"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const passwordConfirm = formData.get("password_confirm") as string | null;

  const phone = (formData.get("phone") as string | null)?.trim() || null;
  const fullName = (formData.get("full_name") as string | null)?.trim() || null;
  const privacyAgree = formData.get("privacy_agree") === "on";

  if (!privacyAgree) {
    redirect(`/signup?error=${encodeURIComponent("개인정보 수집·이용 동의가 필요합니다.")}`);
  }
  if (!fullName) {
    redirect(`/signup?error=${encodeURIComponent("이름을 입력해주세요.")}`);
  }
  if (!phone) {
    redirect(`/signup?error=${encodeURIComponent("전화번호를 입력해주세요.")}`);
  }
  // 브라우저에서도 막지만, 폼 검증은 우회될 수 있으므로 서버에서 다시 본다.
  if (passwordConfirm !== null && password !== passwordConfirm) {
    redirect(
      `/signup?error=${encodeURIComponent("비밀번호가 서로 다릅니다. 다시 확인해주세요.")}`,
    );
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  // 이미 가입된 이메일이면 Supabase가 (계정 존재 여부를 숨기려고) 오류 대신
  // identities 가 빈 사용자를 돌려준다. 그대로 두면 "가입됐다"고 오해하게 되고,
  // 아래 프로필 저장도 세션이 없어 조용히 실패한다. 명시적으로 안내한다.
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    redirect(
      `/signup?error=${encodeURIComponent("이미 가입된 이메일입니다. 로그인해주세요.")}`,
    );
  }

  if (data.user) {
    const { error: profileError } = await supabase
      .from("gyumo_profiles")
      .update({
        full_name: fullName,
        phone,
        agreed_terms: true,
        agreed_at: new Date().toISOString(),
      })
      .eq("id", data.user.id);

    // 예전엔 결과를 확인하지 않아, 저장이 실패해도 가입이 정상으로 보였다
    // (이름·전화번호가 빈 채로 남는 원인). 실패하면 사용자에게 알린다.
    if (profileError) {
      redirect(
        `/signup?error=${encodeURIComponent("가입은 되었으나 회원정보 저장에 실패했습니다. 로그인 후 마이페이지에서 입력해주세요.")}`,
      );
    }
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const redirectTo = safeNext(formData.get("redirect"), "/");

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

/**
 * 개인정보 수집·이용 동의 기록 (소셜 로그인 가입자용).
 * 이메일 가입은 가입 폼에서 동의를 받지만, 구글 등 소셜 가입은 동의 절차가 없어
 * 로그인 직후 /consent 화면에서 동의를 받아 여기서 저장한다.
 */
export async function agreeTerms(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const next = safeNext(formData.get("next"));

  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent(next)}`);
  }

  if (formData.get("privacy_agree") !== "on") {
    redirect(
      `/consent?next=${encodeURIComponent(next)}&error=${encodeURIComponent("개인정보 수집·이용에 동의해야 서비스를 이용할 수 있습니다.")}`,
    );
  }

  await supabase
    .from("gyumo_profiles")
    .update({ agreed_terms: true, agreed_at: new Date().toISOString() })
    .eq("id", user.id);

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/account/update-password`,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/login?success=비밀번호 재설정 링크를 이메일로 보냈습니다.");
}
