"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SliderInputPair } from "@/components/ui/slider-input-pair";
import { useSimulatorStore } from "@/store/simulator";
import { ZONES, getEffectiveFloorRatioMax } from "@/lib/zones";
import { SunlightLearnSheet } from "@/components/simulator/SunlightLearnSheet";

const SQM_PER_PYEONG = 3.305785; // 1평 = 3.305785㎡

export function ControlPanel() {
  // 대지면적 입력 단위 토글 ("py" 평 | "sqm" ㎡). store는 항상 평(lotPy) 기준 유지.
  const [areaUnit, setAreaUnit] = useState<"py" | "sqm">("py");
  const zone = useSimulatorStore((s) => s.zone);
  const lotPy = useSimulatorStore((s) => s.lotPy);
  const covPct = useSimulatorStore((s) => s.covPct);
  const farPct = useSimulatorStore((s) => s.farPct);
  const roadM = useSimulatorStore((s) => s.roadM);
  const sunOn = useSimulatorStore((s) => s.sunOn);
  const isCBD = useSimulatorStore((s) => s.isCBD);
  const setLotPy = useSimulatorStore((s) => s.setLotPy);
  const setCovPct = useSimulatorStore((s) => s.setCovPct);
  const setFarPct = useSimulatorStore((s) => s.setFarPct);
  const setRoadM = useSimulatorStore((s) => s.setRoadM);
  const setSunOn = useSimulatorStore((s) => s.setSunOn);
  const setIsCBD = useSimulatorStore((s) => s.setIsCBD);

  const z = ZONES[zone];
  const effectiveFarMax = getEffectiveFloorRatioMax(z, isCBD);
  const cbdAvailable = !!z.floorRatioCBD;

  return (
    <div className="bg-secondary rounded-lg p-3.5 space-y-3">
      <div className="text-xs text-muted-foreground font-medium">
        ③ 규제값 조정
      </div>

      <div className="space-y-1.5">
        {/* ㎡ ↔ 평 단위 토글 */}
        <div className="flex items-center justify-between gap-2">
          <Label className="text-[12.5px] font-medium text-foreground/90">
            대지면적
          </Label>
          <div className="inline-flex rounded-md border border-border overflow-hidden text-[11px]">
            {(["py", "sqm"] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => setAreaUnit(u)}
                className={`px-2 py-0.5 transition-colors ${
                  areaUnit === u
                    ? "bg-[var(--info)] text-[var(--info-foreground)] font-semibold"
                    : "bg-card text-muted-foreground hover:bg-secondary"
                }`}
                aria-pressed={areaUnit === u}
              >
                {u === "py" ? "평" : "㎡"}
              </button>
            ))}
          </div>
        </div>

        {areaUnit === "py" ? (
          <SliderInputPair
            value={lotPy}
            onChange={setLotPy}
            min={50}
            max={2000}
            step={10}
            unit="평"
            conversion={`(${Math.round(lotPy * SQM_PER_PYEONG).toLocaleString("ko-KR")}㎡)`}
            inputMin={0}
            inputMax={50000}
          />
        ) : (
          <SliderInputPair
            value={Math.round(lotPy * SQM_PER_PYEONG)}
            onChange={(sqm) => setLotPy(Math.round(sqm / SQM_PER_PYEONG))}
            min={165}
            max={6600}
            step={1}
            unit="㎡"
            conversion={`(${lotPy.toLocaleString("ko-KR")}평)`}
            inputMin={0}
            inputMax={165000}
          />
        )}
      </div>

      <SliderInputPair
        label="건폐율"
        value={covPct}
        onChange={setCovPct}
        min={0}
        max={100}
        step={1}
        unit="%"
        markers={[{ position: z.maxCov, label: `법정 ${z.maxCov}%` }]}
        shadeAboveMarker
        hint={
          covPct > z.maxCov ? (
            <span className="text-destructive">
              ⚠ 법정 한도 {z.maxCov}% 초과 — 인허가 불가 (시뮬레이션 전용)
            </span>
          ) : (
            `법정 최대 ${z.maxCov}% (1층 ${(lotPy * z.maxCov / 100).toFixed(0)}평)`
          )
        }
        inputMin={0}
        inputMax={100}
      />
      {covPct < z.maxCov * 0.8 && (
        <RegulationHint
          current={covPct}
          maxLegal={z.maxCov}
          currentFloor1Pyeong={(lotPy * covPct) / 100}
          maxFloor1Pyeong={(lotPy * z.maxCov) / 100}
          onApplyMax={() => setCovPct(z.maxCov)}
          unit="평 (1층 건축면적)"
        />
      )}

      <SliderInputPair
        label="용적률"
        value={farPct}
        onChange={setFarPct}
        min={0}
        max={1500}
        step={10}
        unit="%"
        markers={[
          {
            position: effectiveFarMax,
            label: `법정 ${effectiveFarMax.toLocaleString("ko-KR")}%${isCBD && z.floorRatioCBD ? " (도심)" : ""}`,
          },
        ]}
        shadeAboveMarker
        hint={
          farPct > effectiveFarMax ? (
            <span className="text-destructive">
              ⚠ 법정 한도 {effectiveFarMax.toLocaleString("ko-KR")}% 초과 — 인허가 불가 (시뮬레이션 전용)
            </span>
          ) : (
            <>
              법정 {z.farMin}~{effectiveFarMax.toLocaleString("ko-KR")}% (최대 연면적 {((lotPy * effectiveFarMax) / 100).toLocaleString("ko-KR")}평)
              {cbdAvailable && (
                <span className="ml-2 text-muted-foreground/80 text-[10px]">
                  · 일반 {z.floorRatioMax}% / 도심 {z.floorRatioCBD}%
                </span>
              )}
            </>
          )
        }
        inputMin={0}
        inputMax={3000}
      />
      {farPct < effectiveFarMax * 0.8 && farPct <= effectiveFarMax && (
        <RegulationHint
          current={farPct}
          maxLegal={effectiveFarMax}
          currentFloor1Pyeong={(lotPy * farPct) / 100}
          maxFloor1Pyeong={(lotPy * effectiveFarMax) / 100}
          onApplyMax={() => setFarPct(effectiveFarMax)}
          unit="평 (법정 연면적)"
        />
      )}

      {cbdAvailable && (
        <div className="flex items-center gap-3 pt-1">
          <Label
            htmlFor="cbd-switch"
            className="text-xs text-muted-foreground min-w-[78px]"
          >
            🏛️ 서울도심
          </Label>
          <Switch id="cbd-switch" checked={isCBD} onCheckedChange={setIsCBD} />
          <span className="text-[11px] text-muted-foreground/80 flex-1">
            사대문 안(종로·중구) 특례 — 용적률 {z.floorRatioCBD}% 적용
          </span>
        </div>
      )}

      <SliderInputPair
        label="전면도로"
        value={roadM}
        onChange={setRoadM}
        min={3}
        max={20}
        step={1}
        unit="m"
        inputMin={0}
        inputMax={100}
      />

      <div className="flex items-center gap-3 pt-2 border-t border-border">
        <Label
          htmlFor="sun-switch"
          className="text-xs text-muted-foreground min-w-[78px]"
        >
          일조권 사선
        </Label>
        <Switch
          id="sun-switch"
          checked={sunOn}
          onCheckedChange={setSunOn}
          disabled={!z.residential}
        />
        <span className="text-[11px] text-muted-foreground/80 flex-1">
          {z.residential
            ? "주거지역(전용/일반) · 정북방향 (시행령 86조, 2023.9.12 개정 10m 기준)"
            : "상업·공업지역 · 일조권 사선제한 비적용"}
        </span>
        <SunlightLearnSheet />
      </div>

      <p className="text-[10px] text-muted-foreground/80 pt-2 border-t border-border/60">
        ⚖️ 출처: 서울특별시 도시계획 조례 (2026 기준) · 검토: 고상철 대표
      </p>
    </div>
  );
}

function RegulationHint({
  current,
  maxLegal,
  currentFloor1Pyeong,
  maxFloor1Pyeong,
  onApplyMax,
  unit,
}: {
  current: number;
  maxLegal: number;
  currentFloor1Pyeong: number;
  maxFloor1Pyeong: number;
  onApplyMax: () => void;
  unit: string;
}) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2.5 flex items-start gap-2">
      <span className="text-amber-600 text-base leading-none mt-0.5">⚠️</span>
      <div className="flex-1 min-w-0 text-[11.5px] leading-relaxed text-amber-900">
        <div className="font-semibold">
          법정 최대 {maxLegal.toLocaleString("ko-KR")}% 대비{" "}
          <span className="tabular-nums">{current.toLocaleString("ko-KR")}%</span>로 설정됨
        </div>
        <div className="mt-1 text-amber-800">
          디벨로퍼는 일반적으로 사업성 극대화를 위해 법정 최대치를 선택합니다.
          현재{" "}
          <span className="font-medium tabular-nums">
            {currentFloor1Pyeong.toFixed(0)}
          </span>
          {unit} / 법정 최대 사용 시{" "}
          <span className="font-medium tabular-nums">
            {maxFloor1Pyeong.toFixed(0)}
          </span>
          {unit}.
        </div>
        <button
          type="button"
          onClick={onApplyMax}
          className="mt-1.5 underline text-amber-900 font-semibold hover:text-amber-700"
        >
          법정 최대 {maxLegal}%로 설정 →
        </button>
      </div>
    </div>
  );
}
