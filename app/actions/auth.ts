"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth/safe-next";

export async function signUp(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

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

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (data.user) {
    await supabase
      .from("gyumo_profiles")
      .update({
        full_name: fullName,
        phone,
        agreed_terms: true,
        agreed_at: new Date().toISOString(),
      })
      .eq("id", data.user.id);
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
