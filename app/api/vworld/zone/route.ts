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
  const referer = `https://${domain}`;
  const safeUrl = url.replace(/key=[^&]+/, "key=***");
  console.log("[vworld/zone] URL:", safeUrl);
  console.log("[vworld/zone] Referer:", referer);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: {
        Referer: referer,
        "User-Agent": "Mozilla/5.0 (compatible; gyumo-mr-k/1.0)",
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const text = await res.text();
    if (text.trim().startsWith("<")) {
      console.error("[vworld/zone] HTML response:", text.slice(0, 300));
      return NextResponse.json(
        {
          error: `VWorld returned HTML (status ${res.status}): ${text
            .slice(0, 200)
            .replace(/\s+/g, " ")}`,
        },
        { status: 502 },
      );
    }
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
    clearTimeout(timeoutId);
    const isAbort = e instanceof Error && e.name === "AbortError";
    console.error("[vworld/zone] fetch error:", e);
    return NextResponse.json(
      {
        error: isAbort
          ? "VWorld 응답 시간 초과 (8초)"
          : e instanceof Error
            ? e.message
            : "VWorld 호출 실패",
      },
      { status: 502 },
    );
  }
}
