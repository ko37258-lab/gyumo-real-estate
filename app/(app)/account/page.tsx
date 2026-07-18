import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import Link from "next/link";

export const metadata = { title: "마이페이지 | 규모검토" };

const ROLE_LABEL: Record<string, string> = {
  "일반회원": "일반회원",
  "정회원": "정회원",
  "미스터홈즈": "미스터홈즈",
  "스텝": "스텝",
};

const ROLE_COLOR: Record<string, string> = {
  "일반회원": "#6b7280",
  "정회원": "#FFCF0D",
  "미스터홈즈": "#34d399",
  "스텝": "#a78bfa",
};

const ROLE_DESC: Record<string, string> = {
  "일반회원": "기본 기능 제공 (일 3건 조회)",
  "정회원": "무제한 조회 · PDF 리포트 · 사업성 분석",
  "미스터홈즈": "정회원 혜택 + 미스터홈즈 FC 전용",
  "스텝": "내부 스텝 전용 · 관리자 기능 포함",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/account");

  const { data: profile } = await supabase
    .from("gyumo_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const role = profile?.role ?? "일반회원";
  const roleColor = ROLE_COLOR[role] ?? "#6b7280";

  // 크레딧 잔액·임박 만료일 (1회 조회 = 1크레딧)
  const { data: balanceRaw } = await supabase.rpc("gyumo_credit_balance", {
    p_user: user.id,
  });
  const { data: nextExpiry } = await supabase.rpc("gyumo_credit_next_expiry", {
    p_user: user.id,
  });
  const credits = Number(balanceRaw) || 0;
  const isUnlimited = Boolean(profile?.is_admin) || role === "스텝";

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="sticky top-0 z-40 border-b"
        style={{ background: "rgba(2,4,37,0.96)", borderColor: "rgba(255,255,255,0.1)" }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/simulator" className="text-white/70 text-sm hover:text-white">← 시뮬레이터</Link>
          <span className="text-white font-semibold text-sm">마이페이지</span>
          <form action={signOut}>
            <button type="submit" className="text-xs text-white/50 hover:text-white px-3 py-1.5 rounded hover:bg-white/10 transition-colors">
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        {/* 프로필 카드 */}
        <div className="rounded-2xl border p-6"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-xl font-bold mb-1">{profile?.full_name || "이름 없음"}</div>
              <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>{user.email}</div>
            </div>
            <span className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: `${roleColor}22`, color: roleColor, border: `1px solid ${roleColor}44` }}>
              {ROLE_LABEL[role] ?? role}
              {profile?.is_admin && " · 최고관리자"}
            </span>
          </div>
          <div className="text-sm p-3 rounded-lg" style={{ background: "var(--secondary)" }}>
            {ROLE_DESC[role]}
          </div>
        </div>

        {/* 오늘 사용 현황 */}
        <div className="rounded-2xl border p-6"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <h2 className="font-semibold mb-4">보유 크레딧</h2>
          {isUnlimited ? (
            <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              무제한 조회 가능 (관리자·스텝)
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-baseline justify-between">
                <span className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  지번 조회 1건당 1크레딧
                </span>
                <span className="text-2xl font-bold" style={{ color: roleColor }}>
                  {credits.toLocaleString("ko-KR")}
                  <span className="text-sm font-medium ml-1">크레딧</span>
                </span>
              </div>
              {nextExpiry && (
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  가장 가까운 만료일:{" "}
                  {new Date(nextExpiry as string).toLocaleDateString("ko-KR")} (승인 후 2개월)
                </p>
              )}
              {credits === 0 && (
                <p className="text-xs" style={{ color: "#f87171" }}>
                  크레딧이 모두 소진됐습니다. 정회원 신청으로 충전해주세요.
                </p>
              )}
              <Link
                href="/credits"
                className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-bold transition-opacity hover:opacity-85"
                style={{ background: "#993C1D", color: "#fff" }}
              >
                크레딧 충전 · 정회원 신청 →
              </Link>
            </div>
          )}
        </div>

        {/* 계정 정보 */}
        <div className="rounded-2xl border p-6"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <h2 className="font-semibold mb-4">계정 정보</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt style={{ color: "var(--muted-foreground)" }}>가입일</dt>
              <dd>{profile?.created_at ? new Date(profile.created_at).toLocaleDateString("ko-KR") : "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt style={{ color: "var(--muted-foreground)" }}>약관 동의</dt>
              <dd>{profile?.agreed_terms ? `동의 완료 (${profile.agreed_at ? new Date(profile.agreed_at).toLocaleDateString("ko-KR") : ""})` : "미동의"}</dd>
            </div>
          </dl>
        </div>

        {/* 관리자 바로가기 */}
        {(profile?.is_admin || role === "스텝") && (
          <div className="rounded-2xl border p-6"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <h2 className="font-semibold mb-3">관리자 메뉴</h2>
            <Link href="/admin" className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
              style={{ background: "#FFCF0D", color: "#020425" }}>
              관리자 대시보드 →
            </Link>
          </div>
        )}

        {/* 비밀번호 변경 */}
        <div className="rounded-2xl border p-6"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <h2 className="font-semibold mb-3">보안</h2>
          <Link href="/login/reset" className="text-sm" style={{ color: "var(--info, #60a5fa)" }}>
            비밀번호 변경 →
          </Link>
        </div>
      </main>
    </div>
  );
}
