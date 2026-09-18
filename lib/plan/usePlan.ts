"use client";

// 화면용 훅 — 스토어 값을 모아 computePlan 을 한 번 부른다.
// buildReportInputs(PDF)는 getState() 로 같은 planInputsFromState 를 쓴다(같은 입력 → 같은 결과).

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useSimulatorStore } from "@/store/simulator";
import { ZONES } from "@/lib/zones";
import { computePlan, type PlanInputs, type PlanResult } from "@/lib/plan/computePlan";

type SimSnapshot = ReturnType<typeof useSimulatorStore.getState>;

export function planInputsFromState(s: SimSnapshot): PlanInputs {
  const z = ZONES[s.zone];
  return {
    lotSqm: s.lotSqm,
    covPct: s.covPct,
    farPct: s.farPct,
    sunlightOn: Boolean(s.sunOn && z.sunlight),
    sunlightRule: s.sunlightRule,
    shape: s.parcelShape ? { pts: s.parcelShape.pts, northY: s.parcelShape.bounds.maxY } : null,
    floor1HeightM: s.floor1HeightM,
    typicalFloorHeightM: s.typicalFloorHeightM,
    parkingUsage: s.parkingUsage,
    parkingAreaPerSpace: s.parkingAreaPerSpace,
    parkingProgressiveSpec: s.parkingProgressiveSpec,
    parkingHouseholds: s.parkingHouseholds,
    parkingTierRatios: s.parkingTierRatios,
    parkingMode: s.parkingMode,
    parkingGroundRatio: s.parkingGroundRatio,
    parkingUnitArea: s.parkingUnitArea,
    parkingPilotiMode: s.parkingPilotiMode,
  };
}

export function planFromState(s: SimSnapshot = useSimulatorStore.getState()): PlanResult {
  return computePlan(planInputsFromState(s));
}

// 선택자는 스토어 원본 참조만 고른다(새 객체를 만들면 useShallow 가 매번 달라져 무한 렌더)
const pick = (s: SimSnapshot) => ({
  lotSqm: s.lotSqm,
  covPct: s.covPct,
  farPct: s.farPct,
  sunOn: s.sunOn,
  zone: s.zone,
  sunlightRule: s.sunlightRule,
  parcelShape: s.parcelShape,
  floor1HeightM: s.floor1HeightM,
  typicalFloorHeightM: s.typicalFloorHeightM,
  parkingUsage: s.parkingUsage,
  parkingAreaPerSpace: s.parkingAreaPerSpace,
  parkingProgressiveSpec: s.parkingProgressiveSpec,
  parkingHouseholds: s.parkingHouseholds,
  parkingTierRatios: s.parkingTierRatios,
  parkingMode: s.parkingMode,
  parkingGroundRatio: s.parkingGroundRatio,
  parkingUnitArea: s.parkingUnitArea,
  parkingPilotiMode: s.parkingPilotiMode,
});

export function usePlan(): PlanResult {
  const raw = useSimulatorStore(useShallow(pick));
  return useMemo(() => computePlan(planInputsFromState(raw as unknown as SimSnapshot)), [raw]);
}
