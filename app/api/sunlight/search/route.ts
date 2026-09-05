import { NextResponse } from "next/server";
import { searchVworldPlaces } from "@/lib/vworld-data";

// 아파트 일조 보기 — 단지명/주소 검색 (VWorld search API 경유, 키는 서버에만).
//   GET /api/sunlight/search?q=래미안대치팰리스
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ error: "검색어를 2자 이상 입력해주세요" }, { status: 400 });
  }
  // size: 단지 선택 후 "…/112동" 같은 동별 POI 를 한 번에 받을 때 60까지
  const size = Math.min(60, Math.max(2, Number(searchParams.get("size")) || 10));
  try {
    const items = await searchVworldPlaces(q, size);
    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "public, s-maxage=3600, max-age=600" } },
    );
  } catch {
    return NextResponse.json({ error: "검색 서비스 오류 — 잠시 후 다시 시도해주세요" }, { status: 502 });
  }
}
