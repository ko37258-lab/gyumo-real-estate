// 대지면적·용도지역·공시지가·지목 통합 조회 — 두 소스를 병합.
//
// 소스:
//   ① 건축HUB 건축물대장 표제부(getBrTitleInfo) — platArea(대지면적) + 건폐율·용적률·주용도.
//        건물 있는 땅에만 존재. DATAGO_KEY. (해외 IP OK)
//   ② VWorld NED 토지특성정보(getLandCharacteristics) — 면적(lndpclAr) + 개별공시지가 +
//        지목 + 용도지역(prposArea1Nm, 비도시지역 포함). PNU 한 호출. VWORLD_DATA_KEY(또는 VWORLD_KEY).
//        ※ NED는 api.vworld.kr — production(해외 IP)에서 차단 시 한국 리전 프록시 필요.
//   병합: 면적은 건축물대장 우선(인허가 기준)→NED 폴백, 용도지역·공시지가·지목은 NED.
//
// 견고성(2026-06 장애 대응):
//   - data.go.kr이 간헐적으로 "빈 200 응답"을 반환하면(특히 해외 IP) JSON.parse 실패.
//     이를 "나대지(정상 0건)"와 구분하여 transient 로 처리 → 재시도 + 캐시 stale 제공 +
//     사용자에게 "잠시 후 다시" 안내(200평 기본값으로 조용히 떨어지지 않게).
//   - PNU별 결과 24시간 캐싱 → 동일 주소 재조회 시 API 호출 없음(트래픽·장애 보호).
import { NextResponse } from "next/server";
import {
  fetchVworldLandChar,
  fetchVworldLandUseAttr,
  fetchVworldParcelPolygon,
} from "@/lib/vworld-data";
import { buildParcelShape } from "@/lib/geo/parcel";
import { normalizeJimok } from "@/lib/jimok";

type AreaSource = "building" | "vworld" | "cadastral";

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
  zone?: string; // 용도지역 (비도시지역 포함 — NED getLandCharacteristics)
  roadSide?: string; // 도로접면 (예: 세로(가))
  landShape?: string; // 토지형상 (예: 세로장방)
  landHeight?: string; // 지세 (예: 평지)
  landUse?: string; // 토지이용상황 (예: 단독주택)
  useAttrs?: string[]; // 토지이용계획 지역·지구 목록 (NED getLandUseAttr, 저촉 표기 포함)
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

/** VWorld NED 토지특성정보 → 면적 + 개별공시지가 + 지목 + 용도지역(비도시 포함) */
async function fromVworldLandChar(pnu: string): Promise<SourceOutcome> {
  let lc;
  try {
    lc = await fetchVworldLandChar(pnu);
  } catch {
    // 전송 실패·빈응답 = 일시 장애 → 재시도 대상
    return { status: "transient" };
  }
  // NED 정상 응답이나 해당 필지 없음 = 진짜 데이터 없음
  if (!lc) return { status: "empty" };

  const extra = {
    price: lc.price || undefined,
    priceYear: lc.priceYear || undefined,
    jimok: lc.jimok || undefined,
    zone: lc.zone || undefined,
    roadSide: lc.roadSide || undefined,
    landShape: lc.landShape || undefined,
    landHeight: lc.landHeight || undefined,
    landUse: lc.landUse || undefined,
  };
  const hasExtra = lc.price > 0 || !!lc.jimok || !!lc.zone;

  if (!lc.area || lc.area <= 0) {
    // 면적은 못 구해도 공시지가/지목/용도지역은 있을 수 있음.
    if (hasExtra) {
      return { status: "ok", data: { area: null, source: "vworld", ...extra } };
    }
    return { status: "empty" };
  }
  return {
    status: "ok",
    data: { area: lc.area, source: "vworld", ...extra },
  };
}

/**
 * 연속지적도 폴리곤 → 근사 면적 + 지목(지번 접미).
 * NED 토지특성에 아직 없는 필지(행정구역 개편 직후·신규 분할 등)의 최후 폴백 —
 * 2026.7 인천 영종구·제물포구 신설로 NED가 새 PNU를 모르는 사례 실측(운북동 1257-78).
 * 폴리곤 shoelace 면적이라 등록 면적과 소폭 다를 수 있음(근사 표기 필수).
 */
async function fromCadastralPolygon(pnu: string): Promise<SourceOutcome> {
  let poly;
  try {
    poly = await fetchVworldParcelPolygon(pnu);
  } catch {
    return { status: "transient" };
  }
  if (!poly?.ring || poly.ring.length < 3) return { status: "empty" };
  const areaSqm = buildParcelShape(poly.ring).areaSqm;
  if (!areaSqm || areaSqm <= 0) return { status: "empty" };
  // jibun 예: "1257-78 대" — 끝의 한글이 지목 부호
  const suffix = poly.jibun.match(/([가-힣]+)\s*$/)?.[1];
  return {
    status: "ok",
    data: {
      area: Math.round(areaSqm * 10) / 10,
      source: "cadastral",
      jimok: suffix ? normalizeJimok(suffix) : undefined,
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
    // 두 소스를 모두 시도해 병합한다.
    //   - 건축물대장(getBrTitleInfo): 건물 있는 땅의 대지면적 + 건폐율·용적률·주용도.
    //   - VWorld NED(getLandCharacteristics): 면적 + 공시지가 + 지목 + 용도지역(비도시 포함).
    // 면적은 건축물대장 우선(인허가 기준), 나머지(용도지역·공시지가·지목)는 NED에서.
    const [building, vworld, useAttrs] = await Promise.all([
      trySourceWithRetry(() => fromBuildingLedger(pnu, pkey)),
      trySourceWithRetry(() => fromVworldLandChar(pnu)),
      // 토지이용계획 지역·지구 — best-effort (실패해도 나머지 응답에 영향 없음)
      fetchVworldLandUseAttr(pnu).catch(() => null),
    ]);

    const b = building.status === "ok" ? building.data : null;
    const v = vworld.status === "ok" ? vworld.data : null;
    const sawTransient =
      building.status === "transient" || vworld.status === "transient";

    // 면적: 건축물대장 우선 → NED 폴백.
    const bArea = b?.area && b.area > 0 ? b.area : 0;
    const vArea = v?.area && v.area > 0 ? v.area : 0;
    let area = bArea || vArea || null;
    let areaSource: AreaSource | null = bArea
      ? "building"
      : vArea
        ? "vworld"
        : null;

    // 최후 폴백: 두 소스 다 면적이 없으면 연속지적도 폴리곤 근사 면적.
    let cad: AreaResult | null = null;
    if (!area) {
      const cadOut = await trySourceWithRetry(() => fromCadastralPolygon(pnu));
      if (cadOut.status === "ok") {
        cad = cadOut.data;
        area = cad.area;
        areaSource = "cadastral";
      }
    }

    if (b || v || cad) {
      const merged: AreaResult = {
        area,
        source: areaSource,
        // 건축물대장 부가정보
        bcRat: b?.bcRat,
        vlRat: b?.vlRat,
        mainUse: b?.mainUse,
        grndFloors: b?.grndFloors,
        ugrndFloors: b?.ugrndFloors,
        bldName: b?.bldName,
        archArea: b?.archArea,
        totArea: b?.totArea,
        // NED 토지특성 (용도지역·공시지가·지목 + 도로접면·형상·지세·이용상황)
        price: v?.price,
        priceYear: v?.priceYear,
        jimok: v?.jimok ?? cad?.jimok,
        zone: v?.zone,
        roadSide: v?.roadSide,
        landShape: v?.landShape,
        landHeight: v?.landHeight,
        landUse: v?.landUse,
        // 토지이용계획 지역·지구 (NED getLandUseAttr)
        useAttrs: useAttrs ?? undefined,
      };
      cache.set(pnu, { at: Date.now(), data: merged });
      if (area && areaSource === "cadastral") {
        return NextResponse.json({
          ...merged,
          message:
            "지적도 폴리곤 기반 근사 면적 — 토지대장 등록 면적과 다를 수 있습니다.",
        });
      }
      if (area) return NextResponse.json(merged);
      // 면적만 없는 경우(나대지) — 나머지 정보라도 반환.
      return NextResponse.json({
        ...merged,
        message:
          "대지면적 미확인(나대지/미등록) — 용도지역·공시지가·지목은 조회됨. 면적은 수동 입력.",
      });
    }

    // 양쪽 다 데이터 없음. transient가 있었으면 일시 장애로 안내(기본값 회피).
    if (sawTransient) {
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
