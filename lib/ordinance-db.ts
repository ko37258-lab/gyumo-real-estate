/**
 * 전국 시·도/시·군·구 도시계획 조례 건폐율·용적률 DB.
 *
 * 출처: 국가법령정보센터 자치법규(law.go.kr) 원문 대조 — 공법규제분석 앱
 * (mrk-realestate, 고상철 대표 감수) 데이터를 그대로 가져왔다. 건축이야기
 * (public/building-law)의 조례 데이터는 "자동추출-검증필요" 상태라 채택하지
 * 않았다 — 수치를 다루는 곳은 검증된 소스만 쓴다.
 *
 * ⚠ 서울(법정동코드 11로 시작)은 이 DB로 덮지 않는다. gyumo/lib/zones.ts가
 *   이미 서울 조례 정확값 + 서울도심(사대문 안) 특례까지 갖고 있어서,
 *   여기서 override하면 오히려 도심 특례(floorRatioCBD)가 사라진다.
 */

import ordinanceRaw from "./data/ordinance-density.json";
import type { ZoneCode } from "./zones";

type RawZoneRatio = { bcRat: number; vlRat: number; note?: string };
type RawOrdEntry = {
  name: string;
  source: string;
  url: string;
  lastUpdated: string;
  zones: Record<string, RawZoneRatio>;
};

const DB = ordinanceRaw as unknown as Record<string, RawOrdEntry>;

/** gyumo ZoneCode → 조례 DB의 zone key */
const ZONE_KEY: Record<ZoneCode, string> = {
  "1jeon": "excl1",
  "2jeon": "excl2",
  "1il": "gen1",
  "2il": "gen2",
  "3il": "gen3",
  junju: "semi",
  jungsang: "cen",
  ilsang: "gen_c",
  gunin: "near",
  yutong: "dist",
  jongon: "excl_i",
  ilbgon: "gen_i",
  jungon: "semi_i",
  bojeon: "pres_g",
  saengsan: "prod_g",
  jayeon: "nat_g",
  gyehoek: "plan_m",
  saengsangwan: "prod_m",
  bojeongwan: "pres_m",
  nongrim: "agri",
  jayeonbo: "env",
};

export type OrdinanceLimit = {
  /** 지자체명 (예: "수원시") */
  regionName: string;
  /** 조문 근거 (예: "수원시 도시계획 조례 제54조") */
  source: string;
  /** law.go.kr 원문 링크 */
  url: string;
  lastUpdated: string;
  coverRatioMax: number;
  floorRatioMax: number;
  note?: string;
  /** 조문 원문 링크가 지자체별로 정확히 연결되는지 — false면 검색 안내만 표시 */
  hasPreciseSource: boolean;
};

/**
 * 법정동코드(pnu 앞자리)와 용도지역으로 그 지자체 조례의 건폐율·용적률 상한을 찾는다.
 *
 * - 서울(11로 시작)은 항상 null — zones.ts 값을 그대로 쓰라는 신호.
 * - 시·군·구(5자리) 먼저 매칭, 없으면 시·도(2자리)로 폴백(광역시·세종·제주는
 *   시·도 조례가 곧 적용 조례).
 * - 그 지역 데이터가 있어도 해당 용도지역 값이 없으면(관리·농림·자연환경보전
 *   지역 다수가 여기 해당 — 조례가 시행령 상한을 그대로 쓰는 경우) null.
 *   이 경우 호출부는 zones.ts의 시행령 상한 폴백을 그대로 쓴다.
 */
export function findOrdinanceLimit(
  lawdCd: string | null | undefined,
  zoneCode: ZoneCode,
): OrdinanceLimit | null {
  if (!lawdCd || lawdCd.length < 2) return null;
  if (lawdCd.startsWith("11")) return null; // 서울은 zones.ts가 정본

  const key = ZONE_KEY[zoneCode];
  const sigunguCd = lawdCd.slice(0, 5);
  const sidoCd = lawdCd.slice(0, 2);

  const entry = DB[sigunguCd] ?? DB[sidoCd];
  if (!entry) return null;

  const z = entry.zones[key];
  if (!z) return null;

  // 184개 지역 중 광역시·특별자치시 9곳만 조문 링크가 지자체별로 정확히
  // 연결돼 있다(law.go.kr 자치법규 개별 조문 URL). 나머지 175개 기초자치
  // 단체(수원시 등)는 건폐율·용적률 수치는 확보됐지만 조문 URL이
  // "https://www.law.go.kr/" 루트로만 채워져 있어, 이 경우는 클릭해도
  // 아무 조문도 안 나오는 죽은 링크가 된다. 숫자는 그대로 신뢰해 쓰되
  // 링크는 죽은 것처럼 위장하지 않고 "검색 안내"로 정직하게 낮춘다.
  const hasPreciseSource = entry.url !== "https://www.law.go.kr/";

  return {
    regionName: entry.name,
    source: entry.source,
    url: entry.url,
    lastUpdated: entry.lastUpdated,
    coverRatioMax: z.bcRat,
    floorRatioMax: z.vlRat,
    note: z.note,
    hasPreciseSource,
  };
}

/** 해당 법정동코드에 조례 DB 항목 자체가 있는지 (용도지역 무관) — "미수록 지역" 안내용 */
export function hasOrdinanceRegion(lawdCd: string | null | undefined): boolean {
  if (!lawdCd || lawdCd.length < 2) return false;
  if (lawdCd.startsWith("11")) return true; // 서울은 zones.ts로 항상 커버됨
  return Boolean(DB[lawdCd.slice(0, 5)] ?? DB[lawdCd.slice(0, 2)]);
}
