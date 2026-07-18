import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { GoogleButton } from "@/components/auth/GoogleButton";

export default async function SignupPage({
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
        <h1 className="text-white text-xl font-semibold mb-1">무료 계정 만들기</h1>
        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
          이미 계정이 있으신가요?{" "}
          <Link href="/login" style={{ color: "#FFCF0D" }}>로그인</Link>
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

        <div
          className="rounded-lg px-3.5 py-2.5 mb-4 text-[11.5px] leading-relaxed"
          style={{ background: "rgba(255,207,13,0.10)", border: "1px solid rgba(255,207,13,0.25)", color: "rgba(255,255,255,0.75)" }}
        >
          🎁 가입하면 <b style={{ color: "#FFCF0D" }}>무료 3크레딧</b>이 지급됩니다 (조회 3건). 소진 후에는 정회원 신청으로 크레딧을 충전할 수 있습니다.
        </div>

        <GoogleButton next="/simulator" />

        <div className="flex items-center gap-3 my-5">
          <span className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
          <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
            또는 이메일로 가입
          </span>
          <span className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
        </div>

        <form action={signUp} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
              이름 <span style={{ color: "#FFCF0D" }}>*</span>
            </label>
            <input
              type="text" name="full_name" required autoComplete="name"
              placeholder="홍길동"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
              아이디 (이메일 주소) <span style={{ color: "#FFCF0D" }}>*</span>
            </label>
            <input
              type="email" name="email" required autoComplete="email"
              placeholder="your@email.com"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
              비밀번호 <span style={{ color: "#FFCF0D" }}>*</span>
            </label>
            <input
              type="password" name="password" required autoComplete="new-password"
              minLength={8}
              placeholder="8자 이상"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </div>

          {/* 비밀번호를 한 번만 받으면 오타를 걸러낼 수 없다.
              가입은 되는데 로그인이 안 되는 상황이 생기고, 사용자는 원인을 알기 어렵다. */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
              비밀번호 확인 <span style={{ color: "#FFCF0D" }}>*</span>
            </label>
            <input
              type="password" name="password_confirm" required autoComplete="new-password"
              minLength={8}
              placeholder="위와 같은 비밀번호를 한 번 더"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "rgba(255,255,255,0.65)" }}>
              전화번호 <span style={{ color: "#FFCF0D" }}>*</span>
            </label>
            <input
              type="tel" name="phone" required
              placeholder="010-0000-0000"
              autoComplete="tel"
              pattern="[0-9\-]{9,13}"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </div>

          {/* 개인정보 수집·이용 동의 */}
          <div
            className="rounded-lg px-3.5 py-3"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox" name="privacy_agree" required
                className="mt-0.5 w-4 h-4 cursor-pointer"
                style={{ accentColor: "#FFCF0D" }}
              />
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.75)" }}>
                <b style={{ color: "#FFCF0D" }}>[필수]</b> 개인정보 수집·이용에 동의합니다
              </span>
            </label>
            <details className="mt-2">
              <summary
                className="text-[11px] cursor-pointer"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                자세히 보기
              </summary>
              <div
                className="mt-1.5 text-[11px] leading-relaxed space-y-1"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                <p>· 수집 항목: 이름, 이메일, 전화번호</p>
                <p>· 수집 목적: 회원 식별, 서비스 제공, 등급 관리, 고객 안내</p>
                <p>· 보유 기간: 회원 탈퇴 시까지 (관계 법령에 따른 보존 기간 별도)</p>
                <p>· 동의를 거부할 권리가 있으며, 거부 시 회원가입이 제한됩니다.</p>
              </div>
            </details>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg py-2.5 font-bold text-sm transition-opacity hover:opacity-85 mt-2"
            style={{ background: "#FFCF0D", color: "#020425" }}
          >
            무료로 시작하기
          </button>
        </form>
      </div>

      <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.25)" }}>
        <Link href="/privacy" style={{ color: "rgba(255,255,255,0.4)" }}>개인정보처리방침</Link> 을 확인하세요.
      </p>
    </div>
  );
}
