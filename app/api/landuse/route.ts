// data.go.kr 토지이용규제정보 → 용도지역 조회 프록시
import { NextResponse } from "next/server";

const ZONE_KEYWORDS = [
  "주거지역",
  "상업지역",
  "공업지역",
  "녹지지역",
  "관리지역",
  "농림지역",
  "환경보전지역",
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pnu = searchParams.get("pnu");
  const pkey = process.env.DATAGO_KEY || searchParams.get("pkey");

  if (!pnu) {
    return NextResponse.json({ error: "pnu가 필요합니다" }, { status: 400 });
  }
  if (!pkey) {
    return NextResponse.json(
      { error: "공공데이터포털 API 키가 필요합니다" },
      { status: 400 },
    );
  }

  try {
    const url = `https://apis.data.go.kr/1613000/LandUseService_v2/getRtnLandUseInfo?serviceKey=${encodeURIComponent(pkey)}&pnu=${pnu}&_type=json`;
    const res = await fetch(url);
    const text = await res.text();

    let data: { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: { item?: unknown } } } };
    try {
      data = JSON.parse(text);
    } catch {
      if (
        text.includes("Unexpected errors") ||
        text.includes("SERVICE_KEY_IS_NOT_REGISTERED_ERROR")
      ) {
        return NextResponse.json(
          {
            error:
              "⏳ 용도지역 API 승인 대기 중입니다. 곧 정상화될 예정입니다. (관리자: data.go.kr 토지이용규제정보 API 승인 후 자동 활성화)",
            pending: true,
          },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: `API 응답 오류: ${text.slice(0, 150)}` },
        { status: 500 },
      );
    }

    const resultCode = data.response?.header?.resultCode;
    if (resultCode && resultCode !== "00") {
      return NextResponse.json(
        { error: `공공데이터 API 오류: ${data.response?.header?.resultMsg}` },
        { status: 400 },
      );
    }

    const raw = data.response?.body?.items?.item;
    const items: Array<{ prposAreaDstrcNm?: string }> = Array.isArray(raw)
      ? (raw as Array<{ prposAreaDstrcNm?: string }>)
      : raw && typeof raw === "object"
        ? [raw as { prposAreaDstrcNm?: string }]
        : [];

    if (!items.length) {
      return NextResponse.json(
        { error: "해당 필지의 토지이용규제 정보를 찾을 수 없습니다" },
        { status: 404 },
      );
    }

    const zoneItem =
      items.find((i) =>
        ZONE_KEYWORDS.some((kw) => i.prposAreaDstrcNm?.includes(kw)),
      ) || items[0];

    return NextResponse.json({ zone: zoneItem.prposAreaDstrcNm, pnu });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 실패" },
      { status: 500 },
    );
  }
}
