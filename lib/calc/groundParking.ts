import type { ParkingMode } from "./parking";

export interface GroundParkingInput {
  placement: ParkingMode;
  /** 전체 주차대수 (기존 parking calc 결과) */
  spaces: number;
  /** 1대당 표준 면적(㎡) — 서울시 기준 30 (주차칸 12.5 + 차로·회전 17.5) */
  unitArea: number;
  /** 필로티 구조 여부 — true: 건축면적 제외(시행령 119조 1항 2호 가목 4), false: 벽체식 산입 */
  pilotiMode: boolean;
  /** 혼합 모드의 지상 비율(0-100, %) */
  groundRatioPct: number;
}

export interface GroundParkingResult {
  groundSpaces: number;
  basementSpaces: number;
  /** 1층 지상주차장 면적(㎡) = groundSpaces × unitArea */
  groundParkingArea: number;
  /** 필로티 구조가 실제 활성화됐는지 — pilotiMode + 지상주차 있을 때만 true.
   *  활성 시 시행령 119조 1항 4호에 따라 연면적에서 차감 가능. */
  isReducingFloor1: boolean;
  legalBasis: string;
}

/**
 * 지상/지하 주차 배치 산정 + 1층 차감 여부 판단.
 * 근거: 건축법 시행령 제119조 제1항 제2호 가목 (4) — 필로티 구조 주차장은 건축면적 산정에서 제외.
 */
export function calculateGroundParking(
  input: GroundParkingInput,
): GroundParkingResult {
  const { placement, spaces, unitArea, pilotiMode, groundRatioPct } = input;

  let groundSpaces = 0;
  let basementSpaces = 0;

  if (placement === "ground") {
    groundSpaces = spaces;
  } else if (placement === "basement") {
    basementSpaces = spaces;
  } else if (placement === "mixed") {
    const r = Math.max(0, Math.min(100, groundRatioPct)) / 100;
    groundSpaces = Math.ceil(spaces * r);
    basementSpaces = Math.max(0, spaces - groundSpaces);
  }
  // 'none': 둘 다 0 유지

  const groundParkingArea =
    Number.isFinite(unitArea) && unitArea > 0 ? groundSpaces * unitArea : 0;
  const isReducingFloor1 = pilotiMode && groundSpaces > 0;

  const legalBasis = isReducingFloor1
    ? "건축법 시행령 제119조 제1항 제4호: 필로티 구조의 주차장은 연면적에서 제외"
    : groundSpaces > 0
      ? "벽체식 지상주차장은 연면적에 산입 (필로티 제외 규정 미적용)"
      : "지상주차 없음 — 1층 분해 해당 없음";

  return {
    groundSpaces,
    basementSpaces,
    groundParkingArea,
    isReducingFloor1,
    legalBasis,
  };
}

/**
 * 1층 영업 가능 면적 — 1층 건축면적에서 지상주차 점유면적을 제외.
 * 필로티/벽체식과 무관하게 주차로 잠긴 만큼은 영업 불가.
 * (필로티의 법적 효과는 별도로 `applyPilotiDeduction`이 연면적에서 차감.)
 */
export function calculateFloor1Indoor(
  buildingArea: number,
  groundParkingArea: number,
): number {
  if (!Number.isFinite(buildingArea) || buildingArea <= 0) return 0;
  // 주차가 1층 건축면적을 초과해도 1층 영업 가능 면적은 0 미만이 될 수 없음.
  // 초과분은 2층 이상 또는 지하로 분산되어야 하지만 본 시뮬레이터는 단순화.
  return Math.max(0, buildingArea - groundParkingArea);
}

/**
 * 필로티 적용 시 연면적 차감.
 * 건축법 시행령 119조 1항 4호 — 필로티 구조 주차장은 연면적에서 제외.
 * 활성화 조건은 isPilotiActive (= pilotiMode && groundParkingArea > 0).
 */
export function applyPilotiDeduction(
  floorArea: number,
  groundParkingArea: number,
  isPilotiActive: boolean,
): number {
  if (!isPilotiActive) return floorArea;
  return Math.max(0, floorArea - groundParkingArea);
}
