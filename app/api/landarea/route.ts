// 대지면적 다중 소스 조회 — 승인된 API를 우선순위대로 시도.
//
// 소스 우선순위:
//   ① 건축HUB 건축물대장 표제부(getBrTitleInfo) — platArea(대지면적) + 건폐율·용적률·주용도.
//        건물 있는 땅에만 존재. DATAGO_KEY.
//   ② VWorld 토지특성정보(LP_PA_CBND_BUBUN) — 나대지 면적(폴리곤 계산) + 개별공시지가 + 지목.
//        건축물대장이 없는 나대지를 커버. VWORLD_DATA_KEY(또는 VWORLD_KEY).
//
// 견고성(2026-06 장애 대응):
//   - data.go.kr이 간헐적으로 "빈 200 응답"을 반환하면(특히 해외 IP) JSON.parse 실패.
//     이를 "나대지(정상 0건)"와 구분하여 transient 로 처리 → 재시도 + 캐시 stale 제공 +
//     사용자에게 "잠시 후 다시" 안내(200평 기본값으로 조용히 떨어지지 않게).
//   - PNU별 결과 24시간 캐싱 → 동일 주소 재조회 시 API 호출 없음(트래픽·장애 보호).
import { NextResponse } from "next/server";
import { fetchVworldLandChar } from "@/lib/vworld-data";

type AreaSource = "building" | "vworld";

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
  // VWorld 토지특성정보에서 함께 가져오는 정보 (있을 때만)
  price?: number; // 개별공시지가 원/㎡
  priceYear?: number; // 공시 기준연도
  jimok?: string; // 지목
}

// 소스 호출 결과 — 정상 / 데이터없음(나대지) / 일시오류 3분기.
type SourceOutcome =
  | { status: "ok"; data: AreaResult }
  | { status: "empty" } // 정상 응답이나 매칭 0건 (나대지) → 다음 소스
  | { status: "transient" }; // 빈/비정상 응답 → 재시도 대상

// PNU 캐시 — 24시간 TTL. 동일 PNU 반복 호출 시 API 미호출.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; data: AreaResult }>();

function asArray(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) return raw as Array<Record<string, unknown>>;
  if (raw && typeof raw === "object") return [raw as Record<string, unknown>];
  return [];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 건축물대장 표제부 → 대지면적(platArea) + 건폐율·용적률·주용도. transient/empty 구분. */
async function fromBuildingLedger(
  pnu: string,
  pkey: string,
): Promise<SourceOutcome> {
  const sigunguCd = pnu.slice(0, 5);
  const bjdongCd = pnu.slice(5, 10);
  const platGbCd = pnu.slice(10, 11);
  const bun = pnu.slice(11, 15);
  const ji = pnu.slice(15, 19);

  const url =
    `https://apis.data.go.kr/1613000/BldRgstHubService/getBrTitleInfo?serviceKey=${encodeURIComponent(pkey)}` +
    `&sigunguCd=${sigunguCd}&bjdongCd=${bjdongCd}&platGbCd=${platGbCd}&bun=${bun}&ji=${ji}` +
    `&numOfRows=50&pageNo=1&_type=json`;

  // data.go.kr 빈응답 회피용 헤더 (curl 동작과 정렬).
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; gyumo/1.0)",
      Accept: "application/json",
    },
  }).catch(() => null);

  if (!res || !res.ok) return { status: "transient" };
  const text = await res.text();

  // 빈 본문 / 평문(예: "Unexpected errors") = 일시 장애 또는 미인가 → transient (재시도).
  if (!text.trim()) return { status: "transient" };

  let data: {
    response?: {
      header?: { resultCode?: string; resultMsg?: string };
      body?: { items?: { item?: unknown }; totalCount?: string | number };
    };
  };
  try {
    data = JSON.parse(text);
  } catch {
    // JSON 아님 = 빈응답/장애/미인가 → transient
    return { status: "transient" };
  }

  const header = data.response?.header;
  const resultCode = header?.resultCode;
  // 정상 응답인데 resultCode가 00이 아니면(트래픽 한도·서비스 오류 등) transient 로 본다.
  if (resultCode && resultCode !== "00") {
    // NODATA(03)는 진짜 데이터 없음 = 나대지.
    if (resultCode === "03") return { status: "empty" };
    return { status: "transient" };
  }

  const items = asArray(data.response?.body?.items?.item);
  if (items.length === 0) return { status: "empty" }; // 나대지 — 건물 없음 (정상)

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
  if (!top || top.platArea <= 0) return { status: "empty" };

  return {
    status: "ok",
    data: {
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
    },
  };
}

/** VWorld 토지특성정보 → 나대지 면적 + 개별공시지가 + 지목 */
async function fromVworldLandChar(pnu: string): Promise<SourceOutcome> {
  let lc;
  try {
    lc = await fetchVworldLandChar(pnu);
  } catch {
    // 전송 실패·빈응답 = 일시 장애 → 재시도 대상
    return { status: "transient" };
  }
  // VWorld 정상 응답이나 해당 필지 없음(NOT_FOUND) = 진짜 데이터 없음
  if (!lc) return { status: "empty" };
  if (!lc.area || lc.area <= 0) {
    // 면적은 못 구해도 공시지가/지목은 있을 수 있음 — 면적 없으면 다음 소스로.
    if (lc.price > 0 || lc.jimok) {
      return {
        status: "ok",
        data: {
          area: null,
          source: "vworld",
          price: lc.price || undefined,
          priceYear: lc.priceYear || undefined,
          jimok: lc.jimok || undefined,
        },
      };
    }
    return { status: "empty" };
  }
  return {
    status: "ok",
    data: {
      area: lc.area,
      source: "vworld",
      price: lc.price || undefined,
      priceYear: lc.priceYear || undefined,
      jimok: lc.jimok || undefined,
    },
  };
}

/** 소스를 재시도 백오프와 함께 호출. transient면 최대 2회 추가 재시도. */
async function trySourceWithRetry(
  fn: () => Promise<SourceOutcome>,
): Promise<SourceOutcome> {
  const delays = [350, 800];
  let outcome = await fn().catch(() => ({ status: "transient" }) as SourceOutcome);
  for (let i = 0; outcome.status === "transient" && i < delays.length; i++) {
    await sleep(delays[i]);
    outcome = await fn().catch(() => ({ status: "transient" }) as SourceOutcome);
  }
  return outcome;
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

  // 캐시 적중 (24h)
  const cached = cache.get(pnu);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return NextResponse.json({ ...cached.data, cached: true });
  }

  try {
    // 소스 순차 시도 (우선순위: 건축물대장 → VWorld 토지특성). 추가 소스는 배열에 더하면 됨.
    const sources: Array<() => Promise<SourceOutcome>> = [
      () => fromBuildingLedger(pnu, pkey),
      () => fromVworldLandChar(pnu),
    ];

    let sawTransient = false;
    // 면적은 없지만 공시지가/지목만 얻은 부분 결과(나대지 직전 단계) 보관.
    let partial: AreaResult | null = null;

    for (const source of sources) {
      const outcome = await trySourceWithRetry(source);
      if (outcome.status === "ok") {
        if (outcome.data.area && outcome.data.area > 0) {
          cache.set(pnu, { at: Date.now(), data: outcome.data });
          return NextResponse.json(outcome.data);
        }
        // 면적 없는 부분 정보(공시지가 등)는 누적하고 계속 — 다음 소스가 면적을 줄 수도.
        partial = { ...(partial ?? {}), ...outcome.data, area: null };
      } else if (outcome.status === "transient") {
        sawTransient = true;
      }
    }

    // 모든 소스가 면적을 못 줌. transient가 있었으면 일시 장애로 안내(기본값 회피).
    if (sawTransient && !partial) {
      // 마지막 성공 캐시가 있으면 stale 이라도 제공.
      if (cached) {
        return NextResponse.json({ ...cached.data, cached: true, stale: true });
      }
      return NextResponse.json(
        {
          area: null,
          source: null,
          transient: true,
          message:
            "면적 조회 서비스가 일시적으로 불안정합니다. 잠시 후 다시 시도해주세요.",
        },
        { status: 200 },
      );
    }

    // 나대지 + 부분 정보(공시지가/지목)만 있는 경우 — 그 정보라도 반환(캐시).
    if (partial) {
      cache.set(pnu, { at: Date.now(), data: partial });
      return NextResponse.json({
        ...partial,
        message:
          "건축물대장 미등록(나대지) — 공시지가/지목만 조회됨. 면적은 수동 입력 필요.",
      });
    }

    // 진짜 데이터 없음 — 나대지이거나 미등록 필지.
    const empty: AreaResult = { area: null, source: null };
    cache.set(pnu, { at: Date.now(), data: empty });
    return NextResponse.json({
      ...empty,
      message: "면적 정보 없음 (나대지이거나 미등록) — 수동 입력 필요",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 실패" },
      { status: 500 },
    );
  }
}
