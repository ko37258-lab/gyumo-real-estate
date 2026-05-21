import {
  type AreaTier,
  type ParkingStandard,
  type ProgressiveSpec,
  SQM_PER_SPACE,
} from "@/lib/parking-standards";

export type AreaInput = {
  /** 산정 대상 시설면적(㎡) */
  totalAreaSqm: number;
};

export type ProgressiveInput = AreaInput & {
  /** 사용자 편집 가능: 시작 임계값 N㎡, 시작 대수 M대, 가산 P㎡당 1대 */
  spec: ProgressiveSpec;
};

export type TieredInput = {
  /** 각 구간의 세대수. tiers 길이와 같아야 함. */
  households: number[];
  /** 사용자 편집 가능: 각 구간의 세대당 비율 */
  ratios: number[];
};

export type ParkingCalcInput =
  | { mode: "area"; areaPerSpace: number; input: AreaInput }
  | { mode: "progressive"; input: ProgressiveInput }
  | { mode: "tieredHousehold"; tiers: AreaTier[]; input: TieredInput };

export type ParkingCalcResult = {
  spaces: number;
  /** 소수점 올리기 전 원시값(소수점 1자리) — 사용자 디버깅·검증용 */
  rawSpaces: number;
};

/** 단독주택 누진식. baseStart 이하 0대, firstUpTo 이하 firstSpaces 대, 초과분 addPerArea㎡당 +1대. */
export function calcProgressive(
  totalAreaSqm: number,
  spec: ProgressiveSpec,
): ParkingCalcResult {
  if (totalAreaSqm <= spec.baseStart) {
    return { spaces: 0, rawSpaces: 0 };
  }
  if (totalAreaSqm <= spec.firstUpTo) {
    return { spaces: spec.firstSpaces, rawSpaces: spec.firstSpaces };
  }
  const extra = totalAreaSqm - spec.firstUpTo;
  const raw = spec.firstSpaces + extra / spec.addPerArea;
  return { spaces: Math.ceil(raw), rawSpaces: raw };
}

/** 면적 기준. N㎡당 1대 → 면적/N 절상. */
export function calcArea(
  totalAreaSqm: number,
  areaPerSpace: number,
): ParkingCalcResult {
  if (areaPerSpace <= 0 || totalAreaSqm <= 0) {
    return { spaces: 0, rawSpaces: 0 };
  }
  const raw = totalAreaSqm / areaPerSpace;
  return { spaces: Math.ceil(raw), rawSpaces: raw };
}

/** 공동주택 구간별 세대당. 각 구간 세대수 × 세대당 비율의 가중합 → 절상. */
export function calcTieredHousehold(
  tiers: AreaTier[],
  households: number[],
  ratios: number[],
): ParkingCalcResult {
  let raw = 0;
  const len = Math.min(tiers.length, households.length, ratios.length);
  for (let i = 0; i < len; i++) {
    const h = Number.isFinite(households[i]) ? households[i] : 0;
    const r = Number.isFinite(ratios[i]) ? ratios[i] : 0;
    raw += h * r;
  }
  return { spaces: Math.ceil(raw), rawSpaces: raw };
}

/** 한 standard에 대해 시행령값과 사용자값 둘 다 산정. */
export function computeBoth(params: {
  standard: ParkingStandard;
  decreeInput: ParkingCalcInput;
  appliedInput: ParkingCalcInput;
}): { decree: ParkingCalcResult; applied: ParkingCalcResult } {
  return {
    decree: compute(params.decreeInput),
    applied: compute(params.appliedInput),
  };
}

export function compute(input: ParkingCalcInput): ParkingCalcResult {
  switch (input.mode) {
    case "area":
      return calcArea(input.input.totalAreaSqm, input.areaPerSpace);
    case "progressive":
      return calcProgressive(input.input.totalAreaSqm, input.input.spec);
    case "tieredHousehold":
      return calcTieredHousehold(
        input.tiers,
        input.input.households,
        input.input.ratios,
      );
  }
}

/** 주차 면적(㎡) — 1대당 약 25㎡ */
export function parkingAreaSqm(spaces: number): number {
  return spaces * SQM_PER_SPACE;
}

/** 1층 건축면적 대비 주차면적 비율 (0~∞, 1 초과면 1층에 다 못 들어감) */
export function parkingToFootprintRatio(
  parkingArea: number,
  footprint: number,
): number {
  if (footprint <= 0) return 0;
  return parkingArea / footprint;
}

/** 지하주차장 권장 여부 — 1층 건축면적 대비 60% 이상이면 지하 권장. */
export function recommendBasement(
  parkingArea: number,
  footprint: number,
): boolean {
  return parkingToFootprintRatio(parkingArea, footprint) > 0.6;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 주차장 배치(형식) — 지상/지하/혼합/없음 + 분양 가능 연면적 계산.
 * 근거: 건축법 시행령 119조 1항 4호 — 지하층은 연면적 산정에서 제외.
 *      지상주차장 면적은 연면적 산입(필로티 차량통행·주차 부분은 제외 가능 — 본 시뮬레이터는 단순화하여 모두 산입).
 * ────────────────────────────────────────────────────────────────────────── */
export type ParkingMode = "none" | "basement" | "ground" | "mixed";

/** 지상 주차장 면적(㎡) — 전체 필요 주차면적 중 지상 비중. */
export function groundParkingSqm(
  totalParkingArea: number,
  mode: ParkingMode,
  groundRatioPct: number,
): number {
  switch (mode) {
    case "ground":
      return totalParkingArea;
    case "basement":
    case "none":
      return 0;
    case "mixed": {
      const r = Math.max(0, Math.min(100, groundRatioPct)) / 100;
      return totalParkingArea * r;
    }
  }
}

/** 지하 주차장 면적(㎡). */
export function basementParkingSqm(
  totalParkingArea: number,
  mode: ParkingMode,
  groundRatioPct: number,
): number {
  return totalParkingArea - groundParkingSqm(totalParkingArea, mode, groundRatioPct);
}

/** 분양 가능 연면적 — 법정 연면적에서 지상주차장 면적만 차감.
 *  지하주차장은 시행령 119조 1항 4호에 따라 연면적 자체에 산입되지 않으므로 차감 없음. */
export function salableGfaSqm(
  legalGfa: number,
  totalParkingArea: number,
  mode: ParkingMode,
  groundRatioPct: number,
): number {
  return Math.max(0, legalGfa - groundParkingSqm(totalParkingArea, mode, groundRatioPct));
}

/** 지상주차장이 1층 건축면적을 차지하는 층수 (필로티 층수). 1을 넘기면 2층 일부까지. */
export function pilotisFloors(
  totalParkingArea: number,
  mode: ParkingMode,
  groundRatioPct: number,
  footprint: number,
): number {
  if (footprint <= 0) return 0;
  return groundParkingSqm(totalParkingArea, mode, groundRatioPct) / footprint;
}

/** 지하주차장 필요 층수 추정. 1개 층은 footprint 면적을 가진다고 단순화. */
export function basementFloors(
  totalParkingArea: number,
  mode: ParkingMode,
  groundRatioPct: number,
  footprint: number,
): number {
  if (footprint <= 0) return 0;
  return basementParkingSqm(totalParkingArea, mode, groundRatioPct) / footprint;
}
