// NSDI 개별공시지가 조회 — 최근 5년 fallback (data.go.kr 15124014)
//
// serviceKey 인코딩: DATAGO_KEY(디코딩 키)를 encodeURIComponent()로 1회 인코딩.
//   현재 키는 순수 영숫자라 인코딩 영향 없음(건축물대장에서 동일 키 정상 작동 검증됨).
//   → "Unexpected errors"의 원인은 키 오류가 아니라 이 서비스 활용신청(승인) 미완료임.
//   면적 자동화는 /api/landarea(건축물대장)가 담당하고, 본 라우트는 공시지가 표시용.
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
          text.includes("등록되지 않은") ||
          text.includes("Unexpected errors")
        ) {
          // 키 자체는 유효(건축물대장 정상). 이 서비스에 활용신청 미승인 상태.
          return NextResponse.json(
            {
              error:
                "개별공시지가(NSDI) API가 아직 승인되지 않았습니다. data.go.kr에서 15124014 활용신청 승인 후 자동 활성화됩니다.",
              pending: true,
            },
            { status: 503 },
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
