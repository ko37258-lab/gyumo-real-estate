// VWorld 데이터 API — 서버사이드 전용 클라이언트 (CORS 회피).
//
// 배경: data.go.kr 토지특성정보(개별공시지가·지목·이용상황)가 VWorld로 이전됨.
//   VWorld 데이터 API는 브라우저 CORS를 허용하지 않으므로 반드시 서버(Next.js API route)에서
//   호출하고, Referer 헤더 + domain 파라미터를 등록 도메인으로 맞춰야 502/인증오류를 피한다.
//
// 키: VWORLD_DATA_KEY(신규, 토지특성정보 발급 키). 미설정 시 기존 VWORLD_KEY로 fallback.
//   (두 키 모두 VWorld 데이터 API 사용 가능 — 라이브 검증됨. 키 값은 환경변수로만, 코드 하드코딩 금지.)
//
// 라이브 검증(성내동 562, PNU 1174010800105620000):
//   LP_PA_CBND_BUBUN → jiga=5,832,000원/㎡(2025), jibun="562대"(지목 대), 폴리곤 면적 201.96㎡(≈201.6)
//   LT_C_UQ111       → uname="제2종일반주거지역"

import { normalizeJimok } from "./jimok";

const VWORLD_DATA_ENDPOINT = "https://api.vworld.kr/req/data";

function vworldKey(): string {
  return process.env.VWORLD_DATA_KEY || process.env.VWORLD_KEY || "";
}

function vworldDomain(): string {
  return process.env.VWORLD_DOMAIN || "";
}

export function hasVworldDataKey(): boolean {
  return Boolean(vworldKey());
}

/**
 * 건축물대장/지오코더 PNU(11번째 자리: 평지=0, 산=1) →
 * VWorld PNU(11번째 자리: 일반토지=1, 산=2) 변환.
 * 라이브 검증: geocode PNU(…0…)는 NOT_FOUND, VWorld PNU(…1…)만 조회됨.
 */
export function toVworldPnu(pnu: string): string {
  if (pnu.length !== 19) return pnu;
  const flag = pnu[10];
  const converted = flag === "0" ? "1" : flag === "1" ? "2" : flag;
  return pnu.slice(0, 10) + converted + pnu.slice(11);
}

type FeatureResponse = {
  response?: {
    status?: string;
    error?: { text?: string };
    result?: {
      featureCollection?: {
        features?: Array<{
          properties?: Record<string, unknown>;
          geometry?: {
            type?: string;
            coordinates?: unknown;
          };
        }>;
      };
    };
  };
};

/**
 * WGS84(EPSG:4326) 폴리곤 링을 위도 보정 평면 근사로 면적(㎡) 계산.
 * 작은 필지(수백~수천 ㎡) 기준 오차 < 0.3% (성내동 562: 201.96 vs 실측 201.6).
 */
function ringAreaSqm(ring: number[][], lat: number): number {
  const phi = (lat * Math.PI) / 180;
  // WGS84 위도별 1도당 미터 (표준 근사식)
  const mPerLat =
    111132.92 - 559.82 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi);
  const mPerLon = 111412.84 * Math.cos(phi) - 93.5 * Math.cos(3 * phi);
  let acc = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    acc += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return Math.abs(acc / 2) * mPerLat * mPerLon;
}

function polygonAreaSqm(
  geometry: { type?: string; coordinates?: unknown } | undefined,
  lat: number,
): number {
  if (!geometry?.coordinates) return 0;
  const coords = geometry.coordinates as number[][][] | number[][][][];
  try {
    const outer =
      geometry.type === "MultiPolygon"
        ? (coords as number[][][][])[0][0]
        : (coords as number[][][])[0];
    if (!Array.isArray(outer) || outer.length < 4) return 0;
    return ringAreaSqm(outer, lat);
  } catch {
    return 0;
  }
}

/** jibun("562대" / "12-3도")에서 지목명(끝 한글) 추출 */
function jimokFromJibun(jibun: string): string {
  const m = jibun.match(/([가-힣]+)\s*$/);
  return m ? m[1].trim() : "";
}

/**
 * VWorld 데이터 API 호출. 전송 실패·빈응답·비정상(non-JSON)은 throw(=transient),
 * 정상 JSON은 반환(status가 OK가 아닐 수도 있음 — NOT_FOUND 등은 "데이터 없음").
 * 호출부에서 throw(일시 장애)와 status!=OK(데이터 없음)를 구분 처리한다.
 */
async function callVworldData(url: string): Promise<FeatureResponse> {
  const domain = vworldDomain();
  const headers: Record<string, string> = {
    // 서버사이드 502 회피: 등록 도메인을 Referer로 명시 (CLAUDE.md Day14 검증).
    "User-Agent": "Mozilla/5.0 (compatible; gyumo/1.0)",
    Accept: "application/json",
  };
  if (domain) headers.Referer = `https://${domain}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`VWorld HTTP ${res.status}`);
  const text = await res.text();
  if (!text.trim()) throw new Error("VWorld 빈 응답");
  return JSON.parse(text) as FeatureResponse; // 비정상 본문이면 throw
}

export interface VworldLandChar {
  pnu: string; // VWorld PNU
  area: number; // 면적 ㎡ (폴리곤 계산)
  price: number; // 개별공시지가 원/㎡ (jiga)
  priceYear: number; // 공시 기준연도
  jimok: string; // 지목명 (대/전/답/임야 등)
  jibun: string; // 지번 표기 (예: "562대")
  address: string; // 주소
}

/**
 * VWorld 토지특성정보 — PNU로 조회 → 면적·개별공시지가·지목.
 * 건축물대장이 없는 나대지의 면적/공시지가 자동 입력에 사용.
 */
export async function fetchVworldLandChar(
  pnu: string,
): Promise<VworldLandChar | null> {
  const key = vworldKey();
  if (!key) return null;
  const vpnu = toVworldPnu(pnu);
  const url =
    `${VWORLD_DATA_ENDPOINT}?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN` +
    `&key=${key}&format=json&attrFilter=pnu:=:${vpnu}` +
    `&geometry=true&attribute=true&crs=EPSG:4326&size=1&domain=${vworldDomain()}`;
  const data = await callVworldData(url);
  if (data?.response?.status !== "OK") return null;
  const feature = data.response.result?.featureCollection?.features?.[0];
  if (!feature) return null;

  const p = (feature.properties ?? {}) as Record<string, unknown>;
  const jibun = String(p.jibun ?? "");
  // 부호(약어) → 정식 명칭으로 환원 (예: "임" → "임야", "장" → "공장용지")
  const jimok = normalizeJimok(jimokFromJibun(jibun));

  // 면적: 폴리곤 중심 위도 추정 → 위도 보정 면적
  const ring =
    feature.geometry?.type === "MultiPolygon"
      ? (feature.geometry.coordinates as number[][][][])?.[0]?.[0]
      : (feature.geometry?.coordinates as number[][][])?.[0];
  const lat =
    Array.isArray(ring) && ring.length
      ? ring.reduce((s, pt) => s + pt[1], 0) / ring.length
      : 37.5;
  const area = polygonAreaSqm(feature.geometry, lat);

  return {
    pnu: String(p.pnu ?? vpnu),
    area: Math.round(area * 10) / 10,
    price: Number(p.jiga) || 0,
    priceYear: Number(p.gosi_year) || 0,
    jimok,
    jibun,
    address: String(p.addr ?? ""),
  };
}

export interface VworldZone {
  zone: string; // 용도지역명 (예: 제2종일반주거지역)
  raw: Record<string, unknown>;
}

/** VWorld 용도지역(도시지역) — 좌표로 조회 */
export async function fetchVworldZone(
  x: number | string,
  y: number | string,
): Promise<VworldZone | null> {
  const key = vworldKey();
  if (!key) return null;
  const url =
    `${VWORLD_DATA_ENDPOINT}?service=data&request=GetFeature&data=LT_C_UQ111` +
    `&key=${key}&format=json&geomFilter=POINT(${x} ${y})` +
    `&geometry=false&attribute=true&crs=EPSG:4326&size=1&domain=${vworldDomain()}`;
  // 용도지역은 best-effort — 일시 장애/데이터없음 모두 null.
  const data = await callVworldData(url).catch(() => null);
  if (data?.response?.status !== "OK") return null;
  const feature = data.response.result?.featureCollection?.features?.[0];
  if (!feature) return null;
  const p = (feature.properties ?? {}) as Record<string, unknown>;
  const zone =
    (p.uname as string) ||
    (p.UNAME as string) ||
    (p.uqa111_nm as string) ||
    "";
  if (!zone) return null;
  return { zone, raw: p };
}

export interface VworldRoadCheck {
  hasRoad: boolean;
  roads: Array<{ jibun: string }>;
  totalParcels: number;
}

/** 주변 필지에서 도로(지목 "도") 검출 — 좌표 BOX 조회 */
export async function fetchVworldRoads(
  x: number | string,
  y: number | string,
  radius = 60,
): Promise<VworldRoadCheck | null> {
  const key = vworldKey();
  if (!key) return null;
  const delta = radius / 111000;
  const cx = parseFloat(String(x));
  const cy = parseFloat(String(y));
  const box = `BOX(${(cx - delta).toFixed(7)},${(cy - delta).toFixed(7)},${(cx + delta).toFixed(7)},${(cy + delta).toFixed(7)})`;
  const url =
    `${VWORLD_DATA_ENDPOINT}?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN` +
    `&key=${key}&format=json&geomFilter=${box}` +
    `&geometry=false&attribute=true&crs=EPSG:4326&size=100&domain=${vworldDomain()}`;
  // 도로 판정은 best-effort — 일시 장애/데이터없음 모두 null.
  const data = await callVworldData(url).catch(() => null);
  if (data?.response?.status !== "OK") return null;
  const features = data.response.result?.featureCollection?.features ?? [];
  const roads = features
    .map((f) => String((f.properties ?? {}).jibun ?? ""))
    .filter((jibun) => jimokFromJibun(jibun) === "도")
    .map((jibun) => ({ jibun }));
  return {
    hasRoad: roads.length > 0,
    roads,
    totalParcels: features.length,
  };
}
