import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getDailyLimit } from "@/lib/membership";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ isLoggedIn: false, used: 0, limit: 3, remaining: 3, allowed: true, role: "일반회원" });
  }

  const { data: profile } = await supabase
    .from("gyumo_profiles")
    .select("daily_count, daily_reset, role, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ isLoggedIn: true, used: 0, limit: 3, remaining: 3, allowed: true, role: "일반회원" });
  }

  const today = new Date().toISOString().split("T")[0];
  const isNewDay = profile.daily_reset !== today;
  const used = isNewDay ? 0 : (profile.daily_count ?? 0);
  const limit = getDailyLimit(profile.role, profile.is_admin);

  return NextResponse.json({
    isLoggedIn: true,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    allowed: used < limit,
    role: profile.role ?? "일반회원",
  });
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("gyumo_profiles")
    .select("daily_count, daily_reset, role, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "프로필이 없습니다" }, { status: 404 });
  }

  const today = new Date().toISOString().split("T")[0];
  const isNewDay = profile.daily_reset !== today;
  const used = isNewDay ? 0 : (profile.daily_count ?? 0);
  const limit = getDailyLimit(profile.role, profile.is_admin);

  if (used >= limit) {
    return NextResponse.json(
      { error: "일일 사용 한도 초과", used, limit, remaining: 0, allowed: false },
      { status: 429 },
    );
  }

  const newCount = used + 1;
  await supabase
    .from("gyumo_profiles")
    .update({ daily_count: newCount, daily_reset: today })
    .eq("id", user.id);

  return NextResponse.json({
    used: newCount,
    limit,
    remaining: Math.max(0, limit - newCount),
    allowed: newCount < limit,
  });
}
