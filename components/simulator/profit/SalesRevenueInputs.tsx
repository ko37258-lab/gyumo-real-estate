"use client";

import { SliderInputPair } from "@/components/ui/slider-input-pair";
import { Label } from "@/components/ui/label";
import { useProfitStore } from "@/store/profit";
import type { RevenueModel } from "@/lib/calc/profit";

const MODELS: { v: RevenueModel; label: string; desc: string }[] = [
  { v: "sales", label: "분양", desc: "전체 매각" },
  { v: "rent", label: "임대", desc: "월세 + 보증금" },
  { v: "mixed", label: "혼합", desc: "절반 분양·임대" },
];

export function SalesRevenueInputs({
  salesAvailableAreaPyeong,
}: {
  salesAvailableAreaPyeong: number;
}) {
  const s = useProfitStore();
  const isSales = s.revenueModel === "sales" || s.revenueModel === "mixed";
  const isRent = s.revenueModel === "rent" || s.revenueModel === "mixed";

  return (
    <section className="bg-card border border-border rounded-lg p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">📈 수익 가정</h3>
        <span className="text-[10.5px] text-muted-foreground">
          분양 가능 {salesAvailableAreaPyeong.toLocaleString("ko-KR")}평
        </span>
      </header>

      <div>
        <Label className="text-[11px] text-muted-foreground mb-2 block">
          수익 모델
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {MODELS.map((m) => (
            <button
              key={m.v}
              type="button"
              onClick={() => s.set("revenueModel", m.v)}
              className={`text-left rounded-md px-3 py-2 border transition ${
                s.revenueModel === m.v
                  ? "border-[var(--info)] bg-[var(--info-bg)]"
                  : "border-border bg-background hover:bg-secondary"
              }`}
            >
              <div
                className={`text-[12.5px] font-medium ${
                  s.revenueModel === m.v ? "text-[var(--info)]" : ""
                }`}
              >
                {m.label}
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight">
                {m.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      {isSales && (
        <>
          <SliderInputPair
            label="평당 분양가"
            value={s.salesPricePerPyeong}
            onChange={(v) => s.set("salesPricePerPyeong", v)}
            min={500}
            max={30000}
            step={100}
            unit="만원/평"
            hint="💡 분양가는 평당 공사비의 2~3배 일반적. 위치·등급에 따라 변동 큼."
            inputMin={0}
            inputMax={200000}
            inputWidthClass="w-24"
          />
          <SliderInputPair
            label="예상 분양률"
            value={s.salesRate}
            onChange={(v) => s.set("salesRate", v)}
            min={50}
            max={100}
            step={5}
            unit="%"
            hint="실제 분양 완료율. 80% 미만은 사업 리스크 ↑"
            inputMin={0}
            inputMax={100}
          />
        </>
      )}

      {isRent && (
        <>
          <SliderInputPair
            label="평당 월세"
            value={s.monthlyRentPerPyeong}
            onChange={(v) => s.set("monthlyRentPerPyeong", v)}
            min={5}
            max={100}
            step={1}
            unit="만원/평/월"
            inputMin={0}
            inputMax={500}
          />
          <SliderInputPair
            label="보증금 (월세 N개월)"
            value={s.deposit}
            onChange={(v) => s.set("deposit", v)}
            min={6}
            max={60}
            step={6}
            unit="개월"
            inputMin={0}
            inputMax={120}
          />
          <SliderInputPair
            label="연간 가동률"
            value={s.annualOccupancy}
            onChange={(v) => s.set("annualOccupancy", v)}
            min={70}
            max={100}
            step={5}
            unit="%"
            inputMin={0}
            inputMax={100}
          />
        </>
      )}
    </section>
  );
}
