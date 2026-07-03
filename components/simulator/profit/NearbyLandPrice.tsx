"use client";

import { useEffect, useState } from "react";
import { useSimulatorStore } from "@/store/simulator";
import { useProfitStore } from "@/store/profit";

type LandItem = {
  dong: string;
  jibun: string;
  amount: number;
  areaSqm: number;
  pyeong: number;
  pricePerPy: number;
  year: string;
  month: string;
  day: string;
  landCls: string;
  landUse: string;
};

type NearbyData = {
  count: number;
  stats: {
    avgPricePerPy: number;
    medianPricePerPy: number;
    maxPricePerPy: number;
    minPricePerPy: number;
  } | null;
  items: LandItem[];
  message?: string;
};

function PriceSetBtn({
  price,
  label,
}: {
  price: number;
  label: string;
}) {
  const set = useProfitStore((s) => s.set);
  const current = useProfitStore((s) => s.landPricePerPyeong);
  const isActive = current === price;

  return (
    <button
      onClick={() => set("landPricePerPyeong", price)}
      className={`
        inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium
        border transition-all
        ${isActive
          ? "bg-[var(--info)] text-white border-[var(--info)]"
          : "bg-secondary border-border text-foreground hover:bg-[var(--info-bg)] hover:border-[var(--info)]"
        }
      `}
    >
      {isActive ? "✓ 적용 중" : "↓ 이 가격으로"}
      {!isActive && <span className="opacity-60">{label}</span>}
    </button>
  );
}

export function NearbyLandPrice() {
  const lotInfo = useSimulatorStore((s) => s.lotInfo);
  const [data, setData] = useState<NearbyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const pnu = lotInfo?.pnu;
  const publicPricePerSqm = lotInfo?.publicPricePerSqm;
  const publicPriceYear = lotInfo?.publicPriceYear;

  // 공시지가 원/㎡ → 만원/평
  const officialPy = publicPricePerSqm
    ? Math.round((publicPricePerSqm * 3.3058) / 10000)
    : null;

  useEffect(() => {
    if (!pnu) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setData(null);
    fetch(`/api/nearby-landprice?pnu=${encodeURIComponent(pnu)}`)
      .then((r) => r.json())
      .then((d: NearbyData) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData({ count: 0, stats: null, items: [], message: "조회 실패" });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pnu]);

  if (!pnu && !officialPy) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-4 text-[12px] text-muted-foreground">
        🏷️ <strong className="text-foreground">주변 토지 시세</strong>
        &nbsp;— 1번 탭에서 지번 조회 후 자동으로 불러옵니다.
        <br />
        조회 후 평당 토지가를 실거래가/공시지가 기준으로 자동 입력할 수 있습니다.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* 헤더 */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold">🏷️ 주변 토지 시세</span>
          {lotInfo?.address && (
            <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">
              {lotInfo.address}
            </span>
          )}
          {loading && (
            <span className="text-[11px] text-muted-foreground animate-pulse">조회 중…</span>
          )}
        </div>
        <span className="text-muted-foreground text-[11px]">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* 공시지가 */}
          {officialPy && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
              <div>
                <div className="text-[11px] text-muted-foreground mb-0.5">
                  공시지가 ({publicPriceYear ?? "최근"}년 기준)
                </div>
                <div className="text-[15px] font-semibold tabular-nums">
                  {officialPy.toLocaleString()}
                  <span className="text-[12px] font-normal text-muted-foreground ml-1">만원/평</span>
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  ({(publicPricePerSqm ?? 0).toLocaleString()}원/㎡)
                </div>
              </div>
              <PriceSetBtn price={officialPy} label="공시" />
            </div>
          )}

          {/* 실거래가 통계 */}
          {!loading && data && data.stats && (
            <div className="space-y-2">
              <div className="text-[11px] text-muted-foreground font-medium">
                국토부 토지 실거래가 (최근 12개월 · {data.count}건)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">평균가</div>
                    <div className="text-[15px] font-semibold tabular-nums">
                      {data.stats.avgPricePerPy.toLocaleString()}
                      <span className="text-[11px] font-normal text-muted-foreground ml-1">만원/평</span>
                    </div>
                  </div>
                  <PriceSetBtn price={data.stats.avgPricePerPy} label="평균" />
                </div>
                <div className="rounded-lg border border-border bg-secondary/30 px-3 py-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-0.5">중간값</div>
                    <div className="text-[15px] font-semibold tabular-nums">
                      {data.stats.medianPricePerPy.toLocaleString()}
                      <span className="text-[11px] font-normal text-muted-foreground ml-1">만원/평</span>
                    </div>
                  </div>
                  <PriceSetBtn price={data.stats.medianPricePerPy} label="중간" />
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground">
                범위: {data.stats.minPricePerPy.toLocaleString()} ~ {data.stats.maxPricePerPy.toLocaleString()}만원/평
              </div>
            </div>
          )}

          {/* 거래 없음 */}
          {!loading && data && data.count === 0 && (
            <div className="text-[12px] text-muted-foreground py-2">
              {data.message ?? "최근 12개월 인근 토지 거래 내역 없음"}
            </div>
          )}

          {/* 최근 거래 목록 */}
          {!loading && data && data.items.length > 0 && (
            <details className="group">
              <summary className="text-[11px] text-[var(--info)] cursor-pointer select-none hover:underline list-none flex items-center gap-1">
                <span className="group-open:hidden">▶</span>
                <span className="hidden group-open:inline">▼</span>
                최근 거래 내역 {data.items.length}건 보기
              </summary>
              <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                {data.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-md bg-secondary/40 text-[11px]"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">
                        {item.dong} {item.jibun}
                      </span>
                      {item.landCls && (
                        <span className="text-muted-foreground ml-1">({item.landCls})</span>
                      )}
                      <div className="text-muted-foreground mt-0.5">
                        {item.year}.{String(item.month).padStart(2, "0")}.{String(item.day).padStart(2, "0")}
                        &nbsp;·&nbsp;
                        {item.pyeong.toFixed(0)}평 ({item.areaSqm.toFixed(0)}㎡)
                        &nbsp;·&nbsp;
                        <span className="font-medium text-foreground">
                          {item.amount.toLocaleString()}만원
                        </span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="font-semibold tabular-nums">
                        {item.pricePerPy.toLocaleString()}
                      </div>
                      <div className="text-muted-foreground">만원/평</div>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* 출처 안내 */}
          <div className="text-[10px] text-muted-foreground/70">
            출처: 국토교통부 실거래가 공개시스템 · 국토부 공시지가. 시뮬레이션 참고용 (실제 매매가와 다를 수 있음)
          </div>
        </div>
      )}
    </div>
  );
}
