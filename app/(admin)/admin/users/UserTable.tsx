"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ALL_ROLES, getDailyLimit } from "@/lib/membership";
import { formatDateKST } from "@/lib/utils";

type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  is_admin: boolean;
  daily_count: number;
  daily_reset: string | null;
  agreed_terms: boolean | null;
  agreed_at: string | null;
  created_at: string;
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
  today,
}: {
  profiles: Profile[];
  isSuperAdmin: boolean;
  today: string;
}) {
  const router = useRouter();
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

  const saveOne = async (id: string) => {
    setSavingId(id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, role: rowRoles[id] }),
      });
      if (!res.ok) throw new Error();
      startTransition(() => router.refresh());
    } catch {
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
                {["이름/이메일/전화", "등급 변경", "오늘 사용", "개인정보 동의", isSuperAdmin ? "최고관리자" : null, "가입일", "액션"]
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
                const isToday = p.daily_reset === today;
                const used = isToday ? p.daily_count : 0;
                const limit = p.is_admin ? "∞" : getDailyLimit(p.role, false);
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
                      {p.is_admin && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded mt-0.5 inline-block"
                          style={{ background: "rgba(255,207,13,0.15)", color: "#FFCF0D" }}>
                          최고관리자
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: `${ROLE_COLOR[rowRoles[p.id] ?? p.role] ?? "#6b7280"}22`,
                            color: ROLE_COLOR[rowRoles[p.id] ?? p.role] ?? "#6b7280",
                          }}
                        >
                          {rowRoles[p.id] ?? p.role}
                        </span>
                        <select
                          value={rowRoles[p.id] ?? p.role}
                          onChange={(e) =>
                            setRowRoles((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          className="rounded px-2 py-1 text-xs border outline-none"
                          style={{ background: "var(--secondary)", borderColor: "var(--border)" }}
                        >
                          {ALL_ROLES.map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => saveOne(p.id)}
                          disabled={savingId === p.id || isPending}
                          className="text-xs px-2 py-1 rounded disabled:opacity-40"
                          style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
                        >
                          {savingId === p.id ? "..." : "저장"}
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${used >= (typeof limit === "number" ? limit : 9999) ? "text-red-400" : ""}`}>
                        {used} / {limit}
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
