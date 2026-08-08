import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * 내 조회 이력 CSV 다운로드 — 로그인한 본인 것만 (RLS own_history_read).
 * 엑셀에서 한글이 깨지지 않도록 BOM 을 붙인다.
 */

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      new URL("/login?redirect=/simulator", process.env.NEXT_PUBLIC_SITE_URL || "https://gyumo.vercel.app"),
    );
  }

  const { data, error } = await supabase
    .from("gyumo_history")
    .select("pnu, address, zone_name, area_sqm, result, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const header = [
    "조회일", "주소", "PNU", "용도지역",
    "면적(㎡)", "면적(평)", "지목", "추정 토지가(원)", "공시지가 총액(원)",
  ];
  const rows = (data ?? []).map((row) => {
    const r = (row.result ?? {}) as {
      jimok?: string; estimatedPrice?: number; jigaTotal?: number;
    };
    const sqm = Number(row.area_sqm) || 0;
    return [
      new Date(row.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" }),
      row.address,
      row.pnu ?? "",
      row.zone_name ?? "",
      sqm ? sqm.toFixed(1) : "",
      sqm ? (sqm / 3.3058).toFixed(1) : "",
      r.jimok ?? "",
      r.estimatedPrice ?? "",
      r.jigaTotal ?? "",
    ];
  });

  const csv = [header, ...rows]
    .map((r) => r.map(csvCell).join(","))
    .join("\n");

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gyumo_lookup_history_${today}.csv"`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
