"use client";

import { create } from "zustand";
import type { ReportLandInfo } from "@/lib/ai/types";

/**
 * ① 지번 조회(LandLookup) 결과 스냅샷 — AI 보고서·PDF 주입용.
 * LandLookup이 조회 성공 시 기록하고, buildReportInputs가 주소 일치 시 포함한다.
 */
export type LandInfoData = ReportLandInfo;

type LandInfoState = {
  data: LandInfoData | null;
  setLandInfo: (data: LandInfoData | null) => void;
};

export const useLandInfoStore = create<LandInfoState>((set) => ({
  data: null,
  setLandInfo: (data) => set({ data }),
}));
