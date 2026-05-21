// 카카오 로컬 API 주소 → 좌표 + PNU 변환 프록시
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  const kakaokey = process.env.KAKAO_KEY || searchParams.get("kakaokey");

  if (!address) {
    return NextResponse.json(
      { error: "주소가 필요합니다" },
      { status: 400 },
    );
  }
  if (!kakaokey) {
    return NextResponse.json(
      { error: "카카오 REST API 키가 필요합니다" },
      { status: 400 },
    );
  }

  try {
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}&size=1`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${kakaokey}` },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `카카오 API 오류 (${res.status}): ${text.slice(0, 200)}` },
        { status: 400 },
      );
    }

    const data = (await res.json()) as {
      documents?: Array<{
        address?: {
          b_code?: string;
          mountain_yn?: string;
          main_address_no?: string;
          sub_address_no?: string;
          x?: string;
          y?: string;
        };
        address_name?: string;
      }>;
    };
    const doc = data.documents?.[0];

    if (!doc) {
      return NextResponse.json(
        { error: "주소를 찾을 수 없습니다. 더 구체적으로 입력해주세요." },
        { status: 404 },
      );
    }

    const addr = doc.address;
    if (!addr?.b_code) {
      return NextResponse.json(
        { error: "법정동코드를 가져올 수 없습니다. 지번주소로 다시 시도해보세요." },
        { status: 404 },
      );
    }

    // PNU 19자리: 법정동코드(10) + 산여부(1) + 주번(4) + 부번(4)
    const pnu =
      addr.b_code +
      (addr.mountain_yn === "Y" ? "1" : "0") +
      String(addr.main_address_no || "0").padStart(4, "0") +
      String(addr.sub_address_no || "0").padStart(4, "0");

    return NextResponse.json({
      x: addr.x,
      y: addr.y,
      pnu,
      refined: doc.address_name,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "조회 실패" },
      { status: 500 },
    );
  }
}
