import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

function parseAmount(str: string | undefined): number {
  if (!str) return 0;
  return Number(String(str).replace(/[,\s]/g, "")) || 0;
}

function ymList(months: number): string[] {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

export async function GET(req: NextRequest) {
  const pnu = req.nextUrl.searchParams.get("pnu") ?? "";
  if (pnu.length < 5) {
    return NextResponse.json({ error: "pnu 필요 (5자리 이상)" }, { status: 400 });
  }

  const key = process.env.DATAGO_KEY;
  if (!key) {
    return NextResponse.json({ error: "DATAGO_KEY 미설정" }, { status: 500 });
  }

  const lawdCd = pnu.slice(0, 5);
  const months = 12; // 최근 12개월

  type LandItem = {
    dong: string;
    jibun: string;
    amount: number;
    areaSqm: number;
    pyeong: number;
    pricePerPy: number;
    year: string;
    month: string;
    day: string;
    landCls: string;
    landUse: string;
  };

  const allItems: LandItem[] = [];

  for (const ym of ymList(months)) {
    const url =
      `https://apis.data.go.kr/1613000/RTMSDataSvcLandTrade/getRTMSDataSvcLandTrade` +
      `?serviceKey=${encodeURIComponent(key)}` +
      `&LAWD_CD=${lawdCd}&DEAL_YMD=${ym}&numOfRows=100&pageNo=1&_type=json`;
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const text = await r.text();
      if (text.includes("Unexpected errors") || text.includes("LIMITED_NUMBER")) continue;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = JSON.parse(text);
      const raw = data?.response?.body?.items?.item;
      const items: unknown[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
      for (const it of items as Record<string, string>[]) {
        const amount = parseAmount(it.dealAmount);
        const areaSqm = parseFloat(it.landAr ?? "0") || 0;
        if (amount <= 0 || areaSqm <= 0) continue;
        const pyeong = areaSqm * 0.3025;
        const pricePerPy = Math.round(amount / pyeong);
        if (pricePerPy <= 0 || pricePerPy > 500000) continue; // 이상값 제외
        allItems.push({
          dong: it.umdNm ?? "",
          jibun: it.jibun ?? "",
          amount,
          areaSqm,
          pyeong: Math.round(pyeong * 10) / 10,
          pricePerPy,
          year: it.dealYear ?? "",
          month: it.dealMonth ?? "",
          day: it.dealDay ?? "",
          landCls: it.landCls ?? "",
          landUse: it.landUseSittn ?? "",
        });
      }
    } catch {
      // 개별 월 실패 무시
    }
  }

  if (allItems.length === 0) {
    return NextResponse.json({ count: 0, items: [], stats: null, message: "최근 12개월 토지 거래 없음" });
  }

  const prices = allItems.map((i) => i.pricePerPy);
  const sorted = [...prices].sort((a, b) => a - b);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const median = sorted[Math.floor(sorted.length / 2)];

  return NextResponse.json({
    count: allItems.length,
    stats: {
      avgPricePerPy: avg,
      medianPricePerPy: median,
      maxPricePerPy: Math.max(...prices),
      minPricePerPy: Math.min(...prices),
    },
    items: [...allItems]
      .sort((a, b) =>
        `${b.year}${String(b.month).padStart(2,"0")}${String(b.day).padStart(2,"0")}`.localeCompare(
          `${a.year}${String(a.month).padStart(2,"0")}${String(a.day).padStart(2,"0")}`,
        ),
      )
      .slice(0, 20),
  });
}
