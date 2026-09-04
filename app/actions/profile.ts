"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { PROFILE_BONUS_CREDITS } from "@/lib/credits";
import { safeNext } from "@/lib/auth/safe-next";

/**
 * 이름·전화번호 저장 + 구글 가입자 프로필 완성 보너스(3크레딧).
 *
 * 이메일 가입은 가입 폼에서 이름·전화를 필수로 받으므로 보너스 대상이 아니다.
 * 구글 가입은 프로필 정보가 비어 들어오기 때문에, 채우면 1회에 한해
 * 3크레딧을 지급한다 (source='profile_bonus', 만료 없음 — 가입 크레딧과 동일).
 *
 * 이중 지급 방어 2중:
 *  ① 지급 전 profile_bonus 배치 존재 확인
 *  ② DB 유니크 인덱스 gyumo_credit_batches_once_per_source — 동시 요청이
 *     와도 두 번째 INSERT 가 실패한다 (23505 는 "이미 지급됨"으로 처리)
 */
export async function saveProfileInfo(input: {
  fullName: string;
  phone: string;
}): Promise<{ ok: boolean; bonusGranted: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, bonusGranted: false, error: "로그인이 필요합니다." };

  const fullName = input.fullName.trim();
  const phone = input.phone.trim();

  if (!fullName) return { ok: false, bonusGranted: false, error: "이름을 입력해주세요." };
  if (!/^[0-9\-]{9,13}$/.test(phone)) {
    return { ok: false, bonusGranted: false, error: "전화번호 형식을 확인해주세요 (숫자·하이픈)." };
  }

  // 본인 프로필 갱신 (own_update RLS 통과)
  const { error: upErr } = await supabase
    .from("gyumo_profiles")
    .update({ full_name: fullName, phone })
    .eq("id", user.id);
  if (upErr) return { ok: false, bonusGranted: false, error: "저장에 실패했습니다." };

  // "자기이름 등록" 완료 시각 — 구글 가입자 이용 게이트(proxy.ts)의 기준.
  // 최초 1회만 기록한다. 컬럼이 아직 없는(마이그레이션 전) 환경에서는 조용히 건너뛴다.
  const { error: regErr } = await supabase
    .from("gyumo_profiles")
    .update({ name_registered_at: new Date().toISOString() })
    .eq("id", user.id)
    .is("name_registered_at", null);
  if (regErr) console.warn("[profile] name_registered_at 기록 실패(마이그레이션 전?)", regErr.message);

  // 보너스는 구글 가입자만 — 지급 RPC 가 service_role 전용이라 서버 키로 호출
  const provider = (user.app_metadata as { provider?: string } | null)?.provider;
  if (provider !== "google") {
    revalidatePath("/account");
    return { ok: true, bonusGranted: false };
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: existing } = await svc
    .from("gyumo_credit_batches")
    .select("id")
    .eq("user_id", user.id)
    .eq("source", "profile_bonus")
    .limit(1);
  if (existing && existing.length > 0) {
    revalidatePath("/account");
    return { ok: true, bonusGranted: false };
  }

  const { error: grantErr } = await svc.rpc("gyumo_grant_credits", {
    p_user: user.id,
    p_amount: PROFILE_BONUS_CREDITS,
    p_source: "profile_bonus",
    p_expires: null,
  });

  revalidatePath("/account");
  if (grantErr) {
    // 유니크 인덱스 충돌(동시 요청) = 이미 지급된 것 — 저장 자체는 성공
    if (grantErr.code === "23505" || grantErr.message?.includes("duplicate")) {
      return { ok: true, bonusGranted: false };
    }
    console.error("[profile] 보너스 지급 실패", grantErr);
    return { ok: true, bonusGranted: false };
  }
  return { ok: true, bonusGranted: true };
}

/**
 * "자기이름 등록" 화면(/register-name) <form action>.
 * 구글 가입자는 이름·전화번호를 등록하지 않으면 서비스 이용이 불가능하다.
 * 저장 규칙·보너스는 saveProfileInfo 와 동일하고, 성공하면 원래 가려던 곳으로 보낸다.
 */
export async function registerName(formData: FormData) {
  const next = safeNext(formData.get("next"));
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  const back = (msg: string) =>
    redirect(`/register-name?next=${encodeURIComponent(next)}&error=${encodeURIComponent(msg)}`);

  if (!fullName) back("이름을 입력해주세요. 이름이 등록되지 않으면 사용이 불가능합니다.");
  if (!phone) back("전화번호를 입력해주세요.");

  const res = await saveProfileInfo({ fullName, phone });
  if (!res.ok) back(res.error ?? "저장에 실패했습니다.");

  revalidatePath("/", "layout");
  redirect(next);
}

/** 마이페이지 <form action> 용 래퍼 — 결과를 쿼리스트링으로 돌려보낸다 */
export async function saveProfileInfoForm(formData: FormData) {
  const res = await saveProfileInfo({
    fullName: String(formData.get("full_name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
  });
  if (!res.ok) {
    redirect(`/account?profile_error=${encodeURIComponent(res.error ?? "저장 실패")}`);
  }
  redirect(res.bonusGranted ? "/account?profile=saved&bonus=3" : "/account?profile=saved");
}
