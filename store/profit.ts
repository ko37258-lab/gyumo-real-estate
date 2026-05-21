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

type ProfitState = ProfitFields & {
  /** 사용자가 사업성 탭을 한 번이라도 조작했는지. PDF 사업성 페이지 포함 여부 결정. */
  touched: boolean;
  set: <K extends keyof ProfitFields>(key: K, value: ProfitFields[K]) => void;
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

export const useProfitStore = create<ProfitState>((set) => ({
  ...INITIAL,
  touched: false,
  set: (key, value) => {
    if (typeof value === "number" && !Number.isFinite(value)) return;
    set({ [key]: value, touched: true } as Partial<ProfitState>);
  },
  reset: () => set({ ...INITIAL, touched: false }),
}));
