import { NextRequest, NextResponse } from "next/server";
import { datagoKeyFail } from "@/lib/datago-fail";
import { isBuiltJimok } from "@/lib/jimok";

// 사업성 탭 "주변 토지 시세" — 시군구 전체 토지 매매 실거래 (2026-09-18 재작성)
//
// 예전 문제(역삼동 825-3 재현): ① UA 없이 호출(data.go.kr WAF 차단) ② 실패한 달을 조용히 건너뜀
// ③ 면적 필드를 landAr 로 읽어(실제 dealArea) 성공 응답도 전부 버림 → "최근 12개월 토지 거래 없음"으로
// 표시되는데 ① 토지가치분석 탭(/api/land-trades)은 같은 필지에서 5건을 찾았다.
// 이제 요청·파싱은 land-trades 와 같고, 실패는 실패로, 조건 차이(시군구 전체)는 basis 로 밝힌다.
// runtime 은 기본(nodejs) — vercel.json regions(icn1) 적용 대상. edge 는 리전 고정이 안 된다.

function parseXmlItems(xml: string): Array<Record<string, string>> {
  const items: Array<Record<string, string>> = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  const fieldRe = /<(\w+)>([\s\S]*?)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml))) {
    const obj: Record<string, string> = {};
    let f: RegExpExecArray | null;
    fieldRe.lastIndex = 0;
    while ((f = fieldRe.exec(m[1]))) obj[f[1]] = f[2].trim();
    items.push(obj);
  }
  return items;
}

const JUNK_JIMOK = new Set(["도로", "구거", "하천", "제방", "묘지"]);

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
  const yms = ymList(months);
  const bodies = await Promise.all(
    yms.map(async (ym) => {
      const url =
        `https://apis.data.go.kr/1613000/RTMSDataSvcLandTrade/getRTMSDataSvcLandTrade` +
        `?serviceKey=${encodeURIComponent(key)}&LAWD_CD=${lawdCd}&DEAL_YMD=${ym}&numOfRows=500&pageNo=1`;
      // ⚠ data.go.kr WAF 는 UA 없는 요청을 차단한다
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; gyumo/1.0)" } }).catch(() => null);
      if (!r) return "";
      return r.text().catch(() => "");
    }),
  );

  let okCalls = 0;
  let keyFail: string | null = null;
  const seen = new Set<string>();
  for (const xml of bodies) {
    const fail = datagoKeyFail(xml);
    if (fail) { keyFail = fail; continue; }
    if (!xml || !xml.includes("<resultCode>000</resultCode>")) continue;
    okCalls++;
    for (const it of parseXmlItems(xml)) {
      const amount = parseAmount(it.dealAmount);
      const areaSqm = parseFloat(it.dealArea ?? "0") || 0;
      if (amount <= 0 || areaSqm <= 0) continue;
      // 해제된 거래 제외, 동일 신고 중복 제거(land-trades 와 같은 기준)
      if ((it.cdealType ?? "").trim()) continue;
      const dupKey = [it.dealYear, it.dealMonth, it.dealDay, it.umdNm, it.jibun, it.dealArea, it.dealAmount].join("|");
      if (seen.has(dupKey)) continue;
      seen.add(dupKey);
      // 품질 필터 — land-trades 와 같은 기준: 도로·구거·하천·제방·묘지, 지분거래, 15㎡ 미만 자투리 제외
      if (JUNK_JIMOK.has((it.jimok ?? "").trim())) continue;
      // 건축 가능 지목(대·공장용지 등)만 — 임야·전·답 단가는 대지 토지가 비교사례가 아니다
      if (!isBuiltJimok((it.jimok ?? "").trim())) continue;
      if ((it.shareDealingType ?? "").includes("지분")) continue;
      if (areaSqm < 15) continue;
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
        landCls: it.jimok ?? "",
        landUse: it.landUse ?? "",
      });
    }
  }

  const basis = `시군구 전체 건축지목 토지 매매(용도지역·도로조건 무관) · 최근 ${months}개월 · 해제·중복·지분·도로 등 특수지목·15㎡ 미만 제외`;
  if (okCalls === 0) {
    // 실패를 "거래 없음"으로 표시하지 않는다
    return NextResponse.json(
      { count: 0, items: [], stats: null, failed: true, basis, message: `실거래 조회 실패${keyFail ? ` — ${keyFail}` : ""} (자료 없음이 아님)` },
      { status: 503 },
    );
  }
  if (allItems.length === 0) {
    return NextResponse.json({ count: 0, items: [], stats: null, basis, message: `최근 ${months}개월 시군구 토지 거래 없음 (조회 ${okCalls}/${months}개월 성공)` });
  }

  const prices = allItems.map((i) => i.pricePerPy);
  const sorted = [...prices].sort((a, b) => a - b);
  const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
  const median = sorted[Math.floor(sorted.length / 2)];

  return NextResponse.json({
    count: allItems.length,
    basis,
    partial: okCalls < months ? `${months}개월 중 ${okCalls}개월만 조회 성공` : undefined,
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
