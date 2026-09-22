"use client";

import { formatEok, formatWon } from "@/lib/calc/cost";
import { Icon } from '@/components/ui/icon'
import type { ProfitSnapshot } from "@/lib/plan/finance";
import { PRICE_SOURCE_LABEL } from "@/store/profit";

export function ProfitResults({
  snap,
  loanMethodLabel,
  loanPeriodYears,
}: {
  snap: ProfitSnapshot;
  loanMethodLabel: string;
  loanPeriodYears: number;
}) {
  const result = snap.result;
  const v = snap.verdict;
  const held = v.kind === "hold";
  const irrColor =
    held ? "text-foreground/60" : result.irr < 0 ? "text-red-600" : result.irr < 10 ? "text-foreground/70" : "text-[#993C1D]";
  const src = (k: typeof snap.landPriceSource) => (k === "default" ? "초기 기본값(미검증)" : PRICE_SOURCE_LABEL[k]);

  return (
    <div className="space-y-3">
      {/* 판정 — 주요 가정 확인 전에는 보류 */}
      <div
        className={`rounded-md p-3 border-l-4 ${
          v.kind === "hold"
            ? "border-amber-500 bg-amber-50"
            : v.kind === "loss"
              ? "border-red-500 bg-red-50"
              : v.kind === "risk"
                ? "border-amber-500 bg-amber-50"
                : "border-emerald-500 bg-emerald-50"
        }`}
      >
        <div className="font-semibold text-sm">{v.title}</div>
        <ul className="text-xs mt-1.5 leading-relaxed list-disc pl-4">
          {v.reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <div className="text-[10.5px] text-muted-foreground mt-1.5">
          토지가 출처: {src(snap.landPriceSource)} · 분양가/임대료 출처: {src(snap.salesPriceSource)}
        </div>
      </div>

      {/* 핵심 지표 4개 */}
      <div className="grid grid-cols-2 gap-2">
        <BigCard
          label="토지비 포함 총사업비"
          value={formatEok(result.totalProjectCost)}
          sub={`토지 ${formatEok(result.landCost)} · 이자 ${formatEok(result.loanInterest)} 포함`}
        />
        <BigCard
          label="예상 매출 (분양률 반영)"
          value={formatEok(result.totalRevenue)}
          sub={`세전이익률 ${snap.pretaxMarginOnRevenuePct.toFixed(1)}% (매출 대비)`}
        />
        <BigCard
          label="세후 순이익 (가정 세율)"
          value={formatEok(result.netProfit)}
          sub={`세전 ${formatEok(result.profitBeforeTax)} − 세 ${formatEok(result.tax)}`}
          tone={result.isLoss ? "danger" : "ok"}
        />
        <div className="rounded-md p-3 bg-card border border-border">
          <div className="text-[10.5px] text-muted-foreground mb-0.5">자기자본 IRR (단순 2시점)</div>
          <div className={`text-2xl tabular-nums ${irrColor}`}>{result.irr.toFixed(1)}%</div>
          <div className="text-[10px] text-muted-foreground/80">
            ROE {result.roe.toFixed(1)}% · ROIC {result.roic.toFixed(1)}%{held ? " · 판정 보류 중 참고값" : ""}
          </div>
        </div>
      </div>

      {/* 세부 지표 */}
      <div className="bg-card border border-border rounded-md p-3 space-y-1.5 text-[12px]">
        <Row label="토지비 (부대비 포함)" value={formatEok(result.landCost)} />
        <Row label="건축·부대비 + 부담금 소계" value={formatEok(result.buildingCost + result.feesTotal)} />
        <Row label="대출 이자" value={formatEok(result.loanInterest)} />
        <Row label="자기자본 (Equity)" value={formatEok(result.equity)} bold />
        <hr className="border-border/60 my-1" />
        <Row label="분양·임대 면적 가정" value={`${snap.saleableAreaPyeong.toFixed(1)}평`} />
        <Row label="평당 사업비" value={`${Math.round(result.costPerPyeong).toLocaleString("ko-KR")}만원/평`} />
        <Row
          label="평당 마진율 (완판 기준)"
          value={`${Math.round(result.marginPerPyeong).toLocaleString("ko-KR")}만원/평 (${result.marginPercent.toFixed(1)}%)`}
        />
        <Row label="손익분기 분양률" value={`${result.breakEvenSalesRate.toFixed(1)}%`} />
      </div>

      {/* 대출 요약 */}
      <div className="rounded-md bg-secondary/50 border border-border p-3 text-[11.5px] space-y-1">
        <div className="font-medium text-[12px]"><Icon name="coins" /> 대출 요약</div>
        <Row label="대출 금액" value={formatEok(result.loanAmount)} small />
        <Row label="LTC (대출 ÷ 토지비 포함 사업비)" value={`${snap.ltcPct.toFixed(0)}%`} small />
        <Row label="월 상환액" value={formatWon(result.monthlyLoanPayment)} small />
        <Row label="총 이자" value={formatEok(result.loanInterest)} small />
        <div className="text-[10.5px] text-muted-foreground/90 mt-1">
          {loanMethodLabel} · 대출기간 {loanPeriodYears}년 · 담보가치 대비 LTV 아님
        </div>
      </div>

      {/* 정의·가정 */}
      <details className="rounded-md border border-border p-3 text-[11px] leading-relaxed text-muted-foreground">
        <summary className="cursor-pointer font-medium text-foreground">지표 정의 · 가정</summary>
        <ul className="list-disc pl-4 mt-1.5 space-y-0.5">
          <li>{snap.marginDefinition}</li>
          <li>{snap.irrDefinition}</li>
          <li>{snap.interestNote}</li>
          <li>{snap.taxNote}</li>
          <li>분양·임대 면적: {snap.saleableAreaBasis}</li>
        </ul>
      </details>
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
