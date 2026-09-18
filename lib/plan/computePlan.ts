// 규모검토 단일 계산원 (2026-09-18)
//
// 왜 필요한가: 규모검토·2D·3D·주차·비용·사업성·PDF 가 각자 같은 숫자를 다시 계산하면서
//   ① 대지면적이 "정수 평"을 거쳐 줄어들고(394.8㎡ → 119평 → 393.39㎡)
//   ② 주차 1대당 면적이 곳마다 25㎡/30㎡ 로 달랐고
//   ③ 층수는 환산층수(13.3)에 층고를 곱해 높이를 냈고
//   ④ 지하층을 그리면서 비용에는 지하 0㎡ 가 들어갔다.
// 이 모듈 하나가 원자료 → 층별 계획 → 주차 → 지하층 → 비용 수량까지 계산하고,
// 화면·3D·PDF 는 이 결과 객체만 읽는다.
//
// 용어(고객에게 보이는 이름과 1:1):
//   - 용적률 산정 연면적 상한   = 대지면적 × 용적률 (입력 조건의 산술값, 허가 가능 규모 아님)
//   - 입력 조건 기준 추정 연면적 = 지상 층별 바닥면적 합(일조 반영) − 지상 부속 주차면적 (영 119조①4호 나목, 용적률 산정용)
//   - 총연면적(추정)            = 지상 바닥면적 합 − 필로티 주차(①3호 다목 불산입) + 지하층 바닥면적 합
//   - 환산층수                  = 용적률 ÷ 건폐율 (기준층 면적으로 나눈 값)
//   - 실제 층수                 = 바닥이 있는 층의 개수 (최상층이 부분층이어도 1개 층)

import { floorAreas, type ShapeForGfa } from "@/lib/report/floorTable";
import { type SunlightRule } from "@/lib/calc/sunlight";
import {
  calcArea,
  calcProgressive,
  calcTieredHousehold,
  type ParkingMode,
} from "@/lib/calc/parking";
import {
  PARKING_STANDARDS,
  type ParkingUsageCode,
  type ProgressiveSpec,
} from "@/lib/parking-standards";
import { SQM_PER_PYEONG } from "@/lib/utils/area";

export type ValueStatus = "official" | "input" | "estimate" | "unverified";

export const VALUE_STATUS_LABEL: Record<ValueStatus, string> = {
  official: "공식자료 조회값",
  input: "사용자 입력값",
  estimate: "계산 추정값",
  unverified: "미확인",
};

export interface PlanInputs {
  lotSqm: number;
  covPct: number;
  farPct: number;
  /** 용도지역이 정북 일조 대상인지 × 사용자 토글 */
  sunlightOn: boolean;
  sunlightRule: SunlightRule;
  shape?: ShapeForGfa | null;
  /** 1층 층고(m) */
  floor1HeightM: number;
  /** 기준층 층고(m) */
  typicalFloorHeightM: number;

  parkingUsage: ParkingUsageCode;
  parkingAreaPerSpace: number;
  parkingProgressiveSpec: ProgressiveSpec;
  parkingHouseholds: number[];
  parkingTierRatios: number[];
  parkingMode: ParkingMode;
  parkingGroundRatio: number;
  /** 주차 1대당 계획 소요면적(㎡) — 주차칸 + 차로·회전. 화면·2D·3D·PDF 공통 계수 */
  parkingUnitArea: number;
  parkingPilotiMode: boolean;
}

export interface PlanFloor {
  floor: number;
  areaSqm: number;
  /** 바닥면적 비율(최상층 부분층이면 1 미만) — 높이에는 쓰지 않는다 */
  portion: number;
  /** 이 층의 층고(m) */
  storyHeightM: number;
  /** 지표면에서 이 층 상단까지(m) */
  topM: number;
  legalSetbackM: number;
}

export interface PlanBasementLevel {
  level: number;
  areaSqm: number;
}

export interface PlanParking {
  usageLabel: string;
  basisLabel: string;
  /** 산정 모수(㎡) — 용적률 산정 연면적 상한 기준 */
  baseAreaSqm: number;
  rawSpaces: number;
  /** 법정 필요 대수 (끝수 처리 후) */
  requiredSpaces: number;
  roundingNote: string;
  unitAreaSqm: number;
  /** 면적계수 추정 주차장 계획면적 = 필요 대수 × 1대당 면적 */
  planAreaSqm: number;
  groundSpaces: number;
  basementSpaces: number;
  groundAreaSqm: number;
  basementAreaSqm: number;
  pilotiActive: boolean;
  /** 실제 배치(램프·차로·회전·기둥·코어) 검토 여부 — 이 도구는 면적계수 추정만 한다 */
  layoutVerified: false;
  warnings: string[];
}

export interface PlanResult {
  lotSqm: number;
  lotPy: number;
  footprintSqm: number;
  /** 용적률 산정 연면적 상한 = 대지 × 용적률 (산술값) */
  farCapSqm: number;
  /** 환산층수 = 용적률 ÷ 건폐율 */
  floorsEquivalent: number;
  /** 실제 층수(지상) */
  floorCount: number;
  topFloorPortion: number;
  floors: PlanFloor[];
  heightM: number;
  heightNote: string;
  /** 지상 층별 바닥면적 합(필로티 차감 전) */
  aboveGroundSumSqm: number;
  /** 입력 조건 기준 추정 연면적 (용적률 산정용, 지상 부속 주차면적 제외) */
  estimatedFarAreaSqm: number;
  sunlightLossPct: number;
  parking: PlanParking;
  basement: {
    levels: PlanBasementLevel[];
    totalSqm: number;
    /** 지하 1개 층 계획면적 가정(㎡) */
    levelCapacitySqm: number;
    note: string;
  };
  /** 총연면적(추정) = 지상 층별 바닥면적 합 + 지하 */
  totalFloorAreaSqm: number;
  /** 1층 총바닥면적(건축면적과 같음, 주차 차감 전) */
  floor1GrossSqm: number;
  /** 1층에서 지상주차가 차지하지 않는 바닥면적 — 코어·공용·설비 미반영 */
  floor1NonParkingSqm: number;
}

const MAX_BASEMENT_LEVELS = 6;

export function computeParking(p: PlanInputs, baseAreaSqm: number): PlanParking {
  const std = PARKING_STANDARDS[p.parkingUsage];
  const calc =
    std.mode === "area"
      ? calcArea(baseAreaSqm, p.parkingAreaPerSpace)
      : std.mode === "progressive"
        ? calcProgressive(baseAreaSqm, p.parkingProgressiveSpec)
        : calcTieredHousehold(std.seoulTiers, p.parkingHouseholds, p.parkingTierRatios);
  const required = calc.spaces;
  const roundingNote =
    std.mode === "tieredHousehold"
      ? `세대 기준 산정 ${calc.rawSpaces.toFixed(2)}대 → ${required}대 (소수점 올림 — 주택건설기준 산정 관행, 적용 조례 확인 필요)`
      : calc.rawSpaces < 1 && calc.rawSpaces > 0
        ? `${calc.rawSpaces.toFixed(2)}대 → 0대 (별표1 비고 6: 총 1대 미만은 0대)`
        : `${calc.rawSpaces.toFixed(2)}대 → ${required}대 (별표1 비고 6: 소수점 0.5 이상만 1대로 봄)`;
  const basisLabel =
    std.mode === "area"
      ? `${std.label} — 시설면적 ${p.parkingAreaPerSpace}㎡당 1대`
      : std.mode === "progressive"
        ? `${std.label} — 규모 누진 기준 (주차장법 시행령 별표1)`
        : `${std.label} — 세대 규모별 기준`;

  const unit = Number.isFinite(p.parkingUnitArea) && p.parkingUnitArea > 0 ? p.parkingUnitArea : 30;
  let groundSpaces = 0;
  let basementSpaces = 0;
  if (p.parkingMode === "ground") groundSpaces = required;
  else if (p.parkingMode === "basement") basementSpaces = required;
  else if (p.parkingMode === "mixed") {
    const r = Math.max(0, Math.min(100, p.parkingGroundRatio)) / 100;
    groundSpaces = Math.ceil(required * r);
    basementSpaces = Math.max(0, required - groundSpaces);
  }
  const warnings: string[] = [
    "면적계수 추정입니다 — 램프·차로 폭·회전반경·기둥·코어·설비 공간을 실제 배치로 검토하지 않았습니다.",
  ];
  if (p.parkingMode === "none" && required > 0) {
    warnings.unshift(
      `'주차 없음'은 배치를 가정하지 않은 것일 뿐, 법정 설치의무 ${required}대는 그대로 남아 있습니다. 인근 설치·설치비 납부 등 대체 수단을 확인하세요.`,
    );
  }
  return {
    usageLabel: std.label,
    basisLabel,
    baseAreaSqm,
    rawSpaces: calc.rawSpaces,
    requiredSpaces: required,
    roundingNote,
    unitAreaSqm: unit,
    planAreaSqm: required * unit,
    groundSpaces,
    basementSpaces,
    groundAreaSqm: groundSpaces * unit,
    basementAreaSqm: basementSpaces * unit,
    pilotiActive: p.parkingPilotiMode && groundSpaces > 0,
    layoutVerified: false,
    warnings,
  };
}

export function computePlan(p: PlanInputs): PlanResult {
  const lotSqm = Math.max(0, p.lotSqm || 0);
  const footprintSqm = (lotSqm * p.covPct) / 100;
  const farCapSqm = (lotSqm * p.farPct) / 100;
  const effCov = Math.min(p.covPct, p.farPct);
  const floorsEquivalent = effCov > 0 ? p.farPct / effCov : 0;
  const h1 = p.floor1HeightM > 0 ? p.floor1HeightM : 3.5;
  const ht = p.typicalFloorHeightM > 0 ? p.typicalFloorHeightM : 3.5;

  const raw = floorAreas({
    bldAreaSqm: footprintSqm,
    floors: floorsEquivalent,
    floorHeightM: ht,
    floor1HeightM: h1,
    sunlightOn: p.sunlightOn,
    shape: p.shape ?? null,
    rule: p.sunlightRule,
  });
  const rows = raw.filter((r) => r.areaSqm > 0.01);
  const floors: PlanFloor[] = rows.map((r) => {
    const storyHeightM = r.floor === 1 ? h1 : ht;
    return {
      floor: r.floor,
      areaSqm: r.areaSqm,
      portion: r.portion,
      storyHeightM,
      topM: h1 + (r.floor - 1) * ht,
      legalSetbackM: r.legalSetbackM,
    };
  });
  const floorCount = floors.length;
  const heightM = floorCount > 0 ? floors[floorCount - 1].topM : 0;
  const topFloorPortion = floorCount > 0 ? floors[floorCount - 1].portion : 0;
  const aboveGroundSumSqm = floors.reduce((s, f) => s + f.areaSqm, 0);

  const parking = computeParking(p, farCapSqm);
  // 건축법 시행령 제119조①4호 나목: 용적률 산정 시 지상층의 (부속용도) 주차용 면적 제외 — 필로티·벽체식 공통.
  //   필로티(①3호 다목 요건 충족)는 아예 바닥면적 불산입 → 총연면적에서도 빠진다.
  const estimatedFarAreaSqm = Math.max(0, aboveGroundSumSqm - parking.groundAreaSqm);
  const pilotiExcludedSqm = parking.pilotiActive ? parking.groundAreaSqm : 0;
  const sunlightLossPct = farCapSqm > 0 ? Math.max(0, (1 - aboveGroundSumSqm / farCapSqm) * 100) : 0;

  const levelCapacitySqm = footprintSqm;
  const levels: PlanBasementLevel[] = [];
  let rem = parking.basementAreaSqm;
  let lv = 1;
  while (rem > 0.5 && lv <= MAX_BASEMENT_LEVELS && levelCapacitySqm > 0) {
    const a = Math.min(levelCapacitySqm, rem);
    levels.push({ level: lv, areaSqm: a });
    rem -= a;
    lv++;
  }
  const basementTotal = levels.reduce((s, l) => s + l.areaSqm, 0);
  const basementNote =
    rem > 0.5
      ? `지하 ${MAX_BASEMENT_LEVELS}개 층으로도 주차 계획면적을 다 담지 못합니다(부족 ${Math.round(rem)}㎡). 배치 재검토가 필요합니다.`
      : "지하 1개 층 = 건축면적 가정 · 주차 계획면적만 반영(기계·전기실·코어 등 별도)";

  return {
    lotSqm,
    lotPy: lotSqm / SQM_PER_PYEONG,
    footprintSqm,
    farCapSqm,
    floorsEquivalent,
    floorCount,
    topFloorPortion,
    floors,
    heightM,
    heightNote: `1층 ${h1}m + 기준층 ${ht}m × ${Math.max(0, floorCount - 1)}개 층 · 지표면 기준 · 옥탑·파라펫·설비 높이 제외`,
    aboveGroundSumSqm,
    estimatedFarAreaSqm,
    sunlightLossPct,
    parking,
    basement: { levels, totalSqm: basementTotal, levelCapacitySqm, note: basementNote },
    totalFloorAreaSqm: aboveGroundSumSqm - pilotiExcludedSqm + basementTotal,
    floor1GrossSqm: footprintSqm,
    floor1NonParkingSqm: Math.max(0, footprintSqm - parking.groundAreaSqm),
  };
}

/** "지상 14층(최상층 부분층 33%)" — 실제 층수 표기 */
export function floorLabel(plan: Pick<PlanResult, "floorCount" | "topFloorPortion">): string {
  if (plan.floorCount <= 0) return "-";
  const partial = plan.topFloorPortion < 0.999;
  return partial
    ? `지상 ${plan.floorCount}층 (최상층 부분층 ${Math.round(plan.topFloorPortion * 100)}%)`
    : `지상 ${plan.floorCount}층`;
}
