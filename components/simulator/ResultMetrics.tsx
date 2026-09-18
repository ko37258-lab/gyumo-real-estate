"use client";

import { useSimulatorStore } from "@/store/simulator";
import { useLandInfoStore } from "@/store/landinfo";
import { ZONES } from "@/lib/zones";
import { PY_TO_SQM } from "@/lib/constants";
import { usePlan } from "@/lib/plan/usePlan";
import { floorLabel } from "@/lib/plan/computePlan";
import { scaleConstraintsFrom, ALWAYS_UNVERIFIED } from "@/lib/plan/scaleConstraints";
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
  const plan = usePlan();
  const zone = useSimulatorStore((s) => s.zone);
  const sunOn = useSimulatorStore((s) => s.sunOn);
  const address = useSimulatorStore((s) => s.address);
  const lotAreaSource = useSimulatorStore((s) => s.lotAreaSource);
  const land = useLandInfoStore((s) => s.data);
  const z = ZONES[zone];
  const p = plan.parking;
  const isLockedOut = p.groundAreaSqm > 0 && plan.floor1NonParkingSqm <= 0;
  const landForThis = land && land.address === address ? land : null;
  const cons = scaleConstraintsFrom(landForThis ? landForThis.useAttrs ?? [] : undefined);

  return (
    <div className="space-y-2">
      <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
        <Card
          label="대지면적 (산정)"
          value={formatArea(plan.lotSqm, 2)}
          sub={`${fmt(plan.lotPy, 2)}평 · ${lotAreaSource === "official" ? "공부상 면적" : lotAreaSource === "input" ? "사용자 입력" : "예시값"}`}
        />
        <Card
          label="1층 총바닥면적"
          value={formatArea(plan.floor1GrossSqm)}
          sub={`${fmt(plan.floor1GrossSqm / PY_TO_SQM, 1)}평 · 건폐율 입력값 기준`}
        />
        <Card
          label="1층 주차 외 바닥면적"
          value={formatArea(plan.floor1NonParkingSqm)}
          sub={
            p.groundAreaSqm > 0
              ? isLockedOut
                ? "1층 전체 주차 — 다른 용도 공간 없음"
                : `지상주차 ${p.groundSpaces}대(${fmt(p.groundAreaSqm, 0)}㎡) 제외 · 코어·공용 미반영`
              : "지상주차 없음 · 코어·공용·설비 미반영"
          }
          tone={isLockedOut ? "danger" : "info"}
        />
        <Card
          label="용적률 산정 연면적 상한"
          value={formatArea(plan.farCapSqm, 0)}
          sub={`${fmt(plan.farCapSqm / PY_TO_SQM, 0)}평 · 대지 × 용적률 (산술값)`}
        />
        <Card
          label="입력 조건 기준 추정 연면적"
          value={formatArea(plan.estimatedFarAreaSqm, 0)}
          sub={
            p.groundAreaSqm > 0
              ? `지상 부속주차 ${fmt(p.groundAreaSqm, 0)}㎡ 제외 (영 119조①4호 나목)`
              : sunOn && z.sunlight
                ? `정북 일조 반영 · 손실 ${plan.sunlightLossPct.toFixed(1)}%`
                : "정북 일조 비적용 용도지역"
          }
          tone="success"
        />
        <Card
          label="층수 · 높이"
          value={`지상 ${plan.floorCount}층`}
          sub={`${plan.topFloorPortion < 0.999 ? `최상층 부분층 ${Math.round(plan.topFloorPortion * 100)}% · ` : ""}H ${fmt(plan.heightM, 1)}m · 환산 ${fmt(plan.floorsEquivalent, 1)}층`}
        />
        <Card
          label="총연면적 (지상+지하 추정)"
          value={formatArea(plan.totalFloorAreaSqm, 0)}
          sub={`지하 ${plan.basement.levels.length}개 층 ${fmt(plan.basement.totalSqm, 0)}㎡ 포함`}
        />
      </div>
      <ScaleStatusNote
        fetched={cons.fetched}
        items={cons.items.map((c) => `${c.label} — ${c.effect}`)}
        floorText={floorLabel(plan)}
      />
    </div>
  );
}

/** 결과가 어떤 단계의 수치인지, 무엇이 미확인인지 — 수치 바로 아래에 고정 표시 */
function ScaleStatusNote({ fetched, items, floorText }: { fetched: boolean; items: string[]; floorText: string }) {
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50/70 px-3 py-2 text-[11px] leading-relaxed text-amber-900">
      <div className="font-semibold">
        입력 조건에 따른 이론상 규모 ({floorText}) — 인허가 가능 규모가 아닙니다
      </div>
      {!fetched ? (
        <div>토지이용계획 미조회 — 지번 조회 전에는 규제 반영 여부를 판단할 수 없습니다.</div>
      ) : items.length > 0 ? (
        <ul className="list-disc pl-4">
          {items.map((t) => (
            <li key={t}>미확인: {t}</li>
          ))}
        </ul>
      ) : (
        <div>토지이용계획 조회 결과 높이·용적률을 바꾸는 지역·지구는 나오지 않았습니다.</div>
      )}
      <div className="text-amber-800/80">
        항상 별도 확인: {ALWAYS_UNVERIFIED.map((c) => c.label).join(" · ")}
      </div>
    </div>
  );
}
