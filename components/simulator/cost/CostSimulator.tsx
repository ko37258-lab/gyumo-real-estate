"use client";

import { BasicCostInputs } from "./BasicCostInputs";
import { FarmlandFee } from "./FarmlandFee";
import { ForestFee } from "./ForestFee";
import { DevelopmentFee } from "./DevelopmentFee";
import { CostResults } from "./CostResults";
import { useCostStore } from "@/store/cost";
import { Button } from "@/components/ui/button";

export function CostSimulator() {
  const reset = useCostStore((s) => s.reset);
  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            비용·부담금 시뮬레이션
          </h2>
          <p className="text-[12px] text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            기본 건축비 + 농지·산지·개발 3종 부담금을 직접 조정해 보세요. 슬라이더와
            입력은 실시간 동기화됩니다. 수업·사전검토용이며 최종 금액은 관할청
            확인이 필요합니다.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reset}>
          기본값으로
        </Button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(360px,440px)] gap-4">
        <div className="space-y-4">
          <BasicCostInputs />
          <FarmlandFee />
          <ForestFee />
          <DevelopmentFee />
        </div>
        <div className="lg:sticky lg:top-4 lg:self-start">
          <CostResults />
        </div>
      </div>
    </div>
  );
}
