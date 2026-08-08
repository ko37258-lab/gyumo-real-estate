import { createClient } from "@/lib/supabase/server";
import { ALL_ROLES } from "@/lib/membership";
import Link from "next/link";
import { UserTable } from "./UserTable";

export const metadata = { title: "회원 관리 | 규모검토 관리자" };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; cls?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("gyumo_profiles")
    .select("is_admin, role")
    .eq("id", user!.id)
    .single();
  const isSuperAdmin = me?.is_admin === true;

  let query = supabase
    .from("gyumo_profiles")
    .select("id, email, full_name, phone, role, credits, is_admin, agreed_terms, agreed_at, created_at, signup_provider")
    .order("created_at", { ascending: false });

  if (params.role && params.role !== "all") query = query.eq("role", params.role);

  const { data: profiles } = await query;

  // 크레딧 구매자 = purchase 배치를 받은 적 있는 회원 (admin RLS 로 조회)
  const { data: purchaseBatches } = await supabase
    .from("gyumo_credit_batches")
    .select("user_id")
    .eq("source", "purchase");
  const buyerIds = new Set((purchaseBatches ?? []).map((b) => b.user_id as string));

  let filtered = params.q
    ? (profiles ?? []).filter((p) =>
        p.email?.includes(params.q!) ||
        (p.full_name ?? "").includes(params.q!) ||
        (p.phone ?? "").includes(params.q!),
      )
    : (profiles ?? []);

  // 분류 필터 — 구매자 / 구글 가입(이름 확인·미입력)
  switch (params.cls) {
    case "buyer":
      filtered = filtered.filter((p) => buyerIds.has(p.id));
      break;
    case "google":
      filtered = filtered.filter((p) => p.signup_provider === "google");
      break;
    // ⚠ 구글 가입은 이름이 구글 프로필에서 자동으로 채워진다 (16명 전원 보유 확인).
    //   본인이 직접 입력했는지는 전화번호로 판별한다 — 전화는 우리 폼으로만 들어온다.
    case "google_named":
      filtered = filtered.filter(
        (p) => p.signup_provider === "google" && (p.phone ?? "").trim() !== "",
      );
      break;
    case "google_unnamed":
      filtered = filtered.filter(
        (p) => p.signup_provider === "google" && (p.phone ?? "").trim() === "",
      );
      break;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-semibold">회원 관리</h1>
        <Link
          href="/api/admin/export"
          className="text-xs px-3 py-1.5 rounded-lg font-medium"
          style={{ background: "var(--secondary)", border: "1px solid var(--border)" }}
        >
          📥 엑셀 다운로드
        </Link>
      </div>

      {/* 검색 + 필터 */}
      <form method="GET" className="flex flex-wrap gap-3 mb-6">
        <input
          name="q" defaultValue={params.q}
          placeholder="이름·이메일·전화번호 검색"
          className="rounded-lg px-3.5 py-2 text-sm border outline-none"
          style={{ background: "var(--card)", borderColor: "var(--border)", minWidth: 220 }}
        />
        <select name="role" defaultValue={params.role || "all"}
          className="rounded-lg px-3 py-2 text-sm border outline-none"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <option value="all">전체 등급</option>
          {ALL_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select name="cls" defaultValue={params.cls || "all"}
          className="rounded-lg px-3 py-2 text-sm border outline-none"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}>
          <option value="all">전체 분류</option>
          <option value="buyer">💳 크레딧 구매자</option>
          <option value="google">구글 가입 전체</option>
          <option value="google_named">구글 가입 · 정보 확인(전화 입력)</option>
          <option value="google_unnamed">구글 가입 · 정보 미입력</option>
        </select>
        <button type="submit" className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "#FFCF0D", color: "#020425" }}>검색</button>
      </form>

      <div className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>
        총 {filtered.length}명
      </div>

      <UserTable profiles={filtered} isSuperAdmin={isSuperAdmin} buyerIds={[...buyerIds]} />
    </div>
  );
}
