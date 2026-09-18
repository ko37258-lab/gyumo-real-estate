"use client";

// 비용·사업성 스냅샷 훅 — 화면 탭들이 같은 계산원(lib/plan/finance)을 쓰게 한다.
import { useMemo } from "react";
import { useCostStore } from "@/store/cost";
import { useProfitStore } from "@/store/profit";
import { useSimulatorStore } from "@/store/simulator";
import { useLandInfoStore } from "@/store/landinfo";
import { usePlan } from "@/lib/plan/usePlan";
import { computeCostSnapshot, computeProfitSnapshot } from "@/lib/plan/finance";
import { scaleConstraintsFrom } from "@/lib/plan/scaleConstraints";

export function useCostSnapshot() {
  const plan = usePlan();
  const cost = useCostStore();
  return useMemo(() => computeCostSnapshot(cost, cost.linked, plan), [cost, plan]);
}

export function useProfitSnapshot() {
  const plan = usePlan();
  const costSnap = useCostSnapshot();
  const profit = useProfitStore();
  const usage = useSimulatorStore((s) => s.parkingUsage);
  const address = useSimulatorStore((s) => s.address);
  const land = useLandInfoStore((s) => s.data);
  return useMemo(() => {
    const landForThis = land && land.address === address ? land : null;
    const cons = scaleConstraintsFrom(landForThis ? landForThis.useAttrs ?? [] : undefined);
    const unresolved = cons.fetched ? cons.items.map((c) => c.label) : ["토지이용계획 미조회"];
    return {
      costSnap,
      snap: computeProfitSnapshot({ plan, cost: costSnap, profit, usage, unresolvedRegulations: unresolved }),
    };
  }, [plan, costSnap, profit, usage, address, land]);
}
