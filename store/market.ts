"use client";

import { create } from "zustand";

/** /api/market 응답 — 주변 시세·임대료 (국토교통부 실거래가) */
export type TradeStat = {
  count: number;
  avgPy: number;
  medianPy: number;
  maxPy: number;
  minPy: number;
  samples: {
    name: string;
    dong: string;
    areaSqm: number;
    amount: number;
    pricePerPy: number;
    ym: string;
    floor?: string;
  }[];
} | null;

export type RentStat = {
  jeonseCount: number;
  avgJeonseDeposit: number;
  wolseCount: number;
  avgWolseDeposit: number;
  avgMonthlyRent: number;
  avgMonthlyRentPerPy: number;
  medianMonthlyRentPerPy: number;
  samples: {
    name: string;
    dong: string;
    areaSqm: number;
    deposit: number;
    monthlyRent: number;
    monthlyRentPerPy: number;
    ym: string;
  }[];
} | null;

export type MarketData = {
  lawdCd: string;
  months: number;
  fetchedAt: string;
  aptTrade: TradeStat;
  nrgTrade: TradeStat;
  aptRent: RentStat;
  offiRent: RentStat;
};

type MarketState = {
  data: MarketData | null;
  /** 조회 기준 주소 (보고서 표기용) */
  baseAddress: string | null;
  setMarket: (data: MarketData | null, baseAddress: string | null) => void;
};

export const useMarketStore = create<MarketState>((set) => ({
  data: null,
  baseAddress: null,
  setMarket: (data, baseAddress) => set({ data, baseAddress }),
}));
