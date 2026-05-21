"use client";

import { SliderInputPair } from "@/components/ui/slider-input-pair";
import { useProfitStore } from "@/store/profit";

export function ScheduleInputs() {
  const s = useProfitStore();
  return (
    <section className="bg-card border border-border rounded-lg p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">📅 사업 일정</h3>
        <span className="text-[10.5px] text-muted-foreground">
          착공~준공 + 분양 시작점
        </span>
      </header>

      <SliderInputPair
        label="사업 기간 (착공~준공)"
        value={s.projectDurationMonths}
        onChange={(v) => s.set("projectDurationMonths", v)}
        min={6}
        max={48}
        step={3}
        unit="개월"
        hint="💡 일반 5~10층 약 12~24개월, 대형 단지 24~48개월"
        inputMin={1}
        inputMax={120}
      />

      <SliderInputPair
        label="분양 시작 시점 (준공 기준 ±)"
        value={s.salesStartMonth}
        onChange={(v) => s.set("salesStartMonth", v)}
        min={-12}
        max={12}
        step={1}
        unit="개월"
        hint={
          s.salesStartMonth < 0
            ? `선분양 — 준공 ${Math.abs(s.salesStartMonth)}개월 전 시작`
            : s.salesStartMonth > 0
              ? `후분양 — 준공 ${s.salesStartMonth}개월 후 시작`
              : "준공 시점에 분양 시작"
        }
        inputMin={-36}
        inputMax={36}
      />
    </section>
  );
}
