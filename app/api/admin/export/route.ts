import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { getDailyLimit } from "@/lib/membership";

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
    .select("email, full_name, phone, role, is_admin, daily_count, daily_reset, agreed_terms, agreed_at, created_at")
    .order("created_at", { ascending: false });

  const today = new Date().toISOString().split("T")[0];
  const headers = ["이메일", "이름", "전화번호", "등급", "오늘사용", "한도", "개인정보동의", "동의일시", "가입일"];

  const rows = (data ?? []).map((u) => {
    const isToday = u.daily_reset === today;
    return [
      u.email,
      u.full_name ?? "",
      u.phone ?? "",
      u.role,
      isToday ? u.daily_count : 0,
      u.is_admin ? "무제한" : getDailyLimit(u.role, false),
      u.agreed_terms ? "동의" : "미동의",
      u.agreed_at ? new Date(u.agreed_at).toLocaleString("ko-KR") : "",
      new Date(u.created_at).toLocaleDateString("ko-KR"),
    ];
  });

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
