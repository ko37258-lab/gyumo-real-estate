// 국토교통부 건축HUB 건축인허가정보 — 기본개요 (data.go.kr 15136267)
// 플렉시티 벤치마크 Phase B: 필지의 인허가 이력(허가/착공/사용승인) 카드.
//
//   GET /api/permits?pnu=<19자리>
//   → { permits: [{ permitDay, archGb, mainUse, totArea, realStcnsDay, useAprDay, ... }] }
import { NextResponse } from "next/server";

type Item = Record<string, unknown>;

function asArray(raw: unknown): Item[] {
  if (Array.isArray(raw)) return raw as Item[];
  if (raw && typeof raw === "object") return [raw as Item];
  return [];
}

/** "20130830" → "2013-08-30" (빈 값/공백은 "") */
function fmtDay(raw: unknown): string {
  const s = String(raw ?? "").trim();
  if (!/^\d{8}$/.test(s)) return "";
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pnu = searchParams.get("pnu");
  const pkey = process.env.DATAGO_KEY;

  if (!pnu || pnu.length !== 19) {
    return NextResponse.json(
      { error: "pnu(19자리)가 필요합니다" },
      { status: 400 },
    );
  }
  if (!pkey) {
    return NextResponse.json(
      { error: "DATAGO_KEY 환경변수가 설정되지 않았습니다" },
      { status: 503 },
    );
  }

  const sigunguCd = pnu.slice(0, 5);
  const bjdongCd = pnu.slice(5, 10);
  const platGbCd = pnu.slice(10, 11);
  const bun = pnu.slice(11, 15);
  const ji = pnu.slice(15, 19);

  const url =
    `https://apis.data.go.kr/1613000/ArchPmsHubService/getApBasisOulnInfo` +
    `?serviceKey=${encodeURIComponent(pkey)}&sigunguCd=${sigunguCd}&bjdongCd=${bjdongCd}` +
    `&platGbCd=${platGbCd}&bun=${bun}&ji=${ji}&numOfRows=30&pageNo=1&_type=json`;

  try {
    const r = await fetch(url);
    const text = await r.text();
    let data: {
      response?: {
        header?: { resultCode?: string; resultMsg?: string };
        body?: { items?: { item?: unknown }; totalCount?: number };
      };
    } | null = null;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "인허가 API 비정상 응답 — 잠시 후 다시 시도해주세요" },
        { status: 502 },
      );
    }

    const header = data?.response?.header;
    if (header?.resultCode && header.resultCode !== "00") {
      const msg = String(header.resultMsg ?? "");
      if (msg.includes("SERVICE_KEY") || msg.includes("SERVICE KEY")) {
        return NextResponse.json(
          { error: "건축인허가 API 키가 등록되지 않았습니다 (data.go.kr 활용신청 확인)" },
          { status: 401 },
        );
      }
      return NextResponse.json({ error: msg || "인허가 조회 실패" }, { status: 502 });
    }

    const items = asArray(data?.response?.body?.items?.item);
    const permits = items
      .map((it) => ({
        /** 관리 인허가대장 PK */
        pk: String(it.mgmPmsrgstPk ?? ""),
        address: String(it.platPlc ?? ""),
        bldName: String(it.bldNm ?? "").trim(),
        /** 건축구분 (신축/증축/개축 등 — 데이터에 따라 빈 값 가능) */
        archGb: String(it.archGbCdNm ?? "").trim(),
        mainUse: String(it.mainPurpsCdNm ?? "").trim(),
        platArea: Number(it.platArea) || 0,
        archArea: Number(it.archArea) || 0,
        totArea: Number(it.totArea) || 0,
        bcRat: Number(it.bcRat) || 0,
        vlRat: Number(it.vlRat) || 0,
        hhldCnt: Number(it.hhldCnt) || 0,
        parkingCnt: Number(it.totPkngCnt) || 0,
        /** 건축허가일 */
        permitDay: fmtDay(it.archPmsDay),
        /** 실착공일 */
        realStcnsDay: fmtDay(it.realStcnsDay),
        /** 착공예정일 */
        stcnsSchedDay: fmtDay(it.stcnsSchedDay),
        /** 사용승인일 */
        useAprDay: fmtDay(it.useAprDay),
      }))
      // 최신 허가일 우선 정렬
      .sort((a, b) => (b.permitDay || "").localeCompare(a.permitDay || ""));

    return NextResponse.json({ permits });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "인허가 조회 실패" },
      { status: 500 },
    );
  }
}
