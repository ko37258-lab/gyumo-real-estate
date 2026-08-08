import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";


function getServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: me } = await supabase
    .from("gyumo_profiles")
    .select("is_admin, role")
    .eq("id", user.id)
    .single();

  if (!me?.is_admin && me?.role !== "스텝") {
    return new Response("Forbidden", { status: 403 });
  }

  const admin = getServiceClient();
  const { data } = await admin
    .from("gyumo_profiles")
    .select("id, email, full_name, phone, role, is_admin, credits, signup_provider, agreed_terms, agreed_at, created_at")
    .order("created_at", { ascending: false });

  const today = new Date().toISOString().split("T")[0]; // 파일명용
  // 일 3건 리셋 모델 폐기 — 오늘사용/한도 대신 크레딧 잔액을 내보낸다
  const headers = ["이메일", "이름", "전화번호", "등급", "크레딧", "가입경로", "크레딧구매", "개인정보동의", "동의일시", "가입일"];

  // 크레딧 구매자 표시 — purchase 배치 보유 여부
  const { data: purchases } = await admin
    .from("gyumo_credit_batches")
    .select("user_id")
    .eq("source", "purchase");
  const buyerIds = new Set((purchases ?? []).map((b) => b.user_id as string));

  const rows = (data ?? []).map((u) => [
    u.email,
    u.full_name ?? "",
    u.phone ?? "",
    u.role,
    u.is_admin ? "무제한" : (u.credits ?? 0),
    u.signup_provider === "google" ? "구글" : "이메일",
    buyerIds.has(u.id) ? "구매자" : "",
    u.agreed_terms ? "동의" : "미동의",
    u.agreed_at ? new Date(u.agreed_at).toLocaleString("ko-KR") : "",
    new Date(u.created_at).toLocaleDateString("ko-KR"),
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return new Response("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gyumo_회원_${today}.csv"`,
    },
  });
}
