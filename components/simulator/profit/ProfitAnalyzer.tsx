"use client";

import { useProfitSnapshot } from "@/lib/plan/useSnapshots";

import { Button } from "@/components/ui/button";
import { useProfitStore } from "@/store/profit";
import { LandCostInputs } from "./LandCostInputs";
import { SalesRevenueInputs } from "./SalesRevenueInputs";
import { LoanCalculator } from "./LoanCalculator";
import { ScheduleInputs } from "./ScheduleInputs";
import { ProfitResults } from "./ProfitResults";
import { NearbyLandPrice } from "./NearbyLandPrice";
import { MarketInsight } from "./MarketInsight";

const METHOD_LABEL: Record<string, string> = {
  bullet: "만기일시상환",
  amortized: "원리금균등상환",
  graceThenAmortized: "1년 거치 후 분할",
};

export function ProfitAnalyzer() {
  const profit = useProfitStore();
  // 규모검토 → 비용 → 사업성을 한 계산원(lib/plan/finance)으로 — PDF 와 같은 값
  const { costSnap, snap } = useProfitSnapshot();
  const landAreaPyeong = snap.landAreaPyeong;
  const salesAvailableAreaPyeong = snap.saleableAreaPyeong;
  const baseProjectCost =
    landAreaPyeong * profit.landPricePerPyeong * 10000 * (1 + profit.landAcquisitionCost / 100) +
    costSnap.subtotalExLand;
  const effectiveLoanAmountEok = snap.loanAmountEok;

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

      <NearbyLandPrice />
      <MarketInsight />

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
            snap={snap}
            loanMethodLabel={METHOD_LABEL[profit.repaymentMethod] ?? profit.repaymentMethod}
            loanPeriodYears={profit.loanPeriodYears}
          />
        </div>
      </div>
    </div>
  );
}
