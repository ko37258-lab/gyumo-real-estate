import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// 최초 관리자 계정 생성 엔드포인트
// 관리자가 0명일 때만 작동. 이후 호출은 no-op.
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase 환경변수 미설정" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const { email, password, secret } = body;

  // 단순 시크릿 체크 (환경변수 BOOTSTRAP_SECRET 또는 기본값)
  const expectedSecret = process.env.BOOTSTRAP_SECRET || "gyumo-init-2026";
  if (secret !== expectedSecret) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }

  if (!email || !password) {
    return NextResponse.json({ error: "이메일과 비밀번호 필요" }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 이미 관리자가 있는지 확인
  const { data: existing } = await admin
    .from("gyumo_profiles")
    .select("id")
    .eq("is_admin", true)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ message: "이미 관리자가 존재합니다.", skipped: true });
  }

  // 사용자 생성 또는 기존 사용자 조회
  let userId: string;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "고상철" },
  });

  if (createErr) {
    // 이미 존재하는 경우 이메일로 조회
    if (createErr.message.includes("already")) {
      const { data: users } = await admin.auth.admin.listUsers();
      const found = users?.users.find(u => u.email === email);
      if (!found) {
        return NextResponse.json({ error: createErr.message }, { status: 400 });
      }
      userId = found.id;
    } else {
      return NextResponse.json({ error: createErr.message }, { status: 400 });
    }
  } else {
    userId = created.user.id;
  }

  // is_admin = true 설정 (행이 없으면 생성)
  await admin
    .from("gyumo_profiles")
    .upsert({ id: userId, email, is_admin: true, role: "스텝", full_name: "고상철", agreed_terms: true })
    .eq("id", userId);

  return NextResponse.json({
    message: "최고관리자 계정이 생성됐습니다.",
    email,
    userId,
  });
}
