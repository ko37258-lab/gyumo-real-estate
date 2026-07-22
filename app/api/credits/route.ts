import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getPlan } from "@/lib/credits";

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

// GET — 내 크레딧 잔액 + 신청 내역
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { data: balance } = await supabase.rpc("gyumo_credit_balance", {
    p_user: user.id,
  });
  const { data: nextExpiry } = await supabase.rpc("gyumo_credit_next_expiry", {
    p_user: user.id,
  });
  const { data: requests } = await supabase
    .from("gyumo_credit_requests")
    .select("id, plan, amount_won, credits, status, created_at, processed_at, note")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // 승인 직후 회원이 자기 잔액·신청 상태를 옛것으로 보지 않도록 캐시 금지
  return NextResponse.json(
    {
      credits: Number(balance) || 0,
      nextExpiry: nextExpiry ?? null,
      requests: requests ?? [],
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

// POST — 크레딧 구매/정회원 신청 생성 (입금 확인 대기)
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    plan?: string;
    depositorName?: string;
    phoneLast4?: string;
    company?: string;
    region?: string;
  };

  const plan = getPlan(String(body.plan ?? ""));
  const depositorName = (body.depositorName ?? "").trim();
  const phoneLast4 = (body.phoneLast4 ?? "").trim();
  const company = (body.company ?? "").trim() || null;
  const region = (body.region ?? "").trim() || null;

  if (!plan) {
    return NextResponse.json({ error: "요금제를 선택해주세요." }, { status: 400 });
  }
  if (!depositorName) {
    return NextResponse.json({ error: "입금자 성함을 입력해주세요." }, { status: 400 });
  }
  if (!/^\d{4}$/.test(phoneLast4)) {
    return NextResponse.json(
      { error: "전화번호 뒤 4자리를 숫자로 입력해주세요." },
      { status: 400 },
    );
  }

  const svc = serviceClient();

  // 중복 방지: 처리 대기(pending) 신청이 이미 있으면 반려
  const { data: pending } = await svc
    .from("gyumo_credit_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .limit(1);
  if (pending && pending.length > 0) {
    return NextResponse.json(
      { error: "이미 확인 대기 중인 신청이 있습니다. 승인 후 다시 신청해주세요." },
      { status: 409 },
    );
  }

  const { error: insErr } = await svc.from("gyumo_credit_requests").insert({
    user_id: user.id,
    email: user.email,
    plan: plan.id,
    amount_won: plan.priceWon,
    credits: plan.credits,
    depositor_name: depositorName,
    phone_last4: phoneLast4,
    company,
    region,
    status: "pending",
  });
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // 정회원 신청 정보(회사·지역)를 프로필에도 반영 (본인 것 → RLS 통과)
  if (company || region) {
    await supabase
      .from("gyumo_profiles")
      .update({ ...(company ? { company } : {}), ...(region ? { region } : {}) })
      .eq("id", user.id);
  }

  return NextResponse.json({ ok: true });
}
