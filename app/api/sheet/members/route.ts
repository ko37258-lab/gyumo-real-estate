import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * 구글 시트 IMPORTDATA 전용 회원 목록 CSV.
 *
 * 시트는 우리 로그인 세션을 가질 수 없어서(구글 서버가 대신 받아감)
 * 쿠키 인증 대신 고정 토큰으로 막는다.
 *
 * ⚠ 이 주소는 곧 비밀번호다. 토큰이 들어간 URL 전체를 외부에 공유하지 말 것.
 *   유출되면 SHEET_TOKEN 환경변수만 바꾸면 즉시 무효화된다.
 */

export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  // 쉼표·따옴표·줄바꿈이 있으면 감싸고, 내부 따옴표는 두 번 쓴다(CSV 규칙)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const expected = process.env.SHEET_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "SHEET_TOKEN 미설정 — 서버 환경변수를 등록해주세요." },
      { status: 503 },
    );
  }

  const token = new URL(request.url).searchParams.get("token");
  if (token !== expected) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data, error } = await admin
    .from("gyumo_profiles")
    .select("email, full_name, phone, role, is_admin, credits, agreed_terms, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const header = [
    "가입일", "이메일", "이름", "전화번호", "등급",
    "관리자", "크레딧", "개인정보동의",
  ];

  const rows = (data ?? []).map((u) => [
    new Date(u.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }),
    u.email,
    u.full_name ?? "",
    u.phone ?? "",
    u.role,
    u.is_admin ? "Y" : "",
    u.credits ?? 0,
    u.agreed_terms ? "동의" : "미동의",
  ]);

  const csv = [header, ...rows]
    .map((r) => r.map(csvCell).join(","))
    .join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      // 시트가 캐시된 옛 데이터를 붙들지 않도록
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
