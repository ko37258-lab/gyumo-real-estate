"use client";

import { Icon } from "@/components/ui/icon";
import { SETTLEMENT_CHECKED_AT, type SettlementRule } from "@/lib/settlement";

const change = (base: number, value: number | null) =>
  value == null || base === value ? `${value ?? base}%` : `${base}→${value}%`;

/** 취락지구 안내 — 자동 반영했으면 바뀐 값과 근거를, 일부 저촉·합필·집단취락이면 왜 반영하지 않았는지를 보여준다 */
export function SettlementNotice({
  settlement: s,
  onTry,
}: {
  settlement: SettlementRule;
  onTry: (cov: number, far: number) => void;
}) {
  if (s.applied) {
    return (
      <div className="flex items-start gap-2 rounded-md bg-[var(--info-bg)] border border-[var(--info)]/25 px-3 py-2">
        <span className="text-sm shrink-0"><Icon name="pin" /></span>
        <div className="text-[11px] leading-relaxed space-y-0.5">
          <div>
            <span className="font-medium text-foreground">
              {s.name} 자동 반영 — 건폐율 {change(s.baseCov, s.bc)} · 용적률 {change(s.baseFar, s.far)}
            </span>
            <span className="text-muted-foreground"> — {s.source}</span>
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1.5 text-[var(--info)] hover:underline"
            >
              원문 확인 ↗
            </a>
          </div>
          <div className="text-muted-foreground">
            건축물은 {s.floorsMax}층 이하이고 지을 수 있는 용도가 시행령 별표 23·조례로 제한됩니다.
            {s.note ? ` ${s.note}.` : ""} (조례 확인 {SETTLEMENT_CHECKED_AT})
          </div>
          {s.unverified && (
            <div className="text-destructive">
              <Icon name="warning" /> 이 지자체 조례에서 취락지구 조항을 찾지 못해 시행령 상한 {s.bc}%로 계산했습니다. 관할 지자체 확인이 필요합니다.
            </div>
          )}
        </div>
      </div>
    );
  }

  const canTry = s.bc != null && s.far != null;
  return (
    <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-300/60 px-3 py-2 dark:bg-amber-950/30">
      <span className="text-sm shrink-0"><Icon name="warning" /></span>
      <div className="text-[11px] leading-relaxed space-y-1">
        <div className="font-medium text-foreground">
          {s.name}
          {s.partial ? " 일부 저촉" : ""} — 자동 반영하지 않았습니다
        </div>
        <div className="text-muted-foreground">
          {s.kind === "group"
            ? s.note
            : s.partial
              ? `필지 일부만 걸쳐 국토계획법 제84조에 따라 면적별로 달라집니다. 필지 전체가 지구라면 건폐율 ${s.bc}%, 용적률 ${s.far}%입니다.`
              : `합필이라 필지마다 지구 포함 여부가 다를 수 있습니다. 전체가 지구라면 건폐율 ${s.bc}%, 용적률 ${s.far}%입니다.`}
        </div>
        {canTry && (
          <button
            type="button"
            onClick={() => onTry(s.bc as number, s.far as number)}
            className="text-[var(--info)] hover:underline"
          >
            이 값으로 시험해 보기 →
          </button>
        )}
      </div>
    </div>
  );
}
