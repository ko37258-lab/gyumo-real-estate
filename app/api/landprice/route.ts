// NSDI 개별공시지가 조회 — 최근 5년 fallback
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pnu = searchParams.get("pnu");
  const pkey = process.env.DATAGO_KEY || searchParams.get("pkey");

  if (!pnu || pnu.length !== 19) {
    return NextResponse.json(
      { error: "pnu(19자리)가 필요합니다" },
      { status: 400 },
    );
  }
  if (!pkey) {
    return NextResponse.json(
      { error: "공공데이터포털 API 키가 필요합니다" },
      { status: 400 },
    );
  }

  const thisYear = new Date().getFullYear();
  const years = [thisYear, thisYear - 1, thisYear - 2, thisYear - 3, thisYear - 4];

  try {
    for (const year of years) {
      const url = `https://apis.data.go.kr/1611000/nsdi/IndvdLandPriceService/attr/getIndvdLandPriceAttr?serviceKey=${encodeURIComponent(pkey)}&pnu=${pnu}&stdrYear=${year}&format=json&numOfRows=1&pageNo=1`;
      const res = await fetch(url);
      const text = await res.text();

      let data: { indvdLandPrices?: { field?: unknown } };
      try {
        data = JSON.parse(text);
      } catch {
        if (
          text.includes("SERVICE_KEY_IS_NOT_REGISTERED_ERROR") ||
          text.includes("등록되지 않은")
        ) {
          return NextResponse.json(
            {
              error:
                "공시지가 API 키가 등록되지 않았습니다. data.go.kr에서 NSDI 개별공시지가 API 활용신청해주세요.",
            },
            { status: 401 },
          );
        }
        if (text.includes("Unexpected errors")) {
          return NextResponse.json(
            { error: "공시지가 API 키가 올바르지 않습니다." },
            { status: 401 },
          );
        }
        continue;
      }

      const itemsRaw = data.indvdLandPrices?.field;
      const item = Array.isArray(itemsRaw) ? itemsRaw[0] : itemsRaw;
      if (!item || typeof item !== "object") continue;

      const it = item as Record<string, unknown>;
      return NextResponse.json({
        price: Number(it.pblntfPclnd) || 0,
        year: Number(it.stdrYear) || year,
        area: Number(it.lndAr) || 0,
        category: String(it.ladFrtlsScNm ?? ""),
        reasonCode: String(it.mvmnResnCd ?? ""),
        reason: String(it.mvmnResnCdNm ?? ""),
      });
    }

    return NextResponse.json({
      price: 0,
      message: "최근 5년 공시지가 데이터를 찾을 수 없습니다",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 실패" },
      { status: 500 },
    );
  }
}
