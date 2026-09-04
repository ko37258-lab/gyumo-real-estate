"use client";

// 💡 Tip — 위반건축물 이행강제금 계산기 (건축법 80조·80조의2, 영 115조의2~4, 별표15)
// 계산은 lib/calc/enforcementFine.ts 단일 출처. 여기서는 입력·표시만 한다.

import { useMemo, useState } from "react";
import { CalculatorIcon, ChevronDownIcon } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSimulatorStore } from "@/store/simulator";
import { useLandInfoStore } from "@/store/landinfo";
import { ZONES } from "@/lib/zones";
import { lotPyToSqm } from "@/lib/calc/coverage";
import {
  calcEnforcementFine,
  VIOLATION_TYPES,
  AGGRAVATION_LABEL,
  REDUCTION_LABEL,
  fmt,
  fmtEokWon,
  type AggravationReason,
  type ReductionReason,
} from "@/lib/calc/enforcementFine";

const AGG_KEYS = Object.keys(AGGRAVATION_LABEL) as AggravationReason[];
const RED_KEYS = Object.keys(REDUCTION_LABEL) as ReductionReason[];

/** 시뮬레이터 현재값이 법정 상한을 넘으면 "이 계획대로 지으면 위반" 면적을 제안한다. */
function useExceedSuggestion() {
  const zone = useSimulatorStore((s) => s.zone);
  const lotPy = useSimulatorStore((s) => s.lotPy);
  const covPct = useSimulatorStore((s) => s.covPct);
  const farPct = useSimulatorStore((s) => s.farPct);
  const ordinance = useSimulatorStore((s) => s.ordinance);
  const z = ZONES[zone];
  const covMax = ordinance?.coverRatioMax ?? z.maxCov;
  const farMax = ordinance?.floorRatioMax ?? z.farMax;
  const lotSqm = lotPyToSqm(lotPy);
  const covOver = covPct > covMax ? (lotSqm * (covPct - covMax)) / 100 : 0;
  const farOver = farPct > farMax ? (lotSqm * (farPct - farMax)) / 100 : 0;
  return { covMax, farMax, covOver, farOver, covPct, farPct };
}

export default function EnforcementFineTip() {
  const sug = useExceedSuggestion();
  const hasOver = sug.covOver > 0.05 || sug.farOver > 0.05;
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50/60 px-3 py-2.5 flex flex-wrap items-center gap-2">
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-bold text-amber-900">
          💡 Tip · 위반건축물 이행강제금 계산하기
        </div>
        <p className="text-[11px] text-amber-900/80 mt-0.5 leading-relaxed">
          무허가·건폐율·용적률 초과·용도변경 등 위반 유형별로 1회 부과액과 연간 누적액을 법 80조·별표15 기준으로 산정합니다.
          {hasOver && (
            <>
              {" "}
              <b className="text-red-700">
                현재 계획이 법정 상한을 넘습니다 —{" "}
                {sug.farOver > 0.05 ? `용적률 ${sug.farPct}% (상한 ${sug.farMax}%) → 초과 연면적 약 ${fmt(sug.farOver)}㎡` : ""}
                {sug.farOver > 0.05 && sug.covOver > 0.05 ? " · " : ""}
                {sug.covOver > 0.05 ? `건폐율 ${sug.covPct}% (상한 ${sug.covMax}%) → 초과 건축면적 약 ${fmt(sug.covOver)}㎡` : ""}
                . 그대로 지으면 얼마를 내는지 계산해 보세요.
              </b>
            </>
          )}
        </p>
      </div>
      <EnforcementFineSheet
        presetType={sug.farOver > 0.05 ? "far" : sug.covOver > 0.05 ? "cov" : undefined}
        presetArea={sug.farOver > 0.05 ? sug.farOver : sug.covOver > 0.05 ? sug.covOver : undefined}
      />
    </div>
  );
}

function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-start gap-2 text-[11.5px] leading-snug cursor-pointer">
      <input
        type="checkbox"
        className="mt-0.5 accent-[#993C1D]"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[11.5px] font-semibold text-foreground">{label}</div>
      {children}
      {hint && <p className="text-[10.5px] text-muted-foreground leading-snug">{hint}</p>}
    </div>
  );
}

export function EnforcementFineSheet({
  presetType,
  presetArea,
}: {
  presetType?: string;
  presetArea?: number;
}) {
  const [open, setOpen] = useState(false);
  const land = useLandInfoStore((s) => s.data);
  const address = useSimulatorStore((s) => s.address);

  const [typeCode, setTypeCode] = useState(presetType ?? "nopermit");
  const [unitValue, setUnitValue] = useState(800000); // 원/㎡ (area 군)
  const [totalValue, setTotalValue] = useState(300000000); // 원 (standard 군)
  const [area, setArea] = useState(presetArea ? Math.round(presetArea * 10) / 10 : 50);
  const [ordinanceRate, setOrdinanceRate] = useState<number | "">("");
  const [residential, setResidential] = useState(false);
  const [gfa, setGfa] = useState(120);
  const [aggs, setAggs] = useState<AggravationReason[]>([]);
  const [amended, setAmended] = useState(false);
  const [aggRate, setAggRate] = useState<number | "">("");
  const [reds, setReds] = useState<ReductionReason[]>([]);
  const [agriArea, setAgriArea] = useState(400);
  const [times, setTimes] = useState(1);
  const [years, setYears] = useState(1);
  const [showSteps, setShowSteps] = useState(true);

  const type = VIOLATION_TYPES.find((t) => t.code === typeCode) ?? VIOLATION_TYPES[2];
  const inCapital = /^(서울|경기|인천)/.test(address ?? "");
  const landStdValue =
    land?.buildingPrice && /시가표준/.test(land.buildingPrice.method) ? land.buildingPrice.value : null;

  const result = useMemo(() => {
    try {
      return calcEnforcementFine({
        typeCode,
        standardValue: type.group === "area" ? unitValue : totalValue,
        violationAreaSqm: area,
        ordinanceRate: ordinanceRate === "" ? undefined : ordinanceRate / 100,
        residential,
        totalFloorAreaSqm: gfa,
        aggravations: aggs,
        useAmended2027: amended,
        aggravationRate: aggRate === "" ? undefined : aggRate / 100,
        reductions: reds,
        inCapitalRegion: inCapital,
        agriAreaSqm: agriArea,
        timesPerYear: times,
        years,
      });
    } catch {
      return null;
    }
  }, [typeCode, type.group, unitValue, totalValue, area, ordinanceRate, residential, gfa, aggs, amended, aggRate, reds, inCapital, agriArea, times, years]);

  const toggle = <T extends string>(list: T[], v: T, set: (x: T[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  // 시트는 마운트된 채 남으므로, 열 때마다 시뮬레이터 초과분 프리셋을 다시 적용한다.
  const handleOpenChange = (v: boolean) => {
    if (v && presetType && presetArea && presetArea > 0.05) {
      setTypeCode(presetType);
      setArea(Math.round(presetArea * 10) / 10);
    }
    setOpen(v);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger
        render={
          <Button size="sm" className="gap-1.5 bg-amber-700 hover:bg-amber-800 text-white shrink-0">
            <CalculatorIcon className="size-3.5" />
            <span>이행강제금 계산하기</span>
          </Button>
        }
      />
      <SheetContent side="right">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-secondary text-muted-foreground px-2 py-0.5 rounded-full tracking-wide">
              계산기 · 공법의 신
            </span>
          </div>
          <SheetTitle>위반건축물 이행강제금 계산</SheetTitle>
          <SheetDescription>
            건축법 제80조·제80조의2, 시행령 제115조의2~4, 별표 15 기준(법제처 2026.9 확인). 시가표준액은 「지방세법」
            기준(위택스 → 지방세정보 → 시가표준액 조회, 또는 건축물대장 시가표준액)을 넣으세요. 조례로 비율·횟수가 달라지므로
            관할 구청 건축과 확인이 필요합니다.
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <div className="space-y-4 text-[12px]">
            {/* 1. 위반 유형 */}
            <Field label="① 위반 유형" hint={type.basis + (type.note ? ` · ${type.note}` : "")}>
              <select
                className="w-full h-9 rounded-md border border-border bg-background px-2 text-[12px]"
                value={typeCode}
                onChange={(e) => setTypeCode(e.target.value)}
              >
                <optgroup label="법 80조①1호 — 1㎡ 시가표준액 × 50% × 위반면적 × 비율">
                  {VIOLATION_TYPES.filter((t) => t.group === "area").map((t) => (
                    <option key={t.code} value={t.code}>{t.label} ({Math.round(t.rate * 100)}%)</option>
                  ))}
                </optgroup>
                <optgroup label="법 80조①2호 — 별표15 (시가표준액 × 비율)">
                  {VIOLATION_TYPES.filter((t) => t.group === "standard").map((t) => (
                    <option key={t.code} value={t.code}>{t.label} ({Math.round(t.rate * 100)}%)</option>
                  ))}
                </optgroup>
              </select>
            </Field>

            {/* 2. 시가표준액 · 면적 */}
            {type.group === "area" ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="1㎡당 시가표준액 (원/㎡)" hint="건축물 시가표준액 ÷ 연면적, 또는 위택스 조회값">
                  <Input type="number" inputMode="numeric" value={unitValue} min={0} step={10000} onChange={(e) => setUnitValue(Number(e.target.value) || 0)} />
                </Field>
                <Field label="위반면적 (㎡)" hint={presetArea ? "현재 계획의 상한 초과분이 자동 입력됐습니다" : undefined}>
                  <Input type="number" inputMode="decimal" value={area} min={0} step={1} onChange={(e) => setArea(Number(e.target.value) || 0)} />
                </Field>
                <Field label="조례 비율 (%, 선택)" hint={`비워두면 시행령 ${Math.round(type.rate * 100)}%. 조례로 낮춰도 60% 이상 (영 115조의3① 단서)`}>
                  <Input type="number" inputMode="numeric" placeholder={String(Math.round(type.rate * 100))} value={ordinanceRate} min={60} max={100} onChange={(e) => setOrdinanceRate(e.target.value === "" ? "" : Number(e.target.value))} />
                </Field>
              </div>
            ) : (
              <Field
                label="건축물(해당 부분) 시가표준액 (원)"
                hint={
                  landStdValue
                    ? `조회된 건축물대장 시가표준액 ${fmtEokWon(landStdValue)} — 클릭해 적용`
                    : "지방세 시가표준액. 용도변경·조경은 해당 부분만"
                }
              >
                <div className="flex gap-2">
                  <Input type="number" inputMode="numeric" value={totalValue} min={0} step={1000000} onChange={(e) => setTotalValue(Number(e.target.value) || 0)} />
                  {landStdValue && (
                    <Button size="sm" variant="outline" onClick={() => setTotalValue(Math.round(landStdValue))}>적용</Button>
                  )}
                </div>
              </Field>
            )}

            {/* 3. 주거용 특례 */}
            <div className="rounded-md border border-border p-2.5 space-y-2">
              <Check checked={residential} onChange={setResidential} label="주거용 건축물이다 (법 80조① 단서 ½ 특례 검토)" />
              {residential && (
                <Field label="연면적 (공동주택은 세대 면적) ㎡" hint="60㎡ 이하면 모든 유형 ½ · 60㎡ 초과는 미사용승인·조경·높이·일조·조례 유형만 ½ (영 115조의2①)">
                  <Input type="number" inputMode="decimal" value={gfa} min={0} onChange={(e) => setGfa(Number(e.target.value) || 0)} />
                </Field>
              )}
            </div>

            {/* 4. 가중 */}
            <div className="rounded-md border border-border p-2.5 space-y-2">
              <div className="text-[11.5px] font-semibold">④ 가중 사유 (법 80조② · 영 115조의3②)</div>
              {AGG_KEYS.map((k) => (
                <Check key={k} checked={aggs.includes(k)} onChange={() => toggle(aggs, k, setAggs)} label={AGGRAVATION_LABEL[k]} />
              ))}
              {aggs.length > 0 && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Field label="적용 기준" hint={amended ? "2027.2.12 시행: 50~100% 가중 의무" : "현행: 100% 범위에서 조례 가중"}>
                    <div className="flex gap-1">
                      <Button size="xs" variant={!amended ? "secondary" : "ghost"} onClick={() => setAmended(false)}>현행</Button>
                      <Button size="xs" variant={amended ? "secondary" : "ghost"} onClick={() => setAmended(true)}>2027.2.12~</Button>
                    </div>
                  </Field>
                  <Field label="조례 가중률 (%)" hint={amended ? "비우면 50% (하한)" : "비우면 100% (상한)"}>
                    <Input type="number" inputMode="numeric" placeholder={amended ? "50" : "100"} value={aggRate} min={amended ? 50 : 0} max={100} onChange={(e) => setAggRate(e.target.value === "" ? "" : Number(e.target.value))} />
                  </Field>
                </div>
              )}
            </div>

            {/* 5. 감경 */}
            <div className="rounded-md border border-border p-2.5 space-y-2">
              <div className="text-[11.5px] font-semibold">⑤ 감경 사유 (법 80조의2 · 영 115조의4)</div>
              {RED_KEYS.map((k) => (
                <Check key={k} checked={reds.includes(k)} onChange={() => toggle(reds, k, setReds)} label={REDUCTION_LABEL[k]} />
              ))}
              {reds.includes("agri") && (
                <Field label="농어업용 시설 면적 (㎡)" hint={inCapital ? "수도권: 500㎡ 이하만 감경" : "수도권 외: 1,000㎡ 이하만 감경"}>
                  <Input type="number" inputMode="decimal" value={agriArea} min={0} onChange={(e) => setAgriArea(Number(e.target.value) || 0)} />
                </Field>
              )}
            </div>

            {/* 6. 반복 부과 */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="연간 부과 횟수" hint="1년 2회 이내에서 조례로 정함 (법 80조⑤)">
                <div className="flex gap-1">
                  {[1, 2].map((n) => (
                    <Button key={n} size="xs" variant={times === n ? "secondary" : "ghost"} onClick={() => setTimes(n)}>{n}회</Button>
                  ))}
                </div>
              </Field>
              <Field label="시정 없이 버티는 연수" hint="시정하면 즉시 중지, 기부과분은 징수 (80조⑥)">
                <div className="flex gap-1 flex-wrap">
                  {[1, 2, 3, 5].map((n) => (
                    <Button key={n} size="xs" variant={years === n ? "secondary" : "ghost"} onClick={() => setYears(n)}>{n}년</Button>
                  ))}
                </div>
              </Field>
            </div>

            {/* 결과 */}
            {result && (
              <div className="rounded-md border-2 border-amber-600 bg-amber-50 p-3 space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-[10.5px] text-muted-foreground">1회 부과액</div>
                    <div className="text-[18px] font-extrabold text-amber-900">{fmtEokWon(result.perImposition)}</div>
                  </div>
                  <div>
                    <div className="text-[10.5px] text-muted-foreground">연간 ({result.timesPerYear}회)</div>
                    <div className="text-[16px] font-bold">{fmtEokWon(result.perYear)}</div>
                  </div>
                  <div>
                    <div className="text-[10.5px] text-muted-foreground">{result.years}년 누적</div>
                    <div className="text-[16px] font-bold text-red-700">{fmtEokWon(result.total)}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSteps((v) => !v)}
                  className="w-full flex items-center justify-between text-[11px] font-semibold text-amber-900 pt-1"
                >
                  <span>산정 과정 ({result.steps.length}단계)</span>
                  <ChevronDownIcon className={`size-3.5 transition-transform ${showSteps ? "rotate-180" : ""}`} />
                </button>
                {showSteps && (
                  <ol className="space-y-1.5">
                    {result.steps.map((s, i) => (
                      <li key={i} className="rounded bg-white/80 border border-amber-200 px-2 py-1.5">
                        <div className="flex justify-between gap-2 text-[11.5px]">
                          <b>{i + 1}. {s.label}</b>
                          <span className="tabular-nums font-semibold">{fmt(s.amount)}원</span>
                        </div>
                        <div className="text-[10.5px] text-muted-foreground">{s.formula}</div>
                        <div className="text-[10px] text-amber-900/80">근거: {s.basis}</div>
                      </li>
                    ))}
                  </ol>
                )}
                {result.warnings.length > 0 && (
                  <ul className="space-y-1 pt-1">
                    {result.warnings.map((w, i) => (
                      <li key={i} className="text-[10.5px] text-red-800 leading-snug">⚠ {w}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="text-[10.5px] text-muted-foreground leading-relaxed space-y-1">
              <p>
                <b>절차</b>: 시정명령(79조①) → 이행기한 경과 → 문서 계고(80조③) → 부과(④) → 미납 시 지방행정제재·부과금법으로 징수(⑦).
                부과 후 시정하면 새 부과는 즉시 중지되지만 이미 부과된 금액은 내야 합니다(⑥).
              </p>
              <p>
                <b>2027.2.12 시행 개정(법률 21880호)</b>: 가중이 50~100%로 의무화되고, 반복 부과가 재량에서 의무로 바뀌며
                최초 부과 다음 연도부터 대통령령 가중이 붙습니다. 허가권자는 연 1회 이상 위반 실태조사를 해야 합니다(79조⑤).
              </p>
              <p>※ 참고 계산이며 실제 부과액은 조례·시가표준액·관할청 판단에 따라 달라집니다. 감정평가·법률 자문이 아닙니다.</p>
            </div>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
