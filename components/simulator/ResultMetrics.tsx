"use client";

import { useSimulatorStore } from "@/store/simulator";
import { ZONES } from "@/lib/zones";
import { FLOOR_HEIGHT_M, PY_TO_SQM } from "@/lib/constants";
import { buildingFootprintSqm, lotPyToSqm } from "@/lib/calc/coverage";
import {
  floorsFromFarAndCov,
  legalGfaSqm,
  totalHeightM,
} from "@/lib/calc/far";
import {
  calcActualGfaSqm,
  sunlightLossPct,
} from "@/lib/calc/sunlight";
import {
  applyPilotiDeduction,
  calculateFloor1Indoor,
  calculateGroundParking,
} from "@/lib/calc/groundParking";
import { PARKING_STANDARDS } from "@/lib/parking-standards";
import {
  calcArea,
  calcProgressive,
  calcTieredHousehold,
} from "@/lib/calc/parking";
import { formatArea } from "@/lib/utils/area";

const fmt = (n: number, d = 0) =>
  n.toLocaleString("ko-KR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

function Card({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "info" | "success" | "danger";
}) {
  const valueColor =
    tone === "info"
      ? "text-[var(--info)]"
      : tone === "success"
        ? "text-[var(--success)]"
        : tone === "danger"
          ? "text-destructive"
          : "";
  return (
    <div className="bg-secondary rounded-md p-3">
      <div className="text-[11px] text-muted-foreground mb-0.5">{label}</div>
      <div className={`text-lg font-medium tabular-nums ${valueColor}`}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground/80">{sub}</div>
    </div>
  );
}

export function ResultMetrics() {
  const lotPy = useSimulatorStore((s) => s.lotPy);
  const covPct = useSimulatorStore((s) => s.covPct);
  const farPct = useSimulatorStore((s) => s.farPct);
  const sunOn = useSimulatorStore((s) => s.sunOn);
  const zone = useSimulatorStore((s) => s.zone);
  const parkingUsage = useSimulatorStore((s) => s.parkingUsage);
  const parkingAreaPerSpace = useSimulatorStore((s) => s.parkingAreaPerSpace);
  const parkingProgressiveSpec = useSimulatorStore(
    (s) => s.parkingProgressiveSpec,
  );
  const parkingHouseholds = useSimulatorStore((s) => s.parkingHouseholds);
  const parkingTierRatios = useSimulatorStore((s) => s.parkingTierRatios);
  const parkingMode = useSimulatorStore((s) => s.parkingMode);
  const parkingGroundRatio = useSimulatorStore((s) => s.parkingGroundRatio);
  const parkingUnitArea = useSimulatorStore((s) => s.parkingUnitArea);
  const parkingPilotiMode = useSimulatorStore((s) => s.parkingPilotiMode);

  const z = ZONES[zone];
  const lotSqm = lotPyToSqm(lotPy);
  const bldArea = buildingFootprintSqm(lotSqm, covPct);
  const gfa = legalGfaSqm(lotSqm, farPct);
  const floors = floorsFromFarAndCov(farPct, covPct);
  const heightM = totalHeightM(floors);
  const northDepth = Math.sqrt(bldArea);
  const actualGfa = calcActualGfaSqm({
    bldAreaSqm: bldArea,
    floors,
    northDepthM: northDepth,
    sunlightOn: sunOn && z.residential,
  });
  const loss = sunlightLossPct(gfa, actualGfa);

  // Day 10: 주차 대수 → 1층 영업 가능 + 필로티 효과 (연면적 차감)
  const std = PARKING_STANDARDS[parkingUsage];
  const spaces =
    std.mode === "area"
      ? calcArea(gfa, parkingAreaPerSpace).spaces
      : std.mode === "progressive"
        ? calcProgressive(gfa, parkingProgressiveSpec).spaces
        : calcTieredHousehold(
            std.seoulTiers,
            parkingHouseholds,
            parkingTierRatios,
          ).spaces;
  const gp = calculateGroundParking({
    placement: parkingMode,
    spaces,
    unitArea: parkingUnitArea,
    pilotiMode: parkingPilotiMode,
    groundRatioPct: parkingGroundRatio,
  });
  const floor1Usable = calculateFloor1Indoor(bldArea, gp.groundParkingArea);
  const actualGfaShown = applyPilotiDeduction(
    actualGfa,
    gp.groundParkingArea,
    gp.isReducingFloor1,
  );
  const isLockedOut = gp.groundParkingArea > 0 && floor1Usable <= 0;

  return (
    <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
      <Card
        label="대지면적"
        value={formatArea(lotSqm)}
        sub={`${lotPy}평`}
      />
      <Card
        label="건축면적 (1F)"
        value={formatArea(bldArea)}
        sub={`${fmt(bldArea / PY_TO_SQM, 0)}평`}
      />
      <Card
        label="1층 영업 가능 면적"
        value={formatArea(floor1Usable)}
        sub={
          gp.groundParkingArea > 0
            ? isLockedOut
              ? "1층 전체 주차 — 영업 공간 없음"
              : `주차 ${gp.groundSpaces}대 (${fmt(gp.groundParkingArea, 0)}㎡) 제외`
            : "주차 미배치 — 전체 1층 사용"
        }
        tone={isLockedOut ? "danger" : "info"}
      />
      <Card
        label="법정 연면적"
        value={formatArea(gfa, 0)}
        sub={`${fmt(gfa / PY_TO_SQM, 0)}평`}
      />
      <Card
        label="실제 가능 연면적"
        value={formatArea(actualGfaShown, 0)}
        sub={
          gp.isReducingFloor1
            ? `일조권+필로티 차감 (1층 주차 ${fmt(gp.groundParkingArea, 0)}㎡ 제외)`
            : sunOn && z.residential
              ? `일조권 손실 ${loss.toFixed(1)}%`
              : "일조권 미적용"
        }
        tone="success"
      />
      <Card
        label="층수 · 높이"
        value={`${(Math.round(floors * 10) / 10).toLocaleString("ko-KR")}층`}
        sub={`${fmt(heightM, 1)}m · 층고 ${FLOOR_HEIGHT_M}m 가정`}
      />
    </div>
  );
}
