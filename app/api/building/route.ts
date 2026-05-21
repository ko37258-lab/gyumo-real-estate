// 국토교통부 건축HUB 건축물대장 — 표제부/층별/시가표준 통합
import { NextResponse } from "next/server";

type Item = Record<string, unknown>;

function asArray(raw: unknown): Item[] {
  if (Array.isArray(raw)) return raw as Item[];
  if (raw && typeof raw === "object") return [raw as Item];
  return [];
}

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
      { error: "공공데이터 API 키가 필요합니다" },
      { status: 400 },
    );
  }

  const sigunguCd = pnu.slice(0, 5);
  const bjdongCd = pnu.slice(5, 10);
  const platGbCd = pnu.slice(10, 11);
  const bun = pnu.slice(11, 15);
  const ji = pnu.slice(15, 19);

  const baseParams = `serviceKey=${encodeURIComponent(pkey)}&sigunguCd=${sigunguCd}&bjdongCd=${bjdongCd}&platGbCd=${platGbCd}&bun=${bun}&ji=${ji}&numOfRows=20&pageNo=1&_type=json`;

  async function call(method: string) {
    const url = `https://apis.data.go.kr/1613000/BldRgstHubService/${method}?${baseParams}`;
    const r = await fetch(url);
    const text = await r.text();
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  try {
    const [titleData, floorData, hsprcData] = await Promise.all([
      call("getBrTitleInfo").catch(() => null),
      call("getBrFlrOulnInfo").catch(() => null),
      call("getBrHsprcInfo").catch(() => null),
    ]);

    const titleHeader = titleData?.response?.header;
    if (
      titleHeader?.resultCode &&
      titleHeader.resultCode !== "00" &&
      String(titleHeader.resultMsg).includes("SERVICE_KEY")
    ) {
      return NextResponse.json(
        { error: "건축HUB API 키가 등록되지 않았습니다." },
        { status: 401 },
      );
    }

    const titleItems = asArray(titleData?.response?.body?.items?.item);
    if (titleItems.length === 0) {
      return NextResponse.json({
        buildings: [],
        message: "해당 필지에 등록된 건축물대장이 없습니다 (나대지일 가능성)",
      });
    }

    const floorItems = asArray(floorData?.response?.body?.items?.item);
    const floorsByBuilding: Record<
      string,
      Array<{
        floorNo: string;
        floorGb: string;
        structure: string;
        mainUse: string;
        area: number;
      }>
    > = {};
    floorItems.forEach((f) => {
      const key = String(f.mgmBldrgstPk ?? f.bldNm ?? "");
      if (!floorsByBuilding[key]) floorsByBuilding[key] = [];
      floorsByBuilding[key].push({
        floorNo: String(f.flrNo ?? ""),
        floorGb: String(f.flrGbCdNm ?? ""),
        structure: String(f.strctCdNm ?? ""),
        mainUse: String(f.mainPurpsCdNm ?? ""),
        area: Number(f.area) || 0,
      });
    });

    const hsprcItems = asArray(hsprcData?.response?.body?.items?.item);
    const hsprcByBuilding: Record<string, Array<{ year: string; price: number }>> = {};
    hsprcItems.forEach((h) => {
      const key = String(h.mgmBldrgstPk ?? "");
      if (!hsprcByBuilding[key]) hsprcByBuilding[key] = [];
      hsprcByBuilding[key].push({
        year: String(h.bsisYear ?? ""),
        price: Number(h.bldHsprc) || 0,
      });
    });

    const buildings = titleItems.map((b) => {
      const key = String(b.mgmBldrgstPk ?? b.bldNm ?? "");
      const floors = floorsByBuilding[key] || [];
      const hsprc = hsprcByBuilding[key] || [];
      return {
        name: String(b.bldNm ?? "(명칭없음)"),
        address: String(b.newPlatPlc ?? b.platPlc ?? ""),
        mainUse: String(b.mainPurpsCdNm ?? ""),
        structure: String(b.strctCdNm ?? ""),
        grndFloors: Number(b.grndFlrCnt) || 0,
        ugrndFloors: Number(b.ugrndFlrCnt) || 0,
        height: Number(b.heit) || 0,
        platArea: Number(b.platArea) || 0,
        archArea: Number(b.archArea) || 0,
        totArea: Number(b.totArea) || 0,
        bcRat: Number(b.bcRat) || 0,
        vlRat: Number(b.vlRat) || 0,
        useAprDay: String(b.useAprDay ?? ""),
        regstrKind: String(b.regstrKindCdNm ?? ""),
        floors: floors.sort((a, b) => {
          const na = parseInt(String(a.floorNo).replace(/\D/g, ""), 10) || 0;
          const nb = parseInt(String(b.floorNo).replace(/\D/g, ""), 10) || 0;
          const ga = a.floorGb?.includes("지하") ? -1 : 1;
          const gb = b.floorGb?.includes("지하") ? -1 : 1;
          if (ga !== gb) return gb - ga;
          return ga > 0 ? nb - na : na - nb;
        }),
        priceHistory: hsprc.sort((a, b) => Number(a.year) - Number(b.year)),
      };
    });

    return NextResponse.json({ buildings });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 실패" },
      { status: 500 },
    );
  }
}
