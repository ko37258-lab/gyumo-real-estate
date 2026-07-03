import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/**
 * 주변 시세·임대료 통합 조회 — 국토교통부 RTMS 실거래가
 * (homes-junggae-master real-price + real-estate-infographic transactions 패턴 이식)
 *
 * ?lawdCd=11680&months=6
 * → 아파트 매매 / 상업·업무 매매 / 아파트 전월세 / 오피스텔 전월세 통계
 */

type RtmsType = "aptTrade" | "nrgTrade" | "aptRent" | "offiRent";

const RTMS: Record<RtmsType, { path: string; nameKeys: string[] }> = {
  aptTrade: {
    path: "RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade",
    nameKeys: ["aptNm"],
  },
  nrgTrade: {
    path: "RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade",
    nameKeys: ["buildingUse", "buildingType"],
  },
  aptRent: {
    path: "RTMSDataSvcAptRent/getRTMSDataSvcAptRent",
    nameKeys: ["aptNm"],
  },
  offiRent: {
    path: "RTMSDataSvcOffiRent/getRTMSDataSvcOffiRent",
    nameKeys: ["offiNm"],
  },
};

function parseNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return Number(String(v).replace(/[,\s]/g, "")) || 0;
}

function ymList(months: number): string[] {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

type RawItem = Record<string, unknown>;

async function fetchType(
  type: RtmsType,
  key: string,
  lawdCd: string,
  months: number,
): Promise<RawItem[]> {
  const results = await Promise.all(
    ymList(months).map(async (ym) => {
      const url =
        `https://apis.data.go.kr/1613000/${RTMS[type].path}` +
        `?serviceKey=${encodeURIComponent(key)}` +
        `&LAWD_CD=${lawdCd}&DEAL_YMD=${ym}&numOfRows=200&pageNo=1&_type=json`;
      try {
        const r = await fetch(url);
        if (!r.ok) return [];
        const text = await r.text();
        if (text.includes("Unexpected errors") || text.includes("LIMITED_NUMBER")) return [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = JSON.parse(text);
        const raw = data?.response?.body?.items?.item;
        return (Array.isArray(raw) ? raw : raw ? [raw] : []) as RawItem[];
      } catch {
        return [];
      }
    }),
  );
  return results.flat();
}

function areaOf(it: RawItem): number {
  return (
    parseFloat(String(it.excluUseAr ?? "")) ||
    parseFloat(String(it.buildingAr ?? "")) ||
    parseFloat(String(it.plottageAr ?? "")) ||
    parseFloat(String(it.landAr ?? "")) ||
    0
  );
}

function nameOf(it: RawItem, keys: string[]): string {
  for (const k of keys) {
    const v = it[k];
    if (v && String(v).trim()) return String(v).trim();
  }
  return String(it.umdNm ?? "");
}

type TradeSample = {
  name: string;
  dong: string;
  areaSqm: number;
  amount: number; // 만원
  pricePerPy: number; // 만원/평
  ym: string;
  floor?: string;
};

function tradeStats(items: RawItem[], nameKeys: string[]) {
  const rows: TradeSample[] = [];
  for (const it of items) {
    const amount = parseNum(it.dealAmount);
    const areaSqm = areaOf(it);
    if (amount <= 0 || areaSqm <= 0) continue;
    // 해제된 거래 제외
    if (it.cdealDay || it.cancelDate) continue;
    const py = areaSqm * 0.3025;
    const pricePerPy = Math.round(amount / py);
    if (pricePerPy <= 0 || pricePerPy > 2_000_000) continue;
    rows.push({
      name: nameOf(it, nameKeys),
      dong: String(it.umdNm ?? ""),
      areaSqm,
      amount,
      pricePerPy,
      ym: `${it.dealYear}.${String(it.dealMonth).padStart(2, "0")}`,
      floor: it.floor ? String(it.floor) : undefined,
    });
  }
  if (rows.length === 0) return null;
  const prices = rows.map((r) => r.pricePerPy).sort((a, b) => a - b);
  return {
    count: rows.length,
    avgPy: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
    medianPy: prices[Math.floor(prices.length / 2)],
    maxPy: prices[prices.length - 1],
    minPy: prices[0],
    samples: rows.slice(-8).reverse(),
  };
}

type RentSample = {
  name: string;
  dong: string;
  areaSqm: number;
  deposit: number; // 만원
  monthlyRent: number; // 만원
  monthlyRentPerPy: number; // 만원/평
  ym: string;
};

function rentStats(items: RawItem[], nameKeys: string[]) {
  const jeonse: number[] = []; // 전세 보증금(만원)
  const wolse: RentSample[] = [];
  for (const it of items) {
    const deposit = parseNum(it.deposit);
    const monthly = parseNum(it.monthlyRent);
    const areaSqm = areaOf(it);
    if (areaSqm <= 0 || (deposit <= 0 && monthly <= 0)) continue;
    if (monthly <= 0) {
      jeonse.push(deposit);
    } else {
      const py = areaSqm * 0.3025;
      wolse.push({
        name: nameOf(it, nameKeys),
        dong: String(it.umdNm ?? ""),
        areaSqm,
        deposit,
        monthlyRent: monthly,
        monthlyRentPerPy: Math.round((monthly / py) * 10) / 10,
        ym: `${it.dealYear}.${String(it.dealMonth).padStart(2, "0")}`,
      });
    }
  }
  if (jeonse.length === 0 && wolse.length === 0) return null;
  const avgOf = (arr: number[]) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
  const rentPerPyList = wolse.map((w) => w.monthlyRentPerPy).sort((a, b) => a - b);
  return {
    jeonseCount: jeonse.length,
    avgJeonseDeposit: avgOf(jeonse),
    wolseCount: wolse.length,
    avgWolseDeposit: avgOf(wolse.map((w) => w.deposit)),
    avgMonthlyRent: avgOf(wolse.map((w) => w.monthlyRent)),
    avgMonthlyRentPerPy: rentPerPyList.length
      ? Math.round((rentPerPyList.reduce((a, b) => a + b, 0) / rentPerPyList.length) * 10) / 10
      : 0,
    medianMonthlyRentPerPy: rentPerPyList.length
      ? rentPerPyList[Math.floor(rentPerPyList.length / 2)]
      : 0,
    samples: wolse.slice(-8).reverse(),
  };
}

// 간단 인메모리 캐시 (edge 인스턴스별, TTL 6h)
const cache = new Map<string, { at: number; body: unknown }>();
const TTL = 6 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  const lawdCd = (req.nextUrl.searchParams.get("lawdCd") ?? "").slice(0, 5);
  if (lawdCd.length !== 5) {
    return NextResponse.json({ error: "lawdCd 5자리 필요" }, { status: 400 });
  }
  const months = Math.min(
    12,
    Math.max(1, Number(req.nextUrl.searchParams.get("months") ?? 6)),
  );

  const key = process.env.DATAGO_KEY;
  if (!key) {
    return NextResponse.json({ error: "DATAGO_KEY 미설정" }, { status: 500 });
  }

  const cacheKey = `${lawdCd}:${months}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL) {
    return NextResponse.json({ ...(hit.body as object), cached: true });
  }

  const [aptTradeRaw, nrgTradeRaw, aptRentRaw, offiRentRaw] = await Promise.all([
    fetchType("aptTrade", key, lawdCd, months),
    fetchType("nrgTrade", key, lawdCd, months),
    fetchType("aptRent", key, lawdCd, months),
    fetchType("offiRent", key, lawdCd, months),
  ]);

  const body = {
    lawdCd,
    months,
    fetchedAt: new Date().toISOString(),
    aptTrade: tradeStats(aptTradeRaw, RTMS.aptTrade.nameKeys),
    nrgTrade: tradeStats(nrgTradeRaw, RTMS.nrgTrade.nameKeys),
    aptRent: rentStats(aptRentRaw, RTMS.aptRent.nameKeys),
    offiRent: rentStats(offiRentRaw, RTMS.offiRent.nameKeys),
  };

  cache.set(cacheKey, { at: Date.now(), body });
  return NextResponse.json(body);
}
