// 비용·사업성 단일 계산원 (2026-09-18)
// 규모검토(computePlan) → 비용 수량 → 총사업비 → 수익 → 판정. 화면(비용·사업성 탭)과 PDF가 같이 쓴다.

import { calculateCost, type CostInputs, type CostResult } from "@/lib/calc/cost";
import { calculateProfit, type ProfitResult } from "@/lib/calc/profit";
import type { CostLinks } from "@/store/cost";
import type { PriceSource } from "@/store/profit";
import type { PlanResult } from "@/lib/plan/computePlan";
import { SQM_PER_PYEONG } from "@/lib/utils/area";
import { RESIDENTIAL_USAGES } from "@/lib/calc/schematic";
import type { ParkingUsageCode } from "@/lib/parking-standards";

export interface CostSnapshot {
  inputs: CostInputs;
  result: CostResult;
  /** 건축·부대비 소계(토지비 제외) = 지상+지하+주차+부대 */
  buildingSubtotal: number;
  /** 부담금 합계 */
  fees: number;
  /** 건축·부대비 + 부담금 (토지비·금융비 제외) */
  subtotalExLand: number;
  linkNotes: string[];
}

/**
 * 비용 탭 입력에 규모검토 수량을 연결한다.
 *  - 지상 연면적 = 지상 층별 바닥면적 합 (필로티 포함, 공사 대상 전부)
 *  - 지하 연면적 = 주차 계획으로 생긴 지하층 면적 합
 *  - 주차 설치비 대수 = 지하층 구조체 공사비에 포함되지 않은 대수만
 *    (지하가 연결돼 있으면 지하 주차는 지하 구조체·램프 공사비에 포함 → 지상 대수만. 중복 계상 방지)
 */
export function linkCostInputs(cost: CostInputs, linked: CostLinks, plan: PlanResult): { inputs: CostInputs; notes: string[] } {
  const inputs = { ...cost };
  const notes: string[] = [];
  if (linked.abovePyeong) {
    inputs.abovePyeong = plan.aboveGroundSumSqm / SQM_PER_PYEONG;
    notes.push("지상 연면적 = 규모검토 지상 층별 바닥면적 합");
  } else notes.push("지상 연면적 — 사용자 수동 입력(규모검토와 다를 수 있음)");
  if (linked.basementPyeong) {
    inputs.basementPyeong = plan.basement.totalSqm / SQM_PER_PYEONG;
    notes.push(`지하 연면적 = 주차 계획 지하 ${plan.basement.levels.length}개 층 합`);
  } else notes.push("지하 연면적 — 사용자 수동 입력(주차 계획과 다를 수 있음)");
  if (linked.parkingSpaces) {
    inputs.parkingSpaces = linked.basementPyeong
      ? plan.parking.groundSpaces
      : plan.parking.groundSpaces + plan.parking.basementSpaces;
    notes.push(
      linked.basementPyeong
        ? "주차 설치비 = 지상 주차 대수만 (지하 주차는 지하층 구조체·램프 공사비에 포함)"
        : "주차 설치비 = 법정 필요 대수 전체",
    );
  } else notes.push("주차 설치비 대수 — 사용자 수동 입력");
  return { inputs, notes };
}

export function computeCostSnapshot(cost: CostInputs, linked: CostLinks, plan: PlanResult): CostSnapshot {
  const { inputs, notes } = linkCostInputs(cost, linked, plan);
  const result = calculateCost(inputs);
  const buildingSubtotal = result.aboveCost + result.basementCost + result.parkingCost + result.softCost;
  const fees = result.farmCost + result.forestCost + result.devCharge;
  return { inputs, result, buildingSubtotal, fees, subtotalExLand: buildingSubtotal + fees, linkNotes: notes };
}

export interface ProfitStoreLike {
  landPricePerPyeong: number;
  landAcquisitionCost: number;
  revenueModel: "sales" | "rent" | "mixed";
  salesPricePerPyeong: number;
  salesRate: number;
  monthlyRentPerPyeong: number;
  deposit: number;
  annualOccupancy: number;
  ltvRatio: number;
  loanAmountOverride: number | null;
  annualInterestRate: number;
  loanPeriodYears: number;
  repaymentMethod: "bullet" | "amortized" | "graceThenAmortized";
  projectDurationMonths: number;
  salesStartMonth: number;
  sources: Partial<Record<string, PriceSource>>;
}

export type ProfitVerdict =
  | { kind: "hold"; title: string; reasons: string[] }
  | { kind: "loss"; title: string; reasons: string[] }
  | { kind: "risk"; title: string; reasons: string[] }
  | { kind: "ok"; title: string; reasons: string[] };

export interface ProfitSnapshot {
  result: ProfitResult;
  landAreaPyeong: number;
  /** 분양·임대 면적(평) — 현재는 지상 추정 연면적(공급면적 가정) */
  saleableAreaPyeong: number;
  saleableAreaBasis: string;
  loanAmountEok: number;
  /** 총사업비(이자 전) 대비 대출 비율 = LTC */
  ltcPct: number;
  interestNote: string;
  taxNote: string;
  /** 세전이익 ÷ (분양률 반영) 예상매출 */
  pretaxMarginOnRevenuePct: number;
  marginDefinition: string;
  irrDefinition: string;
  landPriceSource: PriceSource | "default";
  salesPriceSource: PriceSource | "default";
  verdict: ProfitVerdict;
}

const CORPORATE_TAX_ASSUMPTION = 22;

export function computeProfitSnapshot(p: {
  plan: PlanResult;
  cost: CostSnapshot;
  profit: ProfitStoreLike;
  usage: ParkingUsageCode;
  /** 확인되지 않은 규제가 남아 있는지 — 있으면 판정 보류 사유에 넣는다 */
  unresolvedRegulations?: string[];
}): ProfitSnapshot {
  const { plan, cost, profit } = p;
  const landAreaPyeong = plan.lotPy;
  const saleableAreaPyeong = plan.estimatedFarAreaSqm / SQM_PER_PYEONG;
  const landCostBase = landAreaPyeong * profit.landPricePerPyeong * 10000 * (1 + profit.landAcquisitionCost / 100);
  const baseProjectCost = landCostBase + cost.buildingSubtotal + cost.fees;
  const loanAmountEok =
    profit.loanAmountOverride !== null ? profit.loanAmountOverride : (baseProjectCost * (profit.ltvRatio / 100)) / 1e8;

  const result = calculateProfit({
    landAreaPyeong,
    totalBuildingCost: cost.buildingSubtotal,
    totalFees: cost.fees,
    salesAvailableAreaPyeong: saleableAreaPyeong,
    landPricePerPyeong: profit.landPricePerPyeong,
    landAcquisitionCost: profit.landAcquisitionCost,
    revenueModel: profit.revenueModel,
    salesPricePerPyeong: profit.salesPricePerPyeong,
    salesRate: profit.salesRate,
    monthlyRentPerPyeong: profit.monthlyRentPerPyeong,
    deposit: profit.deposit,
    annualOccupancy: profit.annualOccupancy,
    ltvRatio: profit.ltvRatio,
    loanAmountEok,
    annualInterestRate: profit.annualInterestRate,
    loanPeriodYears: profit.loanPeriodYears,
    repaymentMethod: profit.repaymentMethod,
    projectDurationMonths: profit.projectDurationMonths,
    salesStartMonth: profit.salesStartMonth,
  });

  const ltcPct = baseProjectCost > 0 ? (loanAmountEok * 1e8 * 100) / baseProjectCost : 0;
  const landPriceSource = (profit.sources.landPricePerPyeong ?? "default") as PriceSource | "default";
  const priceKey = profit.revenueModel === "rent" ? "monthlyRentPerPyeong" : "salesPricePerPyeong";
  const salesPriceSource = (profit.sources[priceKey] ?? "default") as PriceSource | "default";

  const reasons: string[] = [];
  if (landPriceSource === "default") reasons.push(`평당 토지가 ${profit.landPricePerPyeong.toLocaleString("ko-KR")}만원은 초기 기본값입니다 — 실제 매입가(또는 매도 호가)를 입력하세요.`);
  else if (landPriceSource !== "user") reasons.push("토지가가 통계 추정값입니다 — 실제 매입 조건이 확인되지 않았습니다.");
  if (salesPriceSource === "default")
    reasons.push(profit.revenueModel === "rent" ? "임대료는 초기 기본값입니다." : `평당 분양가 ${profit.salesPricePerPyeong.toLocaleString("ko-KR")}만원은 초기 기본값입니다.`);
  if (
    (salesPriceSource === "estimate-newbuild-res" || salesPriceSource === "estimate-schematic") &&
    !RESIDENTIAL_USAGES.includes(p.usage)
  ) reasons.push("주거 시세를 비주거 용도(업무·근생 등) 분양가로 쓰고 있습니다 — 해당 용도 비교사례로 바꾸세요.");
  for (const r of p.unresolvedRegulations ?? []) reasons.push(`미확인 규제: ${r} — 규모 자체가 바뀔 수 있습니다.`);

  // 제목은 화면·PDF가 별도로 보여주는 상태 배지(판정 보류/손실/여유 부족/이익 발생)를
  // 다시 반복하지 않는다 — "판정 보류 — 사업성 판정 보류 — 주요 가정 확인 전"처럼 같은 말이
  // 두 번 찍히던 문제. 배지는 kind로 그려지고, title은 배지에 없는 내용만 담는다.
  let verdict: ProfitVerdict;
  if (reasons.length > 0) {
    verdict = { kind: "hold", title: "주요 가정 확인 전", reasons };
  } else if (result.isLoss) {
    verdict = { kind: "loss", title: "분양가·공사비·토지가·대출 조건 재검토 필요", reasons: ["입력 가정을 그대로 적용하면 손실입니다."] };
  } else if (result.isHighRisk) {
    verdict = { kind: "risk", title: `손익분기 분양률 ${result.breakEvenSalesRate.toFixed(1)}%까지 — 민감도 확인 권장`, reasons: ["분양률이 조금만 떨어져도 손익분기 아래로 내려갈 수 있습니다."] };
  } else {
    verdict = { kind: "ok", title: "민감도(공사비·금리·분양률) 확인 권장", reasons: ["인허가·금융 조건은 별도 확인이 필요합니다."] };
  }

  return {
    result,
    landAreaPyeong,
    saleableAreaPyeong,
    saleableAreaBasis: "지상 추정 연면적 전체를 분양(공급)면적으로 가정 — 전용·공용·계약면적 구분 전",
    loanAmountEok,
    ltcPct,
    interestNote: `대출이자 = 대출금 × 연 ${profit.annualInterestRate}% × 사업기간 ${profit.projectDurationMonths}개월 (${profit.repaymentMethod === "bullet" ? "준공 시 일시상환 가정" : "상환방식 반영"}). 대출기간 ${profit.loanPeriodYears}년은 월 상환액 계산에만 씁니다.`,
    taxNote: `세금 = 세전이익 × ${CORPORATE_TAX_ASSUMPTION}% 단일 가정 — 법인·개인, 과세표준 구간, 거래 구조에 따라 달라집니다(미확인).`,
    pretaxMarginOnRevenuePct: result.totalRevenue > 0 ? (result.profitBeforeTax / result.totalRevenue) * 100 : 0,
    marginDefinition: "평당 마진율 = (평당 분양가 − 평당 사업비) ÷ 평당 분양가 — 완판(분양률 100%) 기준. 세전이익률은 분양률 반영 매출 기준.",
    irrDefinition: "자기자본 IRR — 착수 시 자기자본 투입, 준공(+분양 시점) 시 원금+순이익 1회 회수의 2시점 단순 모델. 월별 인출·분양대금 유입을 반영한 프로젝트 IRR 아님.",
    landPriceSource,
    salesPriceSource,
    verdict,
  };
}

export interface LandPriceScenario {
  key: "input" | "jiga" | "trade";
  label: string;
  /** 만원/평 */
  landPricePerPyeong: number;
  sourceLabel: string;
  totalProjectCost: number;
  netProfit: number;
  roe: number;
  breakEvenSalesRate: number;
}

/**
 * 토지가 가정값 게이트(C1) — 입력 토지가가 초기 기본값이면 IRR·ROE 큰 숫자 카드 하나만
 * 보여주는 대신, [입력 가정값 / 공시지가 기준 / 실거래 추정 기준] 3가지 토지가로 같은
 * 계산(calculateProfit)을 다시 돌려 시나리오 표로 보여준다. 계산 함수는 그대로 재사용하고
 * 토지 평당가만 바꾼다 — "계산 엔진은 바꾸지 않는다"는 원칙 유지.
 */
export function computeLandPriceScenarios(p: {
  plan: PlanResult;
  cost: CostSnapshot;
  profit: ProfitStoreLike;
  land?: { publicPricePerSqm?: number; landTrades?: { estimatedPrice: number; sampleCount: number } } | null;
}): LandPriceScenario[] | null {
  const landAreaPyeong = p.plan.lotPy;
  const saleableAreaPyeong = p.plan.estimatedFarAreaSqm / SQM_PER_PYEONG;
  if (landAreaPyeong <= 0) return null;

  const run = (landPricePerPyeong: number) => {
    const landCostBase = landAreaPyeong * landPricePerPyeong * 10000 * (1 + p.profit.landAcquisitionCost / 100);
    const baseProjectCost = landCostBase + p.cost.buildingSubtotal + p.cost.fees;
    const loanAmountEok = (baseProjectCost * (p.profit.ltvRatio / 100)) / 1e8;
    return calculateProfit({
      landAreaPyeong,
      totalBuildingCost: p.cost.buildingSubtotal,
      totalFees: p.cost.fees,
      salesAvailableAreaPyeong: saleableAreaPyeong,
      landPricePerPyeong,
      landAcquisitionCost: p.profit.landAcquisitionCost,
      revenueModel: p.profit.revenueModel,
      salesPricePerPyeong: p.profit.salesPricePerPyeong,
      salesRate: p.profit.salesRate,
      monthlyRentPerPyeong: p.profit.monthlyRentPerPyeong,
      deposit: p.profit.deposit,
      annualOccupancy: p.profit.annualOccupancy,
      ltvRatio: p.profit.ltvRatio,
      loanAmountEok,
      annualInterestRate: p.profit.annualInterestRate,
      loanPeriodYears: p.profit.loanPeriodYears,
      repaymentMethod: p.profit.repaymentMethod,
      projectDurationMonths: p.profit.projectDurationMonths,
      salesStartMonth: p.profit.salesStartMonth,
    });
  };

  const toRow = (
    key: LandPriceScenario["key"],
    label: string,
    landPricePerPyeong: number,
    sourceLabel: string,
  ): LandPriceScenario => {
    const r = run(landPricePerPyeong);
    return {
      key,
      label,
      landPricePerPyeong,
      sourceLabel,
      totalProjectCost: r.totalProjectCost,
      netProfit: r.netProfit,
      roe: r.roe,
      breakEvenSalesRate: r.breakEvenSalesRate,
    };
  };

  const scenarios: LandPriceScenario[] = [
    toRow("input", "입력 가정값", p.profit.landPricePerPyeong, "사용자 입력(초기 기본값 포함) — 실제 매입가 아님"),
  ];
  if (p.land?.publicPricePerSqm && p.land.publicPricePerSqm > 0) {
    const perPy = (p.land.publicPricePerSqm * SQM_PER_PYEONG) / 10000;
    scenarios.push(toRow("jiga", "공시지가 기준", perPy, "개별공시지가 환산값(시세 아님, 통상 시세보다 낮음)"));
  }
  if (p.land?.landTrades && p.land.landTrades.estimatedPrice > 0) {
    const perPy = (p.land.landTrades.estimatedPrice / landAreaPyeong) / 10000;
    scenarios.push(
      toRow("trade", "실거래 추정 기준", perPy, `인근 실거래 ${p.land.landTrades.sampleCount}건 중앙값 기반 추정`),
    );
  }
  return scenarios.length > 1 ? scenarios : null;
}
