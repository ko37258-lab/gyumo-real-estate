// VWorld WMTS 배경지도 타일 프록시 — Phase C 지도 필지 선택.
//
// 브라우저에 VWorld 키를 노출하지 않기 위해 서버 경유. Vercel CDN이
// s-maxage로 타일을 캐시하므로 함수 호출은 타일당 최초 1회 수준.
//
//   GET /api/tile/{layer}/{z}/{y}/{x}   layer: Base | Satellite | Hybrid | gray | midnight
import { NextResponse } from "next/server";

const ALLOWED_LAYERS = new Set(["Base", "Satellite", "Hybrid", "gray", "midnight"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ layer: string; z: string; y: string; x: string }> },
) {
  const { layer, z, y, x } = await params;
  const key = process.env.VWORLD_DATA_KEY || process.env.VWORLD_KEY || "";
  if (!key) {
    return NextResponse.json({ error: "VWORLD_KEY 미설정" }, { status: 503 });
  }
  if (!ALLOWED_LAYERS.has(layer) || !/^\d+$/.test(z) || !/^\d+$/.test(y) || !/^\d+$/.test(x)) {
    return NextResponse.json({ error: "잘못된 타일 요청" }, { status: 400 });
  }

  const ext = layer === "Satellite" ? "jpeg" : "png";
  const url = `https://api.vworld.kr/req/wmts/1.0.0/${key}/${layer}/${z}/${y}/${x}.${ext}`;
  const domain = process.env.VWORLD_DOMAIN || "";

  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; gyumo/1.0)",
        ...(domain ? { Referer: `https://${domain}` } : {}),
      },
    });
    if (!r.ok) {
      return new NextResponse(null, { status: r.status });
    }
    const buf = await r.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": ext === "jpeg" ? "image/jpeg" : "image/png",
        // 지도 타일은 사실상 불변 — CDN 7일 캐시로 함수 호출 최소화
        "Cache-Control": "public, s-maxage=604800, max-age=86400, immutable",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
