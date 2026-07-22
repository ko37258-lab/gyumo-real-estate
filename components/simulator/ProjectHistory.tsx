"use client";

import { useEffect, useState } from "react";
import { useHistoryStore } from "@/store/history";
import { useUnitStore } from "@/store/unit";
import { formatAreaShortBy } from "@/lib/utils/area";

/**
 * 📁 내 프로젝트 이력 — 지번 조회 성공 시 자동 기록된 물건 목록.
 * 최근순/지번순 정렬, 클릭 시 딥링크(?address=)로 재조회 (조회 1회 차감).
 *
 * ⚠ 로그인 계정 본인의 기록만 표시한다. LocalStorage는 브라우저 단위라
 *   계정 필터가 없으면 공용 PC에서 다른 회원의 조회 물건이 노출된다.
 */
export function ProjectHistory() {
  const allRecords = useHistoryStore((s) => s.records);
  const remove = useHistoryStore((s) => s.remove);
  const clearAll = useHistoryStore((s) => s.clearAll);
  const [sortByJibun, setSortByJibun] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const unit = useUnitStore((s) => s.unit);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/usage", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => setUserId(j.userId ?? null))
      .catch(() => null);
  }, []);

  // 내 계정 기록만
  const records = userId ? allRecords.filter((r) => r.userId === userId) : [];

  if (!userId || records.length === 0) return null;

  const sorted = sortByJibun
    ? [...records].sort((a, b) => a.address.localeCompare(b.address, "ko"))
    : records; // 기본 최근순 (store가 최신 앞으로 유지)
  const shown = expanded ? sorted : sorted.slice(0, 5);

  const eok = (v?: number) => (v && v > 0 ? `${(v / 1e8).toFixed(1)}억` : null);

  return (
    <div className="rounded-md border border-border bg-card p-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-bold text-foreground">
          📁 내 프로젝트 이력 ({records.length}건)
        </span>
        <span className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSortByJibun((v) => !v)}
            className="text-[10px] px-2 py-0.5 rounded-full border transition-colors"
            style={{
              borderColor: "var(--info)",
              color: sortByJibun ? "var(--info-foreground, #fff)" : "var(--info)",
              background: sortByJibun ? "var(--info)" : "transparent",
            }}
          >
            {sortByJibun ? "지번순 ✓" : "지번순"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("내 프로젝트 이력을 모두 삭제할까요?")) {
                clearAll(userId);
              }
            }}
            className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:text-foreground"
          >
            전체 삭제
          </button>
        </span>
      </div>

      <div className="space-y-0.5">
        {shown.map((r) => (
          <div
            key={r.pnu}
            className="flex items-center gap-2 px-2 py-1 rounded bg-secondary/40 hover:bg-secondary/70 transition-colors"
          >
            <button
              type="button"
              onClick={() => {
                window.location.href = `/simulator?address=${encodeURIComponent(r.address)}`;
              }}
              className="flex-1 min-w-0 text-left"
              title="클릭하면 다시 조회합니다 (조회 1회 차감)"
            >
              <span className="block truncate text-[11.5px] font-medium text-foreground">
                {r.address}
              </span>
              <span className="block text-[10px] text-muted-foreground">
                {r.areaSqm > 0 ? formatAreaShortBy(r.areaSqm, unit) : ""}
                {r.zone ? ` · ${r.zone}` : ""}
                {eok(r.estimatedPrice) ? ` · 추정 ${eok(r.estimatedPrice)}` : ""}
                {" · "}
                {new Date(r.fetchedAt).toLocaleDateString("ko-KR")}
              </span>
            </button>
            <button
              type="button"
              aria-label={`${r.address} 이력 삭제`}
              onClick={() => remove(userId, r.pnu)}
              className="shrink-0 text-[11px] px-1.5 text-muted-foreground hover:text-destructive"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      {sorted.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 w-full text-center text-[10.5px] font-semibold py-1 rounded transition-colors hover:bg-secondary/60"
          style={{ color: "var(--info)" }}
        >
          {expanded ? "접기 ∧" : `${sorted.length - 5}건 더보기 ∨`}
        </button>
      )}
      <div className="mt-1 text-[9px] text-muted-foreground/80">
        ※ 내 계정 기록만 이 브라우저에 저장됩니다. 항목 클릭 시 재조회되며 조회
        1회가 차감됩니다.
      </div>
    </div>
  );
}
