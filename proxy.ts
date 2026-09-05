import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  // Supabase 환경변수 미설정 시 모든 요청 통과 (서비스 정상 운영 유지)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.next({ request });
  }

  // ⚡ 성능: API·정적 사이트 요청은 인증 로직을 아예 타지 않는다.
  // 아래 getUser() 는 Supabase 서버 왕복이라, 지도 타일(/api/tile — 드래그 한 번에
  // 수십 장)·데이터 API·건축이야기 2MB 파일까지 매 요청 수십~수백 ms 를 얹고 있었다.
  // API 라우트는 각자 createClient 로 자체 인증하므로 미들웨어 검사가 불필요하고,
  // 페이지 네비게이션(그 외 경로)에는 세션 쿠키 갱신을 위해 기존 로직을 유지한다.
  {
    const p = request.nextUrl.pathname;
    if (p.startsWith("/api/")) {
      // 자매 앱 CORS — 허용 도메인이 둘 이상이라 next.config 정적 헤더 대신 여기서 Origin 별로 붙인다
      const origin = request.headers.get("origin") ?? "";
      const res = NextResponse.next({ request });
      if (CORS_ORIGINS.has(origin)) res.headers.set("Access-Control-Allow-Origin", origin);
      return res;
    }
    if (p.startsWith("/building-law")) {
      return NextResponse.next({ request });
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // /admin 경로: 관리자(is_admin) 또는 스텝만 접근
  if (pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
    const { data: profile } = await supabase
      .from("gyumo_profiles")
      .select("is_admin, role")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin && profile?.role !== "스텝") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // /account 경로: 로그인 필요
  if (pathname.startsWith("/account") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // 개인정보 수집·이용 미동의자는 서비스 이용 전 동의 화면으로.
  //
  // 콜백(/auth/callback)에서도 검사하지만 그건 구글 로그인 순간 한 번뿐이라,
  // ① 이메일 로그인은 아예 안 걸리고 ② 한 번 건너뛰면 다시 뜨지 않는다.
  // 실제로 기존 회원 6명이 미동의로 남아 있어 여기서 상시 차단한다.
  // 마케팅 페이지(/, /pricing, /building-law)는 열어 두고 실제 도구만 막는다.
  if (user && GATED_PREFIXES.some((p) => pathname.startsWith(p))) {
    // name_registered_at 컬럼은 2026-09-04 마이그레이션(supabase/schema_linked_accounts.sql)에서
    // 추가됐다. 마이그레이션 전 배포에서도 동의 게이트가 풀리지 않도록, 컬럼이 없어
    // 조회가 실패하면 agreed_terms 만 다시 읽는다.
    let profile: { agreed_terms: boolean | null; name_registered_at?: string | null } | null = null;
    {
      const r = await supabase
        .from("gyumo_profiles")
        .select("agreed_terms, name_registered_at")
        .eq("id", user.id)
        .single();
      if (r.error) {
        const r2 = await supabase
          .from("gyumo_profiles")
          .select("agreed_terms")
          .eq("id", user.id)
          .single();
        profile = r2.data;
      } else {
        profile = r.data;
      }
    }

    // 조회 실패(profile null)는 통과 — 장애 시 서비스가 잠기지 않도록.
    if (profile && profile.agreed_terms === false) {
      const url = request.nextUrl.clone();
      url.pathname = "/consent";
      url.search = "";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }

    // 구글 가입자는 가입 폼을 거치지 않아 이름·전화가 없다 — "자기이름 등록"을
    // 마치지 않으면(name_registered_at NULL) 서비스 이용 불가. 동의 게이트 다음 순서.
    // 구글 프로필 이름이 자동으로 들어오므로 full_name 유무로는 판별할 수 없다.
    const provider = (user.app_metadata as { provider?: string } | null)?.provider;
    if (
      provider === "google" &&
      profile &&
      "name_registered_at" in profile &&
      !profile.name_registered_at
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/register-name";
      url.search = "";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

/** gyumo 데이터 API를 브라우저에서 직접 부르는 자매 앱 도메인 (공법규제분석 앱) */
const CORS_ORIGINS = new Set([
  "https://real-estate-infographic.vercel.app",
  "https://372law.com",
  "https://www.372law.com",
]);

/** 동의해야 쓸 수 있는 경로 (/consent 자체와 로그인·API는 제외해야 무한 루프가 없다) */
const GATED_PREFIXES = [
  "/simulator",
  "/credits",
  "/account",
  "/settings",
  "/admin",
];

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
