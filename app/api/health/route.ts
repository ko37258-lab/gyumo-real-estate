// 🩺 외부 키 건강검진 — 매일 크론이 호출해 키 죽음을 당일 발견한다.
//
// 배경(2026-08-31): DATAGO_KEY가 무효화됐는데 응답을 "자료 없음"으로
// 삼켜 몇 주간 시세·추정가 기능이 조용히 죽어 있었다. 이 라우트는
// 실데이터가 나오는지까지 확인하고, 실패 시 관리자 메일을 보낸다.
//
//   GET /api/health              → 상태 JSON (비밀값 없음)
//   GET /api/health?notify=1     → 실패 항목 있으면 관리자 메일
//                                  (Vercel 크론 user-agent 또는 HEALTH_TOKEN 필요)
import { NextResponse } from "next/server";
import { datagoKeyFail } from "@/lib/datago-fail";
import { fetchVworldParcelPolygon, fetchVworldLandChar } from "@/lib/vworld-data";
import { sendAdminEmail } from "@/lib/notify/email";

export const dynamic = "force-dynamic";

const PROBE_PNU = "1168010100007370000"; // 강남 테헤란로 152 — 항상 존재
const PROBE_LAWD = "11680";

type Check = { name: string; ok: boolean; ms: number; detail: string };

async function timed(name: string, fn: () => Promise<{ ok: boolean; detail: string }>): Promise<Check> {
  const t0 = Date.now();
  try {
    const r = await fn();
    return { name, ...r, ms: Date.now() - t0 };
  } catch (e) {
    return { name, ok: false, ms: Date.now() - t0, detail: e instanceof Error ? e.message : "예외" };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wantNotify = searchParams.get("notify") === "1";

  const ym = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1); // 전월 — 당월 초엔 자료가 없을 수 있음
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const checks = await Promise.all([
    timed("data.go.kr 실거래(RTMS)", async () => {
      const pkey = process.env.DATAGO_KEY || "";
      if (!pkey) return { ok: false, detail: "DATAGO_KEY 미설정" };
      const url =
        `https://apis.data.go.kr/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade` +
        `?serviceKey=${encodeURIComponent(pkey)}&LAWD_CD=${PROBE_LAWD}&DEAL_YMD=${ym}&numOfRows=1&pageNo=1`;
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; gyumo-health/1.0)" } });
      const body = await r.text();
      const fail = datagoKeyFail(body);
      if (fail) return { ok: false, detail: fail };
      if (!body.includes("<resultCode>000</resultCode>")) return { ok: false, detail: body.slice(0, 120) };
      const m = body.match(/<totalCount>(\d+)<\/totalCount>/);
      const total = m ? Number(m[1]) : -1;
      // 강남 연립다세대 매매가 한 달 0건일 수는 없다 — 0이면 이상 신호
      return { ok: total > 0, detail: `${ym} ${total}건` };
    }),
    timed("VWorld 지적(필지 폴리곤)", async () => {
      const p = await fetchVworldParcelPolygon(PROBE_PNU);
      return { ok: Boolean(p?.ring?.length), detail: p ? `링 ${p.ring.length}점` : "응답 없음" };
    }),
    timed("VWorld NED(공시지가·지목)", async () => {
      const c = await fetchVworldLandChar(PROBE_PNU);
      return { ok: Boolean(c && c.price > 0), detail: c ? `${c.priceYear}년 ${c.price.toLocaleString()}원/㎡` : "응답 없음" };
    }),
    timed("카카오 지오코딩", async () => {
      const kk = process.env.KAKAO_KEY || "";
      if (!kk) return { ok: false, detail: "KAKAO_KEY 미설정" };
      const r = await fetch(
        "https://dapi.kakao.com/v2/local/search/address.json?query=" + encodeURIComponent("서울 강남구 역삼동 737"),
        { headers: { Authorization: `KakaoAK ${kk}` } },
      );
      const j = (await r.json().catch(() => null)) as { documents?: unknown[] } | null;
      return { ok: Boolean(r.ok && j?.documents?.length), detail: r.ok ? `${j?.documents?.length ?? 0}건` : `HTTP ${r.status}` };
    }),
  ]);

  const failing = checks.filter((c) => !c.ok);
  const ok = failing.length === 0;

  // 메일은 크론(Vercel UA)·토큰 요청만 — 외부인이 발송을 유발 못 하게
  if (wantNotify && !ok) {
    const ua = request.headers.get("user-agent") ?? "";
    const token = searchParams.get("token") ?? "";
    const allowed = ua.includes("vercel-cron") || (process.env.HEALTH_TOKEN && token === process.env.HEALTH_TOKEN);
    if (allowed) {
      const rows = failing.map((c) => `<li><b>${c.name}</b> — ${c.detail} (${c.ms}ms)</li>`).join("");
      await sendAdminEmail(
        `🩺 [gyumo] 외부 키 건강검진 실패 ${failing.length}건`,
        `<p>매일 자동 점검에서 아래 항목이 실패했습니다. 키 만료·교체 누락을 확인하세요.</p><ul>${rows}</ul>` +
          `<p style="color:#888">data.go.kr 키 교체 시 공법앱·gyumo·mrk 3곳을 함께 바꿔야 합니다.</p>`,
      );
    }
  }

  return NextResponse.json(
    { ok, checkedAt: new Date().toISOString(), checks },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
