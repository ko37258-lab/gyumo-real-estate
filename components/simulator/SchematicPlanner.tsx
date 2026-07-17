"use client";

// ⑥ 가설계 (기획설계 개요) — 플렉시티 기획설계 벤치마킹 v1.
//
// 규모검토 결과(건축면적·층수) × 유닛 타입(전용면적·전용률) →
// 층당/총 세대수 + 기준층 개략 배치도(코어+유닛) + 주차 산정 원클릭 연동.
// 주거계 용도(공동주택·다세대연립·다가구·도시형생활주택·오피스텔)에서 활성.

import { useState } from "react";
import { useSimulatorStore } from "@/store/simulator";
import { SliderInputPair } from "@/components/ui/slider-input-pair";
import { lotPyToSqm, buildingFootprintSqm } from "@/lib/calc/coverage";
import { floorsFromFarAndCov } from "@/lib/calc/far";
import {
  calculateSchematic,
  UNIT_PRESETS,
} from "@/lib/calc/schematic";
import { PARKING_STANDARDS, type ParkingUsageCode } from "@/lib/parking-standards";
import { getUseStyle } from "@/lib/building-use";

/** ⑥ 활성 대상 (세대 개념이 있는 주거계 용도) */
const RESIDENTIAL_USAGES: ParkingUsageCode[] = [
  "공동주택",
  "다세대연립",
  "다가구",
  "도시형생활주택",
  "오피스텔",
];

/** 주차 tieredHousehold 배정 가능한 용도 (전용면적 티어 보유) */
const TIERED_USAGES: ParkingUsageCode[] = ["공동주택", "다세대연립", "오피스텔", "도시형생활주택"];

export function SchematicPlanner() {
  const lotPy = useSimulatorStore((s) => s.lotPy);
  const covPct = useSimulatorStore((s) => s.covPct);
  const farPct = useSimulatorStore((s) => s.farPct);
  const parkingUsage = useSimulatorStore((s) => s.parkingUsage);
  const parkingMode = useSimulatorStore((s) => s.parkingMode);
  const parkingPilotiMode = useSimulatorStore((s) => s.parkingPilotiMode);

  const [unitSqm, setUnitSqm] = useState(59);
  const [efficiency, setEfficiency] = useState(78);
  const [applied, setApplied] = useState(false);

  const isResidential = RESIDENTIAL_USAGES.includes(parkingUsage);
  const useStyle = getUseStyle(parkingUsage);

  const lotSqm = lotPyToSqm(lotPy);
  const floorArea = buildingFootprintSqm(lotSqm, covPct);
  const floors = floorsFromFarAndCov(farPct, covPct);
  const groundPiloti =
    (parkingMode === "ground" || parkingMode === "mixed") && parkingPilotiMode;

  const r = calculateSchematic({
    floorAreaSqm: floorArea,
    floors,
    exclusiveUnitSqm: unitSqm,
    efficiencyPct: efficiency,
    groundPiloti,
  });

  /** 세대수 → ⑤ 주차 산정 tieredHousehold 자동 배정 */
  const applyToParking = () => {
    const st = useSimulatorStore.getState();
    // 현 용도가 티어 배정 불가면 다세대연립(중소필지 통상 상품)으로 전환
    const target: ParkingUsageCode = TIERED_USAGES.includes(parkingUsage)
      ? parkingUsage
      : "다세대연립";
    const std = PARKING_STANDARDS[target];
    if (std.mode !== "tieredHousehold") return;
    if (target !== parkingUsage) st.setParkingUsage(target);
    const idx = std.seoulTiers.findIndex(
      (t) => t.upTo === null || unitSqm <= t.upTo,
    );
    std.seoulTiers.forEach((_, i) =>
      st.setParkingHousehold(i, i === idx ? r.totalUnits : 0),
    );
    setApplied(true);
    setTimeout(() => setApplied(false), 2500);
  };

  // ── 기준층 개략 배치도 (판상형 · 중앙 코어 가정) ──
  const diagram = (() => {
    if (!r.feasible) return null;
    const W = 640;
    const H = 96;
    const n = r.unitsPerFloor;
    // 코어 폭 = 유닛 폭의 55% (시각 개요용 근사)
    const coreRatio = 0.55;
    const unitW = W / (n + coreRatio);
    const coreW = unitW * coreRatio;
    const coreIdx = Math.floor(n / 2); // 중앙 코어
    const cells: Array<{ x: number; w: number; type: "unit" | "core"; label: string }> = [];
    let x = 0;
    for (let i = 0; i < n + 1; i++) {
      if (i === coreIdx) {
        cells.push({ x, w: coreW, type: "core", label: "코어" });
        x += coreW;
      }
      if (i < n) {
        cells.push({ x, w: unitW, type: "unit", label: `${unitSqm}` });
        x += unitW;
      }
    }
    return { W, H, cells };
  })();

  return (
    <div className="bg-secondary rounded-lg p-3.5 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-1">
        <div className="text-xs text-muted-foreground font-medium">
          ⑥ 가설계 · 기획설계 개요
          <span
            className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ color: useStyle.edge, background: `${useStyle.gradMid}33` }}
          >
            {useStyle.icon} {useStyle.usageLabel}
          </span>
        </div>
        <span className="text-[10px] text-muted-foreground/80">
          기준층 반복 · 판상형 중앙코어 가정 (개략 검토용)
        </span>
      </div>

      {!isResidential ? (
        <div className="px-3 py-2.5 rounded-md bg-card border border-border text-[11.5px] text-muted-foreground">
          ③ 규제값 조정의 <b className="text-foreground">건축물 용도</b>를 주거계(공동주택·다세대연립·다가구·도시형생활주택·오피스텔)로
          선택하면 세대 배치 가설계가 활성화됩니다. 현재 용도({useStyle.usageLabel})는 기준층
          임대면적 개념으로 ④ 시각화와 ⑤ 주차 산정을 활용하세요.
        </div>
      ) : (
        <>
          {/* 유닛 타입 선택 */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-muted-foreground min-w-[64px]">유닛 타입</span>
              {UNIT_PRESETS.map((p) => (
                <button
                  key={p.sqm}
                  type="button"
                  onClick={() => setUnitSqm(p.sqm)}
                  className={`text-[10.5px] font-semibold px-2 py-1 rounded-md border transition-colors ${
                    unitSqm === p.sqm
                      ? "bg-[var(--info)] text-[var(--info-foreground,#fff)] border-[var(--info)]"
                      : "bg-card text-muted-foreground border-border hover:bg-secondary"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <SliderInputPair
              label="전용면적"
              value={unitSqm}
              onChange={(v) => setUnitSqm(Math.round(v))}
              min={20}
              max={135}
              step={1}
              unit="㎡"
              conversion={`(${(unitSqm / 3.305785).toFixed(1)}평)`}
              inputMin={15}
              inputMax={300}
            />
            <SliderInputPair
              label="전용률"
              value={efficiency}
              onChange={(v) => setEfficiency(Math.round(v))}
              min={55}
              max={90}
              step={1}
              unit="%"
              hint="다세대·연립 75~85% · 아파트 70~80% 통상 (코어·복도 비중에 따라)"
              inputMin={40}
              inputMax={95}
            />
          </div>

          {/* 산출 결과 */}
          {r.feasible ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded-md bg-[var(--info-bg)] px-2.5 py-2">
                  <div className="text-[9.5px] font-semibold" style={{ color: "var(--info)" }}>
                    총 세대수
                  </div>
                  <div className="text-lg font-bold" style={{ color: "var(--info)" }}>
                    {r.totalUnits}세대
                  </div>
                  <div className="text-[9.5px] text-muted-foreground">
                    층당 {r.unitsPerFloor}세대 × {r.residentialFloors}개층
                    {groundPiloti ? " (1층 필로티)" : ""}
                  </div>
                </div>
                <div className="rounded-md bg-card border border-border px-2.5 py-2">
                  <div className="text-[9.5px] text-muted-foreground">세대 공급면적</div>
                  <div className="text-lg font-bold text-foreground">
                    {r.supplyPerUnitSqm}㎡
                  </div>
                  <div className="text-[9.5px] text-muted-foreground">
                    전용 {unitSqm}㎡ ÷ 전용률 {efficiency}%
                  </div>
                </div>
                <div className="rounded-md bg-card border border-border px-2.5 py-2">
                  <div className="text-[9.5px] text-muted-foreground">총 전용면적 합</div>
                  <div className="text-lg font-bold text-foreground">
                    {r.totalExclusiveSqm.toLocaleString("ko-KR")}㎡
                  </div>
                  <div className="text-[9.5px] text-muted-foreground">
                    ({Math.round(r.totalExclusiveSqm / 3.305785).toLocaleString("ko-KR")}평)
                  </div>
                </div>
                <div className="rounded-md bg-card border border-border px-2.5 py-2">
                  <div className="text-[9.5px] text-muted-foreground">기준층 코어·공용</div>
                  <div className="text-lg font-bold text-foreground">
                    {r.corePerFloorSqm}㎡
                  </div>
                  <div className="text-[9.5px] text-muted-foreground">
                    기준층 {Math.round(floorArea)}㎡ 중
                  </div>
                </div>
              </div>

              {/* 기준층 개략 배치도 */}
              {diagram && (
                <div className="rounded-md bg-card border border-border p-2.5">
                  <div className="text-[10px] text-muted-foreground mb-1.5">
                    기준층 개략 배치 (판상형 · 중앙 코어) — 전용 {unitSqm}㎡ × {r.unitsPerFloor}세대
                  </div>
                  <svg
                    width="100%"
                    viewBox={`0 0 ${diagram.W} ${diagram.H}`}
                    role="img"
                    aria-label="기준층 개략 배치도"
                  >
                    {diagram.cells.map((c, i) =>
                      c.type === "core" ? (
                        <g key={i}>
                          <rect
                            x={c.x + 1}
                            y={8}
                            width={c.w - 2}
                            height={diagram.H - 16}
                            fill="#9CA3AF"
                            opacity={0.5}
                            stroke="#4B5563"
                            strokeWidth={1}
                          />
                          <text
                            x={c.x + c.w / 2}
                            y={diagram.H / 2 - 4}
                            textAnchor="middle"
                            style={{ fontSize: 11, fontWeight: 700, fill: "#374151" }}
                          >
                            코어
                          </text>
                          <text
                            x={c.x + c.w / 2}
                            y={diagram.H / 2 + 12}
                            textAnchor="middle"
                            style={{ fontSize: 9, fill: "#4B5563" }}
                          >
                            계단·EV
                          </text>
                        </g>
                      ) : (
                        <g key={i}>
                          <rect
                            x={c.x + 1}
                            y={8}
                            width={c.w - 2}
                            height={diagram.H - 16}
                            fill={useStyle.gradMid}
                            opacity={0.8}
                            stroke={useStyle.edge}
                            strokeWidth={1}
                          />
                          <text
                            x={c.x + c.w / 2}
                            y={diagram.H / 2 - 4}
                            textAnchor="middle"
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              fill: "#ffffff",
                              paintOrder: "stroke",
                              stroke: useStyle.edge,
                              strokeWidth: 0.6,
                            }}
                          >
                            {c.label}㎡
                          </text>
                          <text
                            x={c.x + c.w / 2}
                            y={diagram.H / 2 + 12}
                            textAnchor="middle"
                            style={{ fontSize: 9, fill: "#ffffff", opacity: 0.9 }}
                          >
                            전용
                          </text>
                        </g>
                      ),
                    )}
                    {/* 정북 표기 (상단) */}
                    <text x={6} y={diagram.H - 2} style={{ fontSize: 8.5, fill: "#E24B4A" }}>
                      ↑ 북측 (일조 사선측)
                    </text>
                  </svg>
                </div>
              )}

              {/* 주차 연동 */}
              <button
                type="button"
                onClick={applyToParking}
                disabled={applied}
                className="w-full text-[11.5px] font-semibold px-2.5 py-1.5 rounded-md border transition-colors disabled:opacity-70"
                style={
                  applied
                    ? { background: "var(--info-bg)", borderColor: "var(--info)", color: "var(--info)" }
                    : { background: "var(--info)", borderColor: "var(--info)", color: "var(--info-foreground, #fff)" }
                }
              >
                {applied
                  ? "✓ ⑤ 주차 산정에 세대수 반영됨"
                  : `🚗 ⑤ 주차 산정에 ${r.totalUnits}세대 자동 반영 (전용 ${unitSqm}㎡ 구간)`}
              </button>
            </>
          ) : (
            <div className="px-3 py-2.5 rounded-md bg-amber-50 border border-amber-300 text-[11px] text-amber-800">
              ⚠ 기준층({Math.round(floorArea)}㎡)에 전용 {unitSqm}㎡(공급 {r.supplyPerUnitSqm}㎡) 유닛이
              들어가지 않습니다 — 유닛을 줄이거나 건폐율·대지면적을 확인하세요.
            </div>
          )}

          <p className="text-[9.5px] text-muted-foreground/80">
            ※ 기준층 반복·판상형 가정의 개략 검토입니다. 채광·인동거리·진입동선에 따라 실제 배치는
            달라지며, 정식 계획은 건축사 설계로 확정하세요. 발코니 확장·서비스면적은 미반영.
          </p>
        </>
      )}
    </div>
  );
}
