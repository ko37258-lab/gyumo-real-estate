"use client";

import { useCostStore } from "@/store/cost";
import { FeeSection } from "./FeeSection";
import { SliderInputPair } from "@/components/ui/slider-input-pair";
import { ForestLearnSheet } from "./ForestLearnSheet";
import { sqmToPyeongDisplay } from "@/lib/utils/area";

export function ForestFee() {
  const s = useCostStore();
  const disabled = !s.forestEnabled;
  return (
    <FeeSection
      title="대체산림자원조성비"
      basis="산지관리법 제19조 + 시행령 제24조"
      enabled={s.forestEnabled}
      onEnabledChange={(v) => s.set("forestEnabled", v)}
      enabledLabel="산지전용이 있는 경우 반영"
      accentColor="#9b6b46"
      learnSheet={<ForestLearnSheet />}
    >
      <SliderInputPair
        label="전용면적"
        value={s.forestArea}
        onChange={(v) => s.set("forestArea", v)}
        min={0}
        max={10000}
        step={10}
        unit="㎡"
        disabled={disabled}
        conversion={sqmToPyeongDisplay(s.forestArea)}
        inputMin={0}
        inputMax={100000}
      />
      {/* 2026년 산림청 고시 제2026-16호 단가 프리셋.
          보전·제한지역 단가는 시행령 배율(130%·200%)을 준보전 단가에 적용한 값 —
          기본단가에 반영하고 "보전산지 가산"은 0으로 두는 방식. */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground min-w-[78px]">산지 구분</span>
        {[
          { label: "준보전산지 8,340원", base: 8340 },
          { label: "보전산지 10,840원", base: 10840 },
          { label: "전용제한지역 16,680원", base: 16680 },
        ].map((o) => (
          <button
            key={o.base}
            type="button"
            disabled={disabled}
            onClick={() => {
              s.set("forestBase", o.base);
              s.set("forestAddRate", 0);
            }}
            className="text-[11px] px-2.5 py-1 rounded-full border transition-colors disabled:opacity-40"
            style={
              s.forestBase === o.base
                ? { background: "#9b6b46", color: "#fff", borderColor: "#9b6b46" }
                : { borderColor: "var(--border)", color: "var(--muted-foreground)" }
            }
          >
            {o.label}
          </button>
        ))}
      </div>
      <SliderInputPair
        label="기본 단위금액"
        value={s.forestBase}
        onChange={(v) => s.set("forestBase", v)}
        min={0}
        max={50000}
        step={500}
        unit="원/㎡"
        disabled={disabled}
        inputMin={0}
        inputMax={200000}
        inputWidthClass="w-28"
        hint="2026년 고시: 준보전 8,340 · 보전 10,840 · 전용제한 16,680원/㎡"
      />
      <SliderInputPair
        label="산지 공시지가"
        value={s.forestPrice}
        onChange={(v) => s.set("forestPrice", v)}
        min={0}
        max={2000000}
        step={10000}
        unit="원/㎡"
        disabled={disabled}
        inputMin={0}
        inputMax={10000000}
        inputWidthClass="w-28"
      />
      <SliderInputPair
        label="공시지가 반영률"
        value={s.forestPublicRate}
        onChange={(v) => s.set("forestPublicRate", v)}
        min={0}
        max={1}
        step={0.05}
        unit="%"
        disabled={disabled}
        inputMin={0}
        inputMax={20}
        hint="현행 고시: 1000분의 1 (0.1%) · 가산 상한 8,340원/㎡ (자동 적용)"
      />
      <SliderInputPair
        label="보전산지 가산"
        value={s.forestAddRate}
        onChange={(v) => s.set("forestAddRate", v)}
        min={0}
        max={50}
        step={5}
        unit="%"
        disabled={disabled}
        inputMin={0}
        inputMax={100}
      />
      <SliderInputPair
        label="감면율"
        value={s.forestDiscount}
        onChange={(v) => s.set("forestDiscount", v)}
        min={0}
        max={100}
        step={5}
        unit="%"
        disabled={disabled}
        inputMin={0}
        inputMax={100}
      />
    </FeeSection>
  );
}
