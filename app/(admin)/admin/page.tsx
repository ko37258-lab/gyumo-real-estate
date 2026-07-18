import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateKST } from "@/lib/utils";

export const metadata = { title: "관리자 대시보드 | 규모검토" };

const ROLE_LABEL: Record<string, string> = {
  "일반회원": "일반회원",
  "정회원": "정회원",
  "미스터홈즈": "미스터홈즈",
  "스텝": "스텝",
};
const ROLE_COLOR: Record<string, string> = {
  "일반회원": "#6b7280",
  "정회원": "#FFCF0D",
  "미스터홈즈": "#34d399",
  "스텝": "#a78bfa",
};

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("gyumo_profiles")
    .select("id, email, full_name, role, daily_count, daily_reset, is_admin, agreed_terms, created_at")
    .order("created_at", { ascending: false });

  const total = profiles?.length ?? 0;
  const roleCounts = profiles?.reduce((acc, p) => {
    acc[p.role] = (acc[p.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  const today = new Date().toISOString().slice(0, 10);
  const activeToday = profiles?.filter(p => p.daily_count > 0 && p.daily_reset === today).length ?? 0;
  const paidCount = (roleCounts["정회원"] || 0) + (roleCounts["미스터홈즈"] || 0);

  // 최근 7일 신규 가입 — 메일을 놓쳐도 화면에서 바로 보이게 한다.
  // (Date.now() 는 react-hooks/purity 에 걸려 위 today 와 같은 방식으로 만든다)
  const weekAgoDate = new Date();
  weekAgoDate.setDate(weekAgoDate.getDate() - 7);
  const weekAgo = weekAgoDate.toISOString();
  const recentSignups = (profiles ?? []).filter((p) => p.created_at >= weekAgo);

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">대시보드</h1>

      {recentSignups.length > 0 && (
        <div
          className="rounded-xl border p-4 mb-6 flex flex-wrap items-center gap-x-3 gap-y-2"
          style={{ background: "rgba(255,207,13,0.10)", borderColor: "rgba(255,207,13,0.45)" }}
        >
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: "#FFCF0D", color: "#020425" }}
          >
            새 가입 {recentSignups.length}명
          </span>
          <span className="text-sm">
            최근 7일 —{" "}
            {recentSignups.slice(0, 4).map((p) => p.full_name || p.email).join(", ")}
            {recentSignups.length > 4 && ` 외 ${recentSignups.length - 4}명`}
          </span>
          <Link
            href="/admin/users"
            className="text-xs font-semibold ml-auto hover:underline"
            style={{ color: "var(--info)" }}
          >
            회원 관리 →
          </Link>
        </div>
      )}

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "전체 회원", value: total, sub: "명" },
          { label: "오늘 활성", value: activeToday, sub: "명 조회함" },
          { label: "정회원 이상", value: paidCount, sub: "유료 회원" },
          { label: "미스터홈즈", value: roleCounts["미스터홈즈"] || 0, sub: "VIP 회원" },
        ].map(c => (
          <div key={c.label} className="rounded-xl p-5 border"
            style={{ background: "var(--card)", borderColor: "var(--border)" }}>
            <div className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>{c.label}</div>
            <div className="text-2xl font-bold">{c.value}</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* 등급 분포 */}
      <div className="rounded-xl border p-5 mb-8"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <h2 className="text-sm font-semibold mb-4">회원 등급 분포</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(ROLE_LABEL).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 rounded-full" style={{ background: ROLE_COLOR[key] }} />
              <span>{label}</span>
              <span className="font-bold">{roleCounts[key] || 0}명</span>
            </div>
          ))}
          <div className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full" style={{ background: "#FFCF0D" }} />
            <span>최고관리자</span>
            <span className="font-bold">{profiles?.filter(p => p.is_admin).length || 0}명</span>
          </div>
        </div>
      </div>

      {/* 최근 가입 회원 */}
      <div className="rounded-xl border overflow-hidden"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}>
        <div className="px-5 py-4 border-b flex items-center justify-between"
          style={{ borderColor: "var(--border)" }}>
          <h2 className="text-sm font-semibold">최근 가입 회원</h2>
          <Link href="/admin/users" className="text-xs" style={{ color: "var(--info, #60a5fa)" }}>전체 보기 →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--secondary)" }}>
                {["이름", "이메일", "등급", "오늘 사용", "가입일"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium"
                    style={{ color: "var(--muted-foreground)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(profiles ?? []).slice(0, 10).map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--border)" }}
                  className="hover:bg-[var(--secondary)]/50 transition-colors">
                  <td className="px-4 py-3">{p.full_name || "—"}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--muted-foreground)" }}>{p.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${ROLE_COLOR[p.role] ?? "#6b7280"}22`, color: ROLE_COLOR[p.role] ?? "#6b7280" }}>
                      {p.is_admin ? "최고관리자" : (ROLE_LABEL[p.role] ?? p.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {p.daily_reset === today ? `${p.daily_count}건` : "0건"}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {formatDateKST(p.created_at)}
                  </td>
                </tr>
              ))}
              {!profiles?.length && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm"
                  style={{ color: "var(--muted-foreground)" }}>가입 회원이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
