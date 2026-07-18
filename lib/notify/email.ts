/**
 * 관리자 알림 메일 발송 (Resend HTTP API 직접 호출).
 *
 * 패키지를 따로 넣지 않고 fetch 로 부른다 — 의존성 하나 줄이고 번들도 가볍다.
 *
 * ⚠ 설계 원칙: 메일 발송 실패가 절대 가입을 막으면 안 된다.
 *   키가 없거나 Resend 가 죽어 있어도 가입은 정상 진행되어야 하므로
 *   모든 실패를 여기서 삼키고 false 만 돌려준다.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** 받는 사람 — 미설정 시 운영자 기본 주소 */
export function adminNotifyEmail(): string {
  return process.env.ADMIN_NOTIFY_EMAIL || "scko@mrhomes.co.kr";
}

/** 보내는 사람 — Resend 에서 도메인 인증 전에는 onboarding 주소만 쓸 수 있다 */
function fromAddress(): string {
  return process.env.NOTIFY_FROM_EMAIL || "규모검토 <onboarding@resend.dev>";
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendAdminEmail(
  subject: string,
  html: string,
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // 키 미설정은 오류가 아니라 "아직 안 켠 상태"다. 조용히 건너뛴다.
    console.warn("[notify] RESEND_API_KEY 미설정 — 알림 메일 건너뜀:", subject);
    return false;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [adminNotifyEmail()],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      console.error("[notify] 메일 발송 실패", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[notify] 메일 발송 예외", e);
    return false;
  }
}
