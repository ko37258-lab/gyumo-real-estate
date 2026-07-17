// 용도별 분양가·임대료 표 — 국토부 실거래가 9종 집계 (플렉시티 "용도별 분양가/임대료" 대응)
//
//   매매(분양가 참고): 단독·다가구(SHTrade, 연면적) / 다세대·연립(RHTrade, 전용) /
//                      아파트(AptTrade, 전용) / 오피스텔(OffiTrade, 전용)
//   월세(임대료 참고): 각 용도 Rent 서비스 — 월세>0 표본의 평당 월세 중앙값
//   상업: 상업업무용(NrgTrade) 층별 매매 (건물 ㎡당)
//
//   미승인 서비스(단독다가구 등)는 resultCode!=000 → 표본 0건 → "사례 없음"으로 자연 강등.
//   호출량이 크므로(서비스 9 × 월 12) lawdCd 단위 6시간 캐시 + 동시성 20 제한.
//
//   GET /api/use-prices?pnu=<19>&umd=<법정동명>&months=<기본12>
import { NextResponse } from "next/server";

export const revalidate = 0;

const UA = { "User-Agent": "Mozilla/5.0 (compatible; gyumo/1.0)" }; // data.go.kr WAF 차단 회피
const PY = 3.305785;

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

/** 동시성 제한 병렬 실행 — data.go.kr 순간 폭주(WAF) 방지 */
async function pAll<T>(tasks: Array<() => Promise<T>>, limit = 20): Promise<T[]> {
  const out: T[] = new Array(tasks.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, tasks.length) },
    async () => {
      while (next < tasks.length) {
        const idx = next++;
        out[idx] = await tasks[idx]();
      }
    },
  );
  await Promise.all(workers);
  return out;
}

type Row = { umdNm: string; area: number; valueWon: number };

/** 표본 선택: 같은 동 3건 이상이면 동 기준, 아니면 시군구 전체 */
function stat(rows: Row[], umd: string) {
  let picked = rows;
  let basis = "같은 시군구";
  if (umd) {
    const same = rows.filter((r) => r.umdNm === umd);
    if (same.length >= 3) {
      picked = same;
      basis = "같은 법정동";
    }
  }
  const unitSqm = median(picked.map((r) => r.valueWon / r.area)); // 원/㎡
  return {
    manPerPy: Math.round((unitSqm * PY) / 10000), // 만원/평
    count: picked.length,
    basis,
  };
}

const SERVICES: Record<string, string> = {
  shTrade: "RTMSDataSvcSHTrade/getRTMSDataSvcSHTrade",
  rhTrade: "RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade",
  aptTrade: "RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade",
  offiTrade: "RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade",
  shRent: "RTMSDataSvcSHRent/getRTMSDataSvcSHRent",
  rhRent: "RTMSDataSvcRHRent/getRTMSDataSvcRHRent",
  aptRent: "RTMSDataSvcAptRent/getRTMSDataSvcAptRent",
  offiRent: "RTMSDataSvcOffiRent/getRTMSDataSvcOffiRent",
  nrgTrade: "RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade",
};

// lawdCd 단위 캐시 (6h) — 팝업 반복 오픈·같은 시군구 재조회 시 API 미호출
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { at: number; body: unknown }>();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pnu = searchParams.get("pnu");
  const umd = searchParams.get("umd") ?? "";
  const months = Math.min(Number(searchParams.get("months")) || 12, 12);
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
  const cacheKey = `${lawdCd}:${umd}:${months}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return NextResponse.json(hit.body);
  }

  const yms = recentYms(months);

  try {
    // 서비스×월 전체 태스크를 동시성 20으로 실행
    const keys = Object.keys(SERVICES);
    const tasks: Array<() => Promise<{ key: string; xml: string }>> = [];
    for (const key of keys) {
      for (const ym of yms) {
        tasks.push(async () => {
          const url =
            `https://apis.data.go.kr/1613000/${SERVICES[key]}` +
            `?serviceKey=${encodeURIComponent(pkey)}&LAWD_CD=${lawdCd}&DEAL_YMD=${ym}` +
            `&numOfRows=800&pageNo=1`;
          const r = await fetch(url, { headers: UA }).catch(() => null);
          if (!r || !r.ok) return { key, xml: "" };
          return { key, xml: await r.text() };
        });
      }
    }
    const results = await pAll(tasks, 20);

    const byService: Record<string, Array<Record<string, string>>> = {};
    for (const { key, xml } of results) {
      if (!xml || !xml.includes("<resultCode>000</resultCode>")) continue;
      (byService[key] ??= []).push(...parseXmlItems(xml));
    }

    // ── 매매 rows ──
    const shSale = (byService.shTrade ?? [])
      .map((it) => ({
        umdNm: it.umdNm ?? "",
        houseType: it.houseType ?? "",
        area: Number(it.totalFloorAr) || 0,
        valueWon: manToWon(it.dealAmount ?? ""),
      }))
      .filter((r) => r.area > 0 && r.valueWon > 0);
    const exclusiveSale = (rows: Array<Record<string, string>> | undefined) =>
      (rows ?? [])
        .map((it) => ({
          umdNm: it.umdNm ?? "",
          area: Number(it.excluUseAr) || 0,
          valueWon: manToWon(it.dealAmount ?? ""),
        }))
        .filter((r) => r.area > 0 && r.valueWon > 0);

    // ── 월세 rows (월세 > 0 표본만, valueWon = 월세 원) ──
    const monthlyRows = (
      rows: Array<Record<string, string>> | undefined,
      areaField: (it: Record<string, string>) => number,
    ) =>
      (rows ?? [])
        .map((it) => ({
          umdNm: it.umdNm ?? "",
          area: areaField(it),
          valueWon: manToWon(it.monthlyRent ?? ""),
        }))
        .filter((r) => r.area > 0 && r.valueWon > 0);
    const exclu = (it: Record<string, string>) => Number(it.excluUseAr) || 0;
    const shArea = (it: Record<string, string>) =>
      Number(it.contractArea) || Number(it.totalFloorAr) || 0;

    const shRentAll = (byService.shRent ?? []).filter((it) =>
      manToWon(it.monthlyRent ?? "") > 0,
    );
    const shRentBy = (type: string) =>
      monthlyRows(
        shRentAll.filter((it) => (it.houseType ?? "").includes(type)),
        shArea,
      );

    // ── 상업 층별 ──
    const shops = (byService.nrgTrade ?? [])
      .map((it) => ({
        umdNm: it.umdNm ?? "",
        floor: Number(it.floor) || 0,
        area: Number(it.buildingAr) || 0,
        valueWon: manToWon(it.dealAmount ?? ""),
      }))
      .filter((r) => r.area > 0 && r.valueWon > 0);
    const shopFloor = (pred: (f: number) => boolean) =>
      stat(
        shops.filter((r) => pred(r.floor)).map(({ umdNm, area, valueWon }) => ({ umdNm, area, valueWon })),
        umd,
      );

    const saleRow = (label: string, rows: Row[], areaBasis: string, exclusive: boolean) => ({
      label,
      areaBasis,
      exclusive, // true = 전용면적 기준 → 공급면적 전환 계산 대상
      ...stat(rows, umd),
    });

    const body = {
      periodMonths: months,
      lawdCd,
      sale: [
        saleRow("단독", shSale.filter((r) => r.houseType.includes("단독")), "연면적 기준", false),
        saleRow("다가구", shSale.filter((r) => r.houseType.includes("다가구")), "연면적 기준", false),
        saleRow("다세대/연립", exclusiveSale(byService.rhTrade), "전용면적 기준", true),
        saleRow("아파트", exclusiveSale(byService.aptTrade), "전용면적 기준", true),
        saleRow("오피스텔", exclusiveSale(byService.offiTrade), "전용면적 기준", true),
      ],
      rentMonthly: [
        saleRow("단독", shRentBy("단독"), "계약면적 기준", false),
        saleRow("다가구", shRentBy("다가구"), "계약면적 기준", false),
        saleRow("다세대/연립", monthlyRows(byService.rhRent, exclu), "전용면적 기준", true),
        saleRow("아파트", monthlyRows(byService.aptRent, exclu), "전용면적 기준", true),
        saleRow("오피스텔", monthlyRows(byService.offiRent, exclu), "전용면적 기준", true),
      ],
      commercial: [
        { label: "1층", ...shopFloor((f) => f === 1) },
        { label: "2층", ...shopFloor((f) => f === 2) },
        { label: "3층 이상", ...shopFloor((f) => f >= 3) },
      ],
    };

    cache.set(cacheKey, { at: Date.now(), body });
    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "용도별 시세 조회 실패" },
      { status: 500 },
    );
  }
}
