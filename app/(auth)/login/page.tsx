import Link from "next/link";
import { signIn } from "@/app/actions/auth";
import { GoogleButton } from "@/components/auth/GoogleButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; redirect?: string }>;
}) {
  const params = await searchParams;

  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
      {/* 로고 */}
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

      {/* 카드 */}
      <div className="rounded-2xl p-8"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
        <h1 className="text-white text-xl font-semibold mb-1">로그인</h1>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
          계정이 없으신가요?{" "}
          <Link href="/signup" style={{ color: "#FFCF0D" }}>무료 가입</Link>
        </p>

        {params.error && (
          <div className="rounded-lg px-4 py-3 text-sm mb-4"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
            {decodeURIComponent(params.error)}
          </div>
        )}
        {params.success && (
          <div className="rounded-lg px-4 py-3 text-sm mb-4"
            style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#86efac" }}>
            {decodeURIComponent(params.success)}
          </div>
        )}

        <GoogleButton next={params.redirect || "/simulator"} />

        <div className="flex items-center gap-3 my-5">
          <span className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            또는 이메일로
          </span>
          <span className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
        </div>

        <form action={signIn} className="space-y-4">
          <input type="hidden" name="redirect" value={params.redirect || "/simulator"} />

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
              이메일
            </label>
            <input
              type="email" name="email" required autoComplete="email"
              placeholder="your@email.com"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
              비밀번호
            </label>
            <input
              type="password" name="password" required autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
              }}
            />
            <div className="text-right mt-1.5">
              <Link href="/login/reset" className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                비밀번호 찾기
              </Link>
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg py-2.5 font-bold text-sm transition-opacity hover:opacity-85 mt-2"
            style={{ background: "#FFCF0D", color: "#020425" }}
          >
            로그인
          </button>
        </form>

        <div className="mt-6 pt-6 text-center text-xs" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}>
          <Link href="/privacy" style={{ color: "rgba(255,255,255,0.45)" }}>개인정보처리방침</Link>
          {" · "}
          <Link href="/terms" style={{ color: "rgba(255,255,255,0.45)" }}>이용약관</Link>
        </div>
      </div>
    </div>
  );
}
