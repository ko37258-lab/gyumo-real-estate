"use client";

import { create } from "zustand";
import type { RepaymentMethod } from "@/lib/calc/loan";
import type { RevenueModel } from "@/lib/calc/profit";

type ProfitFields = {
  landPricePerPyeong: number;
  landAcquisitionCost: number;
  revenueModel: RevenueModel;
  salesPricePerPyeong: number;
  salesRate: number;
  monthlyRentPerPyeong: number;
  deposit: number;
  annualOccupancy: number;
  ltvRatio: number;
  loanAmountOverride: number | null;
  annualInterestRate: number;
  loanPeriodYears: number;
  repaymentMethod: RepaymentMethod;
  projectDurationMonths: number;
  salesStartMonth: number;
};

/** 가격 입력의 출처 — 없으면 초기 기본값(미검증) */
export type PriceSource =
  | "user"                 // 사용자가 직접 입력(실제 매입가·분양가 가정)
  | "estimate-land-trades" // 토지 실거래 통계 추정가
  | "estimate-nearby"      // 사업성 탭 인근 거래 버튼
  | "estimate-newbuild-res" // 인근 신축 '주거' 매매 시세
  | "estimate-schematic";  // 가설계 세대 기반(주거)

export const PRICE_SOURCE_LABEL: Record<PriceSource, string> = {
  user: "사용자 입력",
  "estimate-land-trades": "토지 실거래 통계 추정가",
  "estimate-nearby": "인근 거래 참고값",
  "estimate-newbuild-res": "인근 신축 주거 시세",
  "estimate-schematic": "가설계 주거 시세 환산",
};

type ProfitState = ProfitFields & {
  /** 값별 출처 — 없는 키는 초기 기본값(미검증) */
  sources: Partial<Record<keyof ProfitFields, PriceSource>>;
  /** 사용자가 사업성 탭을 한 번이라도 조작했는지. PDF 사업성 페이지 포함 여부 결정. */
  touched: boolean;
  set: <K extends keyof ProfitFields>(key: K, value: ProfitFields[K], source?: PriceSource) => void;
  reset: () => void;
};

const INITIAL: ProfitFields = {
  landPricePerPyeong: 4000,
  landAcquisitionCost: 5,
  revenueModel: "sales",
  salesPricePerPyeong: 4500,
  salesRate: 90,
  monthlyRentPerPyeong: 20,
  deposit: 12,
  annualOccupancy: 95,
  ltvRatio: 60,
  loanAmountOverride: null,
  annualInterestRate: 6,
  loanPeriodYears: 3,
  repaymentMethod: "bullet",
  projectDurationMonths: 18,
  salesStartMonth: 0,
};

export const useProfitStore = create<ProfitState>((set, get) => ({
  ...INITIAL,
  touched: false,
  sources: {},
  set: (key, value, source = "user") => {
    if (typeof value === "number" && !Number.isFinite(value)) return;
    set({
      [key]: value,
      touched: true,
      sources: { ...get().sources, [key]: source },
    } as Partial<ProfitState>);
  },
  reset: () => set({ ...INITIAL, touched: false, sources: {} }),
}));
