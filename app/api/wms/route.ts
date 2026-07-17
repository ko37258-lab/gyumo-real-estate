// VWorld WMS 프록시 — 지적편집도(연속지적도) 오버레이 타일.
//
// leaflet WMSTileLayer가 타일 단위 GetMap 요청을 보내면 bbox 등 파라미터를
// 그대로 전달해 VWorld WMS를 호출한다 (키는 서버에서 주입).
//
//   GET /api/wms?bbox=...&width=256&height=256&...  (leaflet이 자동 구성)
import { NextResponse } from "next/server";

// leaflet WMSTileLayer가 보내는 파라미터만 화이트리스트로 전달
const PASS_PARAMS = [
  "service", "request", "layers", "styles", "format", "transparent",
  "version", "width", "height", "crs", "srs", "bbox",
];

export async function GET(request: Request) {
  const key = process.env.VWORLD_DATA_KEY || process.env.VWORLD_KEY || "";
  if (!key) {
    return NextResponse.json({ error: "VWORLD_KEY 미설정" }, { status: 503 });
  }
  const { searchParams } = new URL(request.url);
  const domain = process.env.VWORLD_DOMAIN || "";

  const qs = new URLSearchParams();
  for (const p of PASS_PARAMS) {
    // leaflet은 대문자(SERVICE 등)로 보낼 수 있어 양쪽 다 조회
    const v = searchParams.get(p) ?? searchParams.get(p.toUpperCase());
    if (v !== null) qs.set(p.toUpperCase(), v);
  }
  qs.set("KEY", key);
  if (domain) qs.set("DOMAIN", domain);

  try {
    const r = await fetch(`https://api.vworld.kr/req/wms?${qs.toString()}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; gyumo/1.0)",
        ...(domain ? { Referer: `https://${domain}` } : {}),
      },
    });
    if (!r.ok) return new NextResponse(null, { status: r.status });
    const buf = await r.arrayBuffer();
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": r.headers.get("Content-Type") ?? "image/png",
        "Cache-Control": "public, s-maxage=86400, max-age=3600",
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
