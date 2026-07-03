/**
 * 지자체별 부설주차장 설치기준 조례 DB — 주차장법 제19조 제3항.
 *
 * 부설주차장 설치기준은 특별시·광역시·특별자치시·특별자치도·시·군의 "조례"로 정한다
 * (자치구 아님 — 서울은 서울특별시 조례가 25개 구 전체에 적용).
 *
 * 수록 원칙:
 * - 조례 원문(law.go.kr·elis.go.kr)에서 확인된 값만 verified: true
 * - 미수록 지자체는 주차장법 시행령 별표1 기준으로 자동 폴백 + UI에 안내
 * - 시설 용도는 시행령 별표1의 그룹으로 묶어 관리:
 *   · class150 — 문화및집회·종교·판매·운수·의료·운동·업무시설 등 (시행령 150㎡당 1대)
 *   · class200 — 제1·2종 근린생활시설·숙박시설 (시행령 200㎡당 1대)
 *   · class400 — 공장·창고시설 (시행령 400㎡당 1대)
 */

import type { ParkingUsageCode } from "./parking-standards";
import { PARKING_STANDARDS } from "./parking-standards";

export type OrdinanceClassValues = {
  /** 시행령 150㎡ 그룹 (판매·업무·의료·운동문화·종교) 조례값 — ㎡당 1대 */
  class150?: number | null;
  /** 시행령 200㎡ 그룹 (근린1·근린2·숙박) 조례값 */
  class200?: number | null;
  /** 시행령 400㎡ 그룹 (공장·창고) 조례값 */
  class400?: number | null;
};

export type RegionOrdinance = {
  /** 법정동코드 prefix (2자리 시도 또는 4~5자리 시군) */
  prefix: string;
  regionName: string;
  ordinanceName: string;
  values: OrdinanceClassValues;
  /** 조례 원문 확인 여부 */
  verified: boolean;
  source?: string;
};

/** 용도 → 시행령 별표1 그룹 매핑 (area 모드 용도만) */
const USAGE_CLASS: Partial<Record<ParkingUsageCode, keyof OrdinanceClassValues>> = {
  판매: "class150",
  업무: "class150",
  의료: "class150",
  운동문화: "class150",
  종교: "class150",
  근린1: "class200",
  근린2: "class200",
  숙박: "class200",
  공장창고: "class400",
};

/**
 * 조례 DB — prefix 긴 것부터 매칭 (시군 5자리 → 시군 4자리 → 시도 2자리).
 * 서울 외 지자체는 조례 원문 검증 후 추가.
 */
export const REGION_ORDINANCES: RegionOrdinance[] = [
  {
    prefix: "11",
    regionName: "서울특별시",
    ordinanceName: "서울특별시 주차장 설치 및 관리 조례",
    values: { class150: 100, class200: 134, class400: 350 },
    verified: true,
    source: "서울특별시 주차장 설치 및 관리 조례 별표2",
  },
  {
    prefix: "26",
    regionName: "부산광역시",
    ordinanceName: "부산광역시 주차장 설치 및 관리 조례",
    values: { class150: 100, class200: 134, class400: 350 },
    verified: true,
    source: "law.go.kr 자치법규 원문 별표 (부산광역시 주차장 설치 및 관리 조례)",
  },
  {
    prefix: "28",
    regionName: "인천광역시",
    ordinanceName: "인천광역시 주차장 설치 및 관리 조례",
    values: { class150: 100, class200: 134, class400: 350 },
    verified: true,
    source:
      "law.go.kr 자치법규정보시스템(elis.go.kr) 원문 [별표 2] 부설주차장의 설치대상시설물 종류 및 설치기준 HWP 직접 파싱 (도시지역·지구단위계획구역 기준; 관리지역은 150/200/350㎡로 시행령과 동일)",
  },
  {
    prefix: "27",
    regionName: "대구광역시",
    ordinanceName: "대구광역시 주차장 설치 및 관리 조례",
    values: { class150: 100, class200: 150, class400: 350 },
    verified: true,
    source:
      "대구광역시의회 조례 개정안 원문(의안 5582호, 별표2 확정 전문) + law.go.kr HWP 원문 [별표 2]",
  },
  {
    prefix: "31",
    regionName: "울산광역시",
    ordinanceName: "울산광역시 주차장 설치 및 관리 조례",
    values: { class150: 100, class200: 134, class400: 266 },
    verified: true,
    source:
      "law.go.kr 자치법규 원문 [별표 6] (공장 350㎡/창고 266㎡ — 창고 기준 채택)",
  },
  {
    prefix: "36",
    regionName: "세종특별자치시",
    ordinanceName: "세종특별자치시 주차장 설치 및 관리 조례",
    values: { class150: 134, class200: 150, class400: 300 },
    verified: true,
    source:
      "law.go.kr 자치법규 원문 [별표 2] (공장 300㎡/창고 400㎡ — 공장 기준 채택)",
  },
];

/** 법정동코드 2자리 → 시도명 (미수록 지자체 표시용) */
export const SIDO_NAME: Record<string, string> = {
  "11": "서울특별시",
  "26": "부산광역시",
  "27": "대구광역시",
  "28": "인천광역시",
  "29": "광주광역시",
  "30": "대전광역시",
  "31": "울산광역시",
  "36": "세종특별자치시",
  "41": "경기도",
  "42": "강원특별자치도",
  "51": "강원특별자치도",
  "43": "충청북도",
  "44": "충청남도",
  "45": "전북특별자치도",
  "52": "전북특별자치도",
  "46": "전라남도",
  "47": "경상북도",
  "48": "경상남도",
  "50": "제주특별자치도",
};

/** lawdCd(법정동코드 앞자리)로 조례 찾기 — 긴 prefix 우선 */
export function findRegionOrdinance(lawdCd: string): RegionOrdinance | null {
  const sorted = [...REGION_ORDINANCES].sort(
    (a, b) => b.prefix.length - a.prefix.length,
  );
  for (const r of sorted) {
    if (lawdCd.startsWith(r.prefix)) return r;
  }
  return null;
}

export type ResolvedParkingBasis = {
  /** N㎡당 1대 */
  areaPerSpace: number;
  /** 어떤 기준이 적용됐는지 */
  sourceType: "ordinance" | "decree" | "seoul-default";
  /** 적용 조례 (ordinance일 때) */
  region: RegionOrdinance | null;
  /** 지역 표시명 (미수록 지자체 안내용) */
  regionName: string | null;
};

/**
 * 용도 + 법정동코드 → 적용 주차 기준(㎡당 1대) 해석.
 * - lawdCd 없음(지번 미조회): 기존 동작 유지 — 서울 조례 기준
 * - lawdCd 있음 + 조례 수록: 해당 조례값
 * - lawdCd 있음 + 미수록: 시행령 별표1 값 (보수적 기본)
 */
export function resolveAreaPerSpace(
  usage: ParkingUsageCode,
  lawdCd: string | null,
): ResolvedParkingBasis {
  const std = PARKING_STANDARDS[usage];
  const seoulValue =
    std.mode === "area" ? std.seoulAreaPerSpace : 0;
  const decreeValue =
    std.mode === "area" ? std.decreeAreaPerSpace : 0;

  if (!lawdCd) {
    return {
      areaPerSpace: seoulValue,
      sourceType: "seoul-default",
      region: null,
      regionName: null,
    };
  }

  const region = findRegionOrdinance(lawdCd);
  const cls = USAGE_CLASS[usage];

  if (region && cls) {
    const v = region.values[cls];
    if (v && v > 0) {
      return {
        areaPerSpace: v,
        sourceType: "ordinance",
        region,
        regionName: region.regionName,
      };
    }
  }

  return {
    areaPerSpace: decreeValue,
    sourceType: "decree",
    region: region ?? null,
    regionName: region?.regionName ?? SIDO_NAME[lawdCd.slice(0, 2)] ?? null,
  };
}

/** 국가법령정보센터 자치법규 검색 링크 (지자체 조례 직접 확인용) */
export function ordinanceSearchUrl(regionName: string): string {
  return `https://www.law.go.kr/lsSc.do?menuId=9&query=${encodeURIComponent(
    `${regionName} 주차장 조례`,
  )}`;
}
