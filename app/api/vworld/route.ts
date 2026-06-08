// VWorld 데이터 API 서버 프록시 — 브라우저 직접 호출(CORS 차단)을 대체.
//
// 기존엔 lib/vworld.ts가 브라우저에서 api.vworld.kr를 직접 호출 → 콘솔에 CORS 에러 다수.
// 면적·공시지가는 서버사이드로 가져오므로, 지적/용도지역/도로 조회도 이 라우트로 일원화한다.
//
//   GET /api/vworld?kind=landchar&pnu=<19자리>     → 면적·공시지가·지목
//   GET /api/vworld?kind=zone&x=<경도>&y=<위도>     → 용도지역명
//   GET /api/vworld?kind=roads&x=<경도>&y=<위도>    → 주변 도로 접면 판정
import { NextResponse } from "next/server";
import {
  fetchVworldLandChar,
  fetchVworldZone,
  fetchVworldRoads,
  hasVworldDataKey,
} from "@/lib/vworld-data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind");

  if (!hasVworldDataKey()) {
    return NextResponse.json(
      { error: "VWORLD_DATA_KEY(또는 VWORLD_KEY) 환경변수가 설정되지 않았습니다" },
      { status: 503 },
    );
  }

  try {
    if (kind === "landchar") {
      const pnu = searchParams.get("pnu");
      if (!pnu || pnu.length !== 19) {
        return NextResponse.json({ error: "pnu(19자리) 필요" }, { status: 400 });
      }
      const data = await fetchVworldLandChar(pnu);
      if (!data) {
        return NextResponse.json({ error: "토지특성정보 없음" }, { status: 404 });
      }
      return NextResponse.json(data);
    }

    if (kind === "zone") {
      const x = searchParams.get("x");
      const y = searchParams.get("y");
      if (!x || !y) {
        return NextResponse.json({ error: "x,y 좌표 필요" }, { status: 400 });
      }
      const data = await fetchVworldZone(x, y);
      if (!data) {
        return NextResponse.json({ error: "용도지역 정보 없음" }, { status: 404 });
      }
      return NextResponse.json(data);
    }

    if (kind === "roads") {
      const x = searchParams.get("x");
      const y = searchParams.get("y");
      if (!x || !y) {
        return NextResponse.json({ error: "x,y 좌표 필요" }, { status: 400 });
      }
      const data = await fetchVworldRoads(x, y);
      if (!data) {
        return NextResponse.json({ error: "도로 정보 없음" }, { status: 404 });
      }
      return NextResponse.json(data);
    }

    return NextResponse.json(
      { error: "kind는 landchar|zone|roads 중 하나여야 합니다" },
      { status: 400 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 실패" },
      { status: 500 },
    );
  }
}
