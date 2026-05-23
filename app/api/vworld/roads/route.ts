// VWorld 도로 접면 검색 (60m 반경) 서버 프록시.
import { NextResponse } from "next/server";
import { parseRoadCheck } from "@/lib/vworld";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const x = searchParams.get("x");
  const y = searchParams.get("y");
  const radiusParam = searchParams.get("radius");
  const radius = radiusParam ? Number(radiusParam) : 60;
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

  const delta = radius / 111000;
  const minX = (parseFloat(x) - delta).toFixed(7);
  const maxX = (parseFloat(x) + delta).toFixed(7);
  const minY = (parseFloat(y) - delta).toFixed(7);
  const maxY = (parseFloat(y) + delta).toFixed(7);

  const url = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN&key=${key}&format=json&geomFilter=BOX(${minX},${minY},${maxX},${maxY})&geometry=false&attribute=true&crs=EPSG:4326&size=50&domain=${domain}`;
  const referer = `https://${domain}`;
  const safeUrl = url.replace(/key=[^&]+/, "key=***");
  console.log("[vworld/roads] URL:", safeUrl);
  console.log("[vworld/roads] Referer:", referer);

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
      console.error("[vworld/roads] HTML response:", text.slice(0, 300));
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
      console.error("[vworld/roads] JSON parse failed:", text.slice(0, 300));
      return NextResponse.json(
        { error: `VWorld 응답 파싱 실패: ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    return NextResponse.json(parseRoadCheck(data));
  } catch (e) {
    clearTimeout(timeoutId);
    const isAbort = e instanceof Error && e.name === "AbortError";
    console.error("[vworld/roads] fetch error:", e);
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
