import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// 크레딧 기반 사용량 API.
//   · 비로그인: 로그인 필요 (allowed=false)
//   · 관리자/스텝: 무제한 (크레딧 차감 없음)
//   · 일반/정회원: 유효 크레딧 잔액으로 조회 (1건 = 1크레딧)
//
// 응답 필드는 기존 LandLookup 호환을 위해 used/limit/remaining/allowed 유지 +
// credits(잔액)·nextExpiry(임박 만료일) 추가.

async function loadProfile(userId: string) {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("gyumo_profiles")
    .select("role, is_admin")
    .eq("id", userId)
    .single();
  return profile;
}

// 크레딧 잔액·등급은 관리자 승인으로 바뀌므로 절대 캐시하지 않는다
// (승인 즉시 배지·잔액이 반영되도록).
const NO_STORE = { headers: { "Cache-Control": "no-store, max-age=0" } };

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        isLoggedIn: false,
        userId: null,
        credits: 0,
        used: 0,
        limit: 0,
        remaining: 0,
        allowed: false,
        role: "일반회원",
        nextExpiry: null,
      },
      NO_STORE,
    );
  }

  const profile = await loadProfile(user.id);
  const isStaff = Boolean(profile?.is_admin) || profile?.role === "스텝";
  const role = profile?.role ?? "일반회원";

  if (isStaff) {
    return NextResponse.json(
      {
        isLoggedIn: true,
        userId: user.id,
        credits: 9999,
        used: 0,
        limit: 9999,
        remaining: 9999,
        allowed: true,
        unlimited: true,
        role,
        nextExpiry: null,
      },
      NO_STORE,
    );
  }

  const { data: balance } = await supabase.rpc("gyumo_credit_balance", {
    p_user: user.id,
  });
  const { data: nextExpiry } = await supabase.rpc("gyumo_credit_next_expiry", {
    p_user: user.id,
  });
  const credits = Number(balance) || 0;

  return NextResponse.json(
    {
      isLoggedIn: true,
      userId: user.id,
      credits,
      used: 0,
      limit: credits,
      remaining: credits,
      allowed: credits > 0,
      role,
      nextExpiry: nextExpiry ?? null,
    },
    NO_STORE,
  );
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const profile = await loadProfile(user.id);
  const isStaff = Boolean(profile?.is_admin) || profile?.role === "스텝";
  const role = profile?.role ?? "일반회원";

  // 관리자·스텝: 무제한 (차감 없음)
  if (isStaff) {
    return NextResponse.json({
      credits: 9999,
      remaining: 9999,
      allowed: true,
      unlimited: true,
      role,
    });
  }

  // 1크레딧 차감 (원자적, 만료 임박 배치 우선). 잔액 없으면 -1.
  const { data: after, error } = await supabase.rpc("gyumo_consume_credit", {
    p_user: user.id,
  });
  if (error) {
    return NextResponse.json(
      { error: "크레딧 차감 실패 — 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }

  const remaining = Number(after);
  if (remaining < 0) {
    return NextResponse.json(
      { error: "크레딧이 부족합니다", credits: 0, remaining: 0, allowed: false },
      { status: 429 },
    );
  }

  return NextResponse.json({
    credits: remaining,
    used: 0,
    limit: remaining,
    remaining,
    allowed: remaining > 0,
    role,
  });
}
