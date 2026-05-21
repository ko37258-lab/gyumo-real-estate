// VWorld 응답 파싱 헬퍼 + 클라이언트가 호출하는 thin wrapper (서버 API Route 경유).
// 이전 버전은 클라이언트 JSONP였으나 VWorld 키의 도메인 제한 때문에 localhost에서 실패.
// 현재 구조: 클라이언트 → /api/vworld/* → 서버에서 VWorld API 호출 → 결과 반환.

const JIMOK_MAP: Record<string, string> = {
  "01": "전", "02": "답", "03": "과수원", "04": "목장용지",
  "05": "임야", "06": "광천지", "07": "염전", "08": "대",
  "09": "공장용지", "10": "학교용지", "11": "주차장", "12": "주유소용지",
  "13": "창고용지", "14": "도로", "15": "철도용지", "16": "제방",
  "17": "하천", "18": "구거", "19": "유지", "20": "양어장",
  "21": "수도용지", "22": "공원", "23": "체육용지", "24": "유원지",
  "25": "종교용지", "26": "사적지", "27": "묘지", "28": "잡종지",
};

const JIMOK_NAMES = Object.values(JIMOK_MAP);

export interface ParcelInfo {
  pnu: string;
  jibun: string;
  jimokCode: string;
  jimokName: string;
  area: number;
  raw: Record<string, unknown>;
}

export interface RoadCheck {
  hasRoad: boolean;
  roads: Array<{ jibun: string; area: number }>;
  totalParcels: number;
}

export interface ZoneFromVworld {
  zone: string;
  code: string | null;
  raw: Record<string, unknown>;
}

type FeatureResponse = {
  response?: {
    status?: string;
    record?: { message?: string };
    result?: {
      featureCollection?: {
        features?: Array<{ properties?: Record<string, unknown> }>;
      };
    };
  };
};

// ─── 응답 파싱 (서버 API Route에서 import) ──────────────────────────

export function parseParcelInfo(raw: unknown): ParcelInfo | null {
  const data = raw as FeatureResponse;
  if (data?.response?.status !== "OK") return null;
  const features = data?.response?.result?.featureCollection?.features;
  if (!features?.length) return null;
  const props = (features[0].properties || {}) as Record<string, unknown>;

  const get = (k: string) =>
    (props[k] ?? props[k.toUpperCase()]) as string | undefined;

  const jimokCodeRaw =
    get("jimok") ||
    get("lndcgr_code") ||
    get("jimok_se") ||
    get("jbn_se") ||
    get("lndcgr_se_cd") ||
    "";

  let jimokName = JIMOK_MAP[jimokCodeRaw] || "";

  if (!jimokName) {
    const txt =
      get("lndcgr_nm") || get("jimok_nm") || get("jimok_se_nm") || "";
    if (txt && JIMOK_NAMES.includes(txt)) jimokName = txt;
  }

  const jibunRaw = String(get("jibun") || get("jbn") || "");
  let jibun = jibunRaw;
  if (!jimokName) {
    const m = jibunRaw.match(/^([\d\-\s]+)([가-힣]+)$/);
    if (m && JIMOK_NAMES.includes(m[2].trim())) {
      jibun = m[1].trim();
      jimokName = m[2].trim();
    }
  }
  if (!jimokName) jimokName = "미상";

  return {
    pnu: String(get("pnu") || ""),
    jibun,
    jimokCode: jimokCodeRaw,
    jimokName,
    area:
      parseFloat(
        String(get("area_m2") || get("area") || get("pblntf_ar") || 0),
      ) || 0,
    raw: props,
  };
}

export function parseRoadCheck(raw: unknown): RoadCheck {
  const data = raw as FeatureResponse;
  if (data?.response?.status !== "OK") {
    return { hasRoad: false, roads: [], totalParcels: 0 };
  }
  const features = data?.response?.result?.featureCollection?.features || [];
  const roads = features
    .filter((f) => {
      const p = (f.properties || {}) as Record<string, unknown>;
      return (p.jimok ?? p.JIMOK) === "14";
    })
    .map((f) => {
      const p = (f.properties || {}) as Record<string, unknown>;
      return {
        jibun: String(p.jibun || ""),
        area: parseFloat(String(p.area_m2 ?? 0)) || 0,
      };
    });
  return { hasRoad: roads.length > 0, roads, totalParcels: features.length };
}

export function parseVworldZone(raw: unknown): ZoneFromVworld {
  const data = raw as FeatureResponse;
  const status = data?.response?.status;
  if (status !== "OK") {
    throw new Error(
      `VWorld 응답 오류: ${
        data?.response?.record?.message || status || "알 수 없음"
      }`,
    );
  }
  const features = data?.response?.result?.featureCollection?.features;
  if (!features?.length) {
    throw new Error("이 위치에서 용도지역 정보를 찾을 수 없습니다");
  }
  const props = (features[0].properties || {}) as Record<string, unknown>;
  const zoneName =
    (props.uqa111_nm as string | undefined) ||
    (props.UQA111_NM as string | undefined) ||
    (props.uname as string | undefined) ||
    (props.UNAME as string | undefined) ||
    (props.uq_nm as string | undefined) ||
    (props.zone_nm as string | undefined) ||
    null;
  if (!zoneName) {
    throw new Error("용도지역명을 응답에서 찾을 수 없습니다");
  }
  return {
    zone: zoneName,
    code:
      (props.uqa111 as string | undefined) ||
      (props.UQA111 as string | undefined) ||
      (props.uq_cd as string | undefined) ||
      null,
    raw: props,
  };
}

// ─── 클라이언트 wrappers (서버 API Route 호출) ──────────────────────

async function jsonOrError(res: Response, label: string) {
  if (res.ok) return res.json();
  let msg = `${label} 실패 (${res.status})`;
  try {
    const j = (await res.json()) as { error?: string };
    if (j?.error) msg = j.error;
  } catch {
    // ignore
  }
  throw new Error(msg);
}

export async function fetchParcelInfo(
  x: number | string,
  y: number | string,
): Promise<ParcelInfo | null> {
  const res = await fetch(`/api/vworld/parcel?x=${x}&y=${y}`);
  if (res.status === 404) return null;
  return (await jsonOrError(res, "지적 조회")) as ParcelInfo;
}

export async function fetchNearbyRoads(
  x: number | string,
  y: number | string,
  radius = 60,
): Promise<RoadCheck> {
  const res = await fetch(
    `/api/vworld/roads?x=${x}&y=${y}&radius=${radius}`,
  );
  return (await jsonOrError(res, "도로 조회")) as RoadCheck;
}

export async function fetchZoneByCoord(
  x: number | string,
  y: number | string,
): Promise<ZoneFromVworld> {
  const res = await fetch(`/api/vworld/zone?x=${x}&y=${y}`);
  return (await jsonOrError(res, "용도지역 조회")) as ZoneFromVworld;
}

/** 더 이상 클라이언트 키를 직접 확인하지 않음 — 서버 API Route가 환경변수를 검증. */
export function hasVworldKey(): boolean {
  // 호환성을 위해 항상 true 반환. 키 부재는 서버에서 500 에러로 표시됨.
  return true;
}
