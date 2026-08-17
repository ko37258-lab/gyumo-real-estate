"use client";

import { buildRegulationChecklist, type ChecklistItem } from "@/lib/regulation-checklist";
import type { ZoneCode } from "@/lib/zones";

const LEVEL_STYLE: Record<
  ChecklistItem["level"],
  { bg: string; border: string; text: string }
> = {
  danger: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.35)", text: "#b91c1c" },
  warning: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.35)", text: "#92400e" },
  info: { bg: "var(--info-bg)", border: "color-mix(in srgb, var(--info) 35%, transparent)", text: "var(--info)" },
  ok: { bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.3)", text: "#15803d" },
};

/**
 * ① 지번 조회 직후 노출하는 "이 땅의 걸림돌" 요약 카드.
 * 새 API 호출 없이 이미 조회된 데이터(지목·용도지역·토지이용계획)만으로
 * 즉시 판정한다 — 탭을 넘기지 않아도 3초 안에 리스크를 파악하는 게 목적.
 */
export function RegulationChecklist({
  jimok,
  useAttrs,
  areaSqm,
  publicPricePerSqm,
  zoneCode,
}: {
  jimok?: string;
  useAttrs?: string[];
  areaSqm: number;
  publicPricePerSqm?: number;
  zoneCode?: ZoneCode;
}) {
  const items = buildRegulationChecklist({ jimok, useAttrs, areaSqm, publicPricePerSqm, zoneCode });
  const hasRisk = items.some((i) => i.level === "danger" || i.level === "warning");

  return (
    <div className="rounded-md border border-border bg-card p-2.5">
      <div className="text-[11px] font-bold text-foreground mb-1.5">
        {hasRisk ? "🧾 이 땅의 걸림돌" : "🧾 규제 체크리스트"}
      </div>
      <div className="space-y-1">
        {items.map((item, i) => {
          const s = LEVEL_STYLE[item.level];
          return (
            <div
              key={i}
              className="flex items-start gap-1.5 rounded px-2 py-1.5"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}
            >
              <span className="text-[12px] shrink-0 leading-[1.4]">{item.icon}</span>
              <div className="min-w-0 text-[11px] leading-relaxed">
                <span className="font-semibold" style={{ color: s.text }}>
                  {item.title}
                </span>
                <span className="text-muted-foreground"> — {item.detail}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 text-[9.5px] text-muted-foreground/80">
        ※ 조회된 데이터 기반 간이 판정입니다. 정확한 저촉 여부·부담금은 인허가 전 관할 지자체 확인이 필요합니다.
      </div>
    </div>
  );
}
