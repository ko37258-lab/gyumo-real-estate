"use client";

import { create } from "zustand";
import type { CostInputs } from "@/lib/calc/cost";

type CostState = CostInputs & {
  set: <K extends keyof CostInputs>(key: K, value: CostInputs[K]) => void;
  reset: () => void;
};

const INITIAL: CostInputs = {
  // 기본 건축비
  abovePyeong: 300,
  // 지하 연면적 기본 0 — 요즘 지하 건축을 잘 하지 않는 추세 (운영자 결정 2026-07-17).
  // 필요 시 사용자가 슬라이더로 올려 반영.
  basementPyeong: 0,
  aboveUnit: 850,
  basementPremium: 150,
  softRate: 12,
  parkingSpaces: 8,
  parkingUnit: 1200,

  // 농지보전부담금 — 기본 off (수치 일치 위해)
  farmEnabled: false,
  farmArea: 660,
  farmPrice: 150000,
  farmRate: 30,
  farmCap: 50000,
  farmDiscount: 0,

  // 대체산림자원조성비 — 기본 off. 단가는 2026년 산림청 고시(제2026-16호) 기준:
  // 준보전산지 8,340원/㎡ · 보전산지 +30% · 산지전용제한지역 +100%(시행령 배율),
  // 공시지가 가산은 1000분의 1(0.1%) · 상한 8,340원/㎡.
  forestEnabled: false,
  forestArea: 660,
  forestBase: 8340,
  forestPrice: 80000,
  forestPublicRate: 0.1,
  forestAddRate: 0,
  forestDiscount: 0,

  // 개발부담금 — 기본 off
  devEnabled: false,
  endLandValue: 120000,
  startLandValue: 80000,
  normalIncrease: 5000,
  devCost: 20000,
  devRate: 25,
};

export const useCostStore = create<CostState>((set) => ({
  ...INITIAL,
  set: (key, value) => {
    if (typeof value === "number" && !Number.isFinite(value)) return;
    set({ [key]: value } as Partial<CostState>);
  },
  reset: () => set({ ...INITIAL }),
}));
