// 신축 시세 테이블 — 국토부 실거래가 3종 집계 (플렉시티 /building/price/ 대응)
//   · 연립다세대 매매 (RTMSDataSvcRHTrade)  → 주거 분양가 참고 (신축급 우선)
//   · 연립다세대 전월세 (RTMSDataSvcRHRent) → 전세가 참고 (월세 0 = 전세만)
//   · 상업업무용 매매 (RTMSDataSvcNrgTrade) → 상가 층별(1층/2층/3층+) 매매가 참고
//
//   단가 기준: 주거 = 전용면적 ㎡당, 상가 = 건물(전유) ㎡당.
//   같은 법정동 표본 3건 이상이면 동 기준, 아니면 시군구 전체로 완화.
//
//   GET /api/newbuild-price?pnu=<19>&umd=<법정동명>&months=<기본6>
import { NextResponse } from "next/server";

export const revalidate = 0;

const UA = { "User-Agent": "Mozilla/5.0 (compatible; gyumo/1.0)" }; // data.go.kr WAF 차단 회피

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

function manToWon(raw: string): number {
  const n = Number((raw ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n * 10000 : 0;
}

function recentYms(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 1; i <= n; i++) {
    const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${dd.getFullYear()}${String(dd.getMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** 표본: 같은 동 3건 이상이면 동 기준, 아니면 전체 */
function pick<T extends { umdNm: string }>(
  arr: T[],
  umd: string,
): { rows: T[]; basis: string } {
  if (umd) {
    const same = arr.filter((r) => r.umdNm === umd);
    if (same.length >= 3) return { rows: same, basis: "같은 법정동" };
  }
  return { rows: arr, basis: "같은 시군구" };
}

async function fetchMonths(
  service: string,
  op: string,
  pkey: string,
  lawdCd: string,
  yms: string[],
): Promise<Array<Record<string, string>>> {
  const xmls = await Promise.all(
    yms.map(async (ym) => {
      const url =
        `https://apis.data.go.kr/1613000/${service}/${op}` +
        `?serviceKey=${encodeURIComponent(pkey)}&LAWD_CD=${lawdCd}&DEAL_YMD=${ym}` +
        `&numOfRows=800&pageNo=1`;
      const r = await fetch(url, { headers: UA }).catch(() => null);
      if (!r || !r.ok) return "";
      return r.text();
    }),
  );
  const out: Array<Record<string, string>> = [];
  for (const xml of xmls) {
    if (!xml || !xml.includes("<resultCode>000</resultCode>")) continue;
    out.push(...parseXmlItems(xml));
  }
  return out;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pnu = searchParams.get("pnu");
  const umd = searchParams.get("umd") ?? "";
  const months = Math.min(Number(searchParams.get("months")) || 6, 12);
  const pkey = process.env.DATAGO_KEY;

  if (!pnu || pnu.length !== 19) {
    return NextResponse.json({ error: "pnu(19자리) 필요" }, { status: 400 });
  }
  if (!pkey) {
    return NextResponse.json(
      { error: "DATAGO_KEY 환경변수가 설정되지 않았습니다" },
      { status: 503 },
    );
  }

  const lawdCd = pnu.slice(0, 5);
  const yms = recentYms(months);
  const nowYear = new Date().getFullYear();

  try {
    const [rhTrade, rhRent, nrgTrade] = await Promise.all([
      fetchMonths("RTMSDataSvcRHTrade", "getRTMSDataSvcRHTrade", pkey, lawdCd, yms),
      fetchMonths("RTMSDataSvcRHRent", "getRTMSDataSvcRHRent", pkey, lawdCd, yms),
      fetchMonths("RTMSDataSvcNrgTrade", "getRTMSDataSvcNrgTrade", pkey, lawdCd, yms),
    ]);

    const ymOf = (it: Record<string, string>) =>
      `${it.dealYear}.${String(it.dealMonth ?? "").padStart(2, "0")}`;
    const sortRecent = <T extends { ym: string; day: string }>(rows: T[]): T[] =>
      [...rows].sort((a, b) =>
        `${b.ym}${b.day.padStart(2, "0")}`.localeCompare(
          `${a.ym}${a.day.padStart(2, "0")}`,
        ),
      );

    // ── 주거: 연립다세대 매매 (전용 ㎡당) ──
    const sales = rhTrade
      .map((it) => ({
        umdNm: it.umdNm ?? "",
        name: (it.mhouseNm ?? "").trim(),
        ym: ymOf(it),
        day: it.dealDay ?? "",
        floor: Number(it.floor) || 0,
        buildYear: Number(it.buildYear) || 0,
        excluAr: Number(it.excluUseAr) || 0,
        won: manToWon(it.dealAmount ?? ""),
      }))
      .filter((r) => r.excluAr > 0 && r.won > 0)
      .map((r) => ({ ...r, unit: r.won / r.excluAr }));
    // 신축급(준공 5년 이내) 우선 — 3건 미만이면 전체 연식
    const salesPicked = pick(sales, umd);
    const newish = salesPicked.rows.filter((r) => r.buildYear >= nowYear - 5);
    const salesRows = newish.length >= 3 ? newish : salesPicked.rows;
    const salesBasis =
      salesPicked.basis + (newish.length >= 3 ? " · 준공 5년 이내" : " · 전체 연식");

    // ── 주거: 전세 (월세 0만, 전용 ㎡당 보증금) ──
    const jeonse = rhRent
      .map((it) => ({
        umdNm: it.umdNm ?? "",
        name: (it.mhouseNm ?? "").trim(),
        ym: ymOf(it),
        day: it.dealDay ?? "",
        floor: Number(it.floor) || 0,
        excluAr: Number(it.excluUseAr) || 0,
        deposit: manToWon(it.deposit ?? ""),
        monthly: manToWon(it.monthlyRent ?? ""),
      }))
      .filter((r) => r.excluAr > 0 && r.deposit > 0 && r.monthly === 0)
      .map((r) => ({ ...r, unit: r.deposit / r.excluAr }));
    const jeonsePicked = pick(jeonse, umd);

    // ── 상가: 층별 매매 (건물 ㎡당) ──
    const shops = nrgTrade
      .map((it) => ({
        umdNm: it.umdNm ?? "",
        ym: ymOf(it),
        day: it.dealDay ?? "",
        floor: Number(it.floor) || 0,
        ar: Number(it.buildingAr) || 0,
        won: manToWon(it.dealAmount ?? ""),
        use: it.buildingUse ?? "",
      }))
      .filter((r) => r.ar > 0 && r.won > 0)
      .map((r) => ({ ...r, unit: r.won / r.ar }));
    const shopsPicked = pick(shops, umd);
    const byFloor = (pred: (f: number) => boolean) => {
      const rows = shopsPicked.rows.filter((r) => pred(r.floor));
      return {
        unitWon: Math.round(median(rows.map((r) => r.unit))),
        count: rows.length,
      };
    };

    return NextResponse.json({
      periodMonths: months,
      residential: {
        tradeUnitWon: Math.round(median(salesRows.map((r) => r.unit))),
        tradeCount: salesRows.length,
        tradeBasis: salesBasis,
        jeonseUnitWon: Math.round(median(jeonsePicked.rows.map((r) => r.unit))),
        jeonseCount: jeonsePicked.rows.length,
        jeonseBasis: jeonsePicked.basis,
        // 실제 거래 사례 (플렉시티식 — 최신순 10건)
        tradeSamples: sortRecent(salesRows)
          .slice(0, 10)
          .map((r) => ({
            ym: r.ym,
            name: r.name,
            umdNm: r.umdNm,
            floor: r.floor,
            buildYear: r.buildYear,
            areaSqm: r.excluAr,
            amountWon: r.won,
            unitWon: Math.round(r.unit),
          })),
        jeonseSamples: sortRecent(jeonsePicked.rows)
          .slice(0, 10)
          .map((r) => ({
            ym: r.ym,
            name: r.name,
            umdNm: r.umdNm,
            floor: r.floor,
            areaSqm: r.excluAr,
            depositWon: r.deposit,
            unitWon: Math.round(r.unit),
          })),
      },
      commercial: {
        basis: shopsPicked.basis,
        f1: byFloor((f) => f === 1),
        f2: byFloor((f) => f === 2),
        f3plus: byFloor((f) => f >= 3),
        b: byFloor((f) => f < 1),
        samples: sortRecent(shopsPicked.rows)
          .slice(0, 10)
          .map((r) => ({
            ym: r.ym,
            umdNm: r.umdNm,
            floor: r.floor,
            use: r.use,
            areaSqm: r.ar,
            amountWon: r.won,
            unitWon: Math.round(r.unit),
          })),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "신축 시세 조회 실패" },
      { status: 500 },
    );
  }
}
