"use client";

import { useCostStore } from "@/store/cost";
import { FeeSection } from "./FeeSection";
import { SliderInputPair } from "@/components/ui/slider-input-pair";
import { DevelopmentLearnSheet } from "./DevelopmentLearnSheet";

export function DevelopmentFee() {
  const s = useCostStore();
  const disabled = !s.devEnabled;
  return (
    <FeeSection
      title="개발부담금"
      basis="개발이익 환수에 관한 법률 제5조"
      enabled={s.devEnabled}
      onEnabledChange={(v) => s.set("devEnabled", v)}
      enabledLabel="개발부담금 대상 검토"
      accentColor="#b6573e"
      learnSheet={<DevelopmentLearnSheet />}
    >
      <SliderInputPair
        label="종료시점 지가"
        value={s.endLandValue}
        onChange={(v) => s.set("endLandValue", v)}
        min={0}
        max={1000000}
        step={1000}
        unit="만원"
        disabled={disabled}
        inputMin={0}
        inputMax={5000000}
        inputWidthClass="w-28"
      />
      <SliderInputPair
        label="개시시점 지가"
        value={s.startLandValue}
        onChange={(v) => s.set("startLandValue", v)}
        min={0}
        max={1000000}
        step={1000}
        unit="만원"
        disabled={disabled}
        inputMin={0}
        inputMax={5000000}
        inputWidthClass="w-28"
      />
      <SliderInputPair
        label="정상지가상승분"
        value={s.normalIncrease}
        onChange={(v) => s.set("normalIncrease", v)}
        min={0}
        max={300000}
        step={500}
        unit="만원"
        disabled={disabled}
        inputMin={0}
        inputMax={1000000}
        inputWidthClass="w-28"
      />
      <SliderInputPair
        label="개발비용 인정액"
        value={s.devCost}
        onChange={(v) => s.set("devCost", v)}
        min={0}
        max={500000}
        step={1000}
        unit="만원"
        disabled={disabled}
        inputMin={0}
        inputMax={2000000}
        inputWidthClass="w-28"
      />
      <SliderInputPair
        label="부담률"
        value={s.devRate}
        onChange={(v) => s.set("devRate", v)}
        min={0}
        max={50}
        step={1}
        unit="%"
        disabled={disabled}
        inputMin={0}
        inputMax={100}
      />
    </FeeSection>
  );
}
