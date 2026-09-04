"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ALL_ROLES } from "@/lib/membership";
import { formatDateKST } from "@/lib/utils";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  is_admin: boolean;
  credits: number | null;
  signup_provider: string | null;
  agreed_terms: boolean | null;
  agreed_at: string | null;
  created_at: string;
  /** 구글 가입자 "자기이름 등록" 완료 시각 (2026-09-04 컬럼) */
  name_registered_at?: string | null;
};

const ROLE_COLOR: Record<string, string> = {
  "일반회원":       "#6b7280",
  "정회원":         "#FFCF0D",
  "VIP":            "#c4b5fd",
  "미스터홈즈센터": "#34d399",
  "멘토스쿨":       "#fb923c",
  "스텝":           "#a78bfa",
};

export function UserTable({
  profiles,
  isSuperAdmin,
  buyerIds,
  linkedEmails = {},
}: {
  profiles: Profile[];
  isSuperAdmin: boolean;
  /** purchase 크레딧을 받은 적 있는 회원 id — 💳 구매자 배지 표시용 */
  buyerIds: string[];
  /** 회원 id → 같은 전화번호·이름으로 묶인 다른 계정 이메일 (👥 N계정 배지) */
  linkedEmails?: Record<string, string[]>;
}) {
  const router = useRouter();
  const buyers = new Set(buyerIds);
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState<string>(ALL_ROLES[0]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [rowRoles, setRowRoles] = useState<Record<string, string>>(
    Object.fromEntries(profiles.map((p) => [p.id, p.role])),
  );

  const allIds = profiles.map((p) => p.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(allIds));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /**
   * 등급 토글 — 누르는 즉시 저장한다.
   * 화면은 먼저 바꿔 두고(낙관적 갱신), 실패하면 원래 등급으로 되돌린다.
   * 저장 버튼을 따로 누르게 하면 바꿔놓고 저장을 잊는 일이 생긴다.
   */
  const setRole = async (id: string, nextRole: string, prevRole: string) => {
    if (nextRole === prevRole) return;
    setRowRoles((prev) => ({ ...prev, [id]: nextRole }));
    setSavingId(id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role: nextRole }),
      });
      if (!res.ok) throw new Error();
      startTransition(() => router.refresh());
    } catch {
      setRowRoles((prev) => ({ ...prev, [id]: prevRole }));
      alert("등급 변경에 실패했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  const applyBulk = async () => {
    if (selected.size === 0) return;
    const confirm = window.confirm(
      `선택한 ${selected.size}명을 [${bulkRole}]으로 변경하시겠습니까?`,
    );
    if (!confirm) return;

    setBulkSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], role: bulkRole }),
      });
      if (!res.ok) throw new Error();
      setSelected(new Set());
      startTransition(() => router.refresh());
    } catch {
      alert("일괄 변경에 실패했습니다.");
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div>
      {/* 일괄 변경 바 */}
      {selected.size > 0 && (
        <div
          className="sticky top-14 z-30 flex items-center gap-3 px-4 py-3 rounded-xl mb-4 shadow-lg flex-wrap"
          style={{
            background: "rgba(255,207,13,0.12)",
            border: "1px solid rgba(255,207,13,0.4)",
            backdropFilter: "blur(8px)",
          }}
        >
          <span className="text-sm font-semibold" style={{ color: "#FFCF0D" }}>
            {selected.size}명 선택됨
          </span>
          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            → 일괄 변경:
          </span>
          <select
            value={bulkRole}
            onChange={(e) => setBulkRole(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-sm border outline-none"
            style={{ background: "var(--card)", borderColor: "rgba(255,207,13,0.4)" }}
          >
            {ALL_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          <button
            onClick={applyBulk}
            disabled={bulkSaving || isPending}
            className="px-4 py-1.5 rounded-lg text-sm font-bold transition-opacity hover:opacity-85 disabled:opacity-50"
            style={{ background: "#FFCF0D", color: "#020425" }}
          >
            {bulkSaving ? "변경 중..." : "일괄 변경 적용"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="text-xs px-2 py-1 rounded"
            style={{ color: "var(--muted-foreground)" }}
          >
            선택 해제
          </button>
        </div>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary)" }}>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleAll}
                    className="cursor-pointer"
                    style={{ accentColor: "#FFCF0D" }}
                  />
                </th>
                {["이름/이메일/전화", "등급 변경", "크레딧", "개인정보 동의", isSuperAdmin ? "최고관리자" : null, "가입일", "액션"]
                  .filter(Boolean)
                  .map((h) => (
                    <th key={h!} className="text-left px-4 py-3 text-xs font-medium"
                      style={{ color: "var(--muted-foreground)" }}>
                      {h}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => {
                const isChecked = selected.has(p.id);
                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: isChecked ? "rgba(255,207,13,0.06)" : undefined,
                    }}
                    className="transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(p.id)}
                        className="cursor-pointer"
                        style={{ accentColor: "#FFCF0D" }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{p.full_name || "—"}</div>
                      <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{p.email}</div>
                      {p.phone && (
                        <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{p.phone}</div>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.is_admin && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(255,207,13,0.15)", color: "#FFCF0D" }}>
                            최고관리자
                          </span>
                        )}
                        {buyers.has(p.id) && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(255,207,13,0.15)", color: "#eab308", border: "1px solid rgba(234,179,8,0.35)" }}>
                            💳 구매자
                          </span>
                        )}
                        {/* 동일 전화번호·이름 묶음 — 한 계정처럼 크레딧을 함께 쓴다 */}
                        {(linkedEmails[p.id]?.length ?? 0) > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            title={`함께 묶인 계정: ${linkedEmails[p.id].join(", ")}`}
                            style={{ background: "rgba(96,165,250,0.14)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.35)" }}>
                            👥 {linkedEmails[p.id].length + 1}계정
                          </span>
                        )}
                        {/* 구글 가입은 이름이 자동으로 오므로, "자기이름 등록" 여부는 등록시각(또는 전화)으로 판별 */}
                        {p.signup_provider === "google" && (
                          (p.name_registered_at || (p.phone ?? "").trim() !== "") ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: "rgba(52,211,153,0.14)", color: "#34d399", border: "1px solid rgba(52,211,153,0.35)" }}>
                              구글 · 이름 등록
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              title="자기이름 등록 전 — 서비스 이용 불가"
                              style={{ background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.35)" }}>
                              구글 · 이름 미등록
                            </span>
                          )
                        )}
                      </div>
                      {(linkedEmails[p.id]?.length ?? 0) > 0 && (
                        <div className="text-[10px] mt-1" style={{ color: "#60a5fa" }}>
                          함께: {linkedEmails[p.id].join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {/* 등급 토글 — 누른 등급이 곧바로 적용된다 (별도 저장 없음) */}
                      <div
                        role="group"
                        aria-label={`${p.email} 등급`}
                        className="inline-flex flex-wrap gap-1 p-1 rounded-lg"
                        style={{ background: "var(--secondary)", border: "1px solid var(--border)", opacity: savingId === p.id ? 0.55 : 1 }}
                      >
                        {ALL_ROLES.map((r) => {
                          const current = rowRoles[p.id] ?? p.role;
                          const active = current === r;
                          const color = ROLE_COLOR[r] ?? "#6b7280";
                          return (
                            <button
                              key={r}
                              type="button"
                              aria-pressed={active}
                              disabled={savingId === p.id || isPending}
                              onClick={() => setRole(p.id, r, current)}
                              className="text-[11px] font-semibold px-2 py-1 rounded-md transition-colors disabled:cursor-not-allowed"
                              style={
                                active
                                  ? { background: `${color}26`, color, border: `1px solid ${color}` }
                                  : { background: "transparent", color: "var(--muted-foreground)", border: "1px solid transparent" }
                              }
                            >
                              {r}
                            </button>
                          );
                        })}
                      </div>
                      {savingId === p.id && (
                        <div className="text-[10px] mt-1" style={{ color: "var(--muted-foreground)" }}>
                          저장 중...
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {/* 크레딧 잔액 — 일 3건 리셋 모델 폐기 후 daily_count 는 죽은 데이터라 교체 */}
                      <span className={`text-sm font-semibold tabular-nums ${!p.is_admin && (p.credits ?? 0) === 0 ? "text-red-400" : ""}`}>
                        {p.is_admin ? "∞" : (p.credits ?? 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {p.agreed_terms ? (
                        <div>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}
                          >
                            ✓ 동의
                          </span>
                          {p.agreed_at && (
                            <div className="text-[10px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                              {formatDateKST(p.agreed_at)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}
                        >
                          미동의
                        </span>
                      )}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded font-medium"
                          style={p.is_admin
                            ? { background: "rgba(255,207,13,0.15)", color: "#FFCF0D", border: "1px solid rgba(255,207,13,0.3)" }
                            : { background: "var(--secondary)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }
                          }
                        >
                          {p.is_admin ? "관리자" : "일반"}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {formatDateKST(p.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <a href={`mailto:${p.email}`} className="text-xs px-2 py-1 rounded"
                        style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}>
                        메일
                      </a>
                    </td>
                  </tr>
                );
              })}
              {!profiles.length && (
                <tr>
                  <td colSpan={isSuperAdmin ? 8 : 7} className="px-4 py-10 text-center text-sm"
                    style={{ color: "var(--muted-foreground)" }}>
                    회원이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
