// 💰 분양·월세 수익 추정 — 가설계 세대수 × 인근 실거래 시세(/api/use-prices, 만원/평).
// 화면 카드(RevenueEstimateCard)와 PDF(수익 페이지·표지 KPI)가 같은 계산을 쓰도록 분리했다.
// 다른 곳에 같은 식을 또 만들지 말 것 — 화면 숫자와 보고서 숫자가 어긋난다.

import type { ReportUsePrices } from "@/lib/ai/types";

export const PY = 3.305785;

export interface RevenueRowBasis {
  label: string;
  manPerPy: number;
  count: number;
  basis: string;
  exclusive: boolean;
}

export interface ReportRevenue {
  usage: string;
  totalUnits: number;
  unitExclusiveSqm: number;
  efficiencyPct: number;
  exclusivePy: number;
  supplyPy: number;
  periodMonths: number;
  baseAddress?: string;
  sale: (RevenueRowBasis & { areaPy: number; perUnitWon: number; totalWon: number }) | null;
  rent:
    | (RevenueRowBasis & {
        areaPy: number;
        perUnitMonthlyWon: number;
        monthlyWon: number;
        yearlyWon: number;
      })
    | null;
  /** 분양 총액 대비 연 임대수입 (표면 수익률 %) — 둘 다 있을 때만 */
  grossYieldPct: number;
}

/** 용도 코드 → 시세 표 라벨 매칭 (아파트/오피스텔/단독·다가구/그 외 다세대·연립) */
export function matchRow<T extends { label: string }>(rows: T[], usage: string): T | null {
  const prefer: string[] =
    usage === "아파트"
      ? ["아파트"]
      : usage === "오피스텔"
        ? ["오피스텔"]
        : usage === "다가구" || usage === "단독주택"
          ? ["단독", "다가구"]
          : ["다세대", "연립"]; // 다세대연립·도시형생활 등
  for (const kw of prefer) {
    const hit = rows.find((r) => r.label.includes(kw));
    if (hit) return hit;
  }
  return rows[0] ?? null;
}

export function estimateRevenue(p: {
  usePrices: ReportUsePrices;
  usage: string;
  unitSqm: number;
  efficiencyPct: number;
  totalUnits: number;
}): ReportRevenue | null {
  const { usePrices, usage, unitSqm, efficiencyPct, totalUnits } = p;
  if (totalUnits <= 0 || unitSqm <= 0) return null;
  const exclusivePy = unitSqm / PY;
  const supplyPy = ((unitSqm / Math.max(efficiencyPct, 1)) * 100) / PY;

  const saleRow = matchRow(usePrices.sale, usage);
  const rentRow = matchRow(usePrices.rentMonthly, usage);

  const sale =
    saleRow && saleRow.manPerPy > 0
      ? (() => {
          const areaPy = saleRow.exclusive ? exclusivePy : supplyPy;
          const perUnitWon = saleRow.manPerPy * 1e4 * areaPy;
          return {
            label: saleRow.label,
            manPerPy: saleRow.manPerPy,
            count: saleRow.count,
            basis: saleRow.basis,
            exclusive: saleRow.exclusive,
            areaPy,
            perUnitWon,
            totalWon: perUnitWon * totalUnits,
          };
        })()
      : null;
  const rent =
    rentRow && rentRow.manPerPy > 0
      ? (() => {
          const areaPy = rentRow.exclusive ? exclusivePy : supplyPy;
          const perUnitMonthlyWon = rentRow.manPerPy * 1e4 * areaPy;
          const monthlyWon = perUnitMonthlyWon * totalUnits;
          return {
            label: rentRow.label,
            manPerPy: rentRow.manPerPy,
            count: rentRow.count,
            basis: rentRow.basis,
            exclusive: rentRow.exclusive,
            areaPy,
            perUnitMonthlyWon,
            monthlyWon,
            yearlyWon: monthlyWon * 12,
          };
        })()
      : null;
  if (!sale && !rent) return null;
  const grossYieldPct =
    sale && rent && sale.totalWon > 0 ? (rent.yearlyWon / sale.totalWon) * 100 : 0;
  return {
    usage,
    totalUnits,
    unitExclusiveSqm: unitSqm,
    efficiencyPct,
    exclusivePy,
    supplyPy,
    periodMonths: usePrices.periodMonths,
    baseAddress: usePrices.baseAddress,
    sale,
    rent,
    grossYieldPct,
  };
}

export function fmtEokShort(won: number): string {
  if (won >= 1e8) return `${(won / 1e8).toFixed(1).replace(/\.0$/, "")}억`;
  return `${Math.round(won / 1e4).toLocaleString()}만원`;
}
