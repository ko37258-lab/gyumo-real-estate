import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { ALL_ROLES } from "@/lib/membership";

function getServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("gyumo_profiles")
    .select("is_admin, role")
    .eq("id", user.id)
    .single();
  return !!(data?.is_admin || data?.role === "스텝");
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  }

  const admin = getServiceClient();
  const { data, error } = await admin
    .from("gyumo_profiles")
    .select("id, email, full_name, phone, role, is_admin, daily_count, daily_reset, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    ids?: string[];
    role?: string;
  };
  const { id, ids, role } = body;

  if (!role || !(ALL_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: "유효하지 않은 등급" }, { status: 400 });
  }

  const admin = getServiceClient();

  // 일괄 변경
  if (ids && ids.length > 0) {
    const { error } = await admin
      .from("gyumo_profiles")
      .update({ role })
      .in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, updated: ids.length });
  }

  // 단건 변경
  if (!id) {
    return NextResponse.json({ error: "id 또는 ids 필수" }, { status: 400 });
  }
  const { error } = await admin
    .from("gyumo_profiles")
    .update({ role })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
