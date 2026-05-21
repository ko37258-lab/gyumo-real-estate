"use client";

import type { ProfitResult } from "@/lib/calc/profit";
import { formatEok, formatWon } from "@/lib/calc/cost";

export function ProfitResults({
  result,
  ltvRatio,
  loanMethodLabel,
  loanPeriodYears,
}: {
  result: ProfitResult;
  ltvRatio: number;
  loanMethodLabel: string;
  loanPeriodYears: number;
}) {
  const irrColor =
    result.irr < 0
      ? "text-red-600"
      : result.irr < 10
        ? "text-foreground/70"
        : result.irr < 20
          ? "text-[#993C1D]"
          : "text-[#993C1D] font-bold";

  return (
    <div className="space-y-3">
      {/* 핵심 지표 4개 */}
      <div className="grid grid-cols-2 gap-2">
        <BigCard
          label="총 사업비"
          value={formatEok(result.totalProjectCost)}
          sub={`이자 ${formatEok(result.loanInterest)} 포함`}
        />
        <BigCard
          label="예상 수익"
          value={formatEok(result.totalRevenue)}
          sub={`마진 ${result.marginPercent.toFixed(1)}%`}
        />
        <BigCard
          label="순이익 (세후)"
          value={formatEok(result.netProfit)}
          sub={`세전 ${formatEok(result.profitBeforeTax)} − 세 ${formatEok(result.tax)}`}
          tone={result.isLoss ? "danger" : "ok"}
        />
        <div className="rounded-md p-3 bg-card border border-border">
          <div className="text-[10.5px] text-muted-foreground mb-0.5">
            IRR (연)
          </div>
          <div className={`text-2xl tabular-nums ${irrColor}`}>
            {result.irr.toFixed(1)}%
          </div>
          <div className="text-[10px] text-muted-foreground/80">
            ROE {result.roe.toFixed(1)}% · ROIC {result.roic.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* 세부 지표 */}
      <div className="bg-card border border-border rounded-md p-3 space-y-1.5 text-[12px]">
        <Row label="토지비" value={formatEok(result.landCost)} />
        <Row
          label="건축비 + 부담금"
          value={formatEok(result.buildingCost + result.feesTotal)}
        />
        <Row label="대출 이자" value={formatEok(result.loanInterest)} />
        <Row label="자기자본 (Equity)" value={formatEok(result.equity)} bold />
        <hr className="border-border/60 my-1" />
        <Row
          label="평당 사업비"
          value={`${Math.round(result.costPerPyeong).toLocaleString("ko-KR")}만원/평`}
        />
        <Row
          label="평당 마진"
          value={`${Math.round(result.marginPerPyeong).toLocaleString("ko-KR")}만원/평 (${result.marginPercent.toFixed(1)}%)`}
        />
        <Row
          label="손익분기 분양률"
          value={`${result.breakEvenSalesRate.toFixed(1)}%`}
        />
      </div>

      {/* 경고 박스 */}
      {result.isLoss ? (
        <div className="rounded-md p-3 border-l-4 border-red-500 bg-red-50">
          <div className="text-red-700 font-semibold text-sm flex items-center gap-1.5">
            ⚠️ 손실 예상
          </div>
          <p className="text-xs text-red-600 mt-1.5 leading-relaxed">
            분양가·공사비·LTV 재검토 필요. 평당 분양가가 평당 사업비({Math.round(result.costPerPyeong).toLocaleString("ko-KR")}만원)를 충분히 상회해야 합니다.
          </p>
        </div>
      ) : result.breakEvenSalesRate > 90 ? (
        <div className="rounded-md p-3 border-l-4 border-amber-500 bg-amber-50">
          <div className="text-amber-700 font-semibold text-sm">
            ⚠️ 손익분기 분양률 {result.breakEvenSalesRate.toFixed(1)}%
          </div>
          <p className="text-xs text-amber-700 mt-1.5 leading-relaxed">
            90% 초과 — 사업 안정성 낮음. 분양가 ↑ 또는 사업비 ↓ 검토.
          </p>
        </div>
      ) : result.isHighRisk ? (
        <div className="rounded-md p-3 border-l-4 border-amber-500 bg-amber-50">
          <div className="text-amber-700 font-semibold text-sm">
            ⚠️ 손익분기 여유 부족
          </div>
          <p className="text-xs text-amber-700 mt-1.5 leading-relaxed">
            현재 분양률이 손익분기({result.breakEvenSalesRate.toFixed(1)}%) 대비 여유가 10% 미만. 분양률 변동 시 손실 전환 리스크.
          </p>
        </div>
      ) : (
        <div className="rounded-md p-3 border-l-4 border-emerald-500 bg-emerald-50">
          <div className="text-emerald-700 font-semibold text-sm">
            ✅ 사업성 양호
          </div>
          <p className="text-xs text-emerald-700 mt-1.5 leading-relaxed">
            손익분기 여유 + 마진 확보. IRR {result.irr.toFixed(1)}%로 자기자본 회수 양호.
          </p>
        </div>
      )}

      {/* 대출 요약 */}
      <div className="rounded-md bg-secondary/50 border border-border p-3 text-[11.5px] space-y-1">
        <div className="font-medium text-[12px]">💰 대출 요약</div>
        <Row label="대출 금액" value={formatEok(result.loanAmount)} small />
        <Row
          label="LTV (대출/총사업비)"
          value={`${ltvRatio.toFixed(0)}%`}
          small
        />
        <Row
          label="월 상환액"
          value={formatWon(result.monthlyLoanPayment)}
          small
        />
        <Row label="총 이자" value={formatEok(result.loanInterest)} small />
        <div className="text-[10.5px] text-muted-foreground/90 mt-1">
          {loanMethodLabel} · {loanPeriodYears}년
        </div>
      </div>
    </div>
  );
}

function BigCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "danger" | "ok";
}) {
  const valColor = tone === "danger" ? "text-red-600" : "";
  return (
    <div className="rounded-md p-3 bg-card border border-border">
      <div className="text-[10.5px] text-muted-foreground mb-0.5">{label}</div>
      <div className={`text-lg font-bold tabular-nums ${valColor}`}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground/80">{sub}</div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  small,
}: {
  label: string;
  value: string;
  bold?: boolean;
  small?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className={`text-muted-foreground ${small ? "text-[11px]" : "text-[12px]"}`}
      >
        {label}
      </span>
      <span
        className={`tabular-nums whitespace-nowrap ${bold ? "font-semibold" : ""} ${small ? "text-[11px]" : "text-[12px]"}`}
      >
        {value}
      </span>
    </div>
  );
}
