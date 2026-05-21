"use client";

import { SliderInputPair } from "@/components/ui/slider-input-pair";
import { Label } from "@/components/ui/label";
import { useProfitStore } from "@/store/profit";
import type { RepaymentMethod } from "@/lib/calc/loan";
import { formatEok } from "@/lib/calc/cost";

const METHODS: { v: RepaymentMethod; label: string; desc: string }[] = [
  { v: "bullet", label: "만기일시", desc: "월 이자만, 원금은 만기 일시" },
  { v: "amortized", label: "원리금균등", desc: "매월 원리금 균등" },
  { v: "graceThenAmortized", label: "1년 거치", desc: "1년 거치 후 원리금" },
];

/**
 * LTV와 loanAmountEok 양방향 동기화.
 * - LTV slider 변경 → loanAmountOverride = null로 리셋 (auto 모드)
 * - loanAmount slider 변경 → loanAmountOverride = 그 값
 * effectiveLoanAmount는 부모에서 계산해서 prop으로 전달.
 */
export function LoanCalculator({
  baseProjectCost,
  effectiveLoanAmountEok,
}: {
  /** 토지비 + 건축비 + 부담금 (이자 제외, 원 단위) */
  baseProjectCost: number;
  /** 현재 적용되는 대출액 (억원) — auto면 LTV×base, override면 사용자 값 */
  effectiveLoanAmountEok: number;
}) {
  const s = useProfitStore();

  const onLtvChange = (v: number) => {
    s.set("ltvRatio", v);
    s.set("loanAmountOverride", null); // auto 모드로 복귀
  };

  const onLoanAmountChange = (v: number) => {
    s.set("loanAmountOverride", v);
    // LTV도 새 값에 맞춰 갱신 (표시용)
    if (baseProjectCost > 0) {
      const newLtv = (v * 1_0000_0000) / baseProjectCost * 100;
      s.set("ltvRatio", Math.max(0, Math.min(100, Math.round(newLtv))));
    }
  };

  return (
    <section className="bg-card border border-border rounded-lg p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">🏦 대출</h3>
        <span className="text-[10.5px] text-muted-foreground">
          베이스 사업비 {formatEok(baseProjectCost)} 기준
        </span>
      </header>

      <SliderInputPair
        label="LTV (총 사업비 대비 대출 비율)"
        value={s.ltvRatio}
        onChange={onLtvChange}
        min={40}
        max={80}
        step={5}
        unit="%"
        hint="💡 토지담보 60~70%, PF 60~80% 일반적"
        inputMin={0}
        inputMax={100}
      />

      <SliderInputPair
        label="대출 금액"
        value={effectiveLoanAmountEok}
        onChange={onLoanAmountChange}
        min={0}
        max={500}
        step={1}
        unit="억원"
        hint={
          s.loanAmountOverride === null
            ? "🔄 LTV로 자동 산정 중 — 슬라이더 조작 시 사용자 직접 입력 모드로 전환"
            : "✋ 사용자 직접 입력 모드 — LTV는 표시값"
        }
        inputMin={0}
        inputMax={10000}
        inputWidthClass="w-24"
      />

      <SliderInputPair
        label="연 금리"
        value={s.annualInterestRate}
        onChange={(v) => s.set("annualInterestRate", v)}
        min={3}
        max={12}
        step={0.1}
        unit="%"
        hint="💰 한국은행 기준금리 3.25% (2026.5 기준) · 토지담보 4~7% · PF 5~10%"
        inputMin={0}
        inputMax={30}
      />

      <SliderInputPair
        label="대출 기간"
        value={s.loanPeriodYears}
        onChange={(v) => s.set("loanPeriodYears", v)}
        min={1}
        max={10}
        step={1}
        unit="년"
        inputMin={1}
        inputMax={30}
      />

      <div>
        <Label className="text-[11px] text-muted-foreground mb-2 block">
          상환 방식
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {METHODS.map((m) => (
            <button
              key={m.v}
              type="button"
              onClick={() => s.set("repaymentMethod", m.v)}
              className={`text-left rounded-md px-2.5 py-1.5 border transition ${
                s.repaymentMethod === m.v
                  ? "border-[var(--info)] bg-[var(--info-bg)]"
                  : "border-border bg-background hover:bg-secondary"
              }`}
            >
              <div
                className={`text-[12px] font-medium ${
                  s.repaymentMethod === m.v ? "text-[var(--info)]" : ""
                }`}
              >
                {m.label}
              </div>
              <div className="text-[9.5px] text-muted-foreground leading-tight">
                {m.desc}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
