import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { CREDIT_VALID_MONTHS } from "@/lib/credits";

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function requireAdmin(): Promise<{ ok: boolean; userId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { data } = await supabase
    .from("gyumo_profiles")
    .select("is_admin, role")
    .eq("id", user.id)
    .single();
  return { ok: !!(data?.is_admin || data?.role === "스텝"), userId: user.id };
}

// GET — 크레딧 신청 목록 (기본 pending, ?status=all 로 전체)
export async function GET(request: Request) {
  const { ok } = await requireAdmin();
  if (!ok) return NextResponse.json({ error: "권한 없음" }, { status: 401 });

  const status = new URL(request.url).searchParams.get("status") ?? "pending";
  const admin = getServiceClient();
  let query = admin
    .from("gyumo_credit_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status !== "all") query = query.eq("status", status);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// PATCH — 승인/반려. { id, action: 'approve'|'reject', note? }
export async function PATCH(request: Request) {
  const { ok, userId } = await requireAdmin();
  if (!ok) return NextResponse.json({ error: "권한 없음" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    action?: "approve" | "reject";
    note?: string;
  };
  const { id, action, note } = body;
  if (!id || (action !== "approve" && action !== "reject")) {
    return NextResponse.json({ error: "id·action 필수" }, { status: 400 });
  }

  const admin = getServiceClient();
  const { data: req, error: reqErr } = await admin
    .from("gyumo_credit_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (reqErr || !req) {
    return NextResponse.json({ error: "신청을 찾을 수 없습니다." }, { status: 404 });
  }
  if (req.status !== "pending") {
    return NextResponse.json(
      { error: `이미 처리된 신청입니다 (${req.status}).` },
      { status: 409 },
    );
  }

  if (action === "reject") {
    await admin
      .from("gyumo_credit_requests")
      .update({
        status: "rejected",
        processed_by: userId,
        processed_at: new Date().toISOString(),
        note: note ?? null,
      })
      .eq("id", id);
    return NextResponse.json({ ok: true, action: "rejected" });
  }

  // 승인: 크레딧 지급(승인 후 2개월 만료) + 정회원 승격
  if (!req.user_id) {
    return NextResponse.json(
      { error: "신청자 계정이 없습니다 (탈퇴 등)." },
      { status: 400 },
    );
  }

  const expires = new Date();
  expires.setMonth(expires.getMonth() + CREDIT_VALID_MONTHS);

  const { data: newBalance, error: grantErr } = await admin.rpc(
    "gyumo_grant_credits",
    {
      p_user: req.user_id,
      p_amount: req.credits,
      p_source: "purchase",
      p_expires: expires.toISOString(),
    },
  );
  if (grantErr) {
    return NextResponse.json({ error: grantErr.message }, { status: 500 });
  }

  // 일반회원 → 정회원 승격 (상위 등급은 유지)
  const { data: prof } = await admin
    .from("gyumo_profiles")
    .select("role")
    .eq("id", req.user_id)
    .single();
  if (prof && prof.role === "일반회원") {
    await admin
      .from("gyumo_profiles")
      .update({ role: "정회원" })
      .eq("id", req.user_id);
  }

  await admin
    .from("gyumo_credit_requests")
    .update({
      status: "approved",
      processed_by: userId,
      processed_at: new Date().toISOString(),
      note: note ?? null,
    })
    .eq("id", id);

  return NextResponse.json({
    ok: true,
    action: "approved",
    balance: Number(newBalance),
  });
}
