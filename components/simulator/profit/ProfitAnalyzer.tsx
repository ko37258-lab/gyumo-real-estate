"use client";

import { Button } from "@/components/ui/button";
import { useSimulatorStore } from "@/store/simulator";
import { useCostStore } from "@/store/cost";
import { useProfitStore } from "@/store/profit";
import { calculateCost } from "@/lib/calc/cost";
import { calculateProfit } from "@/lib/calc/profit";
import { LandCostInputs } from "./LandCostInputs";
import { SalesRevenueInputs } from "./SalesRevenueInputs";
import { LoanCalculator } from "./LoanCalculator";
import { ScheduleInputs } from "./ScheduleInputs";
import { ProfitResults } from "./ProfitResults";

const METHOD_LABEL: Record<string, string> = {
  bullet: "만기일시상환",
  amortized: "원리금균등상환",
  graceThenAmortized: "1년 거치 후 분할",
};

export function ProfitAnalyzer() {
  const lotPy = useSimulatorStore((s) => s.lotPy);
  const cost = useCostStore();
  const profit = useProfitStore();

  const landAreaPyeong = lotPy;
  const salesAvailableAreaPyeong = cost.abovePyeong; // 지상 연면적 = 분양 가능

  // 비용 시뮬레이션 결과 (이미 계산되어 있음)
  const costResult = calculateCost(cost);
  const totalBuildingCost =
    costResult.aboveCost +
    costResult.basementCost +
    costResult.parkingCost +
    costResult.softCost;
  const totalFees =
    costResult.farmCost + costResult.forestCost + costResult.devCharge;

  // 토지비 (사업성 입력 기반)
  const landCost =
    landAreaPyeong *
    profit.landPricePerPyeong *
    10000 *
    (1 + profit.landAcquisitionCost / 100);

  // 베이스 사업비 = 토지 + 건축 + 부담금 (이자 제외)
  const baseProjectCost = landCost + totalBuildingCost + totalFees;

  // 실효 대출액 — override 있으면 사용자값, 없으면 LTV × baseProjectCost
  const effectiveLoanAmountEok =
    profit.loanAmountOverride !== null
      ? profit.loanAmountOverride
      : (baseProjectCost * (profit.ltvRatio / 100)) / 1_0000_0000;

  const result = calculateProfit({
    landAreaPyeong,
    totalBuildingCost,
    totalFees,
    salesAvailableAreaPyeong,
    landPricePerPyeong: profit.landPricePerPyeong,
    landAcquisitionCost: profit.landAcquisitionCost,
    revenueModel: profit.revenueModel,
    salesPricePerPyeong: profit.salesPricePerPyeong,
    salesRate: profit.salesRate,
    monthlyRentPerPyeong: profit.monthlyRentPerPyeong,
    deposit: profit.deposit,
    annualOccupancy: profit.annualOccupancy,
    ltvRatio: profit.ltvRatio,
    loanAmountEok: effectiveLoanAmountEok,
    annualInterestRate: profit.annualInterestRate,
    loanPeriodYears: profit.loanPeriodYears,
    repaymentMethod: profit.repaymentMethod,
    projectDurationMonths: profit.projectDurationMonths,
    salesStartMonth: profit.salesStartMonth,
  });

  // 표시용 LTV — override 모드면 effectiveLoanAmount를 다시 LTV로 환산
  const displayLtv =
    profit.loanAmountOverride !== null && baseProjectCost > 0
      ? Math.min(
          100,
          (profit.loanAmountOverride * 1_0000_0000 * 100) / baseProjectCost,
        )
      : profit.ltvRatio;

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            사업성 분석 (Phase 5)
          </h2>
          <p className="text-[12px] text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            규모·비용 입력값에 토지비·수익·대출·일정을 더해 IRR·ROE·손익분기를
            계산합니다. 수치는 사업타당성 사전검토용이며 실제 재무 계획·금융기관
            심사 자료는 별도 작성 권장.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => profit.reset()}>
          기본값으로
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(360px,440px)] gap-4">
        <div className="space-y-4">
          <LandCostInputs landAreaPyeong={landAreaPyeong} />
          <SalesRevenueInputs
            salesAvailableAreaPyeong={salesAvailableAreaPyeong}
          />
          <LoanCalculator
            baseProjectCost={baseProjectCost}
            effectiveLoanAmountEok={effectiveLoanAmountEok}
          />
          <ScheduleInputs />
        </div>
        <div className="lg:sticky lg:top-4 lg:self-start">
          <ProfitResults
            result={result}
            ltvRatio={displayLtv}
            loanMethodLabel={METHOD_LABEL[profit.repaymentMethod] ?? profit.repaymentMethod}
            loanPeriodYears={profit.loanPeriodYears}
          />
        </div>
      </div>
    </div>
  );
}
