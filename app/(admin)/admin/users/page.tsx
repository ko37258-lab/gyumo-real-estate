import { createClient } from "@/lib/supabase/server";
import { ALL_ROLES } from "@/lib/membership";
import Link from "next/link";
import { UserTable } from "./UserTable";
import { groupLinked, linkKey, normPhone } from "@/lib/linkedAccounts";

export const metadata = { title: "회원 관리 | 규모검토 관리자" };

/** 구글 가입자의 "자기이름 등록" 완료 여부 — 컬럼 도입 전 데이터는 전화 입력으로 대신 판별 */
function isNameRegistered(p: { name_registered_at?: string | null; phone?: string | null }) {
  return Boolean(p.name_registered_at) || (p.phone ?? "").trim() !== "";
}

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

  const COLS = "id, email, full_name, phone, role, credits, is_admin, agreed_terms, agreed_at, created_at, signup_provider";
  let query = supabase
    .from("gyumo_profiles")
    .select(`${COLS}, name_registered_at`)
    .order("created_at", { ascending: false });

  if (params.role && params.role !== "all") query = query.eq("role", params.role);

  let { data: profiles } = await query;
  if (!profiles) {
    // name_registered_at 컬럼 추가(supabase/schema_linked_accounts.sql) 전 환경 폴백
    let q2 = supabase.from("gyumo_profiles").select(COLS).order("created_at", { ascending: false });
    if (params.role && params.role !== "all") q2 = q2.eq("role", params.role);
    profiles = ((await q2).data ?? []).map((p) => ({ ...p, name_registered_at: null as string | null }));
  }

  // 크레딧 구매자 = purchase 배치를 받은 적 있는 회원 (admin RLS 로 조회)
  const { data: purchaseBatches } = await supabase
    .from("gyumo_credit_batches")
    .select("user_id")
    .eq("source", "purchase");
  const buyerIds = new Set((purchaseBatches ?? []).map((b) => b.user_id as string));

  // 동일 전화번호+이름 계정 묶음 — 전체 목록 기준으로 묶은 뒤 검색·필터를 건다
  // (검색 결과에 한 계정만 남아도 "👥 2계정" 배지가 유지되도록)
  const linked = groupLinked(profiles ?? []);
  const linkedEmails: Record<string, string[]> = {};
  for (const [id, others] of linked) linkedEmails[id] = others.map((o) => o.email);
  const linkedGroupCount = new Set(
    [...linked.keys()].map((id) => linkKey(profiles!.find((p) => p.id === id)!)),
  ).size;

  // 검색: 이름·이메일·전화(하이픈 유무 무관 — "01012345678"로도 "010-1234-5678"이 잡힌다)
  const qRaw = (params.q ?? "").trim();
  const qDigits = normPhone(qRaw);
  let filtered = qRaw
    ? (profiles ?? []).filter((p) =>
        p.email?.includes(qRaw) ||
        (p.full_name ?? "").includes(qRaw) ||
        (p.phone ?? "").includes(qRaw) ||
        (qDigits.length >= 4 && normPhone(p.phone).includes(qDigits)),
      )
    : (profiles ?? []);

  // 분류 필터 — 구매자 / 다계정 / 구글 가입(이름 등록·미등록)
  switch (params.cls) {
    case "buyer":
      filtered = filtered.filter((p) => buyerIds.has(p.id));
      break;
    case "multi":
      filtered = filtered.filter((p) => linked.has(p.id));
      break;
    case "google":
      filtered = filtered.filter((p) => p.signup_provider === "google");
      break;
    // ⚠ 구글 가입은 이름이 구글 프로필에서 자동으로 채워진다 (16명 전원 보유 확인).
    //   본인이 직접 "자기이름 등록"을 했는지는 name_registered_at(또는 전화 입력)으로 판별한다.
    case "google_named":
      filtered = filtered.filter((p) => p.signup_provider === "google" && isNameRegistered(p));
      break;
    case "google_unnamed":
      filtered = filtered.filter((p) => p.signup_provider === "google" && !isNameRegistered(p));
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
          <option value="multi">👥 다계정 (전화번호 동일)</option>
          <option value="google">구글 가입 전체</option>
          <option value="google_named">구글 가입 · 이름 등록 완료</option>
          <option value="google_unnamed">구글 가입 · 이름 미등록(이용 불가)</option>
        </select>
        <button type="submit" className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: "#FFCF0D", color: "#020425" }}>검색</button>
      </form>

      <div className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>
        총 {filtered.length}명
        {linkedGroupCount > 0 && ` · 다계정 ${linkedGroupCount}묶음(${linked.size}계정) — 같은 전화번호·이름은 한 계정처럼 크레딧을 함께 씁니다`}
      </div>

      <UserTable profiles={filtered} isSuperAdmin={isSuperAdmin} buyerIds={[...buyerIds]} linkedEmails={linkedEmails} />
    </div>
  );
}
