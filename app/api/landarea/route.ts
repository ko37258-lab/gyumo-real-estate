// 대지면적 다중 소스 조회 — 승인된 API를 순차 시도하는 구조.
//
// 현재 소스 순서:
//   ① 건축HUB 건축물대장 표제부 (getBrTitleInfo) — platArea(대지면적, ㎡) + bcRat/vlRat/주용도
//        ✅ DATAGO_KEY 승인됨 (data.go.kr 15134735). 건물 있는 땅에만 존재.
//   ② (TODO) 토지대장 API — 나대지 면적 대응. 승인되면 여기에 추가.
//
// 나대지(건물 없음)는 ①이 빈 응답 → { area: null } 반환 → UI에서 수동 입력 유지.
//
// serviceKey 인코딩 주의: data.go.kr 키는 디코딩 키를 encodeURIComponent()로 1회 인코딩해야 함.
// (현재 DATAGO_KEY는 순수 영숫자라 인코딩 영향 없음 — 건축물대장 정상 작동으로 검증됨.)
import { NextResponse } from "next/server";

type AreaSource = "building" | "landledger";

interface AreaResult {
  area: number | null; // 대지면적 ㎡
  source: AreaSource | null;
  // 건축물대장에서 함께 가져오는 참고 정보 (있을 때만)
  bcRat?: number; // 실제 건폐율 %
  vlRat?: number; // 실제 용적률 %
  mainUse?: string; // 주용도
  grndFloors?: number; // 지상 층수
  ugrndFloors?: number; // 지하 층수
  bldName?: string; // 건물명
  archArea?: number; // 건축면적 ㎡
  totArea?: number; // 연면적 ㎡
}

// PNU 캐시 (트래픽 제한 대비) — 모듈 스코프 in-memory, 6시간 TTL.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: AreaResult }>();

function asArray(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) return raw as Array<Record<string, unknown>>;
  if (raw && typeof raw === "object") return [raw as Record<string, unknown>];
  return [];
}

/** 건축물대장 표제부 → 대지면적(platArea) + 건폐율·용적률·주용도 */
async function fromBuildingLedger(
  pnu: string,
  pkey: string,
): Promise<AreaResult | null> {
  const sigunguCd = pnu.slice(0, 5);
  const bjdongCd = pnu.slice(5, 10);
  const platGbCd = pnu.slice(10, 11);
  const bun = pnu.slice(11, 15);
  const ji = pnu.slice(15, 19);

  const url =
    `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?serviceKey=${encodeURIComponent(pkey)}` +
    `&sigunguCd=${sigunguCd}&bjdongCd=${bjdongCd}&platGbCd=${platGbCd}&bun=${bun}&ji=${ji}` +
    `&numOfRows=50&pageNo=1&_type=json`;

  const res = await fetch(url);
  const text = await res.text();

  let data: {
    response?: {
      header?: { resultCode?: string; resultMsg?: string };
      body?: { items?: { item?: unknown } };
    };
  };
  try {
    data = JSON.parse(text);
  } catch {
    // "Unexpected errors" 등 평문 = 키 미인가 → 이 소스 스킵(상위에서 다음 소스 시도)
    return null;
  }

  const header = data.response?.header;
  if (header?.resultCode && header.resultCode !== "00") {
    return null;
  }

  const items = asArray(data.response?.body?.items?.item);
  if (items.length === 0) return null; // 나대지 — 건물 없음

  // 같은 필지 여러 동(棟)이면 platArea가 가장 큰(또는 대표) 표제부 사용.
  // 대지면적은 필지 공유값이지만 일부 등본에 0이 섞여 들어오므로 최댓값을 택함.
  const withArea = items
    .map((b) => ({
      platArea: Number(b.platArea) || 0,
      archArea: Number(b.archArea) || 0,
      totArea: Number(b.totArea) || 0,
      bcRat: Number(b.bcRat) || 0,
      vlRat: Number(b.vlRat) || 0,
      mainUse: String(b.mainPurpsCdNm ?? ""),
      grndFloors: Number(b.grndFlrCnt) || 0,
      ugrndFloors: Number(b.ugrndFlrCnt) || 0,
      bldName: String(b.bldNm ?? "").trim(),
    }))
    .sort((a, b) => b.platArea - a.platArea);

  const top = withArea[0];
  if (!top || top.platArea <= 0) return null;

  return {
    area: top.platArea,
    source: "building",
    bcRat: top.bcRat || undefined,
    vlRat: top.vlRat || undefined,
    mainUse: top.mainUse || undefined,
    grndFloors: top.grndFloors || undefined,
    ugrndFloors: top.ugrndFloors || undefined,
    bldName: top.bldName || undefined,
    archArea: top.archArea || undefined,
    totArea: top.totArea || undefined,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pnu = searchParams.get("pnu");
  const pkey = process.env.DATAGO_KEY || searchParams.get("pkey");

  if (!pnu || pnu.length !== 19) {
    return NextResponse.json(
      { error: "pnu(19자리)가 필요합니다" },
      { status: 400 },
    );
  }
  if (!pkey) {
    return NextResponse.json(
      { error: "공공데이터포털 API 키가 필요합니다" },
      { status: 400 },
    );
  }

  // 캐시 적중
  const cached = cache.get(pnu);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json({ ...cached.data, cached: true });
  }

  try {
    // 소스 순차 시도. 추가 소스는 이 배열에 함수만 더하면 됨.
    const sources: Array<() => Promise<AreaResult | null>> = [
      () => fromBuildingLedger(pnu, pkey),
      // () => fromLandLedger(pnu, pkey),  // TODO: 토지대장 API 승인 후 추가
    ];

    for (const tryFetch of sources) {
      const result = await tryFetch().catch(() => null);
      if (result && result.area && result.area > 0) {
        cache.set(pnu, { at: Date.now(), data: result });
        return NextResponse.json(result);
      }
    }

    // 모든 소스 실패 — 나대지이거나 미등록 필지
    const empty: AreaResult = { area: null, source: null };
    cache.set(pnu, { at: Date.now(), data: empty });
    return NextResponse.json({
      ...empty,
      message: "면적 정보 없음 (나대지이거나 건축물대장 미등록) — 수동 입력 필요",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 실패" },
      { status: 500 },
    );
  }
}
