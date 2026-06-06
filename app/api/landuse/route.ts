// data.go.kr 토지이용규제정보서비스 → 용도지역 조회 프록시 (data.go.kr 15058410)
//
// serviceKey 인코딩: DATAGO_KEY(디코딩 키)를 encodeURIComponent()로 1회 인코딩.
//   현재 키는 순수 영숫자라 인코딩 영향 없음(건축물대장에서 동일 키 정상 작동 검증됨).
//   → 401/미응답의 원인은 "키 오류"가 아니라 "해당 서비스 활용신청(승인) 미완료"임.
//
// 승인 전파 시점/정식 엔드포인트가 유동적이므로, 알려진 후보 엔드포인트를
// 순차 시도하고 응답에서 용도지역 키워드를 가진 필드를 탐색하는 robust 구조로 작성.
import { NextResponse } from "next/server";

const ZONE_KEYWORDS = [
  "주거지역",
  "상업지역",
  "공업지역",
  "녹지지역",
  "관리지역",
  "농림지역",
  "환경보전지역",
];

// 토지이용규제정보서비스 후보 엔드포인트 (apis.data.go.kr 기준).
// 승인된 정식 경로가 확정되면 첫 항목으로 정리. 나머지는 fallback.
const ENDPOINTS = [
  "1613000/LandUseService_v2/getRtnLandUseInfo",
  "1613000/LandUseService/getLandUseInfo",
  "1611000/nsdi/LandUseService/attr/getLandUseAttr",
];

// PNU 캐시 (트래픽 제한 대비) — 6시간 TTL.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; zone: string | null }>();

/** 임의의 객체에서 용도지역 키워드를 포함한 문자열 값을 탐색 */
function findZoneInItem(item: Record<string, unknown>): string | null {
  // 자주 쓰이는 필드 우선
  const preferred = [
    "prposAreaDstrcNm",
    "prposAreaDstrcCodeNm",
    "prposArea1Nm",
    "lndcgrCodeNm",
  ];
  for (const key of preferred) {
    const v = item[key];
    if (typeof v === "string" && ZONE_KEYWORDS.some((kw) => v.includes(kw))) {
      return v;
    }
  }
  // 그 외 모든 문자열 필드 스캔
  for (const v of Object.values(item)) {
    if (typeof v === "string" && ZONE_KEYWORDS.some((kw) => v.includes(kw))) {
      return v;
    }
  }
  return null;
}

function asArray(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) return raw as Array<Record<string, unknown>>;
  if (raw && typeof raw === "object") return [raw as Record<string, unknown>];
  return [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pnu = searchParams.get("pnu");
  const pkey = process.env.DATAGO_KEY || searchParams.get("pkey");

  if (!pnu) {
    return NextResponse.json({ error: "pnu가 필요합니다" }, { status: 400 });
  }
  if (!pkey) {
    return NextResponse.json(
      { error: "공공데이터포털 API 키가 필요합니다" },
      { status: 400 },
    );
  }

  const cached = cache.get(pnu);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    if (cached.zone) return NextResponse.json({ zone: cached.zone, pnu, cached: true });
  }

  let sawUnauthorized = false;

  try {
    for (const path of ENDPOINTS) {
      const url = `https://apis.data.go.kr/${path}?serviceKey=${encodeURIComponent(pkey)}&pnu=${pnu}&numOfRows=20&pageNo=1&format=json&_type=json`;
      const res = await fetch(url).catch(() => null);
      if (!res) continue;
      const text = await res.text();

      // 평문 "Unexpected errors" / 미등록 = 이 서비스 미승인 → 다음 후보
      if (
        text.includes("Unexpected errors") ||
        text.includes("SERVICE_KEY_IS_NOT_REGISTERED_ERROR")
      ) {
        sawUnauthorized = true;
        continue;
      }

      let data: {
        response?: {
          header?: { resultCode?: string; resultMsg?: string };
          body?: { items?: { item?: unknown } };
        };
      };
      try {
        data = JSON.parse(text);
      } catch {
        continue;
      }

      const resultCode = data.response?.header?.resultCode;
      if (resultCode && resultCode !== "00") {
        // NODATA(03) 등은 다른 엔드포인트로 재시도
        continue;
      }

      const items = asArray(data.response?.body?.items?.item);
      if (!items.length) continue;

      const zone =
        items.map(findZoneInItem).find((z) => z) ??
        // 키워드 매칭 실패 시 대표 필드 원문이라도 반환
        (typeof items[0].prposAreaDstrcNm === "string"
          ? (items[0].prposAreaDstrcNm as string)
          : null);

      if (zone) {
        cache.set(pnu, { at: Date.now(), zone });
        return NextResponse.json({ zone, pnu });
      }
    }

    if (sawUnauthorized) {
      return NextResponse.json(
        {
          error:
            "⏳ 용도지역(토지이용규제정보) API 인가 전파 중입니다. 활용신청 승인 직후 수 분~수십 분 지연될 수 있습니다.",
          pending: true,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "해당 필지의 토지이용규제 정보를 찾을 수 없습니다" },
      { status: 404 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 실패" },
      { status: 500 },
    );
  }
}
