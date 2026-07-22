"use client";

import { useEffect, useState, useTransition } from "react";
import { formatDateKST } from "@/lib/utils";
import { formatWon } from "@/lib/credits";

type CreditRequest = {
  id: string;
  email: string | null;
  plan: string;
  amount_won: number;
  credits: number;
  depositor_name: string;
  phone_last4: string;
  company: string | null;
  region: string | null;
  status: "pending" | "approved" | "rejected";
  processed_at: string | null;
  note: string | null;
  created_at: string;
};

const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "확인 대기", color: "#f59e0b" },
  approved: { label: "지급 완료", color: "#22c55e" },
  rejected: { label: "반려", color: "#ef4444" },
};

export function CreditRequestTable() {
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [rows, setRows] = useState<CreditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  // 프로미스 체인 형태 유지 — effect 내 동기 setState 회피 (react-hooks/set-state-in-effect)
  // cache:"no-store" — 승인 직후 다시 불러올 때 브라우저가 캐시된 옛 목록(방금
  // 승인한 건이 아직 '대기')을 돌려주던 문제 방지. 이게 "로그아웃해야 갱신"의 원인.
  const load = (status: "pending" | "all") =>
    fetch(`/api/admin/credits?status=${status}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setErr("목록을 불러오지 못했습니다."))
      .finally(() => setLoading(false));

  useEffect(() => {
    void load(tab);
  }, [tab]);

  const act = (id: string, action: "approve" | "reject") => {
    if (action === "reject" && !window.confirm("이 신청을 반려할까요?")) return;
    if (action === "approve" && !window.confirm("입금 확인 완료 — 크레딧을 지급하고 정회원으로 승격할까요?")) return;
    setErr(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/credits", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.error ?? "처리 실패");
        return;
      }
      // 서버 반영 완료 — 화면에서도 즉시 바꾼다(낙관적 갱신).
      // '확인 대기' 탭이면 처리된 건은 목록에서 빠지고, '전체' 탭이면 상태만 바뀐다.
      const newStatus = action === "approve" ? "approved" : "rejected";
      setRows((prev) =>
        tab === "pending"
          ? prev.filter((row) => row.id !== id)
          : prev.map((row) =>
              row.id === id
                ? { ...row, status: newStatus, processed_at: new Date().toISOString() }
                : row,
            ),
      );
      // 서버 최신값으로 재동기화(캐시 없이)
      load(tab);
    });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        {(["pending", "all"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setLoading(true);
              setTab(t);
            }}
            className="text-sm px-3 py-1.5 rounded-lg font-medium transition-colors"
            style={{
              background: tab === t ? "#FFCF0D" : "var(--secondary)",
              color: tab === t ? "#020425" : "var(--muted-foreground)",
            }}
          >
            {t === "pending" ? "확인 대기" : "전체"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => load(tab)}
          className="text-xs px-2.5 py-1.5 rounded-lg ml-auto"
          style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}
        >
          새로고침
        </button>
      </div>

      {err && (
        <div className="rounded-lg px-4 py-2.5 text-sm mb-3" style={{ background: "rgba(239,68,68,0.12)", color: "#dc2626" }}>
          {err}
        </div>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary)" }}>
                {["신청일", "입금자", "전화 뒤4", "요금제", "입금액", "크레딧", "소속/지역", "상태", "처리"].map((h) => (
                  <th key={h} className="text-left px-3 py-3 text-xs font-medium whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>불러오는 중...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {tab === "pending" ? "확인 대기 중인 신청이 없습니다." : "신청 내역이 없습니다."}
                </td></tr>
              ) : (
                rows.map((r) => {
                  const st = STATUS[r.status] ?? STATUS.pending;
                  return (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: "var(--muted-foreground)" }}>
                        {formatDateKST(r.created_at)}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="font-medium">{r.depositor_name}</div>
                        <div className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{r.email}</div>
                      </td>
                      <td className="px-3 py-3 tabular-nums">{r.phone_last4}</td>
                      <td className="px-3 py-3 whitespace-nowrap">{r.plan}회</td>
                      <td className="px-3 py-3 whitespace-nowrap font-medium">{formatWon(r.amount_won)}</td>
                      <td className="px-3 py-3 whitespace-nowrap font-bold" style={{ color: "#993C1D" }}>{r.credits}</td>
                      <td className="px-3 py-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {[r.company, r.region].filter(Boolean).join(" / ") || "—"}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: `${st.color}22`, color: st.color }}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {r.status === "pending" ? (
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => act(r.id, "approve")}
                              className="text-xs font-bold px-2.5 py-1 rounded-md disabled:opacity-50"
                              style={{ background: "#22c55e", color: "#fff" }}
                            >
                              승인·지급
                            </button>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => act(r.id, "reject")}
                              className="text-xs px-2.5 py-1 rounded-md disabled:opacity-50 border"
                              style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                            >
                              반려
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
                            {r.processed_at ? formatDateKST(r.processed_at) : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
