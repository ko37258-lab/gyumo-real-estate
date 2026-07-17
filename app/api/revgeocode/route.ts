// 카카오 좌표→지번주소 역지오코딩 — 지도 클릭으로 필지 선택 (Phase C).
//
//   GET /api/revgeocode?x=<경도>&y=<위도>
//   → { address: "서울 강동구 성내동 562" }
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const x = searchParams.get("x");
  const y = searchParams.get("y");
  const kakaoKey = process.env.KAKAO_KEY;

  if (!x || !y) {
    return NextResponse.json({ error: "x,y 좌표 필요" }, { status: 400 });
  }
  if (!kakaoKey) {
    return NextResponse.json({ error: "KAKAO_KEY 미설정" }, { status: 503 });
  }

  try {
    const r = await fetch(
      `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${x}&y=${y}`,
      { headers: { Authorization: `KakaoAK ${kakaoKey}` } },
    );
    if (!r.ok) {
      return NextResponse.json({ error: `역지오코딩 실패 (${r.status})` }, { status: 502 });
    }
    const data = (await r.json()) as {
      documents?: Array<{ address?: { address_name?: string } }>;
    };
    const address = data.documents?.[0]?.address?.address_name ?? "";
    if (!address) {
      return NextResponse.json({ error: "해당 위치의 지번주소 없음" }, { status: 404 });
    }
    return NextResponse.json({ address });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "역지오코딩 실패" },
      { status: 500 },
    );
  }
}
