"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface SliderInputPairProps {
  /** 현재 값 (controlled) */
  value: number;
  /** commit 시 호출 — clamp 적용된 값이 전달됨 */
  onChange: (v: number) => void;
  /** 슬라이더 최소 */
  min: number;
  /** 슬라이더 최대 */
  max: number;
  /** step (default 1) */
  step?: number;
  /** "㎡" "%" "만원/평" 등 단위 텍스트 */
  unit?: string;
  /** 라벨 (왼쪽 상단) */
  label?: string;
  /** 라벨 옆 작은 ⓘ 툴팁 콘텐츠 (HTML title attribute로 처리) */
  tooltip?: string;
  /** 슬라이더 아래 안내 (회색 작은 글씨) */
  hint?: ReactNode;
  /** 단위 옆 라이브 변환값 (예: "(991.7㎡)") */
  conversion?: string;
  disabled?: boolean;
  /** 키보드 직접 입력의 최소 — slider min보다 작을 수 있음. default = min */
  inputMin?: number;
  /** 키보드 직접 입력의 최대 — slider max보다 클 수 있음. default = max */
  inputMax?: number;
  /** Input width 클래스 — default w-24 */
  inputWidthClass?: string;
  /** 슬라이더 트랙 위에 표시할 빨간 마커 (예: 법정 한도). position은 슬라이더 좌표(min~max) 값. */
  markers?: Array<{
    position: number;
    label?: string;
    color?: string;
  }>;
  /** 첫 마커 position을 초과한 영역을 빨강 그라데이션으로 음영. */
  shadeAboveMarker?: boolean;
}

/**
 * 슬라이더 + 키보드 직접 입력 통합 컴포넌트.
 * - 슬라이더 드래그 → 즉시 onChange (controlled)
 * - Input 타이핑 → 로컬 editing 상태로만 유지, blur/Enter 시 commit (clamp 후 onChange)
 * - inputMin/Max로 슬라이더 범위 밖 직접 입력 허용
 * - 범위 밖 입력 시 input border 1초간 amber 깜빡 (clamp 안내)
 */
export function SliderInputPair({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  label,
  tooltip,
  hint,
  conversion,
  disabled,
  inputMin,
  inputMax,
  inputWidthClass = "w-24",
  markers,
  shadeAboveMarker,
}: SliderInputPairProps) {
  // editing이 null이면 props.value를 그대로 표시 (외부 변경 자동 반영).
  // editing이 string이면 사용자가 타이핑 중 — blur/Enter 시 commit + editing=null.
  const [editing, setEditing] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  const effectiveMin = inputMin ?? min;
  const effectiveMax = inputMax ?? max;
  const sliderValue = Math.max(min, Math.min(max, value));
  const displayValue = editing ?? String(value);

  const commit = () => {
    if (editing === null) return;
    const trimmed = editing.trim();
    if (trimmed === "") {
      setEditing(null);
      return;
    }
    const parsed = parseFloat(trimmed);
    if (!Number.isFinite(parsed)) {
      setEditing(null);
      return;
    }
    const clamped = Math.max(effectiveMin, Math.min(effectiveMax, parsed));
    if (clamped !== parsed) {
      // 범위 밖이면 border flash 1초
      setFlash(true);
      window.setTimeout(() => setFlash(false), 1000);
    }
    onChange(clamped);
    setEditing(null);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commit();
      (e.currentTarget as HTMLInputElement).blur();
    } else if (e.key === "Escape") {
      setEditing(null);
      (e.currentTarget as HTMLInputElement).blur();
    }
  };

  return (
    <div className={disabled ? "opacity-50 space-y-1.5" : "space-y-1.5"}>
      {(label || unit) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <Label className="text-[12.5px] font-medium text-foreground/90">
              {label}
              {tooltip && (
                <abbr
                  title={tooltip}
                  className="ml-1 text-muted-foreground/80 cursor-help no-underline"
                >
                  ⓘ
                </abbr>
              )}
            </Label>
          )}
          <div className="flex items-start gap-1.5 flex-shrink-0">
            <Input
              type="number"
              inputMode="decimal"
              value={displayValue}
              onChange={(e) => setEditing(e.target.value)}
              onBlur={commit}
              onKeyDown={onKeyDown}
              disabled={disabled}
              step={step}
              className={`${inputWidthClass} h-7 text-right tabular-nums text-[12.5px] transition-colors ${
                flash ? "border-amber-500 ring-2 ring-amber-200" : ""
              }`}
              aria-label={label}
            />
            {(unit || conversion) && (
              <div className="flex flex-col items-start min-w-[42px] pt-0.5">
                {unit && (
                  <span className="text-[11px] text-muted-foreground leading-tight whitespace-nowrap">
                    {unit}
                  </span>
                )}
                {conversion && (
                  <span className="text-[10px] text-muted-foreground/70 tabular-nums leading-tight whitespace-nowrap">
                    {conversion}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className={`relative ${markers && markers.length > 0 ? "pb-5" : ""}`}
      >
        {/* 마커 position 초과 영역 음영 (슬라이더 트랙 위에 절대 위치) */}
        {shadeAboveMarker && markers && markers.length > 0 && (() => {
          const m = markers[0];
          const span = Math.max(1, max - min);
          const leftPct = ((m.position - min) / span) * 100;
          if (leftPct >= 100) return null;
          return (
            <div
              aria-hidden
              className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 pointer-events-none"
            >
              <div
                className="absolute h-full rounded-r-full"
                style={{
                  left: `${leftPct}%`,
                  right: 0,
                  background:
                    "linear-gradient(to right, rgba(239,68,68,0.18), rgba(220,38,38,0.55))",
                }}
              />
            </div>
          );
        })()}

        <Slider
          value={[sliderValue]}
          min={min}
          max={max}
          step={step}
          onValueChange={(v) =>
            onChange(Array.isArray(v) ? (v[0] as number) : (v as number))
          }
          disabled={disabled}
        />

        {/* 빨간 마커 + 라벨 */}
        {markers?.map((m, i) => {
          const span = Math.max(1, max - min);
          const leftPct = ((m.position - min) / span) * 100;
          if (leftPct < 0 || leftPct > 100) return null;
          const color = m.color ?? "#DC2626";
          return (
            <div
              key={i}
              className="absolute top-0 -translate-x-1/2 pointer-events-none"
              style={{ left: `${leftPct}%` }}
            >
              <div
                className="w-0.5 h-5"
                style={{ background: color }}
              />
              {m.label && (
                <div className="mt-0.5 -translate-x-1/2 absolute left-1/2 whitespace-nowrap">
                  <span
                    className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded border"
                    style={{
                      color,
                      backgroundColor: "#FEE2E2",
                      borderColor: color,
                    }}
                  >
                    {m.label}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hint && (
        <p className="text-[10.5px] text-muted-foreground leading-relaxed">
          {hint}
        </p>
      )}
    </div>
  );
}
