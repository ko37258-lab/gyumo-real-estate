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
  area: number; // 면적 ㎡ (lndpclAr — 속성 직접 제공)
  price: number; // 개별공시지가 원/㎡ (pblntfPclnd)
  priceYear: number; // 공시 기준연도 (stdrYear)
  jimok: string; // 지목명 (대/전/답/임야 등 — 정식명으로 정규화)
  zone: string; // 용도지역 (prposArea1Nm — 비도시지역 포함)
  jibun: string; // 지번 표기 (현재 NED 미제공 → 빈 문자열, backward-compat)
  address: string; // 주소 (현재 NED 미제공 → 빈 문자열)
}

const VWORLD_NED_ENDPOINT = "https://api.vworld.kr/ned/data";

type NedResponse = {
  landCharacteristicss?: {
    field?: Record<string, unknown> | Array<Record<string, unknown>>;
    resultCode?: string;
    resultMsg?: string;
  };
  response?: { totalCount?: string; resultMsg?: string };
};

/** NED 응답의 field(단건 객체 또는 배열) → 최신 stdrYear 행 선택. */
function pickLatestField(
  raw: Record<string, unknown> | Array<Record<string, unknown>> | undefined,
): Record<string, unknown> | null {
  const rows = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(
    (x): x is Record<string, unknown> => !!x && typeof x === "object",
  );
  if (!rows.length) return null;
  rows.sort((a, b) => (Number(b.stdrYear) || 0) - (Number(a.stdrYear) || 0));
  return rows[0];
}

/**
 * VWorld NED 토지특성정보(getLandCharacteristics) — PNU 한 번에
 * 면적(lndpclAr)·개별공시지가(pblntfPclnd)·지목(lndcgrCodeNm)·용도지역(prposArea1Nm).
 *
 * 라이브 검증(2026-06): 도시(성내동562 대/201.6㎡/제2종일반주거)·나대지(역삼825-3 대/394.8㎡/
 *   일반상업)·비도시(파주 송촌동578-11 공장용지/624㎡/계획관리지역)·임야(춘천 산1 임야/5,157㎡)
 *   모두 정상. 폴리곤 면적 계산·LT_C_UQ111(비도시 NOT_FOUND) 의존 제거.
 *
 * stdrYear 생략 → 전 연도 반환되므로 최신 행 선택. 전송실패/빈응답/비정상 본문은 throw(transient).
 */
export async function fetchVworldLandChar(
  pnu: string,
): Promise<VworldLandChar | null> {
  const key = vworldKey();
  if (!key) return null;
  const vpnu = toVworldPnu(pnu);
  const url =
    `${VWORLD_NED_ENDPOINT}/getLandCharacteristics` +
    `?key=${key}&domain=${vworldDomain()}&pnu=${vpnu}&format=json&numOfRows=50&pageNo=1`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; gyumo/1.0)",
      Accept: "application/json",
      ...(vworldDomain() ? { Referer: `https://${vworldDomain()}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`VWorld NED HTTP ${res.status}`);
  const text = await res.text();
  if (!text.trim()) throw new Error("VWorld NED 빈 응답");
  const data = JSON.parse(text) as NedResponse; // 비정상 본문이면 throw

  // 인증키 오류 등은 데이터 없음으로 취급(무한 재시도 방지).
  const field = pickLatestField(data.landCharacteristicss?.field);
  if (!field) return null; // 해당 필지 없음(나대지 외 미등록) 또는 totalCount 0

  const zoneRaw = String(field.prposArea1Nm ?? "").trim();
  return {
    pnu: vpnu,
    area: Math.round((Number(field.lndpclAr) || 0) * 10) / 10,
    price: Number(field.pblntfPclnd) || 0,
    priceYear: Number(field.stdrYear) || 0,
    jimok: normalizeJimok(String(field.lndcgrCodeNm ?? "")),
    zone: zoneRaw && zoneRaw !== "지정되지않음" ? zoneRaw : "",
    jibun: "",
    address: "",
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
