import { sendAdminEmail } from "./email";

/**
 * 크레딧 신청(입금 신고) 접수 즉시 관리자에게 메일.
 *
 * 신청은 이미 DB에 저장된 뒤 호출되므로, 메일 실패가 신청을 막으면 안 된다 —
 * sendAdminEmail 이 모든 실패를 삼키고, 여기서도 예외를 내보내지 않는다.
 */
export async function notifyCreditRequest(info: {
  email: string | null;
  planLabel: string;
  amountWon: number;
  credits: number;
  depositorName: string;
  phoneLast4: string;
  company?: string | null;
  region?: string | null;
}): Promise<void> {
  try {
    const site = process.env.NEXT_PUBLIC_SITE_URL || "https://gyumo.vercel.app";
    const rows: [string, string][] = [
      ["입금자", `${info.depositorName} (뒤 4자리 ${info.phoneLast4})`],
      ["신청", `${info.planLabel} — ${info.amountWon.toLocaleString("ko-KR")}원 → ${info.credits}크레딧`],
      ["계정", info.email ?? "-"],
      ["소속/지역", [info.company, info.region].filter(Boolean).join(" / ") || "-"],
      ["접수 시각", new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })],
    ];

    const html = `
      <div style="font-family:-apple-system,'Malgun Gothic',sans-serif;max-width:520px">
        <div style="background:#020425;color:#fff;padding:18px 22px;border-radius:10px 10px 0 0">
          <div style="color:#FFCF0D;font-size:11px;letter-spacing:.12em;font-weight:700">SCALE REVIEW</div>
          <div style="font-size:17px;font-weight:700;margin-top:6px">크레딧 신청이 들어왔습니다 — 입금 확인 필요</div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          ${rows
            .map(
              ([k, v]) => `<tr>
                <td style="padding:10px 14px;background:#f7f7f9;color:#666;width:96px;border-bottom:1px solid #eee">${k}</td>
                <td style="padding:10px 14px;border-bottom:1px solid #eee">${escapeHtml(v)}</td>
              </tr>`,
            )
            .join("")}
        </table>
        <div style="padding:18px 14px">
          <a href="${site}/admin/credits"
             style="display:inline-block;background:#FFCF0D;color:#020425;font-weight:700;
                    font-size:14px;padding:11px 22px;border-radius:8px;text-decoration:none">
            입금 확인하고 승인하기
          </a>
        </div>
      </div>`;

    await sendAdminEmail(
      `[규모검토] 크레딧 신청 — ${info.depositorName} · ${info.amountWon.toLocaleString("ko-KR")}원`,
      html,
    );
  } catch (e) {
    console.error("[notify] 크레딧 신청 알림 실패", e);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
