// 주소 → 좌표 + PNU 변환 프록시.
//   1순위 카카오 로컬 API (KAKAO_KEY) — 지번·도로명 모두 강함
//   2순위 VWorld 지오코더 (VWORLD_KEY) — 카카오 키 없음/오류/미검색 시 자동 폴백
// 폴백을 둔 이유: 카카오 장애나 키 문제 하나로 ① 지번 조회 전체가 멈추지 않게.
// (2026-09-03) 로컬엔 카카오 키가 없어(Secret) 이 폴백으로 실데이터 E2E를 돌린다.
import { NextResponse } from "next/server";

type GeoResult = { x: string; y: string; pnu: string; refined: string; source: "kakao" | "vworld" };

/** PNU 19자리: 법정동코드(10) + 산여부(1: 0 일반/1 산) + 주번(4) + 부번(4) — 건축물대장 규약 */
function buildPnu(bcode: string, mountain: boolean, main: string | number, sub: string | number): string {
  return (
    bcode +
    (mountain ? "1" : "0") +
    String(main || "0").padStart(4, "0") +
    String(sub || "0").padStart(4, "0")
  );
}

async function kakaoGeocode(address: string, key: string): Promise<GeoResult | { error: string; status: number }> {
  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}&size=1`;
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } });
  if (!res.ok) {
    const text = await res.text();
    return { error: `카카오 API 오류 (${res.status}): ${text.slice(0, 200)}`, status: res.status };
  }
  const data = (await res.json()) as {
    documents?: Array<{
      address?: {
        b_code?: string;
        mountain_yn?: string;
        main_address_no?: string;
        sub_address_no?: string;
        x?: string;
        y?: string;
      };
      address_name?: string;
    }>;
  };
  const doc = data.documents?.[0];
  if (!doc) return { error: "주소를 찾을 수 없습니다. 더 구체적으로 입력해주세요.", status: 404 };
  const addr = doc.address;
  if (!addr?.b_code || !addr.x || !addr.y) {
    return { error: "법정동코드를 가져올 수 없습니다. 지번주소로 다시 시도해보세요.", status: 404 };
  }
  return {
    x: addr.x,
    y: addr.y,
    pnu: buildPnu(addr.b_code, addr.mountain_yn === "Y", addr.main_address_no ?? "0", addr.sub_address_no ?? "0"),
    refined: doc.address_name ?? address,
    source: "kakao",
  };
}

/** VWorld 지오코더(type=parcel) — refined.structure.level4LC 는 19자리 VWorld PNU
 *  (법정동10 + 산여부1[1 일반/2 산] + 본번4 + 부번4). level5 는 지번 문자열.
 *  ⚠ 이 서비스는 `domain` 파라미터를 붙이면 500(시스템 에러)을 낸다(2026-09-03 실측) — 붙이지 않는다. */
async function vworldGeocode(address: string): Promise<GeoResult | { error: string; status: number }> {
  const key = process.env.VWORLD_DATA_KEY || process.env.VWORLD_KEY || "";
  if (!key) return { error: "지오코딩 키가 설정되지 않았습니다 (KAKAO_KEY·VWORLD_KEY)", status: 400 };
  const url =
    `https://api.vworld.kr/req/address?service=address&request=getcoord&version=2.0&crs=epsg:4326` +
    `&address=${encodeURIComponent(address)}&refine=true&simple=false&format=json&type=parcel` +
    `&key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; gyumo/1.0)" } });
  if (!res.ok) return { error: `VWorld 지오코더 오류 (${res.status})`, status: res.status };
  const data = (await res.json().catch(() => null)) as {
    response?: {
      status?: string;
      error?: { text?: string };
      result?: { point?: { x?: string; y?: string } };
      refined?: {
        text?: string;
        structure?: { level4LC?: string; level5?: string; detail?: string };
      };
    };
  } | null;
  const r = data?.response;
  if (!r || r.status !== "OK" || !r.result?.point?.x) {
    return { error: r?.error?.text ? `VWorld: ${r.error.text}` : "주소를 찾을 수 없습니다. 지번주소로 다시 시도해보세요.", status: 404 };
  }
  const lc = (r.refined?.structure?.level4LC ?? "").trim();
  const jibunRaw = (r.refined?.structure?.level5 ?? "").trim();
  let pnu: string | null = null;
  if (/^\d{19}$/.test(lc)) {
    // VWorld PNU → 건축물대장 규약(산 0/1)으로 변환
    pnu = lc.slice(0, 10) + (lc[10] === "2" ? "1" : "0") + lc.slice(11);
  } else if (/^\d{10}$/.test(lc) && jibunRaw) {
    const mountain = /^산/.test(jibunRaw);
    const nums = jibunRaw.replace(/^산\s*/, "").split("-");
    pnu = buildPnu(lc, mountain, nums[0] ?? "0", nums[1] ?? "0");
  }
  if (!pnu) {
    return { error: "법정동코드를 가져올 수 없습니다. 지번주소로 다시 시도해보세요.", status: 404 };
  }
  return {
    x: r.result.point.x!,
    y: r.result.point.y!,
    pnu,
    refined: r.refined?.text ?? address,
    source: "vworld",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const kakaokey = process.env.KAKAO_KEY || searchParams.get("kakaokey");

  if (!address) {
    return NextResponse.json({ error: "주소가 필요합니다" }, { status: 400 });
  }

  try {
    let kakaoErr: { error: string; status: number } | null = null;
    if (kakaokey) {
      const k = await kakaoGeocode(address, kakaokey).catch((e: unknown) => ({
        error: e instanceof Error ? e.message : "카카오 호출 실패",
        status: 502,
      }));
      if ("pnu" in k) return NextResponse.json(k);
      kakaoErr = k;
    }
    // 폴백 — 카카오 키 없음 / 키·서버 오류 / 미검색 모두 VWorld로 한 번 더
    const v = await vworldGeocode(address);
    if ("pnu" in v) return NextResponse.json(v);
    // 둘 다 실패 — 사용자에게 더 유용한 쪽(카카오가 있었으면 카카오 사유) 전달
    const err = kakaoErr ?? v;
    return NextResponse.json({ error: err.error }, { status: err.status === 404 ? 404 : 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 실패" },
      { status: 500 },
    );
  }
}
