"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 📁 내 프로젝트 이력 — 지번 조회 성공 시 자동 기록 (LocalStorage 영속).
 * 같은 PNU 재조회 시 최신 정보로 갱신 + 맨 앞으로. 최대 100건 유지.
 */
export type ProjectRecord = {
  pnu: string;
  address: string;
  fetchedAt: string; // ISO
  areaSqm: number;
  zone?: string;
  jimok?: string;
  /** 실거래 기반 추정 토지가 (원) */
  estimatedPrice?: number;
  /** 개별공시지가 총액 (원) */
  jigaTotal?: number;
};

type HistoryState = {
  records: ProjectRecord[];
  add: (r: ProjectRecord) => void;
  remove: (pnu: string) => void;
  clearAll: () => void;
};

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      records: [],
      add: (r) =>
        set((s) => ({
          records: [r, ...s.records.filter((x) => x.pnu !== r.pnu)].slice(0, 100),
        })),
      remove: (pnu) =>
        set((s) => ({ records: s.records.filter((x) => x.pnu !== pnu) })),
      clearAll: () => set({ records: [] }),
    }),
    { name: "gyumo_project_history" },
  ),
);
