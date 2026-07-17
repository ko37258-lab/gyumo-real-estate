// ⑥ 가설계(기획설계 개요) 계산 — 플렉시티 기획설계 벤치마킹 v1.
//
// 목적: 규모검토 결과(연면적·층수·기준층 면적)에 유닛 타입을 대입해
// "이 땅에 어떤 상품이 몇 세대 들어가는가"를 30초 안에 산출한다.
//
// 용어 (주택공급 실무):
//   전용면적  = 세대 독점 사용 면적 (분양가 기준면적)
//   공급면적  = 전용 + 주거공용(계단·복도·EV홀)  → 전용률 = 전용/공급
//   세대수    = 층당 세대수 × 주거 층수 (기준층 반복 가정)

export interface SchematicInput {
  /** 기준층 바닥면적(건축면적) ㎡ */
  floorAreaSqm: number;
  /** 층수 (소수 가능 — 규모검토 산출값) */
  floors: number;
  /** 유닛 전용면적 ㎡ */
  exclusiveUnitSqm: number;
  /** 전용률 % (전용/공급, 다세대 75~85 · 아파트 70~80 통상) */
  efficiencyPct: number;
  /** 1층 필로티 주차(주거 제외) 여부 */
  groundPiloti: boolean;
}

export interface SchematicResult {
  /** 세대 공급면적 ㎡ (전용/전용률) */
  supplyPerUnitSqm: number;
  /** 주거 사용 층수 (필로티면 1층 제외, 소수 내림) */
  residentialFloors: number;
  /** 층당 세대수 */
  unitsPerFloor: number;
  /** 총 세대수 */
  totalUnits: number;
  /** 총 전용면적 합 ㎡ */
  totalExclusiveSqm: number;
  /** 기준층 코어·공용 면적 ㎡ (기준층 − 전용합) */
  corePerFloorSqm: number;
  /** 산출 가능 여부 (기준층이 한 세대 공급면적보다 작으면 false) */
  feasible: boolean;
}

export function calculateSchematic(i: SchematicInput): SchematicResult {
  const eff = Math.min(Math.max(i.efficiencyPct, 40), 95) / 100;
  const supplyPerUnitSqm = i.exclusiveUnitSqm / eff;
  const residentialFloors = Math.max(
    0,
    Math.floor(i.floors) - (i.groundPiloti ? 1 : 0),
  );
  const unitsPerFloor =
    i.floorAreaSqm > 0 ? Math.floor(i.floorAreaSqm / supplyPerUnitSqm) : 0;
  const totalUnits = unitsPerFloor * residentialFloors;
  const totalExclusiveSqm =
    Math.round(totalUnits * i.exclusiveUnitSqm * 10) / 10;
  const corePerFloorSqm =
    Math.round((i.floorAreaSqm - unitsPerFloor * i.exclusiveUnitSqm) * 10) / 10;
  return {
    supplyPerUnitSqm: Math.round(supplyPerUnitSqm * 10) / 10,
    residentialFloors,
    unitsPerFloor,
    totalUnits,
    totalExclusiveSqm,
    corePerFloorSqm,
    feasible: unitsPerFloor >= 1 && residentialFloors >= 1,
  };
}

import type { ParkingUsageCode } from "@/lib/parking-standards";

/** ⑥ 가설계 활성 대상 (세대 개념이 있는 주거계 용도) — UI·3D 공용 */
export const RESIDENTIAL_USAGES: ParkingUsageCode[] = [
  "공동주택",
  "다세대연립",
  "다가구",
  "도시형생활주택",
  "오피스텔",
];

/** 주차 tieredHousehold 배정 가능한 용도 (전용면적 티어 보유) */
export const TIERED_USAGES: ParkingUsageCode[] = [
  "공동주택",
  "다세대연립",
  "오피스텔",
  "도시형생활주택",
];

/** 유닛 전용면적 프리셋 (시장 통용 타입) */
export const UNIT_PRESETS = [
  { sqm: 29, label: "29㎡ (원룸·도생)" },
  { sqm: 49, label: "49㎡ (투룸)" },
  { sqm: 59, label: "59㎡ (국민평형 소형)" },
  { sqm: 84, label: "84㎡ (국민평형)" },
] as const;
