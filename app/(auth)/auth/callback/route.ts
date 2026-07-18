import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/simulator";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // 소셜(구글) 가입자는 가입 폼을 거치지 않아 개인정보 동의 기록이 없다.
      // 미동의면 동의 화면으로. (조회 실패 시엔 통과 — 로그인 잠금 방지)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("gyumo_profiles")
            .select("agreed_terms")
            .eq("id", user.id)
            .single();
          if (profile && profile.agreed_terms === false) {
            return NextResponse.redirect(
              `${origin}/consent?next=${encodeURIComponent(next)}`,
            );
          }
        }
      } catch {
        /* 동의 확인 실패가 로그인을 막지 않도록 */
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=이메일 인증에 실패했습니다.`);
}
