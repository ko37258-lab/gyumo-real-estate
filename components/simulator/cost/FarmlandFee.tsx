"use client";

import { useCostStore } from "@/store/cost";
import { FeeSection } from "./FeeSection";
import { SliderInputPair } from "@/components/ui/slider-input-pair";
import { FarmlandLearnSheet } from "./FarmlandLearnSheet";
import { sqmToPyeongDisplay } from "@/lib/utils/area";

export function FarmlandFee() {
  const s = useCostStore();
  const disabled = !s.farmEnabled;
  return (
    <FeeSection
      title="농지보전부담금"
      basis="농지법 제38조 + 시행령 제53조"
      enabled={s.farmEnabled}
      onEnabledChange={(v) => s.set("farmEnabled", v)}
      enabledLabel="농지전용이 있는 경우 반영"
      accentColor="#d97757"
      learnSheet={<FarmlandLearnSheet />}
    >
      <SliderInputPair
        label="전용면적"
        value={s.farmArea}
        onChange={(v) => s.set("farmArea", v)}
        min={0}
        max={10000}
        step={10}
        unit="㎡"
        disabled={disabled}
        conversion={sqmToPyeongDisplay(s.farmArea)}
        inputMin={0}
        inputMax={100000}
      />
      <SliderInputPair
        label="개별공시지가"
        value={s.farmPrice}
        onChange={(v) => s.set("farmPrice", v)}
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
        label="적용률"
        value={s.farmRate}
        onChange={(v) => s.set("farmRate", v)}
        min={0}
        max={50}
        step={1}
        unit="%"
        disabled={disabled}
        inputMin={0}
        inputMax={100}
      />
      <SliderInputPair
        label="㎡당 상한"
        value={s.farmCap}
        onChange={(v) => s.set("farmCap", v)}
        min={0}
        max={100000}
        step={1000}
        unit="원"
        disabled={disabled}
        inputMin={0}
        inputMax={500000}
        inputWidthClass="w-28"
      />
      <SliderInputPair
        label="감면율"
        value={s.farmDiscount}
        onChange={(v) => s.set("farmDiscount", v)}
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
