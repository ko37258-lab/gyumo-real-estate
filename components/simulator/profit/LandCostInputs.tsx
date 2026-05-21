"use client";

import { SliderInputPair } from "@/components/ui/slider-input-pair";
import { useProfitStore } from "@/store/profit";
import { formatEok } from "@/lib/calc/cost";

export function LandCostInputs({
  landAreaPyeong,
}: {
  landAreaPyeong: number;
}) {
  const s = useProfitStore();

  const landCostRaw = landAreaPyeong * s.landPricePerPyeong * 10000;
  const landCostWithFee = landCostRaw * (1 + s.landAcquisitionCost / 100);

  return (
    <section className="bg-card border border-border rounded-lg p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">💰 토지비</h3>
        <span className="text-[10.5px] text-muted-foreground">
          대지 {landAreaPyeong.toLocaleString("ko-KR")}평 기준
        </span>
      </header>

      <SliderInputPair
        label="평당 토지가"
        value={s.landPricePerPyeong}
        onChange={(v) => s.set("landPricePerPyeong", v)}
        min={100}
        max={30000}
        step={100}
        unit="만원/평"
        hint="💡 강남·송파 8,000~20,000 / 서울 일반 3,000~6,000 / 수도권 1,500~3,500 만원/평"
        inputMin={0}
        inputMax={200000}
        inputWidthClass="w-24"
      />

      <SliderInputPair
        label="취득세·등기·중개 등 부대비"
        value={s.landAcquisitionCost}
        onChange={(v) => s.set("landAcquisitionCost", v)}
        min={0}
        max={20}
        step={0.5}
        unit="%"
        hint="취득세 4.6% + 등기·중개·법무 ~0.5% = 약 5%"
        inputMin={0}
        inputMax={50}
      />

      <div className="rounded-md bg-secondary/50 border border-border px-3 py-2 text-[12.5px] space-y-1">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground">기본 토지비</span>
          <span className="font-medium tabular-nums">
            {formatEok(landCostRaw)}
          </span>
        </div>
        <div className="flex items-baseline justify-between font-semibold border-t border-border/60 pt-1">
          <span>총 토지비 (부대비 포함)</span>
          <span className="text-[#993C1D] tabular-nums">
            {formatEok(landCostWithFee)}
          </span>
        </div>
      </div>
    </section>
  );
}
