// VWorld 지적정보 (LP_PA_CBND_BUBUN) 서버 프록시 — 좌표 → 지목·지번·면적.
// 클라이언트 JSONP 호출은 키의 도메인 제한 때문에 localhost에서 실패하므로 서버 fetch로 처리.
// VWorld 키는 한국 IP 제한이 있어 운영 배포 시 Korean region 함수 또는 ko-Korea edge가 필요할 수 있음.
import { NextResponse } from "next/server";
import { parseParcelInfo } from "@/lib/vworld";

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

  // domain 파라미터: stellar 도메인을 사용 (키가 등록된 도메인). 빈 값도 시도 가능.
  const domain =
    process.env.VWORLD_DOMAIN ||
    "gyumo-mr-k.netlify.app";

  const url = `https://api.vworld.kr/req/data?service=data&request=GetFeature&data=LP_PA_CBND_BUBUN&key=${key}&format=json&geomFilter=POINT(${x} ${y})&geometry=false&attribute=true&crs=EPSG:4326&size=1&domain=${domain}`;

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
      console.error("[vworld/parcel] JSON parse failed:", text.slice(0, 300));
      return NextResponse.json(
        { error: `VWorld 응답 파싱 실패: ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const parcel = parseParcelInfo(data);
    if (!parcel) {
      const status = (data as { response?: { status?: string; record?: { message?: string } } })
        ?.response?.status;
      const msg = (data as { response?: { record?: { message?: string } } })
        ?.response?.record?.message;
      console.warn("[vworld/parcel] no parcel:", status, msg);
      return NextResponse.json(
        { error: msg ?? `이 좌표에서 지적 정보를 찾을 수 없습니다 (${status ?? "unknown"})` },
        { status: 404 },
      );
    }
    return NextResponse.json(parcel);
  } catch (e) {
    console.error("[vworld/parcel] fetch error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "VWorld 호출 실패" },
      { status: 502 },
    );
  }
}
