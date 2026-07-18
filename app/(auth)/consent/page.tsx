import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { agreeTerms, signOut } from "@/app/actions/auth";

export const metadata = { title: "개인정보 수집·이용 동의 | 규모검토" };

/**
 * 소셜(구글) 로그인 가입자 동의 화면.
 * 이메일 가입은 가입 폼에서 동의를 받으므로 이 화면을 거치지 않는다.
 */
export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next || "/simulator";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(next)}`);

  const { data: profile } = await supabase
    .from("gyumo_profiles")
    .select("agreed_terms, full_name")
    .eq("id", user.id)
    .single();

  // 이미 동의했으면 통과
  if (profile?.agreed_terms) redirect(next);

  return (
    <div style={{ width: "100%", maxWidth: 460 }}>
      <div className="text-center mb-8">
        <Link href="/" className="inline-flex flex-col items-center gap-2">
          <span
            className="text-[10px] font-semibold px-3 py-1 rounded-full tracking-wider"
            style={{ background: "rgba(255,207,13,0.14)", color: "#FFCF0D", border: "1px solid rgba(255,207,13,0.28)" }}
          >
            SCALE REVIEW
          </span>
          <span className="text-white font-semibold text-lg">건축가능 규모검토</span>
        </Link>
      </div>

      <div
        className="rounded-2xl p-8"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}
      >
        <h1 className="text-white text-xl font-semibold mb-1">개인정보 수집·이용 동의</h1>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
          {profile?.full_name || user.email} 님, 서비스 이용을 위해 아래 동의가 필요합니다.
        </p>

        {params.error && (
          <div
            className="rounded-lg px-4 py-3 text-sm mb-4"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
          >
            {decodeURIComponent(params.error)}
          </div>
        )}

        <div
          className="rounded-lg px-4 py-3.5 mb-5 text-[12px] leading-relaxed space-y-1.5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)" }}
        >
          <p>· <b style={{ color: "rgba(255,255,255,0.85)" }}>수집 항목</b>: 이름, 이메일, 프로필 정보 (구글 계정 제공분)</p>
          <p>· <b style={{ color: "rgba(255,255,255,0.85)" }}>수집 목적</b>: 회원 식별, 서비스 제공, 등급·크레딧 관리, 고객 안내</p>
          <p>· <b style={{ color: "rgba(255,255,255,0.85)" }}>보유 기간</b>: 회원 탈퇴 시까지 (관계 법령에 따른 보존 기간 별도)</p>
          <p>· 동의를 거부할 권리가 있으며, 거부 시 서비스 이용이 제한됩니다.</p>
        </div>

        <form action={agreeTerms} className="space-y-4">
          <input type="hidden" name="next" value={next} />

          <label
            className="flex items-start gap-2.5 cursor-pointer rounded-lg px-3.5 py-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <input
              type="checkbox"
              name="privacy_agree"
              required
              className="mt-0.5 w-4 h-4 cursor-pointer"
              style={{ accentColor: "#FFCF0D" }}
            />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>
              <b style={{ color: "#FFCF0D" }}>[필수]</b> 개인정보 수집·이용에 동의합니다
            </span>
          </label>

          <button
            type="submit"
            className="w-full rounded-lg py-2.5 font-bold text-sm transition-opacity hover:opacity-85"
            style={{ background: "#FFCF0D", color: "#020425" }}
          >
            동의하고 시작하기
          </button>
        </form>

        <form action={signOut} className="mt-3">
          <button
            type="submit"
            className="w-full text-center text-xs py-2"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            동의하지 않고 로그아웃
          </button>
        </form>
      </div>

      <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.25)" }}>
        <Link href="/privacy" style={{ color: "rgba(255,255,255,0.4)" }}>
          개인정보처리방침
        </Link>{" "}
        전문을 확인하실 수 있습니다.
      </p>
    </div>
  );
}
