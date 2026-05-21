"use client";

import { useSimulatorStore } from "@/store/simulator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SliderInputPair } from "@/components/ui/slider-input-pair";
import { ParkingLearnSheet } from "@/components/simulator/ParkingLearnSheet";
import {
  PARKING_STANDARDS,
  PARKING_USAGE_LIST,
  SQM_PER_SPACE,
  type ParkingUsageCode,
  tierLabel,
} from "@/lib/parking-standards";
import {
  calcArea,
  calcProgressive,
  calcTieredHousehold,
  parkingAreaSqm,
  parkingToFootprintRatio,
  groundParkingSqm,
  salableGfaSqm,
  type ParkingMode,
} from "@/lib/calc/parking";
import {
  calculateFloor1Indoor,
  calculateGroundParking,
} from "@/lib/calc/groundParking";
import { formatArea, sqmToPyeong } from "@/lib/utils/area";
import { lotPyToSqm, buildingFootprintSqm } from "@/lib/calc/coverage";
import { legalGfaSqm } from "@/lib/calc/far";
import { PY_TO_SQM } from "@/lib/constants";

const fmt = (n: number, d = 0) =>
  n.toLocaleString("ko-KR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

export function ParkingCalculator() {
  const lotPy = useSimulatorStore((s) => s.lotPy);
  const covPct = useSimulatorStore((s) => s.covPct);
  const farPct = useSimulatorStore((s) => s.farPct);
  const usage = useSimulatorStore((s) => s.parkingUsage);
  const areaPerSpace = useSimulatorStore((s) => s.parkingAreaPerSpace);
  const progressiveSpec = useSimulatorStore((s) => s.parkingProgressiveSpec);
  const households = useSimulatorStore((s) => s.parkingHouseholds);
  const tierRatios = useSimulatorStore((s) => s.parkingTierRatios);
  const setUsage = useSimulatorStore((s) => s.setParkingUsage);
  const setAreaPerSpace = useSimulatorStore((s) => s.setParkingAreaPerSpace);
  const setProgressiveSpec = useSimulatorStore(
    (s) => s.setParkingProgressiveSpec,
  );
  const setHousehold = useSimulatorStore((s) => s.setParkingHousehold);
  const setTierRatio = useSimulatorStore((s) => s.setParkingTierRatio);
  const parkingMode = useSimulatorStore((s) => s.parkingMode);
  const parkingGroundRatio = useSimulatorStore((s) => s.parkingGroundRatio);
  const parkingUnitArea = useSimulatorStore((s) => s.parkingUnitArea);
  const parkingPilotiMode = useSimulatorStore((s) => s.parkingPilotiMode);
  const setParkingMode = useSimulatorStore((s) => s.setParkingMode);
  const setParkingGroundRatio = useSimulatorStore(
    (s) => s.setParkingGroundRatio,
  );
  const setParkingUnitArea = useSimulatorStore((s) => s.setParkingUnitArea);
  const setParkingPilotiMode = useSimulatorStore(
    (s) => s.setParkingPilotiMode,
  );

  const lotSqm = lotPyToSqm(lotPy);
  const footprint = buildingFootprintSqm(lotSqm, covPct);
  const gfa = legalGfaSqm(lotSqm, farPct);

  const std = PARKING_STANDARDS[usage];

  const result = (() => {
    if (std.mode === "area") {
      return {
        decree: calcArea(gfa, std.decreeAreaPerSpace),
        applied: calcArea(gfa, areaPerSpace),
      };
    }
    if (std.mode === "progressive") {
      return {
        decree: calcProgressive(gfa, std.decree),
        applied: calcProgressive(gfa, progressiveSpec),
      };
    }
    return {
      decree: calcTieredHousehold(
        std.decreeTiers,
        households,
        std.decreeTiers.map((t) => t.ratio),
      ),
      applied: calcTieredHousehold(std.seoulTiers, households, tierRatios),
    };
  })();

  const parkArea = parkingAreaSqm(result.applied.spaces);
  const footprintRatio = parkingToFootprintRatio(parkArea, footprint);

  // 주차 배치 형식 → 분양 가능 연면적 (건축법 시행령 119조 1항 4호)
  const groundPark = groundParkingSqm(parkArea, parkingMode, parkingGroundRatio);
  const salableGfa = salableGfaSqm(gfa, parkArea, parkingMode, parkingGroundRatio);
  const gfaDiff = gfa - salableGfa;
  const gfaDiffPct = gfa > 0 ? (gfaDiff / gfa) * 100 : 0;

  // Day 10: 1층 분해 — 30㎡/대 단위, 필로티/벽체식 분기 (시행령 119조 1항 2호 가목 4)
  const gp = calculateGroundParking({
    placement: parkingMode,
    spaces: result.applied.spaces,
    unitArea: parkingUnitArea,
    pilotiMode: parkingPilotiMode,
    groundRatioPct: parkingGroundRatio,
  });
  const floor1Indoor = calculateFloor1Indoor(footprint, gp.groundParkingArea);

  return (
    <div className="bg-secondary rounded-lg p-3.5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-xs text-muted-foreground font-medium">
            ⑤ 주차장 산정
          </div>
          <div className="text-[11px] text-muted-foreground/80 mt-0.5">
            주차장법 시행령 별표1 + 서울특별시 조례 기준
          </div>
        </div>
        <ParkingLearnSheet />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="flex-1">
          <Label className="text-[11px] text-muted-foreground mb-1">
            건축물 용도
          </Label>
          <Select
            value={usage}
            onValueChange={(v) => setUsage(v as ParkingUsageCode)}
          >
            <SelectTrigger className="w-full">
              <SelectValue>
                {(value: ParkingUsageCode) =>
                  PARKING_STANDARDS[value]?.label ?? null
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {PARKING_USAGE_LIST.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {std.mode === "area" && (
        <div className="space-y-2.5">
          <InfoLine label="산정 대상 시설면적">
            <span className="tabular-nums font-medium">{fmt(gfa, 0)}㎡</span>
            <span className="text-muted-foreground/80 ml-1.5 text-[11px]">
              (연면적 기준 — 상단 슬라이더로 조정)
            </span>
          </InfoLine>

          <div className="grid grid-cols-2 gap-2">
            <Card title="시행령 기준" muted>
              <KV
                k={`${std.decreeAreaPerSpace}㎡당 1대`}
                v={`${result.decree.spaces}대`}
              />
              <div className="text-[10.5px] text-muted-foreground mt-1">
                {std.legalBasis}
              </div>
            </Card>
            <Card title="적용 기준" highlight>
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  value={areaPerSpace}
                  min={1}
                  step={1}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n > 0) setAreaPerSpace(n);
                  }}
                  className="w-20 h-7 text-right"
                />
                <span className="text-[12px] text-muted-foreground">
                  ㎡당 1대
                </span>
              </div>
              <div className="mt-2 text-lg font-semibold tabular-nums text-[var(--info)]">
                {result.applied.spaces}대
              </div>
              <div className="text-[10.5px] text-muted-foreground">
                원시값 {result.applied.rawSpaces.toFixed(2)} → 절상
              </div>
            </Card>
          </div>
        </div>
      )}

      {std.mode === "progressive" && (
        <div className="space-y-2.5">
          <InfoLine label="산정 대상 시설면적">
            <span className="tabular-nums font-medium">{fmt(gfa, 0)}㎡</span>
            <span className="text-muted-foreground/80 ml-1.5 text-[11px]">
              (연면적 기준)
            </span>
          </InfoLine>

          <div className="grid grid-cols-2 gap-2">
            <Card title="시행령 기준" muted>
              <div className="text-[11.5px] leading-relaxed">
                {std.decree.baseStart}㎡ 초과 {std.decree.firstUpTo}㎡ 이하:{" "}
                {std.decree.firstSpaces}대
                <br />
                초과분: {std.decree.addPerArea}㎡당 +1대
              </div>
              <div className="mt-2 text-base font-semibold tabular-nums">
                {result.decree.spaces}대
              </div>
            </Card>
            <Card title="적용 기준" highlight>
              <div className="flex flex-col gap-1.5">
                <SmallNumberInput
                  label="시작 임계"
                  suffix="㎡"
                  value={progressiveSpec.firstUpTo}
                  onChange={(v) =>
                    setProgressiveSpec({ ...progressiveSpec, firstUpTo: v })
                  }
                />
                <SmallNumberInput
                  label="시작 대수"
                  suffix="대"
                  value={progressiveSpec.firstSpaces}
                  onChange={(v) =>
                    setProgressiveSpec({ ...progressiveSpec, firstSpaces: v })
                  }
                />
                <SmallNumberInput
                  label="가산 면적"
                  suffix="㎡/대"
                  value={progressiveSpec.addPerArea}
                  onChange={(v) =>
                    setProgressiveSpec({ ...progressiveSpec, addPerArea: v })
                  }
                />
              </div>
              <div className="mt-2 text-lg font-semibold tabular-nums text-[var(--info)]">
                {result.applied.spaces}대
              </div>
            </Card>
          </div>
        </div>
      )}

      {std.mode === "tieredHousehold" && (
        <div className="space-y-2.5">
          <div className="text-[11px] text-muted-foreground mb-1">
            전용면적 구간별 세대수 + 세대당 비율 (서울조례 기준값에서 시작,
            편집 가능)
          </div>
          <div className="overflow-x-auto rounded-md border border-border bg-card">
            <table className="w-full text-[12px]">
              <thead className="bg-secondary text-muted-foreground">
                <tr>
                  <th className="text-left px-2 py-1.5 font-medium">구간</th>
                  <th className="text-right px-2 py-1.5 font-medium">세대수</th>
                  <th className="text-right px-2 py-1.5 font-medium">
                    시행령 비율
                  </th>
                  <th className="text-right px-2 py-1.5 font-medium">
                    적용 비율
                  </th>
                </tr>
              </thead>
              <tbody>
                {std.seoulTiers.map((t, i) => (
                  <tr
                    key={i}
                    className="border-t border-border last:border-b-0"
                  >
                    <td className="px-2 py-1.5">
                      {tierLabel(t, std.seoulTiers[i - 1])}
                    </td>
                    <td className="px-2 py-1 text-right">
                      <input
                        type="number"
                        value={households[i] ?? 0}
                        min={0}
                        step={1}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (Number.isFinite(n) && n >= 0)
                            setHousehold(i, n);
                        }}
                        className="w-16 h-6 px-1.5 text-right border rounded tabular-nums bg-background"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                      {std.decreeTiers[i]?.ratio.toFixed(1) ?? "-"}
                    </td>
                    <td className="px-2 py-1 text-right">
                      <input
                        type="number"
                        value={tierRatios[i] ?? 0}
                        min={0}
                        step={0.1}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (Number.isFinite(n) && n >= 0)
                            setTierRatio(i, n);
                        }}
                        className="w-16 h-6 px-1.5 text-right border rounded tabular-nums bg-background"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Card title="시행령 기준" muted>
              <div className="text-lg font-semibold tabular-nums">
                {result.decree.spaces}대
              </div>
              <div className="text-[10.5px] text-muted-foreground">
                원시값 {result.decree.rawSpaces.toFixed(1)} → 절상
              </div>
            </Card>
            <Card title="적용 기준 (서울조례)" highlight>
              <div className="text-lg font-semibold tabular-nums text-[var(--info)]">
                {result.applied.spaces}대
              </div>
              <div className="text-[10.5px] text-muted-foreground">
                원시값 {result.applied.rawSpaces.toFixed(1)} → 절상
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* 주차장 배치 형식 토글 */}
      <div className="mt-3 rounded-md bg-card border border-border p-2.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-[11px] text-muted-foreground font-medium">
            주차장 배치 형식
          </div>
          <div className="text-[10px] text-muted-foreground/70">
            지하는 연면적에서 제외 · 시행령 119조 1항 4호
          </div>
        </div>
        <ModeToggle value={parkingMode} onChange={setParkingMode} />
        {parkingMode === "mixed" && (
          <div className="mt-2.5">
            <SliderInputPair
              label="지상 비율"
              value={parkingGroundRatio}
              onChange={setParkingGroundRatio}
              min={0}
              max={100}
              step={5}
              unit="%"
              inputMin={0}
              inputMax={100}
            />
          </div>
        )}
      </div>

      {/* Day 10: 지상주차 면적 산정 (above/mixed 모드에서만) */}
      {(parkingMode === "ground" || parkingMode === "mixed") && (
        <div className="mt-3 rounded-md border-l-4 border-amber-400 bg-amber-50 p-3 space-y-2.5">
          <div className="flex items-baseline justify-between">
            <div className="font-medium text-[12.5px]">
              🚗 1층 지상주차 면적 산정
            </div>
            <div className="text-[10px] text-muted-foreground">
              시행령 119조 1항 2호 가목 (4)
            </div>
          </div>

          <SliderInputPair
            label="1대당 점유 면적"
            value={parkingUnitArea}
            onChange={setParkingUnitArea}
            min={25}
            max={35}
            step={1}
            unit="㎡/대"
            hint="💡 자주식 평행 28~32, 직각 25~30, 기계식 15~20㎡ 참고"
            inputMin={10}
            inputMax={50}
          />

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-muted-foreground min-w-[80px]">
              주차장 구조
            </span>
            <button
              type="button"
              onClick={() => setParkingPilotiMode(true)}
              className={`text-[11px] rounded px-2 py-1 border ${
                parkingPilotiMode
                  ? "bg-[var(--info-bg)] border-[var(--info)] text-[var(--info)] font-medium"
                  : "bg-background border-border"
              }`}
            >
              필로티 (연면적 제외)
            </button>
            <button
              type="button"
              onClick={() => setParkingPilotiMode(false)}
              className={`text-[11px] rounded px-2 py-1 border ${
                !parkingPilotiMode
                  ? "bg-[var(--info-bg)] border-[var(--info)] text-[var(--info)] font-medium"
                  : "bg-background border-border"
              }`}
            >
              벽체식 (연면적 산입)
            </button>
          </div>
          <div className="text-[10.5px] text-muted-foreground -mt-1">
            💡 필로티: 벽 없는 개방형 + 주차 외 다른 용도 없을 때 적용 가능 (건축법 시행령 119조 1항 4호)
          </div>

          {/* 실시간 결과 */}
          <div className="rounded bg-card border border-border px-2.5 py-2 text-[12px] space-y-1">
            <div>
              · 지상 주차:{" "}
              <span className="font-semibold tabular-nums">
                {gp.groundSpaces}대
              </span>
              <span className="text-muted-foreground">
                {" "}
                ({fmt(gp.groundParkingArea, 0)}㎡ = {fmt(sqmToPyeong(gp.groundParkingArea), 0)}평)
              </span>
            </div>
            <div>
              · 지하 주차:{" "}
              <span className="font-semibold tabular-nums">
                {gp.basementSpaces}대
              </span>
            </div>
            {gp.isReducingFloor1 && (
              <div className="text-[var(--info)] text-[11.5px] font-medium">
                ✓ 필로티 적용 — 연면적에서{" "}
                <span className="font-semibold tabular-nums">
                  {fmt(gp.groundParkingArea, 0)}㎡
                </span>{" "}
                추가 차감 (시행령 119조 1항 4호)
              </div>
            )}
          </div>

          {/* 1F 분해 카드 */}
          <Floor1BreakdownCard
            buildingArea={footprint}
            groundParkingArea={gp.groundParkingArea}
            floor1Indoor={floor1Indoor}
            isReducingFloor1={gp.isReducingFloor1}
            legalBasis={gp.legalBasis}
          />
        </div>
      )}

      {/* 결과 요약 */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SummaryCard
          label="필요 주차면적"
          value={`${fmt(parkArea, 0)}㎡`}
          sub={`${fmt(parkArea / PY_TO_SQM, 0)}평 · 1대 ${SQM_PER_SPACE}㎡`}
        />
        <SummaryCard
          label="1층 건축면적 대비"
          value={`${fmt(footprintRatio * 100, 1)}%`}
          sub={`${fmt(footprint, 0)}㎡ 중`}
          tone={
            footprintRatio > 1 ? "danger" : footprintRatio > 0.6 ? "warn" : "ok"
          }
        />
        <SummaryCard
          label="분양 가능 연면적"
          value={`${fmt(salableGfa, 0)}㎡`}
          sub={
            groundPark > 0
              ? `지상주차 ${fmt(groundPark, 0)}㎡ 차감`
              : "지하주차 (연면적 제외)"
          }
          tone="success"
        />
        <SummaryCard
          label="법정 vs 분양 차이"
          value={
            gfaDiff > 0
              ? `−${fmt(gfaDiff, 0)}㎡`
              : "0㎡"
          }
          sub={
            gfaDiff > 0
              ? `법정 ${fmt(gfa, 0)}㎡ · −${gfaDiffPct.toFixed(1)}%`
              : "지상주차 없음"
          }
          tone={gfaDiff > 0 ? "warn" : "ok"}
        />
      </div>

      {std.note && (
        <div className="mt-2 text-[11px] text-muted-foreground/90 leading-relaxed bg-card/60 px-2.5 py-1.5 rounded">
          📎 {std.note}
        </div>
      )}
      <div className="mt-2 text-[10.5px] text-muted-foreground/80 leading-relaxed">
        ⚖️ {std.legalBasis} · 시·군·구 조례별 강화 가능. 최종 인허가 시 해당
        지자체 확인 필수.
      </div>
    </div>
  );
}

function InfoLine({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2 text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}

function Card({
  title,
  children,
  highlight,
  muted,
}: {
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
  muted?: boolean;
}) {
  const cls = highlight
    ? "border-[var(--info)] bg-[var(--info-bg)]"
    : muted
      ? "border-border bg-card"
      : "border-border bg-card";
  return (
    <div className={`rounded-md border p-2.5 ${cls}`}>
      <div className="text-[10.5px] text-muted-foreground font-medium mb-1">
        {title}
      </div>
      {children}
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <>
      <div className="text-[12px] text-muted-foreground">{k}</div>
      <div className="text-base font-semibold tabular-nums">{v}</div>
    </>
  );
}

function SmallNumberInput({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-1.5 text-[11.5px]">
      <span className="text-muted-foreground min-w-[58px]">{label}</span>
      <Input
        type="number"
        value={value}
        min={0}
        step={1}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n) && n >= 0) onChange(n);
        }}
        className="w-16 h-6 text-right text-[11.5px]"
      />
      <span className="text-muted-foreground min-w-[28px]">{suffix}</span>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  tone = "ok",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "ok" | "warn" | "danger" | "success";
}) {
  const valueClr =
    tone === "danger"
      ? "text-destructive"
      : tone === "warn"
        ? "text-[var(--info)]"
        : tone === "success"
          ? "text-[var(--success)]"
          : "";
  return (
    <div className="bg-card rounded-md p-2.5 border border-border">
      <div className="text-[10.5px] text-muted-foreground mb-0.5">{label}</div>
      <div className={`text-base font-semibold tabular-nums ${valueClr}`}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground/80">{sub}</div>
    </div>
  );
}

function Floor1BreakdownCard({
  buildingArea,
  groundParkingArea,
  floor1Indoor,
  isReducingFloor1,
  legalBasis,
}: {
  buildingArea: number;
  groundParkingArea: number;
  floor1Indoor: number;
  isReducingFloor1: boolean;
  legalBasis: string;
}) {
  const isLockedOut = floor1Indoor <= 0 && groundParkingArea > 0;
  return (
    <div className="rounded-md bg-card border border-border p-4 space-y-2">
      <div className="text-[11px] text-muted-foreground font-medium mb-3">
        1층 건축면적 분해
      </div>

      {/* 법정 건축면적 — 헤더 행 */}
      <div className="flex items-center justify-between gap-3 font-semibold text-foreground border-b border-border/60 pb-2">
        <span className="text-sm">법정 건축면적 (건폐율 기준)</span>
        <span className="text-sm whitespace-nowrap tabular-nums">
          {formatArea(buildingArea)}
        </span>
      </div>

      {groundParkingArea > 0 ? (
        <>
          {/* 주차 점유 차감 행 */}
          <div className="flex items-center justify-between gap-3 py-2">
            <div className="flex items-center gap-2 text-foreground/80 min-w-0 flex-1">
              <span className="text-muted-foreground">└</span>
              <span className="text-sm">1층 지상주차 점유</span>
            </div>
            <div className="text-[#993C1D] font-semibold text-sm whitespace-nowrap tabular-nums flex-shrink-0">
              − {formatArea(groundParkingArea)}
            </div>
          </div>

          {/* 결과 박스 — 잠김(빨강) 또는 영업 가능(코랄) */}
          {isLockedOut ? (
            <div className="bg-red-50 border-l-4 border-red-500 rounded p-3 mt-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
                    <span>⚠️</span>
                    <span>1층 전체 주차 — 영업 공간 없음</span>
                  </div>
                  <p className="text-xs text-red-600 mt-1.5 leading-relaxed">
                    💡 주차대수 또는 1대당 면적 조정 검토 — 1층 매출 손실 리스크
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-red-700 font-bold text-base whitespace-nowrap tabular-nums">
                    0㎡
                  </div>
                  <div className="text-xs text-red-500 whitespace-nowrap">
                    (0평)
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[var(--info-bg)] border-l-4 border-[var(--info)] rounded p-3 mt-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-[var(--info)] font-semibold text-sm">
                    <span>✓</span>
                    <span>1층 영업 가능 면적</span>
                  </div>
                  {isReducingFloor1 && (
                    <p className="text-xs text-[var(--info)] mt-1.5 leading-relaxed font-medium">
                      ✓ 필로티 적용: 연면적에서 {formatArea(groundParkingArea)} 추가 제외
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[var(--info)] font-bold text-base whitespace-nowrap tabular-nums">
                    {formatArea(floor1Indoor)}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 법령 근거 */}
          <p className="text-xs text-muted-foreground mt-2 ml-6 leading-relaxed">
            ⚖️ {legalBasis}
          </p>
        </>
      ) : null}
    </div>
  );
}

function ModeToggle({
  value,
  onChange,
}: {
  value: ParkingMode;
  onChange: (m: ParkingMode) => void;
}) {
  const options: { v: ParkingMode; label: string; hint: string }[] = [
    { v: "none", label: "없음", hint: "주차 없는 가정" },
    { v: "basement", label: "지하", hint: "연면적 제외" },
    { v: "ground", label: "지상", hint: "필로티 · 연면적 산입" },
    { v: "mixed", label: "혼합", hint: "지상+지하 안분" },
  ];
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {options.map((o) => {
        const active = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`text-left rounded-md px-2 py-1.5 border transition ${
              active
                ? "border-[var(--info)] bg-[var(--info-bg)]"
                : "border-border bg-background hover:bg-secondary"
            }`}
          >
            <div
              className={`text-[12px] font-medium ${
                active ? "text-[var(--info)]" : ""
              }`}
            >
              {o.label}
            </div>
            <div className="text-[9.5px] text-muted-foreground leading-tight">
              {o.hint}
            </div>
          </button>
        );
      })}
    </div>
  );
}
