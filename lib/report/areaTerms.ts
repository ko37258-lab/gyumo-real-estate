// 면적 명칭 단일 출처 — 화면(ResultMetrics)·한장 보고서(onePager)·상세 보고서(ReportDocument)가
// 전부 같은 라벨 문자열을 쓰게 한다. (2026-10-05)
//
// 배경: 한장 보고서 KPI 카드가 "지상 연면적(추정)"이라는 이름으로 실제로는
// plan.estimatedFarAreaSqm(= 입력 조건 기준 추정 연면적, 지상 부속주차 제외)을 보여주고
// 있었다 — 다른 화면·상세 보고서는 같은 값을 전부 "입력 조건 기준 추정 연면적"으로 부른다.
// 값은 그대로 두고 이름만 여기서 통일한다. 정의는 lib/plan/computePlan.ts 주석이 정본.
export const AREA_TERMS = {
  /** 1층 건축면적 (건폐율 적용 결과) — plan.footprintSqm */
  buildingFootprint: "1층 건축면적",
  /** 지상 층별 바닥면적 합(필로티·주차 포함, 공사 대상 전부) — plan.aboveGroundSumSqm */
  aboveGroundGfa: "지상 연면적",
  /** 지하 층별 바닥면적 합 — plan.basement.totalSqm */
  basementGfa: "지하 연면적",
  /** 총연면적(지상+지하 추정) — plan.totalFloorAreaSqm */
  totalGfa: "총연면적 (지상+지하 추정)",
  /** 대지면적 × 용적률 산술값(허가 가능 규모 아님) — plan.farCapSqm */
  farCapGfa: "용적률 산정 연면적 상한",
  /** 지상 바닥면적 합에서 부속 주차면적 제외한 용적률 산정용 추정치 — plan.estimatedFarAreaSqm */
  farEstimateGfa: "입력 조건 기준 추정 연면적",
  /** 분양·임대 면적 산정 기준 문구 (finance.ts saleableAreaBasis) */
  saleableArea: "분양·임대 면적",
} as const;

export type AreaTermKey = keyof typeof AREA_TERMS;
