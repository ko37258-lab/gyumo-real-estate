"use client";

// 💰 "이 계획으로 얼마 받을 수 있나?" — 가설계 세대수 × 인근 실거래 시세로
// 분양수입·월세수입을 문장으로 풀어주는 펼침 카드.
//
// 데이터: /api/use-prices (인근 12개월 실거래 — 매매·월세, 만원/평).
// UsePricesDialog와 같은 캐시(useUsePricesStore)를 쓰므로 중복 호출 없음.
// ① 지번 조회가 되어 있어야 동작 (pnu·법정동 필요).

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLandInfoStore } from "@/store/landinfo";
import { useUsePricesStore } from "@/store/useprices";
import type { ReportUsePrices } from "@/lib/ai/types";

const PY = 3.305785;

function fmtEok(won: number): string {
  if (won >= 1e8) return `${(won / 1e8).toFixed(1).replace(/\.0$/, "")}억`;
  return `${Math.round(won / 1e4).toLocaleString()}만원`;
}

/** 용도 코드 → 시세 표 라벨 매칭 키워드 */
function matchRow<T extends { label: string }>(rows: T[], usage: string): T | null {
  const prefer: string[] =
    usage === "아파트" ? ["아파트"]
    : usage === "오피스텔" ? ["오피스텔"]
    : usage === "다가구" || usage === "단독주택" ? ["단독", "다가구"]
    : ["다세대", "연립"]; // 다세대연립·도시형생활 등
  for (const kw of prefer) {
    const hit = rows.find((r) => r.label.includes(kw));
    if (hit) return hit;
  }
  return rows[0] ?? null;
}

export default function RevenueEstimateCard({
  unitSqm,
  efficiencyPct,
  totalUnits,
  usage,
}: {
  unitSqm: number;
  efficiencyPct: number;
  totalUnits: number;
  usage: string;
}) {
  const land = useLandInfoStore((s) => s.data);
  const cached = useUsePricesStore((s) => (land && s.pnu === land.pnu ? s.data : null));
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const umd = (() => {
    if (!land?.address) return "";
    const tok = land.address.split(/\s+/).filter((t) => /[동가리]$/.test(t));
    return tok.length ? tok[tok.length - 1] : "";
  })();

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && land && !cached && !loading) {
      setLoading(true);
      setError(null);
      fetch(`/api/use-prices?pnu=${land.pnu}&umd=${encodeURIComponent(umd)}`)
        .then(async (r) => {
          if (!r.ok) {
            const j = (await r.json().catch(() => ({}))) as { error?: string };
            throw new Error(j.error ?? `조회 실패 (${r.status})`);
          }
          return (await r.json()) as ReportUsePrices;
        })
        .then((data) => {
          useUsePricesStore
            .getState()
            .setUsePrices(land.pnu, { ...data, baseAddress: land.address });
        })
        .catch((e) => setError(e instanceof Error ? e.message : "조회 실패"))
        .finally(() => setLoading(false));
    }
  };

  if (totalUnits <= 0) return null;

  // ── 계산 ──
  const exclusivePy = unitSqm / PY;
  const supplyPy = unitSqm / Math.max(efficiencyPct, 1) * 100 / PY;
  const saleRow = cached ? matchRow(cached.sale, usage) : null;
  const rentRow = cached ? matchRow(cached.rentMonthly, usage) : null;

  const salePerUnit = saleRow
    ? saleRow.manPerPy * 1e4 * (saleRow.exclusive ? exclusivePy : supplyPy)
    : 0;
  const saleTotal = salePerUnit * totalUnits;
  const rentPerUnit = rentRow
    ? rentRow.manPerPy * 1e4 * (rentRow.exclusive ? exclusivePy : supplyPy)
    : 0;
  const rentMonthly = rentPerUnit * totalUnits;
  const rentYearly = rentMonthly * 12;
  const grossYieldPct = saleTotal > 0 && rentYearly > 0 ? (rentYearly / saleTotal) * 100 : 0;

  return (
    <div className="mt-3 rounded-md border border-amber-300 bg-amber-50/50 overflow-hidden">
      <Button
        variant="ghost"
        onClick={toggle}
        className="w-full justify-between text-[12.5px] font-bold text-amber-900 hover:bg-amber-100/60 rounded-none h-9"
      >
        <span>💰 이 계획으로 얼마 받을 수 있나? <span className="font-medium text-[11px]">— 인근 실거래 기준 분양·월세 추정</span></span>
        <span>{open ? "∧ 접기" : "∨ 열기"}</span>
      </Button>

      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2">
          {!land && (
            <p className="text-[11.5px] text-amber-900">
              ① 토지가치분석에서 <b>지번을 먼저 조회</b>하면 그 동네 실거래 시세로 자동 계산됩니다.
            </p>
          )}
          {land && loading && (
            <p className="text-[11.5px] text-muted-foreground">인근 12개월 실거래를 집계하는 중…</p>
          )}
          {land && error && <p className="text-[11.5px] text-red-700">⚠️ {error}</p>}

          {land && cached && (
            <>
              {/* 분양 */}
              <div className="rounded border border-border bg-card p-2.5">
                <div className="text-[11px] font-bold text-muted-foreground mb-1">🏷️ 분양(매각)하면</div>
                {saleRow && salePerUnit > 0 ? (
                  <>
                    <p className="text-[13px] leading-relaxed">
                      세대당 약 <b className="text-[15px]">{fmtEok(salePerUnit)}</b>
                      <span className="text-muted-foreground text-[11px]"> ({saleRow.exclusive ? "전용" : "공급"} {Math.round((saleRow.exclusive ? exclusivePy : supplyPy) * 10) / 10}평 × {saleRow.manPerPy.toLocaleString()}만원/평)</span>
                      {" "}× {totalUnits}세대 = <b className="text-[15px] text-green-700">총 {fmtEok(saleTotal)}</b>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      근거: {saleRow.label} 매매 {saleRow.count}건 · 최근 {cached.periodMonths}개월 · {saleRow.basis}
                    </p>
                  </>
                ) : (
                  <p className="text-[11.5px] text-muted-foreground">인근에 비교할 매매 표본이 부족합니다.</p>
                )}
              </div>

              {/* 월세 */}
              <div className="rounded border border-border bg-card p-2.5">
                <div className="text-[11px] font-bold text-muted-foreground mb-1">🏠 월세를 놓으면</div>
                {rentRow && rentPerUnit > 0 ? (
                  <>
                    <p className="text-[13px] leading-relaxed">
                      세대당 월 <b className="text-[15px]">{Math.round(rentPerUnit / 1e4).toLocaleString()}만원</b>
                      <span className="text-muted-foreground text-[11px]"> (보증금 별도)</span>
                      {" "}× {totalUnits}세대 = 월 <b className="text-[15px] text-green-700">{Math.round(rentMonthly / 1e4).toLocaleString()}만원</b>
                      <span className="text-muted-foreground"> · 연 {fmtEok(rentYearly)}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      근거: {rentRow.label} 월세 {rentRow.count}건 · 최근 {cached.periodMonths}개월 · {rentRow.basis}
                      {grossYieldPct > 0 && <> · 분양가 대비 표면 임대수익률 약 {grossYieldPct.toFixed(1)}%/년</>}
                    </p>
                  </>
                ) : (
                  <p className="text-[11.5px] text-muted-foreground">인근에 비교할 월세 표본이 부족합니다.</p>
                )}
              </div>

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                ※ 인근 실거래 중앙값 기준 <b>참고 추정</b>입니다. 신축 프리미엄·보증금 구조·공실·관리비·
                층·향에 따라 실제 수입은 달라지며, 감정평가·분양가 산정 자료가 아닙니다.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
