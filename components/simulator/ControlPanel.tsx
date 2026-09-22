"use client";

import { useState } from "react";
import { Icon } from '@/components/ui/icon'
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SliderInputPair } from "@/components/ui/slider-input-pair";
import { useSimulatorStore } from "@/store/simulator";
import { ZONES, getEffectiveFloorRatioMax } from "@/lib/zones";
import {
  PARKING_USAGE_LIST,
  type ParkingUsageCode,
} from "@/lib/parking-standards";
import { getUseStyle } from "@/lib/building-use";
import { SunlightLearnSheet } from "@/components/simulator/SunlightLearnSheet";
import { lotPyToSqm, buildingFootprintSqm } from "@/lib/calc/coverage";
import { floorsFromFarAndCov } from "@/lib/calc/far";
import { actualGfaPrecise } from "@/lib/report/floorTable";
import {
  compareRulesByFloor,
  sunlightLossPct,
  sunlightRuleForDate,
  todayYmd,
  REVISED_EFFECTIVE_DATE,
  SUNLIGHT_RULE_META,
  type SunlightRule,
} from "@/lib/calc/sunlight";
import { FLOOR_HEIGHT_M } from "@/lib/constants";
import { formatArea } from "@/lib/utils/area";
import type { ParcelShape } from "@/lib/geo/parcel";

const SQM_PER_PYEONG = 3.305785; // 1평 = 3.305785㎡

export function ControlPanel() {
  // 대지면적 입력 단위 토글 ("py" 평 | "sqm" ㎡). store 원본은 항상 ㎡(lotSqm) 정밀값.
  const [areaUnit, setAreaUnit] = useState<"py" | "sqm">("sqm");
  const zone = useSimulatorStore((s) => s.zone);
  const lotPy = useSimulatorStore((s) => s.lotPy);
  const lotSqm = useSimulatorStore((s) => s.lotSqm);
  const lotAreaSource = useSimulatorStore((s) => s.lotAreaSource);
  const officialLotSqm = useSimulatorStore((s) => s.officialLotSqm);
  const setLotSqm = useSimulatorStore((s) => s.setLotSqm);
  const setOfficialLotSqm = useSimulatorStore((s) => s.setOfficialLotSqm);
  const roadMSource = useSimulatorStore((s) => s.roadMSource);
  const floor1HeightM = useSimulatorStore((s) => s.floor1HeightM);
  const typicalFloorHeightM = useSimulatorStore((s) => s.typicalFloorHeightM);
  const setFloor1HeightM = useSimulatorStore((s) => s.setFloor1HeightM);
  const setTypicalFloorHeightM = useSimulatorStore((s) => s.setTypicalFloorHeightM);
  const permitDate = useSimulatorStore((s) => s.permitDate);
  const setPermitDate = useSimulatorStore((s) => s.setPermitDate);
  const covPct = useSimulatorStore((s) => s.covPct);
  const farPct = useSimulatorStore((s) => s.farPct);
  const roadM = useSimulatorStore((s) => s.roadM);
  const sunOn = useSimulatorStore((s) => s.sunOn);
  const isCBD = useSimulatorStore((s) => s.isCBD);
  const parkingUsage = useSimulatorStore((s) => s.parkingUsage);
  const setParkingUsage = useSimulatorStore((s) => s.setParkingUsage);
  const setLotPy = useSimulatorStore((s) => s.setLotPy);
  const setCovPct = useSimulatorStore((s) => s.setCovPct);
  const setFarPct = useSimulatorStore((s) => s.setFarPct);
  const setRoadM = useSimulatorStore((s) => s.setRoadM);
  const setSunOn = useSimulatorStore((s) => s.setSunOn);
  const sunlightRule = useSimulatorStore((s) => s.sunlightRule);
  const setSunlightRule = useSimulatorStore((s) => s.setSunlightRule);
  const parcelShape = useSimulatorStore((s) => s.parcelShape);
  const setIsCBD = useSimulatorStore((s) => s.setIsCBD);
  const ordinance = useSimulatorStore((s) => s.ordinance);
  const parkingLawdCd = useSimulatorStore((s) => s.parkingLawdCd);

  const z = ZONES[zone];
  // 지자체 조례 상한이 확인된 경우(서울 외 지역) 그 값을 최우선으로 쓴다.
  // 서울은 ordinance가 항상 null이라 zones.ts의 서울도심 특례(CBD)가 그대로 산다.
  const maxCov = ordinance?.coverRatioMax ?? z.maxCov;
  const effectiveFarMax = ordinance?.floorRatioMax ?? getEffectiveFloorRatioMax(z, isCBD);
  const cbdAvailable = !ordinance && !!z.floorRatioCBD;
  const useStyle = getUseStyle(parkingUsage);

  return (
    <div className="bg-secondary rounded-lg p-3.5 space-y-3">
      <div className="text-xs text-muted-foreground font-medium">
        ③ 규제값 조정
      </div>

      {/* 건축물 용도 — 선택 시 ④ 매스 시각화가 용도별 색·입면으로 그려지고
          ⑤ 주차 산정 용도와 자동 연동된다. */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-[12.5px] font-medium text-foreground/90">
            건축물 용도
          </Label>
          <span
            className="inline-flex items-center gap-1 text-[10.5px] font-medium px-1.5 py-0.5 rounded"
            style={{ color: useStyle.edge, background: `${useStyle.gradMid}33` }}
          >
            <Icon name={useStyle.icon} /> {useStyle.label}
          </span>
        </div>
        <Select
          value={parkingUsage}
          onValueChange={(v) => setParkingUsage(v as ParkingUsageCode)}
        >
          <SelectTrigger className="w-full">
            <SelectValue>
              {(value: ParkingUsageCode) => {
                const s = getUseStyle(value);
                return `${s.usageLabel}`;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PARKING_USAGE_LIST.map((s) => {
              const st = getUseStyle(s.code);
              return (
                <SelectItem key={s.code} value={s.code}>
                  <Icon name={st.icon} /> {s.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <p className="text-[10px] text-muted-foreground/80">
          선택한 용도에 따라 ④ 매스 시각화의 색·외관이 바뀌고 ⑤ 주차 산정과 연동됩니다.
        </p>
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
            conversion={`(${lotSqm.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}㎡)`}
            inputMin={0}
            inputMax={50000}
          />
        ) : (
          <SliderInputPair
            value={Math.round(lotSqm * 100) / 100}
            onChange={(sqm) => setLotSqm(sqm)}
            min={165}
            max={6600}
            step={0.1}
            unit="㎡"
            conversion={`(${lotPy.toLocaleString("ko-KR", { maximumFractionDigits: 2 })}평)`}
            inputMin={0}
            inputMax={165000}
          />
        )}
        <LotAreaProvenance
          lotSqm={lotSqm}
          source={lotAreaSource}
          officialLotSqm={officialLotSqm}
          shapeSqm={parcelShape?.areaSqm ?? null}
          onRestore={officialLotSqm ? () => setOfficialLotSqm(officialLotSqm) : undefined}
        />
      </div>

      <SliderInputPair
        label="건폐율"
        value={covPct}
        onChange={setCovPct}
        min={0}
        max={100}
        step={1}
        unit="%"
        markers={[{ position: maxCov, label: `법정 ${maxCov}%` }]}
        shadeAboveMarker
        hint={
          covPct > maxCov ? (
            <span className="text-destructive">
              <Icon name="warning" /> 법정 한도 {maxCov}% 초과 — 인허가 불가 (시뮬레이션 전용)
            </span>
          ) : (
            `법정 최대 ${maxCov}% (1층 ${(lotPy * maxCov / 100).toFixed(0)}평)`
          )
        }
        inputMin={0}
        inputMax={100}
      />
      {covPct < maxCov * 0.8 && (
        <RegulationHint
          current={covPct}
          maxLegal={maxCov}
          currentFloor1Pyeong={(lotPy * covPct) / 100}
          maxFloor1Pyeong={(lotPy * maxCov) / 100}
          onApplyMax={() => setCovPct(maxCov)}
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
              <Icon name="warning" /> 법정 한도 {effectiveFarMax.toLocaleString("ko-KR")}% 초과 — 인허가 불가 (시뮬레이션 전용)
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
            <Icon name="courthouse" /> 서울도심
          </Label>
          <Switch id="cbd-switch" checked={isCBD} onCheckedChange={setIsCBD} />
          <span className="text-[11px] text-muted-foreground/80 flex-1">
            사대문 안(종로·중구) 특례 — 용적률 {z.floorRatioCBD}% 적용
          </span>
        </div>
      )}

      {/* 지자체 조례 자동 적용 안내 — 서울 외 지역이 조례 DB에 있으면 그 값을,
          없으면 국토계획법 시행령 상한(정직한 폴백)임을 밝힌다. */}
      {ordinance ? (
        <div className="flex items-start gap-2 rounded-md bg-[var(--info-bg)] border border-[var(--info)]/25 px-3 py-2">
          <span className="text-sm shrink-0"><Icon name="pin" /></span>
          <div className="text-[11px] leading-relaxed">
            <span className="font-medium text-foreground">
              {ordinance.regionName} 도시계획조례 자동 적용
            </span>
            {ordinance.hasPreciseSource ? (
              <>
                <span className="text-muted-foreground"> — {ordinance.source}</span>
                <a
                  href={ordinance.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1.5 text-[var(--info)] hover:underline"
                >
                  원문 확인 ↗
                </a>
              </>
            ) : (
              <a
                href="https://www.law.go.kr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-[var(--info)] hover:underline"
              >
                {` — 건폐율·용적률 수치는 국가법령정보센터 자치법규 원문 대조 완료. 조문 링크는 국가법령정보센터에서 “${ordinance.regionName} 도시계획 조례”로 직접 검색해주세요 ↗`}
              </a>
            )}
          </div>
        </div>
      ) : (
        parkingLawdCd &&
        !parkingLawdCd.startsWith("11") && (
          <div className="text-[10.5px] text-muted-foreground/80 px-1">
            ⓘ 이 지역 조례 데이터가 아직 없어 국토계획법 시행령 상한을 기준으로
            표시했습니다. 실제 조례가 더 강화·완화되어 있을 수 있으니 인허가 전
            해당 지자체에 확인하세요.
          </div>
        )
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
        hint={
          roadMSource === "assumed" ? (
            <span className="text-amber-700">
              ⓘ 가정값 — 지번 조회는 인접 도로 존재만 확인하고 폭은 {roadM}m로 가정합니다. 실측·도로대장 폭이 아닙니다.
            </span>
          ) : (
            "사용자 입력값"
          )
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SliderInputPair
          label="1층 층고"
          value={floor1HeightM}
          onChange={setFloor1HeightM}
          min={3}
          max={7}
          step={0.1}
          unit="m"
          inputMin={2.4}
          inputMax={10}
        />
        <SliderInputPair
          label="기준층 층고"
          value={typicalFloorHeightM}
          onChange={setTypicalFloorHeightM}
          min={2.8}
          max={5}
          step={0.1}
          unit="m"
          inputMin={2.4}
          inputMax={8}
        />
      </div>
      <p className="text-[10px] text-muted-foreground/80 -mt-1">
        높이 = 1층 층고 + 기준층 층고 × (층수−1), 지표면 기준. 옥탑·파라펫·설비 높이는 포함하지 않습니다.
      </p>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 border-t border-border">
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
          disabled={!z.sunlight}
        />
        <span className="text-[11px] text-muted-foreground/80 flex-1 min-w-[180px] order-last basis-full sm:basis-auto sm:order-none">
          {z.sunlight
            ? "전용·일반주거지역 · 정북방향 (건축법 61조① — 2026.8.11 개정 · 11.12 시행)"
            : z.code === "junju"
              ? "준주거지역 · 정북 일조권 미적용 (61조①은 전용·일반주거만 — 공동주택 채광기준은 별도)"
              : "전용·일반주거지역 외 · 정북 일조권 사선제한 비적용"}
        </span>
        <SunlightLearnSheet />
      </div>

      {sunOn && z.sunlight && (
        <SunlightRulePicker
          rule={sunlightRule}
          onChange={setSunlightRule}
          permitDate={permitDate}
          onPermitDate={setPermitDate}
          lotPy={lotPy}
          covPct={covPct}
          farPct={farPct}
          parcelShape={parcelShape}
        />
      )}

      <p className="text-[10px] text-muted-foreground/80 pt-2 border-t border-border/60">
        <Icon name="scale" /> 출처: 서울특별시 도시계획 조례 (2026 기준) · 검토: 고상철 대표
      </p>
    </div>
  );
}

/**
 * 일조 규칙 선택 + 개정 전·후 비교 카드.
 * 원칙은 개정 후(2026.11.12 시행). [개정 전 보기]를 누르면 시뮬레이터 전체(2D·3D·KPI·보고서)가
 * 개정 전 규칙으로 바뀌고, 아래에 층별 이격·연면적 차이가 나란히 표시된다.
 */
function SunlightRulePicker({
  rule,
  onChange,
  permitDate,
  onPermitDate,
  lotPy,
  covPct,
  farPct,
  parcelShape,
}: {
  rule: SunlightRule;
  onChange: (r: SunlightRule) => void;
  permitDate: string | null;
  onPermitDate: (v: string | null) => void;
  lotPy: number;
  covPct: number;
  farPct: number;
  parcelShape: ParcelShape | null;
}) {
  const lotSqm = lotPyToSqm(lotPy);
  const bldArea = buildingFootprintSqm(lotSqm, covPct);
  const floors = floorsFromFarAndCov(farPct, covPct);
  const legalGfa = (lotSqm * farPct) / 100;
  const shape = parcelShape
    ? { pts: parcelShape.pts, northY: parcelShape.bounds.maxY }
    : null;
  const gfa = (r: SunlightRule) =>
    actualGfaPrecise({
      bldAreaSqm: bldArea,
      floors,
      floorHeightM: FLOOR_HEIGHT_M,
      sunlightOn: true,
      shape,
      rule: r,
    });
  const legacyGfa = gfa("legacy");
  const revisedGfa = gfa("revised");
  const diff = revisedGfa - legacyGfa;
  const rows = compareRulesByFloor(floors, FLOOR_HEIGHT_M);
  const gained = rows.filter((r) => r.gainM > 0.01);
  const meta = SUNLIGHT_RULE_META[rule];

  return (
    <div className="rounded-md border border-border bg-card/70 p-2.5 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
          적용 규칙
        </span>
        <div className="flex rounded-md border border-border overflow-hidden">
          {(["revised", "legacy"] as SunlightRule[]).map((r) => {
            const active = rule === r;
            return (
              <button
                key={r}
                type="button"
                onClick={() => onChange(r)}
                className={`px-2.5 py-1 text-[11.5px] whitespace-nowrap transition ${
                  active
                    ? "bg-[var(--info)] text-white font-semibold"
                    : "bg-background text-muted-foreground hover:bg-secondary"
                }`}
              >
                {r === "revised" ? "개정 후" : "개정 전"}
              </button>
            );
          })}
        </div>
        <span className="text-[10.5px] text-muted-foreground/80">
          {meta.basis} · {meta.effective}
        </span>
      </div>

      {/* 기준일 — 부칙: 시행일(2026.11.12) 이후 건축허가·심의·신고 신청분부터 개정 후 규정 */}
      <div className="flex items-center gap-2 flex-wrap text-[11px]">
        <label htmlFor="permit-date" className="text-muted-foreground whitespace-nowrap">
          허가·신고 신청 예정일
        </label>
        <input
          id="permit-date"
          type="date"
          value={permitDate ?? ""}
          onChange={(e) => onPermitDate(e.target.value || null)}
          className="border border-border rounded px-1.5 py-0.5 bg-background text-[11px]"
        />
        <span className="text-muted-foreground/90">
          기준일 {permitDate ?? `${todayYmd()}(검토일)`} → 적용 규정{" "}
          <b>{SUNLIGHT_RULE_META[sunlightRuleForDate(permitDate ?? todayYmd())].short}</b>
          {rule !== sunlightRuleForDate(permitDate ?? todayYmd()) && (
            <span className="text-amber-700"> · 지금은 비교용으로 {SUNLIGHT_RULE_META[rule].short} 규정을 보고 있습니다</span>
          )}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground/80 -mt-1">
        개정 규정은 {REVISED_EFFECTIVE_DATE} 이후 건축허가·심의·신고를 신청하는 분부터 적용(부칙). 심의와 허가 시점이 다른 사업은 관할청에 적용 기준을 확인하세요.
      </p>

      <div className="grid grid-cols-3 gap-1.5 text-[10.5px]">
        {meta.tiers.map((t) => (
          <div key={t.range} className="rounded bg-secondary/70 px-2 py-1">
            <div className="text-muted-foreground leading-tight">{t.range}</div>
            <div className="font-semibold tabular-nums">{t.setback}</div>
          </div>
        ))}
      </div>

      {rule === "legacy" && (
        <div className="rounded-md border border-[var(--info)]/40 bg-[var(--info-bg)]/60 p-2.5 space-y-2">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-[12px] font-semibold text-[var(--info)] whitespace-nowrap">
              개정 전 → 후, 무엇이 좋아졌나
            </span>
            <span className="text-[10.5px] text-muted-foreground">
              현재 조건({floors.toFixed(1)}층 · 층고 {FLOOR_HEIGHT_M}m) 기준
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded bg-background px-2 py-1.5">
              <div className="text-[10px] text-muted-foreground">개정 전 실제 연면적</div>
              <div className="text-[12px] font-semibold tabular-nums">{formatArea(legacyGfa, 0)}</div>
              <div className="text-[10px] text-muted-foreground">
                손실 {sunlightLossPct(legalGfa, legacyGfa).toFixed(1)}%
              </div>
            </div>
            <div className="rounded bg-background px-2 py-1.5 border border-[var(--info)]/50">
              <div className="text-[10px] text-muted-foreground">개정 후 실제 연면적</div>
              <div className="text-[12px] font-semibold tabular-nums text-[var(--info)]">
                {formatArea(revisedGfa, 0)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                손실 {sunlightLossPct(legalGfa, revisedGfa).toFixed(1)}%
              </div>
            </div>
            <div className="rounded bg-background px-2 py-1.5">
              <div className="text-[10px] text-muted-foreground">차이</div>
              <div
                className={`text-[12px] font-semibold tabular-nums ${
                  diff > 0.5 ? "text-[var(--info)]" : ""
                }`}
              >
                {diff >= 0 ? "+" : ""}
                {Math.round(diff).toLocaleString("ko-KR")}㎡
              </div>
              <div className="text-[10px] text-muted-foreground">
                {diff >= 0 ? "+" : ""}
                {(diff / SQM_PER_PYEONG).toFixed(1)}평
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded border border-border bg-background">
            <table className="w-full text-[10.5px] tabular-nums">
              <thead className="bg-secondary text-muted-foreground">
                <tr>
                  <th className="px-2 py-1 text-left font-medium whitespace-nowrap">층</th>
                  <th className="px-2 py-1 text-right font-medium whitespace-nowrap">상단 높이</th>
                  <th className="px-2 py-1 text-right font-medium whitespace-nowrap">개정 전 이격</th>
                  <th className="px-2 py-1 text-right font-medium whitespace-nowrap text-[var(--info)]">개정 후 이격</th>
                  <th className="px-2 py-1 text-right font-medium whitespace-nowrap">완화</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.floor}
                    className={`border-t border-border ${
                      r.gainM > 0.01 ? "bg-[var(--info-bg)]/70 font-medium" : ""
                    }`}
                  >
                    <td className="px-2 py-1">{r.floor}F</td>
                    <td className="px-2 py-1 text-right">{r.heightM.toFixed(1)}m</td>
                    <td className="px-2 py-1 text-right">{r.legacyM.toFixed(2)}m</td>
                    <td className="px-2 py-1 text-right">{r.revisedM.toFixed(2)}m</td>
                    <td className="px-2 py-1 text-right">
                      {r.gainM > 0.01 ? `−${r.gainM.toFixed(2)}m` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-[10.5px] leading-relaxed text-foreground/85">
            {gained.length > 0 ? (
              <>
                <b>{gained.map((r) => `${r.floor}F`).join("·")}</b> 부분(10~17m 구간)의
                이격이 <b>5m 고정</b>으로 줄어 북측이 덜 깎입니다. 17m부터는 두 규칙이 같아
                차이가 없습니다.
              </>
            ) : floors * FLOOR_HEIGHT_M <= 10 ? (
              <>10m 이하 저층이라 두 규칙 모두 1.5m 이격 — 이 규모에선 차이가 없습니다.</>
            ) : (
              <>현재 층 구성에는 10~17m 구간 층 상단이 없어 차이가 없습니다.</>
            )}{" "}
            시행 전(2026.11.11까지) 신청분은 개정 전 기준으로 심사됩니다.
          </p>
          <button
            type="button"
            onClick={() => onChange("revised")}
            className="text-[11px] text-[var(--info)] hover:underline"
          >
            개정 후 규정으로 비교해 보기 →
          </button>
        </div>
      )}
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
      <span className="text-amber-600 text-base leading-none mt-0.5"><Icon name="warning" /></span>
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

/** 대지면적 출처 — 공부상 면적 / 지도 도형면적 / 산정 적용 면적을 구분해 보여준다 */
function LotAreaProvenance({
  lotSqm,
  source,
  officialLotSqm,
  shapeSqm,
  onRestore,
}: {
  lotSqm: number;
  source: "official" | "input" | "default";
  officialLotSqm: number | null;
  shapeSqm: number | null;
  onRestore?: () => void;
}) {
  const f = (v: number) => v.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  const diffOfficial = officialLotSqm != null && Math.abs(officialLotSqm - lotSqm) > 0.005;
  return (
    <div className="text-[10.5px] leading-relaxed text-muted-foreground space-y-0.5">
      <div>
        산정 대지면적 <b className="text-foreground tabular-nums">{f(lotSqm)}㎡</b>{" "}
        <span
          className={`px-1 rounded ${
            source === "official" ? "bg-emerald-50 text-emerald-700" : source === "input" ? "bg-sky-50 text-sky-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {source === "official" ? "공식자료 조회값(공부상 면적)" : source === "input" ? "사용자 입력값" : "초기 예시값 — 지번 조회 전"}
        </span>
      </div>
      {officialLotSqm != null && (
        <div>
          공부상 면적 {f(officialLotSqm)}㎡
          {diffOfficial && <span className="text-amber-700"> · 산정 면적과 다름(도로 후퇴·저촉 등 차감 사유를 기록하세요)</span>}
          {diffOfficial && onRestore && (
            <button type="button" onClick={onRestore} className="ml-1 text-[var(--info)] hover:underline">
              공부상 면적으로 되돌리기
            </button>
          )}
        </div>
      )}
      {shapeSqm != null && shapeSqm > 0 && (
        <div>지적도 도형면적 {f(shapeSqm)}㎡ (참고 — 폴리곤 계산값, 산정에는 공부상 면적 사용)</div>
      )}
    </div>
  );
}
