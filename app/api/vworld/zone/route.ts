// VWorld 용도지역 (LT_C_UQ111) 서버 프록시.
import { NextResponse } from "next/server";
import { parseVworldZone } from "@/lib/vworld";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const x = searchParams.get("x");
  const y = searchParams.get("y");
  const key = process.env.VWORLD_KEY || process.env.NEXT_PUBLIC_VWORLD_KEY;

  if (!x || !y) {
    return NextResponse.json(
      { error: "x, y 좌표가 필요합니다" },
      { status: 400 },
    );
  }
  if (!key) {
    return NextResponse.json(
      { error: "VWORLD_KEY 환경변수가 설정되지 않았습니다" },
      { status: 500 },
    );
  }

  const domain =
    process.env.VWORLD_DOMAIN ||
    "gyumo-mr-k.netlify.app";

  const url = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LT_C_UQ111&key=${key}&format=json&geomFilter=POINT(${x} ${y})&geometry=false&attribute=true&crs=EPSG:4326&size=10&domain=${domain}`;

  try {
    const res = await fetch(url, {
      headers: { Referer: `https://${domain}` },
      cache: "no-store",
    });
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("[vworld/zone] JSON parse failed:", text.slice(0, 300));
      return NextResponse.json(
        { error: `VWorld 응답 파싱 실패: ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    try {
      const parsed = parseVworldZone(data);
      return NextResponse.json(parsed);
    } catch (e) {
      console.warn("[vworld/zone] parse warn:", e);
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "용도지역 파싱 실패" },
        { status: 404 },
      );
    }
  } catch (e) {
    console.error("[vworld/zone] fetch error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "VWorld 호출 실패" },
      { status: 502 },
    );
  }
}
