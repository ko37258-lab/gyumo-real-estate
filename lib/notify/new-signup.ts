import { createClient as createAdminClient } from "@supabase/supabase-js";
import { sendAdminEmail } from "./email";

/**
 * 신규 가입 알림.
 *
 * 이메일 가입(서버 액션)과 구글 가입(콜백) 두 경로에서 모두 부른다.
 * gyumo_profiles.signup_notified_at 로 중복 발송을 막으므로 몇 번을 불러도 안전하다.
 *
 * ⚠ 이 함수는 절대 예외를 밖으로 던지지 않는다 — 알림 때문에 가입이 실패하면 안 된다.
 */
export async function notifyNewSignup(userId: string): Promise<void> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return;

    const admin = createAdminClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 아직 안 보낸 건에 한해 "먼저 도장을 찍고" 보낸다.
    // 순서를 뒤집으면 동시 요청에서 같은 메일이 두 번 나갈 수 있다.
    const { data: claimed } = await admin
      .from("gyumo_profiles")
      .update({ signup_notified_at: new Date().toISOString() })
      .eq("id", userId)
      .is("signup_notified_at", null)
      .select("email, full_name, phone, role, created_at")
      .maybeSingle();

    if (!claimed) return; // 이미 보냈거나 대상 없음

    const when = new Date(claimed.created_at ?? Date.now()).toLocaleString(
      "ko-KR",
      { timeZone: "Asia/Seoul" },
    );

    const rows: [string, string][] = [
      ["이메일", claimed.email ?? "-"],
      ["이름", claimed.full_name || "(미입력)"],
      ["전화번호", claimed.phone || "(미입력)"],
      ["등급", claimed.role ?? "일반회원"],
      ["가입 시각", when],
    ];

    const site = process.env.NEXT_PUBLIC_SITE_URL || "https://gyumo.vercel.app";
    const html = `
      <div style="font-family:-apple-system,'Malgun Gothic',sans-serif;max-width:520px">
        <div style="background:#020425;color:#fff;padding:18px 22px;border-radius:10px 10px 0 0">
          <div style="color:#FFCF0D;font-size:11px;letter-spacing:.12em;font-weight:700">SCALE REVIEW</div>
          <div style="font-size:17px;font-weight:700;margin-top:6px">새 회원이 가입했습니다</div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          ${rows
            .map(
              ([k, v]) => `<tr>
                <td style="padding:10px 14px;background:#f7f7f9;color:#666;width:110px;border-bottom:1px solid #eee">${k}</td>
                <td style="padding:10px 14px;border-bottom:1px solid #eee">${escapeHtml(String(v))}</td>
              </tr>`,
            )
            .join("")}
        </table>
        <div style="padding:18px 14px">
          <a href="${site}/admin/users"
             style="display:inline-block;background:#FFCF0D;color:#020425;font-weight:700;
                    font-size:14px;padding:11px 22px;border-radius:8px;text-decoration:none">
            회원 관리 열기
          </a>
        </div>
      </div>`;

    await sendAdminEmail(
      `[규모검토] 새 회원 가입 — ${claimed.full_name || claimed.email}`,
      html,
    );
  } catch (e) {
    console.error("[notify] 가입 알림 실패", e);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
