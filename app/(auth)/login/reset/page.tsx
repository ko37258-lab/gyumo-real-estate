import Link from "next/link";
import { resetPassword } from "@/app/actions/auth";

export default async function ResetPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

  return (
    <div style={{ width: "100%", maxWidth: 420 }}>
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

      <div className="rounded-2xl p-8"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)" }}>
        <h1 className="text-white text-xl font-semibold mb-1">비밀번호 찾기</h1>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
          가입한 이메일을 입력하시면 재설정 링크를 보내드립니다.
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

        <form action={resetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
              이메일
            </label>
            <input
              type="email" name="email" required autoComplete="email"
              placeholder="your@email.com"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg py-2.5 font-bold text-sm transition-opacity hover:opacity-85 mt-2"
            style={{ background: "#FFCF0D", color: "#020425" }}
          >
            재설정 링크 보내기
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
            ← 로그인으로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  );
}
