import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { registerName } from "@/app/actions/profile";
import { safeNext } from "@/lib/auth/safe-next";
import { PROFILE_BONUS_CREDITS } from "@/lib/credits";

export const metadata = { title: "자기이름 등록 | 규모검토" };

/**
 * 자기이름 등록 — 구글 계정으로 들어온 회원의 이름·전화번호·아이디(이메일) 등록 화면.
 *
 * 구글 로그인은 가입 폼을 거치지 않아 전화번호가 없고 이름도 구글 프로필 값이 자동으로
 * 들어온다. 본인이 직접 등록하기 전(name_registered_at NULL)에는 proxy.ts 가 도구 경로를
 * 막고 여기로 보낸다. 이름이 등록되지 않으면 사용이 불가능하다.
 * 같은 전화번호+이름으로 등록한 계정은 한 계정처럼 묶여 크레딧을 함께 쓴다(gyumo_linked_user_ids).
 */
export default async function RegisterNamePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNext(params.next);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=${encodeURIComponent(next)}`);

  const { data: profile } = await supabase
    .from("gyumo_profiles")
    .select("full_name, phone, agreed_terms, name_registered_at")
    .eq("id", user.id)
    .single();

  // 동의가 먼저 — 동의 화면에서 이름·전화도 같이 받는다
  if (profile && profile.agreed_terms === false) redirect(`/consent?next=${encodeURIComponent(next)}`);
  // 이미 등록했으면 통과
  if (profile?.name_registered_at) redirect(next);

  const field =
    "w-full rounded-lg px-3.5 py-2.5 text-sm text-white outline-none";
  const fieldStyle = { background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" };

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
        <h1 className="text-white text-xl font-semibold mb-1">자기이름 등록</h1>
        <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.5)" }}>
          구글 계정으로 로그인하셨습니다. 서비스 이용을 위해 본인 정보를 등록해 주세요.
        </p>

        <div
          className="rounded-lg px-4 py-3 text-sm mb-5 font-semibold"
          style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
        >
          이름이 등록되지 않으면 사용이 불가능합니다.
        </div>

        {params.error && (
          <div
            className="rounded-lg px-4 py-3 text-sm mb-4"
            style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
          >
            {decodeURIComponent(params.error)}
          </div>
        )}

        <form action={registerName} className="space-y-3">
          <input type="hidden" name="next" value={next} />

          <label className="block">
            <span className="block text-xs mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>이름</span>
            <input
              name="full_name" required placeholder="실명"
              defaultValue={profile?.full_name ?? ""}
              className={field} style={fieldStyle}
            />
          </label>

          <label className="block">
            <span className="block text-xs mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>전화번호</span>
            <input
              name="phone" required placeholder="010-0000-0000"
              pattern="[0-9\-]{9,13}" inputMode="tel"
              defaultValue={profile?.phone ?? ""}
              className={field} style={fieldStyle}
            />
          </label>

          <label className="block">
            <span className="block text-xs mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>아이디(이메일주소)</span>
            <input
              value={user.email ?? ""} readOnly
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", color: "rgba(255,255,255,0.5)" }}
            />
            <span className="block text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              구글 계정 이메일이 아이디로 사용됩니다.
            </span>
          </label>

          <div
            className="rounded-lg px-3.5 py-3 text-[12px] leading-relaxed"
            style={{ background: "rgba(255,207,13,0.08)", border: "1px solid rgba(255,207,13,0.3)", color: "rgba(255,255,255,0.75)" }}
          >
            · 등록하시면 무료 크레딧 {PROFILE_BONUS_CREDITS}개를 추가로 드립니다 (1회).<br />
            · 같은 이름·전화번호로 등록한 계정은 한 계정처럼 관리되어 크레딧을 함께 사용합니다.
          </div>

          <button
            type="submit"
            className="w-full rounded-lg py-2.5 font-bold text-sm transition-opacity hover:opacity-85"
            style={{ background: "#FFCF0D", color: "#020425" }}
          >
            등록하고 시작하기
          </button>
        </form>

        <form action={signOut} className="mt-3">
          <button type="submit" className="w-full text-center text-xs py-2" style={{ color: "rgba(255,255,255,0.4)" }}>
            등록하지 않고 로그아웃
          </button>
        </form>
      </div>
    </div>
  );
}
