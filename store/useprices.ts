"use client";

import { create } from "zustand";
import type { ReportUsePrices } from "@/lib/ai/types";

/**
 * 용도별 분양가·임대료 팝업(/api/use-prices) 결과 캐시 —
 * 같은 pnu 재오픈 시 재호출 방지 + 보고서(usePrices 섹션) 주입용.
 */
type UsePricesState = {
  pnu: string | null;
  data: ReportUsePrices | null;
  setUsePrices: (pnu: string, data: ReportUsePrices) => void;
  clear: () => void;
};

export const useUsePricesStore = create<UsePricesState>((set) => ({
  pnu: null,
  data: null,
  setUsePrices: (pnu, data) => set({ pnu, data }),
  clear: () => set({ pnu: null, data: null }),
}));
