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
        max={5}
        step={0.1}
        unit="%"
        disabled={disabled}
        inputMin={0}
        inputMax={20}
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
