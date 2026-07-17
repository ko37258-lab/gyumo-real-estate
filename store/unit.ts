"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AreaUnit } from "@/lib/utils/area";

/**
 * ㎡ ↔ 평 표시 단위 토글 (플렉시티 [⇄ 평] 대응) — LocalStorage 영속.
 * 면적·단가(㎡당/평당) 표시가 이 단위를 따라 전환된다.
 */
type UnitState = {
  unit: AreaUnit;
  toggle: () => void;
};

export const useUnitStore = create<UnitState>()(
  persist(
    (set) => ({
      unit: "sqm",
      toggle: () => set((s) => ({ unit: s.unit === "sqm" ? "py" : "sqm" })),
    }),
    { name: "gyumo_area_unit" },
  ),
);
