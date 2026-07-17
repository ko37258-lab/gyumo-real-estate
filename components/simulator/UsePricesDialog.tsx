"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSimulatorStore } from "@/store/simulator";
import { useUsePricesStore } from "@/store/useprices";
import type { ReportUsePrices } from "@/lib/ai/types";

/**
 * 📊 용도별 분양가·임대료 팝업 (플렉시티 대응).
 * 매매(분양가 참고)·월세(임대료 참고)를 용도별로, 상업은 층별로 표시.
 * 조회 결과는 useUsePricesStore에 저장 → 보고서 생성 시 선택 포함.
 */
export function UsePricesDialog({
  pnu,
  umd,
  address,
}: {
  pnu: string;
  umd: string;
  address: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cached = useUsePricesStore((s) => (s.pnu === pnu ? s.data : null));
  const effPct = useSimulatorStore((s) => s.schematicEfficiencyPct) || 78;

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && !cached && !loading) {
      setLoading(true);
      setError(null);
      fetch(`/api/use-prices?pnu=${pnu}&umd=${encodeURIComponent(umd)}`)
        .then(async (r) => {
          if (!r.ok) {
            const j = (await r.json().catch(() => ({}))) as { error?: string };
            throw new Error(j.error ?? `조회 실패 (${r.status})`);
          }
          return (await r.json()) as ReportUsePrices;
        })
        .then((data) => {
          useUsePricesStore.getState().setUsePrices(pnu, { ...data, baseAddress: address });
        })
        .catch((e) => setError(e instanceof Error ? e.message : "조회 실패"))
        .finally(() => setLoading(false));
    }
  };

  const d = cached;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button
            type="button"
            className="w-full text-[11px] font-semibold px-2.5 py-1.5 rounded-md border transition-colors"
            style={{
              background: "var(--card)",
              borderColor: "var(--info)",
              color: "var(--info)",
            }}
          >
            📊 용도별 분양가·임대료 전체 보기 (플렉시티식 표)
          </button>
        }
      />
      <DialogContent className="sm:max-w-2xl max-h-[88vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>용도별 분양가·임대료</DialogTitle>
          <DialogDescription>
            {address} 주변 실거래 기반 용도별 시세 — 분양가·임대료 계산 참고용.
            보고서 생성 시 이 표를 선택해 수록할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-2 text-[12px]">
          {loading && (
            <div className="py-10 text-center space-y-2">
              <Loader2Icon className="size-8 animate-spin mx-auto text-[var(--info)]" />
              <div className="text-[12px] text-muted-foreground">
                용도별 실거래 9종을 집계 중입니다... (10초 내외)
              </div>
            </div>
          )}
          {error && (
            <div className="px-3 py-2 rounded-md text-xs bg-red-50 border-l-4 border-red-500 text-red-700">
              ⚠ {error}
            </div>
          )}
          {d && !loading && (
            <div className="space-y-4">
              <PriceTable
                title={`용도별 분양가 (매매 실거래 · 최근 ${d.periodMonths}개월 중앙값)`}
                rows={d.sale}
                unitSuffix="만원/평"
                effPct={effPct}
              />
              <PriceTable
                title={`용도별 임대료 (월세 실거래 · 최근 ${d.periodMonths}개월 중앙값)`}
                rows={d.rentMonthly}
                unitSuffix="만원/평 (월)"
                effPct={effPct}
              />
              {/* 상업 층별 */}
              <div>
                <div className="text-[11px] font-bold mb-1.5">
                  상업 (층별 매매 · 건물면적 기준)
                </div>
                <div className="rounded-md border border-border overflow-hidden">
                  <div className="grid grid-cols-[1fr_1.6fr] text-[10px] text-muted-foreground bg-secondary/60 px-2.5 py-1.5">
                    <span>층수</span>
                    <span>실거래가</span>
                  </div>
                  {d.commercial.map((r) => (
                    <div
                      key={r.label}
                      className="grid grid-cols-[1fr_1.6fr] px-2.5 py-2 border-t border-border items-baseline"
                    >
                      <span className="font-medium">{r.label}</span>
                      {r.count > 0 ? (
                        <span>
                          <b className="text-[13px]">
                            {r.manPerPy.toLocaleString("ko-KR")}만원/평
                          </b>
                          <span className="text-[10px] text-muted-foreground">
                            {" "}
                            ({r.count}건 · {r.basis})
                          </span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          주변 실거래 사례가 없습니다.
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground leading-relaxed">
                출처: 국토교통부 실거래가 공개시스템 · 공급면적 전환은 전용률{" "}
                {effPct}% 가정(⑥ 가설계의 전용률과 연동) · 통계 추정치로
                감정평가가 아니며 상품 기획·마감 수준에 따라 달라질 수 있음.
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border pt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PriceTable({
  title,
  rows,
  unitSuffix,
  effPct,
}: {
  title: string;
  rows: ReportUsePrices["sale"];
  unitSuffix: string;
  effPct: number;
}) {
  return (
    <div>
      <div className="text-[11px] font-bold mb-1.5">{title}</div>
      <div className="rounded-md border border-border overflow-hidden">
        <div className="grid grid-cols-[1fr_1.6fr_1.2fr] text-[10px] text-muted-foreground bg-secondary/60 px-2.5 py-1.5">
          <span>건축물용도</span>
          <span>실거래가</span>
          <span>공급면적 전환시</span>
        </div>
        {rows.map((r) => (
          <div
            key={r.label}
            className="grid grid-cols-[1fr_1.6fr_1.2fr] px-2.5 py-2 border-t border-border items-baseline"
          >
            <span className="font-medium">{r.label}</span>
            {r.count > 0 ? (
              <>
                <span>
                  <b className="text-[13px]">
                    {r.manPerPy.toLocaleString("ko-KR")}
                  </b>
                  <span className="text-[10px]"> {unitSuffix}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    ({r.areaBasis} · {r.count}건 · {r.basis})
                  </span>
                </span>
                <span className="text-[12px]">
                  {r.exclusive
                    ? `${Math.round(r.manPerPy * (effPct / 100)).toLocaleString("ko-KR")}만원/평`
                    : "—"}
                </span>
              </>
            ) : (
              <span className="col-span-2 text-[11px] text-muted-foreground">
                주변 실거래 사례가 없습니다.
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
