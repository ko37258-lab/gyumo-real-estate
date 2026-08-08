"use client";

import { useEffect, useRef, useState } from "react";
import { useHistoryStore } from "@/store/history";
import { useUnitStore } from "@/store/unit";
import { formatAreaShortBy } from "@/lib/utils/area";

/**
 * 📁 내 프로젝트 이력 — 지번 조회 성공 시 자동 기록된 물건 목록.
 *
 * 저장소는 서버 DB(gyumo_history)가 정본 — 어느 기기·브라우저로 로그인해도
 * 같은 이력이 보인다. LocalStorage 는 두 가지 역할만 남는다:
 *   ① 조회 직후 즉시 표시 (서버 재조회 전까지의 낙관적 캐시)
 *   ② 예전 브라우저 저장분의 1회성 서버 이관 (아래 migrate — upsert 라 중복 무해)
 *
 * 다운로드: /api/history/export — 본인 이력 CSV (엑셀 호환 BOM).
 */

type Rec = {
  pnu: string;
  address: string;
  fetchedAt: string;
  areaSqm: number;
  zone?: string;
  jimok?: string;
  estimatedPrice?: number;
  jigaTotal?: number;
};

export function ProjectHistory() {
  const localRecords = useHistoryStore((s) => s.records);
  const removeLocal = useHistoryStore((s) => s.remove);
  const clearAllLocal = useHistoryStore((s) => s.clearAll);
  const [sortByJibun, setSortByJibun] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const unit = useUnitStore((s) => s.unit);
  const [userId, setUserId] = useState<string | null>(null);
  const [serverRecords, setServerRecords] = useState<Rec[] | null>(null);
  const migratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/usage", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/history", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([usage, history]) => {
        if (cancelled) return;
        const uid: string | null = usage.userId ?? null;
        setUserId(uid);
        const recs: Rec[] = Array.isArray(history.records) ? history.records : [];
        setServerRecords(recs);

        // 예전 LocalStorage 기록 중 서버에 없는 것 1회 이관
        if (uid && !migratedRef.current) {
          migratedRef.current = true;
          const serverPnus = new Set(recs.map((r) => r.pnu));
          const missing = useHistoryStore
            .getState()
            .records.filter((r) => r.userId === uid && !serverPnus.has(r.pnu));
          if (missing.length > 0) {
            void fetch("/api/history", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ records: missing }),
            }).catch(() => {});
          }
        }
      })
      .catch(() => {
        if (!cancelled) setServerRecords([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!userId) return null;

  // 서버(정본) + 이번 세션 로컬 기록(서버 응답 이후 조회분) 병합 — pnu 기준 최신 우선
  const merged = new Map<string, Rec>();
  for (const r of serverRecords ?? []) merged.set(r.pnu, r);
  for (const r of localRecords) {
    if (r.userId !== userId) continue;
    const prev = merged.get(r.pnu);
    if (!prev || r.fetchedAt > prev.fetchedAt) merged.set(r.pnu, r);
  }
  const records = [...merged.values()].sort((a, b) =>
    b.fetchedAt.localeCompare(a.fetchedAt),
  );
  if (records.length === 0) return null;

  const sorted = sortByJibun
    ? [...records].sort((a, b) => a.address.localeCompare(b.address, "ko"))
    : records;
  const shown = expanded ? sorted : sorted.slice(0, 5);

  const eok = (v?: number) => (v && v > 0 ? `${(v / 1e8).toFixed(1)}억` : null);

  const removeOne = (pnu: string) => {
    removeLocal(userId, pnu);
    setServerRecords((prev) => (prev ?? []).filter((r) => r.pnu !== pnu));
    void fetch(`/api/history?pnu=${encodeURIComponent(pnu)}`, {
      method: "DELETE",
    }).catch(() => {});
  };

  const removeAll = () => {
    if (!window.confirm("내 프로젝트 이력을 모두 삭제할까요? (모든 기기에서 삭제됩니다)"))
      return;
    clearAllLocal(userId);
    setServerRecords([]);
    void fetch("/api/history?all=1", { method: "DELETE" }).catch(() => {});
  };

  return (
    <div className="rounded-md border border-border bg-card p-2.5">
      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
        <span className="text-[11px] font-bold text-foreground">
          📁 내 프로젝트 이력 ({records.length}건)
        </span>
        <span className="flex items-center gap-1.5">
          <a
            href="/api/history/export"
            className="text-[10px] px-2 py-0.5 rounded-full border font-semibold"
            style={{ borderColor: "var(--info)", color: "var(--info)" }}
            title="내 조회 이력을 CSV(엑셀)로 내려받습니다"
          >
            📥 자료 다운로드
          </a>
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
            onClick={removeAll}
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
              onClick={() => removeOne(r.pnu)}
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
        ※ 이력은 내 계정에 저장되어 어느 기기에서 로그인해도 보입니다. 항목 클릭
        시 재조회되며 조회 1회가 차감됩니다.
      </div>
    </div>
  );
}
