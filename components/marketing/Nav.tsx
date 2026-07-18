import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { ROLE_BADGE_STYLE } from "@/lib/membership";

export async function Nav() {
  let user = null;
  let profile: { role: string; is_admin: boolean } | null = null;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createClient();
      const { data: { user: u } } = await supabase.auth.getUser();
      user = u;
      if (user) {
        const { data } = await supabase
          .from("gyumo_profiles")
          .select("role, is_admin")
          .eq("id", user.id)
          .single();
        profile = data;
      }
    } catch {
      // Supabase 연결 실패 시 비로그인 상태로 폴백
    }
  }

  const roleBadge = profile?.role ? ROLE_BADGE_STYLE[profile.role] ?? null : null;

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md"
      style={{ background: "rgba(2,4,37,0.82)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* 모바일에서는 좁은 폭에 항목이 눌려 글자가 세로로 쪼개졌다.
          각 항목에 whitespace-nowrap·shrink-0 을 걸고, 좁으면 메뉴 줄이
          가로로 스크롤되게 한다(잘리거나 깨지지 않도록). */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 min-h-14 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 py-2 sm:py-0">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full tracking-wider whitespace-nowrap"
            style={{
              background: "rgba(255,207,13,0.14)",
              color: "#FFCF0D",
              border: "1px solid rgba(255,207,13,0.28)",
            }}
          >
            SCALE REVIEW
          </span>
          <span className="font-medium text-sm text-white/90 whitespace-nowrap">건축가능 규모검토</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto sm:overflow-visible -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Link
            href="/simulator"
            className="text-sm px-2 sm:px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0"
            style={{ color: "rgba(255,255,255,0.58)" }}
          >
            시뮬레이터
          </Link>
          {/* 건축이야기 = public/building-law/ 정적 사이트 (외부 netlify → 내부 편입).
              Next 라우트가 아니라 정적 파일이므로 <Link> 프리페치 대상이 아니다. */}
          <a
            href="/building-law"
            className="text-sm px-2 sm:px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0"
            style={{ color: "rgba(255,255,255,0.58)" }}
          >
            건축이야기
          </a>
          <Link
            href="/pricing"
            className="text-sm px-2 sm:px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0"
            style={{ color: "rgba(255,255,255,0.58)" }}
          >
            가격
          </Link>

          {user ? (
            <div className="flex items-center gap-2">
              {roleBadge && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full hidden sm:inline"
                  style={{ background: roleBadge.bg, color: roleBadge.color }}>
                  {roleBadge.label}
                </span>
              )}
              {(profile?.is_admin || profile?.role === "스텝") && (
                <Link href="/admin"
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,207,13,0.2)", color: "#FFCF0D" }}>
                  ADMIN
                </Link>
              )}
              <span className="text-xs truncate max-w-[9rem] hidden md:inline" style={{ color: "rgba(255,255,255,0.6)" }}>
                {user.email}
              </span>
              <form action={signOut}>
                <button type="submit"
                  className="text-xs px-3 py-1.5 rounded-md whitespace-nowrap shrink-0"
                  style={{ color: "rgba(255,255,255,0.45)" }}>
                  로그아웃
                </button>
              </form>
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm px-2 sm:px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0"
                style={{ color: "rgba(255,255,255,0.58)" }}
              >
                로그인
              </Link>
              <Link href="/signup" className="shrink-0">
                <button
                  className="text-sm font-bold px-3 sm:px-4 py-1.5 rounded-md transition-opacity hover:opacity-85 whitespace-nowrap"
                  style={{ background: "#FFCF0D", color: "#020425" }}
                >
                  {/* 좁은 화면에선 라벨을 줄여 버튼이 잘려 보이지 않게 한다 */}
                  <span className="sm:hidden">시작하기</span>
                  <span className="hidden sm:inline">지번 조회 시작</span>
                </button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
