// 국토교통부 토지 매매 실거래가 (data.go.kr 15126466, RTMSDataSvcLandTrade)
// 플렉시티 벤치마크 Phase B: 인근 실거래 사례 + 토지 추정가.
//
//   추정 방법론 (플렉시티 실측과 동일 계열):
//   같은 법정동 + 같은 용도지역의 최근 실거래 ㎡당 단가 중앙값 × 대상 면적.
//   개별 필지 지번이 마스킹(1*)되어 거래필지별 공시지가 매칭은 불가하므로
//   ㎡당 단가 분포로 근사하고, 대상 필지 공시지가 대비 배수를 함께 제공한다.
//
//   GET /api/land-trades?pnu=<19>&umd=<법정동명>&zone=<용도지역명>&areaSqm=<㎡>&jiga=<원/㎡>
import { NextResponse } from "next/server";

export const revalidate = 0;

type Trade = {
  yearMonth: string; // "2026.05"
  day: string;
  jibun: string; // 마스킹 지번 (예: "1*")
  umdNm: string;
  jimok: string;
  landUse: string;
  areaSqm: number;
  amountWon: number; // 원
  unitWon: number; // 원/㎡
  isShare: boolean; // 지분거래
  dealingGbn: string; // 중개/직거래
};

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

/** "2,214" (만원) → 원 */
function amountToWon(raw: string): number {
  const n = Number(raw.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n * 10000 : 0;
}

/** 최근 n개월의 YYYYMM 목록 (이번 달 포함 X — 신고 지연 감안해 지난달부터) */
function recentYms(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setDate(1);
  for (let i = 1; i <= n; i++) {
    const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(
      `${dd.getFullYear()}${String(dd.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return out;
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pnu = searchParams.get("pnu");
  const umd = searchParams.get("umd") ?? ""; // 법정동명 (예: 역삼동)
  const zone = searchParams.get("zone") ?? ""; // 용도지역명
  const areaSqm = Number(searchParams.get("areaSqm")) || 0;
  const jiga = Number(searchParams.get("jiga")) || 0; // 개별공시지가 원/㎡
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
  const months = Math.min(Number(searchParams.get("months")) || 12, 24);
  const yms = recentYms(months);

  try {
    const responses = await Promise.all(
      yms.map(async (ym) => {
        const url =
          `https://apis.data.go.kr/1613000/RTMSDataSvcLandTrade/getRTMSDataSvcLandTrade` +
          `?serviceKey=${encodeURIComponent(pkey)}&LAWD_CD=${lawdCd}&DEAL_YMD=${ym}` +
          `&numOfRows=500&pageNo=1`;
        // ⚠ data.go.kr WAF가 UA 없는 요청을 차단(Request Blocked) — UA 필수 (2026-07 실측)
        const r = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; gyumo/1.0)" },
        }).catch(() => null);
        if (!r || !r.ok) return "";
        return r.text();
      }),
    );

    const all: Trade[] = [];
    for (const xml of responses) {
      if (!xml || !xml.includes("<resultCode>000</resultCode>")) continue;
      for (const it of parseXmlItems(xml)) {
        const area = Number(it.dealArea) || 0;
        const won = amountToWon(it.dealAmount ?? "");
        if (area <= 0 || won <= 0) continue;
        all.push({
          yearMonth: `${it.dealYear}.${String(it.dealMonth).padStart(2, "0")}`,
          day: it.dealDay ?? "",
          jibun: it.jibun ?? "",
          umdNm: it.umdNm ?? "",
          jimok: it.jimok ?? "",
          landUse: it.landUse ?? "",
          areaSqm: area,
          amountWon: won,
          unitWon: Math.round(won / area),
          isShare: (it.shareDealingType ?? "").includes("지분"),
          dealingGbn: it.dealingGbn ?? "",
        });
      }
    }

    // 유사 사례 필터: 같은 법정동 → 같은 용도지역 → 지분거래 제외.
    // 표본 부족 시 단계적으로 완화 (동 전체 → 시군구 동일 용도지역).
    const sameUmd = umd ? all.filter((t) => t.umdNm === umd) : all;
    const noShare = sameUmd.filter((t) => !t.isShare);
    let sample = zone ? noShare.filter((t) => t.landUse === zone) : noShare;
    let basis = "같은 법정동 · 같은 용도지역";
    if (sample.length < 3) {
      sample = noShare;
      basis = "같은 법정동 (용도지역 무관)";
    }
    if (sample.length < 3 && zone) {
      sample = all.filter((t) => !t.isShare && t.landUse === zone);
      basis = "같은 시군구 · 같은 용도지역";
    }

    // 품질 필터 — 도로·구거·하천·제방·묘지 거래는 대지의 유사 사례가 될 수 없으므로
    // 항상 제외 (성내동 실측: 도로 683만/㎡ vs 대 2,816만/㎡ — 포함 시 중앙값 붕괴).
    // 초소형(<15㎡, 자투리·알박기)은 표본이 2건 이상 남을 때만 추가 제외.
    // 표본 0건이면 추정가를 내지 않는다 (거래 리스트만 제공) — 부정확한 수치 방지.
    const JUNK_JIMOK = new Set(["도로", "구거", "하천", "제방", "묘지"]);
    sample = sample.filter((t) => !JUNK_JIMOK.has(t.jimok));
    basis += " · 건축지목";
    const sized = sample.filter((t) => t.areaSqm >= 15);
    if (sized.length >= 2) sample = sized;

    const medianUnit = median(sample.map((t) => t.unitWon));
    const estimatedPrice =
      areaSqm > 0 && medianUnit > 0 ? Math.round(medianUnit * areaSqm) : 0;
    const jigaTotal = jiga > 0 && areaSqm > 0 ? jiga * areaSqm : 0;
    const ratioToJiga =
      estimatedPrice > 0 && jigaTotal > 0
        ? Math.round((estimatedPrice / jigaTotal) * 100) / 100
        : 0;

    // 최신순 정렬 후 상위 20건만
    const sorted = [...sample].sort((a, b) =>
      `${b.yearMonth}${b.day.padStart(2, "0")}`.localeCompare(
        `${a.yearMonth}${a.day.padStart(2, "0")}`,
      ),
    );

    return NextResponse.json({
      trades: sorted.slice(0, 20),
      sampleCount: sample.length,
      periodMonths: months,
      basis,
      medianUnitWon: Math.round(medianUnit),
      estimatedPrice,
      jigaTotal,
      ratioToJiga,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "실거래 조회 실패" },
      { status: 500 },
    );
  }
}
