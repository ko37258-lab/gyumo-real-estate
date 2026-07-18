"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * 📁 내 프로젝트 이력 — 지번 조회 성공 시 자동 기록 (LocalStorage 영속).
 *
 * ⚠ 계정별 분리 필수: LocalStorage는 브라우저 단위라, 계정 구분 없이 저장하면
 *   공용 PC에서 앞 사람이 조회한 물건이 다음 로그인 사용자에게 노출된다.
 *   따라서 각 기록에 userId를 남기고, 화면에서는 현재 로그인 계정 것만 보여준다.
 *   (userId가 없는 과거 기록은 소유자를 알 수 없으므로 표시하지 않는다.)
 */
export type ProjectRecord = {
  /** 소유 계정 (Supabase auth user id) */
  userId: string;
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
  /** 같은 계정의 같은 필지만 삭제 */
  remove: (userId: string, pnu: string) => void;
  /** 현재 계정 기록만 전체 삭제 */
  clearAll: (userId: string) => void;
};

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      records: [],
      add: (r) =>
        set((s) => ({
          records: [
            r,
            // 같은 계정 + 같은 필지만 중복 제거 (다른 계정 기록은 보존)
            ...s.records.filter(
              (x) => !(x.userId === r.userId && x.pnu === r.pnu),
            ),
          ].slice(0, 300),
        })),
      remove: (userId, pnu) =>
        set((s) => ({
          records: s.records.filter(
            (x) => !(x.userId === userId && x.pnu === pnu),
          ),
        })),
      clearAll: (userId) =>
        set((s) => ({ records: s.records.filter((x) => x.userId !== userId) })),
    }),
    { name: "gyumo_project_history", version: 2 },
  ),
);
