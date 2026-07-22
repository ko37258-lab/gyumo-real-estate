"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BANK_INFO,
  CREDIT_NOTICE,
  CREDIT_PLANS,
  formatWon,
  type CreditPlanId,
} from "@/lib/credits";

type MyRequest = {
  id: string;
  plan: string;
  amount_won: number;
  credits: number;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  processed_at: string | null;
  note: string | null;
};

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "확인 대기", color: "#f59e0b", bg: "rgba(245,158,11,0.14)" },
  approved: { label: "지급 완료", color: "#22c55e", bg: "rgba(34,197,94,0.14)" },
  rejected: { label: "반려", color: "#ef4444", bg: "rgba(239,68,68,0.14)" },
};

export default function CreditsPage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [nextExpiry, setNextExpiry] = useState<string | null>(null);
  const [requests, setRequests] = useState<MyRequest[]>([]);
  const [loggedOut, setLoggedOut] = useState(false);

  const [plan, setPlan] = useState<CreditPlanId>("30");
  const [depositorName, setDepositorName] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [company, setCompany] = useState("");
  const [region, setRegion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // 프로미스 체인 형태 유지 — effect 내 동기 setState 회피 (react-hooks/set-state-in-effect)
  const load = () =>
    fetch("/api/credits", { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) {
          setLoggedOut(true);
          return;
        }
        const j = await res.json();
        setBalance(j.credits ?? 0);
        setNextExpiry(j.nextExpiry ?? null);
        setRequests(j.requests ?? []);
      })
      .catch(() => null);

  useEffect(() => {
    void load();
  }, []);

  const selected = CREDIT_PLANS.find((p) => p.id === plan)!;

  const submit = async () => {
    setMsg(null);
    if (!depositorName.trim()) {
      setMsg({ type: "err", text: "입금자 성함을 입력해주세요." });
      return;
    }
    if (!/^\d{4}$/.test(phoneLast4)) {
      setMsg({ type: "err", text: "전화번호 뒤 4자리를 숫자로 입력해주세요." });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, depositorName, phoneLast4, company, region }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ type: "err", text: j.error ?? "신청 실패" });
      } else {
        setMsg({
          type: "ok",
          text: "신청이 접수됐습니다. 입금 확인 후 3시간 안에 크레딧이 지급됩니다.",
        });
        setDepositorName("");
        setPhoneLast4("");
        await load();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loggedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--background)" }}>
        <div className="text-center space-y-3">
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            로그인이 필요합니다.
          </p>
          <Link
            href="/login?redirect=/credits"
            className="inline-block px-4 py-2 rounded-lg font-bold text-sm"
            style={{ background: "#993C1D", color: "#fff" }}
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header
        className="sticky top-0 z-40 border-b"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/simulator" className="text-sm hover:opacity-70" style={{ color: "var(--muted-foreground)" }}>
            ← 시뮬레이터
          </Link>
          <span className="font-semibold text-sm">정회원 · 크레딧 신청</span>
          <Link href="/account" className="text-xs hover:opacity-70" style={{ color: "var(--muted-foreground)" }}>
            마이페이지
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* 현재 잔액 */}
        <div className="rounded-2xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="flex items-baseline justify-between">
            <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              보유 크레딧
            </span>
            <span className="text-3xl font-bold" style={{ color: "#993C1D" }}>
              {balance === null ? "…" : balance.toLocaleString("ko-KR")}
              <span className="text-base font-medium ml-1">크레딧</span>
            </span>
          </div>
          <div className="text-[11px] mt-1" style={{ color: "var(--muted-foreground)" }}>
            조회 1건당 1크레딧 소모
            {nextExpiry
              ? ` · 가장 가까운 만료일 ${new Date(nextExpiry).toLocaleDateString("ko-KR")}`
              : ""}
          </div>
        </div>

        {/* 안내 */}
        <div
          className="rounded-2xl border p-5 text-[12.5px] leading-relaxed"
          style={{ background: "rgba(153,60,29,0.06)", borderColor: "rgba(153,60,29,0.3)" }}
        >
          <div className="font-bold mb-2" style={{ color: "#993C1D" }}>
            📌 신청 안내
          </div>
          <ul className="space-y-1 list-disc pl-5">
            {CREDIT_NOTICE.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>

        {/* 요금제 선택 */}
        <div className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="font-semibold text-sm">① 요금제 선택</div>
          <div className="grid grid-cols-2 gap-2.5">
            {CREDIT_PLANS.map((p) => {
              const active = p.id === plan;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlan(p.id)}
                  className="text-left rounded-xl border-2 p-3 transition-all"
                  style={{
                    borderColor: active ? "#993C1D" : "var(--border)",
                    background: active ? "rgba(153,60,29,0.08)" : "transparent",
                  }}
                >
                  <div className="font-bold text-sm">{p.label}</div>
                  <div className="text-lg font-bold" style={{ color: "#993C1D" }}>
                    {formatWon(p.priceWon)}
                  </div>
                  <div className="text-[12px] font-semibold">{p.credits}크레딧</div>
                  {p.note && (
                    <div className="text-[10.5px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                      {p.note}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 입금 계좌 */}
        <div className="rounded-2xl border p-5 space-y-2" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="font-semibold text-sm">② 입금 계좌</div>
          <div className="rounded-lg p-3.5 text-sm" style={{ background: "var(--secondary)" }}>
            <div className="flex justify-between py-0.5">
              <span style={{ color: "var(--muted-foreground)" }}>은행</span>
              <b>{BANK_INFO.bank}</b>
            </div>
            <div className="flex justify-between py-0.5">
              <span style={{ color: "var(--muted-foreground)" }}>계좌번호</span>
              <b className="tabular-nums">{BANK_INFO.account}</b>
            </div>
            <div className="flex justify-between py-0.5">
              <span style={{ color: "var(--muted-foreground)" }}>예금주</span>
              <b>{BANK_INFO.holder}</b>
            </div>
            <div
              className="flex justify-between py-0.5 mt-1 pt-2 border-t"
              style={{ borderColor: "var(--border)" }}
            >
              <span style={{ color: "var(--muted-foreground)" }}>입금액</span>
              <b style={{ color: "#993C1D" }}>{formatWon(selected.priceWon)}</b>
            </div>
          </div>
        </div>

        {/* 신청 정보 입력 */}
        <div className="rounded-2xl border p-5 space-y-3" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="font-semibold text-sm">③ 입금 확인 정보</div>
          <p className="text-[11.5px]" style={{ color: "var(--muted-foreground)" }}>
            송금 후 아래 정보를 입력하면, 확인 후 3시간 안에 크레딧이 지급됩니다.
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="입금자 성함 *">
              <input
                value={depositorName}
                onChange={(e) => setDepositorName(e.target.value)}
                placeholder="홍길동"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
                style={{ background: "var(--background)", borderColor: "var(--border)" }}
              />
            </Field>
            <Field label="전화번호 뒤 4자리 *">
              <input
                value={phoneLast4}
                onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                placeholder="1234"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none border tabular-nums"
                style={{ background: "var(--background)", borderColor: "var(--border)" }}
              />
            </Field>
          </div>

          <div className="pt-1">
            <div className="text-[11px] font-medium mb-1.5" style={{ color: "var(--muted-foreground)" }}>
              정회원 정보 (선택 — 입력 시 맞춤 안내에 활용)
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="회사 / 소속">
                <input
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="○○부동산"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
                  style={{ background: "var(--background)", borderColor: "var(--border)" }}
                />
              </Field>
              <Field label="관심 지역">
                <input
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="서울 강남구"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none border"
                  style={{ background: "var(--background)", borderColor: "var(--border)" }}
                />
              </Field>
            </div>
          </div>

          {msg && (
            <div
              className="rounded-lg px-3.5 py-2.5 text-[12.5px]"
              style={
                msg.type === "ok"
                  ? { background: "rgba(34,197,94,0.12)", color: "#16a34a", border: "1px solid rgba(34,197,94,0.3)" }
                  : { background: "rgba(239,68,68,0.12)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.3)" }
              }
            >
              {msg.text}
            </div>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="w-full rounded-lg py-3 font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: "#993C1D", color: "#fff" }}
          >
            {submitting
              ? "신청 중..."
              : `${selected.label} 신청 (${formatWon(selected.priceWon)} · ${selected.credits}크레딧)`}
          </button>
        </div>

        {/* 내 신청 내역 */}
        {requests.length > 0 && (
          <div className="rounded-2xl border p-5" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="font-semibold text-sm mb-3">내 신청 내역</div>
            <div className="space-y-1.5">
              {requests.map((r) => {
                const st = STATUS_LABEL[r.status] ?? STATUS_LABEL.pending;
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between text-[12px] px-3 py-2 rounded-lg"
                    style={{ background: "var(--secondary)" }}
                  >
                    <span>
                      {new Date(r.created_at).toLocaleDateString("ko-KR")} · {r.plan}회 ·{" "}
                      {formatWon(r.amount_won)} → {r.credits}크레딧
                    </span>
                    <span
                      className="text-[10.5px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: st.bg, color: st.color }}
                    >
                      {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium mb-1" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}
