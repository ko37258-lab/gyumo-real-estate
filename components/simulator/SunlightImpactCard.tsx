"use client";

// ☀️ 북측 일조 영향 진단 카드 — 동지 9~15시 그림자 스캔 결과.
// 실형상(지번 조회) 필지에서만 계산 가능. 계획 참고용임을 명시한다.

import { useMemo } from "react";
import { useSimulatorStore } from "@/store/simulator";
import { ZONES } from "@/lib/zones";
import { lotPyToSqm, buildingFootprintSqm } from "@/lib/calc/coverage";
import { floorsFromFarAndCov } from "@/lib/calc/far";
import { FLOOR_HEIGHT_M } from "@/lib/constants";
import { checkNorthSunlight } from "@/lib/calc/shadowCheck";

export default function SunlightImpactCard() {
  const zone = useSimulatorStore((s) => s.zone);
  const lotPy = useSimulatorStore((s) => s.lotPy);
  const covPct = useSimulatorStore((s) => s.covPct);
  const farPct = useSimulatorStore((s) => s.farPct);
  const sunOn = useSimulatorStore((s) => s.sunOn);
  const parcelShape = useSimulatorStore((s) => s.parcelShape);

  const result = useMemo(() => {
    if (!parcelShape) return null;
    const z = ZONES[zone];
    const lotSqm = lotPyToSqm(lotPy);
    const bldArea = buildingFootprintSqm(lotSqm, covPct);
    const floors = floorsFromFarAndCov(farPct, covPct);
    if (floors <= 0 || bldArea <= 0) return null;
    try {
      return checkNorthSunlight({
        shape: { pts: parcelShape.pts, northY: parcelShape.bounds.maxY },
        bldAreaSqm: bldArea,
        floors,
        floorHeightM: FLOOR_HEIGHT_M,
        sunlightOn: sunOn && z.sunlight,
        latDeg: parcelShape.centerLat,
        lonDeg: parcelShape.centerLon,
      });
    } catch {
      return null;
    }
  }, [parcelShape, zone, lotPy, covPct, farPct, sunOn]);

  if (!parcelShape) return null;
  if (!result) return null;

  const worstPass = result.rows.findIndex((r) => r.pass);
  const headline =
    worstPass === 0
      ? "경계 바로 북측(2m)부터 연속 2시간 일조가 확보됩니다."
      : worstPass < 0
        ? "20m 북측까지도 연속 2시간 일조가 확보되지 않습니다 — 이웃 민원·분쟁 리스크가 큽니다."
        : `북측 약 ${result.rows[worstPass].offsetM}m부터 연속 2시간 일조가 확보됩니다.`;

  return (
    <div className="rounded-md border border-border bg-card">
      <div className="px-3 py-2 border-b border-border bg-secondary/40">
        <div className="text-[13px] font-bold">☀️ 북측 일조 영향 진단 <span className="text-[11px] font-medium text-muted-foreground">동지 9~15시 그림자 스캔</span></div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          이 매스가 북측 이웃 땅에 남기는 일조 — 판례 수인한도(동지 9~15시 <b>연속 2시간</b>) 기준.
        </p>
      </div>
      <div className="p-3">
        <p className={`text-[12.5px] font-semibold mb-2 ${worstPass === 0 ? "text-green-700" : worstPass < 0 ? "text-red-700" : "text-amber-700"}`}>
          {headline}
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {result.rows.map((r) => (
            <div
              key={r.offsetM}
              className={`rounded border px-1.5 py-1.5 text-center ${
                r.pass ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"
              }`}
            >
              <div className="text-[10px] text-muted-foreground">북측 {r.offsetM}m</div>
              <div className={`text-[13px] font-bold tabular-nums ${r.pass ? "text-green-700" : "text-red-700"}`}>
                {r.maxRunH.toFixed(2).replace(/\.?0+$/, "")}h
              </div>
              <div className="text-[9.5px] text-muted-foreground">총 {r.totalH.toFixed(2).replace(/\.?0+$/, "")}h</div>
              <div className={`text-[10px] font-bold ${r.pass ? "text-green-700" : "text-red-700"}`}>
                {r.pass ? "충족" : "미달"}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
          ※ {result.basis}. 주변 기존 건물·지형·수목은 반영하지 않은 <b>계획 참고용</b>이며,
          실제 일조 분쟁 판단은 정밀 일조 시뮬레이션·전문가 감정이 필요합니다.
        </p>
      </div>
    </div>
  );
}
