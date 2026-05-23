// VWorld API 클라이언트 직접 호출 (브라우저에서 실행).
// 서버사이드(Netlify Functions Lambda)에서 호출하면 도메인 인증/IP 제한으로 502가 나므로
// stellar(real-estate-infographic)의 검증된 패턴을 따라 사용자 브라우저에서 fetch 시도 후
// CORS 실패 시 JSONP로 fallback. 키는 NEXT_PUBLIC_VWORLD_KEY로 클라이언트 번들에 인라인되며,
// VWorld 측 도메인 화이트리스트로 키 오용을 차단한다.

const VWORLD_KEY =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_VWORLD_KEY) ||
  "";

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

// ─── JSONP fallback (CORS 차단 시) ─────────────────────────────────

function vworldJsonp<T>(url: string): Promise<T> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("VWorld JSONP는 브라우저에서만 호출 가능합니다"));
  }
  const w = window as unknown as Record<string, unknown>;
  return new Promise<T>((resolve, reject) => {
    const callbackName = `vworld_cb_${Date.now()}_${Math.floor(
      Math.random() * 1000,
    )}`;
    const timeoutId = window.setTimeout(() => {
      delete w[callbackName];
      reject(new Error("VWorld 응답 시간 초과"));
    }, 10000);

    w[callbackName] = (data: T) => {
      window.clearTimeout(timeoutId);
      delete w[callbackName];
      document.getElementById(callbackName)?.remove();
      resolve(data);
    };

    const script = document.createElement("script");
    script.id = callbackName;
    script.src = `${url}&callback=${callbackName}`;
    script.onerror = () => {
      window.clearTimeout(timeoutId);
      delete w[callbackName];
      script.remove();
      reject(new Error("VWorld 스크립트 로드 실패"));
    };
    document.head.appendChild(script);
  });
}

function currentDomain(): string {
  if (typeof window === "undefined") return "";
  return window.location.hostname;
}

async function callVworld<T>(url: string): Promise<T> {
  // 1) 일반 fetch 시도 (CORS 허용된 경우)
  try {
    const r = await fetch(url);
    if (r.ok) {
      return (await r.json()) as T;
    }
  } catch {
    // CORS 실패 → JSONP fallback
  }
  return vworldJsonp<T>(url);
}

// ─── 파서 (외부 호출 가능 — 서버 라우트가 import할 수 있음) ───────

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

// ─── 클라이언트 직접 호출 (브라우저 한국 IP + Origin 자동 첨부) ────

export async function fetchParcelInfo(
  x: number | string,
  y: number | string,
): Promise<ParcelInfo | null> {
  if (!VWORLD_KEY) throw new Error("VWorld 키가 설정되지 않았습니다");
  const url = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN&key=${VWORLD_KEY}&format=json&geomFilter=POINT(${x} ${y})&geometry=false&attribute=true&crs=EPSG:4326&size=1&domain=${currentDomain()}`;
  const data = await callVworld<unknown>(url);
  return parseParcelInfo(data);
}

export async function fetchNearbyRoads(
  x: number | string,
  y: number | string,
  radius = 60,
): Promise<RoadCheck> {
  if (!VWORLD_KEY) throw new Error("VWorld 키가 설정되지 않았습니다");
  const delta = radius / 111000;
  const minX = (parseFloat(String(x)) - delta).toFixed(7);
  const maxX = (parseFloat(String(x)) + delta).toFixed(7);
  const minY = (parseFloat(String(y)) - delta).toFixed(7);
  const maxY = (parseFloat(String(y)) + delta).toFixed(7);
  const url = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN&key=${VWORLD_KEY}&format=json&geomFilter=BOX(${minX},${minY},${maxX},${maxY})&geometry=false&attribute=true&crs=EPSG:4326&size=50&domain=${currentDomain()}`;
  const data = await callVworld<unknown>(url);
  return parseRoadCheck(data);
}

export async function fetchZoneByCoord(
  x: number | string,
  y: number | string,
): Promise<ZoneFromVworld> {
  if (!VWORLD_KEY) throw new Error("VWorld 키가 설정되지 않았습니다");
  const url = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LT_C_UQ111&key=${VWORLD_KEY}&format=json&geomFilter=POINT(${x} ${y})&geometry=false&attribute=true&crs=EPSG:4326&size=10&domain=${currentDomain()}`;
  const data = await callVworld<unknown>(url);
  return parseVworldZone(data);
}

export function hasVworldKey(): boolean {
  return Boolean(VWORLD_KEY);
}
