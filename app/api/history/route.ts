import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * 회원별 조회 이력 — 서버 저장.
 *
 * 원래 LocalStorage 에만 있어 PC·폰을 바꾸면 이력이 사라졌다.
 * DB(gyumo_history)로 올려 어느 기기로 로그인해도 이어지게 한다.
 * 인증은 세션 쿠키, 접근 제어는 RLS(own_*) — 서버 키를 쓰지 않는다.
 *
 * 같은 필지를 다시 조회하면 (user_id, pnu) 유니크 인덱스 위에서 upsert 되어
 * 행이 늘지 않고 최신 정보로 갱신된다.
 */

const NO_STORE = { headers: { "Cache-Control": "no-store, max-age=0" } };

type HistoryRecord = {
  pnu: string;
  address: string;
  fetchedAt?: string;
  areaSqm?: number;
  zone?: string;
  jimok?: string;
  estimatedPrice?: number;
  jigaTotal?: number;
};

/** DB 행 → 프론트 ProjectRecord 형태 */
function toRecord(row: {
  pnu: string | null;
  address: string;
  zone_name: string | null;
  area_sqm: number | null;
  result: Record<string, unknown> | null;
  created_at: string;
}) {
  const r = (row.result ?? {}) as {
    jimok?: string;
    estimatedPrice?: number;
    jigaTotal?: number;
  };
  return {
    pnu: row.pnu ?? "",
    address: row.address,
    fetchedAt: row.created_at,
    areaSqm: Number(row.area_sqm) || 0,
    zone: row.zone_name ?? undefined,
    jimok: r.jimok,
    estimatedPrice: r.estimatedPrice,
    jigaTotal: r.jigaTotal,
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ records: [] }, NO_STORE);

  const { data, error } = await supabase
    .from("gyumo_history")
    .select("pnu, address, zone_name, area_sqm, result, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ records: (data ?? []).map(toRecord) }, NO_STORE);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    record?: HistoryRecord;
    records?: HistoryRecord[]; // LocalStorage → 서버 1회 이관용
  };
  const list = (body.records ?? (body.record ? [body.record] : []))
    .filter((r) => r && r.pnu && r.address)
    .slice(0, 300);
  if (list.length === 0) {
    return NextResponse.json({ error: "record 필요" }, { status: 400 });
  }

  const rows = list.map((r) => ({
    user_id: user.id,
    pnu: r.pnu,
    address: r.address,
    zone_name: r.zone ?? null,
    area_sqm: Number.isFinite(r.areaSqm) ? r.areaSqm : null,
    result: {
      jimok: r.jimok ?? null,
      estimatedPrice: r.estimatedPrice ?? null,
      jigaTotal: r.jigaTotal ?? null,
    },
    // 재조회 시 최근순 정렬에 반영되도록 시각도 갱신
    created_at: r.fetchedAt ?? new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("gyumo_history")
    .upsert(rows, { onConflict: "user_id,pnu" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: rows.length });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인 필요" }, { status: 401 });

  const url = new URL(request.url);
  const pnu = url.searchParams.get("pnu");
  const all = url.searchParams.get("all") === "1";
  if (!pnu && !all) {
    return NextResponse.json({ error: "pnu 또는 all=1 필요" }, { status: 400 });
  }

  let q = supabase.from("gyumo_history").delete().eq("user_id", user.id);
  if (pnu) q = q.eq("pnu", pnu);
  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
