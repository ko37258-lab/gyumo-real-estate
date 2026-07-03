"use client";

import { useEffect, useState } from "react";
import { useSimulatorStore } from "@/store/simulator";
import { useProfitStore } from "@/store/profit";
import { useMarketStore, type MarketData } from "@/store/market";

function ApplyBtn({
  field,
  value,
  label,
}: {
  field: "salesPricePerPyeong" | "monthlyRentPerPyeong";
  value: number;
  label: string;
}) {
  const set = useProfitStore((s) => s.set);
  const current = useProfitStore((s) => s[field]);
  const isActive = current === value;

  return (
    <button
      onClick={() => set(field, value)}
      className={`
        inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium
        border transition-all flex-shrink-0
        ${isActive
          ? "bg-[var(--info)] text-white border-[var(--info)]"
          : "bg-secondary border-border text-foreground hover:bg-[var(--info-bg)] hover:border-[var(--info)]"
        }
      `}
    >
      {isActive ? "✓ 적용 중" : `↓ ${label}`}
    </button>
  );
}

function StatCard({
  title,
  count,
  main,
  mainUnit,
  sub,
  apply,
}: {
  title: string;
  count: number;
  main: number;
  mainUnit: string;
  sub?: string;
  apply?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2.5 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="text-[10px] text-muted-foreground mb-0.5">
          {title} <span className="opacity-70">· {count}건</span>
        </div>
        <div className="text-[15px] font-semibold tabular-nums">
          {main.toLocaleString()}
          <span className="text-[11px] font-normal text-muted-foreground ml-1">{mainUnit}</span>
        </div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
      </div>
      {apply}
    </div>
  );
}

export function MarketInsight() {
  const lotInfo = useSimulatorStore((s) => s.lotInfo);
  const setMarket = useMarketStore((s) => s.setMarket);
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const pnu = lotInfo?.pnu;
  const lawdCd = pnu?.slice(0, 5);

  useEffect(() => {
    if (!lawdCd) {
      setData(null);
      setMarket(null, null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/market?lawdCd=${lawdCd}&months=6`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "조회 실패");
        return r.json() as Promise<MarketData>;
      })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setMarket(d, lotInfo?.address ?? null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "조회 실패");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lawdCd]);

  if (!lawdCd) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-4 text-[12px] text-muted-foreground">
        📡 <strong className="text-foreground">주변 시세·임대료</strong>
        &nbsp;— 1번 탭에서 지번 조회 후 자동으로 불러옵니다.
        <br />
        아파트·상업업무 매매 시세와 아파트·오피스텔 임대료(전월세)를 분양가·임대료 입력에 바로 적용할 수 있습니다.
      </div>
    );
  }

  const anyData =
    data && (data.aptTrade || data.nrgTrade || data.aptRent || data.offiRent);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold">📡 주변 시세·임대료</span>
          <span className="text-[11px] text-muted-foreground">
            국토부 실거래 최근 6개월 (시군구 단위)
          </span>
          {loading && (
            <span className="text-[11px] text-muted-foreground animate-pulse">조회 중…</span>
          )}
        </div>
        <span className="text-muted-foreground text-[11px]">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {error && (
            <div className="text-[11.5px] text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              ⚠ {error}
            </div>
          )}

          {!loading && data && !anyData && (
            <div className="text-[12px] text-muted-foreground py-2">
              최근 6개월 인근 실거래 내역 없음
            </div>
          )}

          {/* 매매 시세 */}
          {!loading && (data?.aptTrade || data?.nrgTrade) && (
            <div className="space-y-2">
              <div className="text-[11px] text-muted-foreground font-medium">
                🏢 매매 시세 (평당) — 분양가 참고
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data?.aptTrade && (
                  <StatCard
                    title="아파트 매매 평균"
                    count={data.aptTrade.count}
                    main={data.aptTrade.avgPy}
                    mainUnit="만원/평"
                    sub={`중간 ${data.aptTrade.medianPy.toLocaleString()} · ${data.aptTrade.minPy.toLocaleString()}~${data.aptTrade.maxPy.toLocaleString()}`}
                    apply={
                      <ApplyBtn
                        field="salesPricePerPyeong"
                        value={data.aptTrade.avgPy}
                        label="분양가에"
                      />
                    }
                  />
                )}
                {data?.nrgTrade && (
                  <StatCard
                    title="상업·업무 매매 평균"
                    count={data.nrgTrade.count}
                    main={data.nrgTrade.avgPy}
                    mainUnit="만원/평"
                    sub={`중간 ${data.nrgTrade.medianPy.toLocaleString()}`}
                    apply={
                      <ApplyBtn
                        field="salesPricePerPyeong"
                        value={data.nrgTrade.avgPy}
                        label="분양가에"
                      />
                    }
                  />
                )}
              </div>
            </div>
          )}

          {/* 임대료 */}
          {!loading && (data?.aptRent || data?.offiRent) && (
            <div className="space-y-2">
              <div className="text-[11px] text-muted-foreground font-medium">
                🔑 임대료 (전월세) — 임대 수익 모델 참고
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data?.aptRent && data.aptRent.wolseCount > 0 && (
                  <StatCard
                    title="아파트 월세 평균"
                    count={data.aptRent.wolseCount}
                    main={data.aptRent.avgMonthlyRentPerPy}
                    mainUnit="만원/평·월"
                    sub={`평균 보증금 ${data.aptRent.avgWolseDeposit.toLocaleString()}만원 · 월세 ${data.aptRent.avgMonthlyRent.toLocaleString()}만원${data.aptRent.jeonseCount > 0 ? ` · 전세 ${data.aptRent.jeonseCount}건 평균 ${data.aptRent.avgJeonseDeposit.toLocaleString()}만원` : ""}`}
                    apply={
                      <ApplyBtn
                        field="monthlyRentPerPyeong"
                        value={data.aptRent.avgMonthlyRentPerPy}
                        label="임대료에"
                      />
                    }
                  />
                )}
                {data?.offiRent && data.offiRent.wolseCount > 0 && (
                  <StatCard
                    title="오피스텔 월세 평균"
                    count={data.offiRent.wolseCount}
                    main={data.offiRent.avgMonthlyRentPerPy}
                    mainUnit="만원/평·월"
                    sub={`평균 보증금 ${data.offiRent.avgWolseDeposit.toLocaleString()}만원 · 월세 ${data.offiRent.avgMonthlyRent.toLocaleString()}만원`}
                    apply={
                      <ApplyBtn
                        field="monthlyRentPerPyeong"
                        value={data.offiRent.avgMonthlyRentPerPy}
                        label="임대료에"
                      />
                    }
                  />
                )}
              </div>
            </div>
          )}

          {/* 최근 거래 샘플 */}
          {!loading && data?.aptTrade && data.aptTrade.samples.length > 0 && (
            <details className="group">
              <summary className="text-[11px] text-[var(--info)] cursor-pointer select-none hover:underline list-none flex items-center gap-1">
                <span className="group-open:hidden">▶</span>
                <span className="hidden group-open:inline">▼</span>
                최근 아파트 매매 {data.aptTrade.samples.length}건 보기
              </summary>
              <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                {data.aptTrade.samples.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-md bg-secondary/40 text-[11px]"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{s.dong} {s.name}</span>
                      <div className="text-muted-foreground mt-0.5">
                        {s.ym} · {(s.areaSqm * 0.3025).toFixed(0)}평 ({s.areaSqm.toFixed(0)}㎡)
                        {s.floor ? ` · ${s.floor}층` : ""} ·{" "}
                        <span className="font-medium text-foreground">
                          {s.amount.toLocaleString()}만원
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="font-semibold tabular-nums">{s.pricePerPy.toLocaleString()}</div>
                      <div className="text-muted-foreground">만원/평</div>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          <div className="text-[10px] text-muted-foreground/70">
            출처: 국토교통부 실거래가 공개시스템 (아파트·상업업무 매매, 아파트·오피스텔 전월세).
            시군구 단위 통계로 개별 입지·상품에 따라 차이가 큽니다 — 시뮬레이션 참고용.
          </div>
        </div>
      )}
    </div>
  );
}
