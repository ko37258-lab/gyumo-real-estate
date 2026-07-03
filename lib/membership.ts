export const ROLE_DAILY_LIMIT: Record<string, number> = {
  "일반회원": 3,
  "정회원": 30,
  "VIP": 30,
  "미스터홈즈센터": 30,
  "멘토스쿨": 30,
  "스텝": 9999,
};

export function getDailyLimit(role: string | null | undefined, isAdmin: boolean): number {
  if (isAdmin) return 9999;
  return ROLE_DAILY_LIMIT[role ?? "일반회원"] ?? 3;
}

/** 브랜드 설정 페이지(/settings) 접근 가능 여부 */
export function canEditBrandSettings(role: string | null | undefined, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  return ["정회원", "VIP", "미스터홈즈센터", "멘토스쿨", "스텝"].includes(role ?? "");
}

/** PDF 리포트 브랜드 커스터마이즈 가능 여부 (더 상위 등급) */
export function canEditReportBrand(role: string | null | undefined, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  return ["VIP", "미스터홈즈센터", "멘토스쿨", "스텝"].includes(role ?? "");
}

export const ALL_ROLES = ["일반회원", "정회원", "VIP", "미스터홈즈센터", "멘토스쿨", "스텝"] as const;
export type MemberRole = (typeof ALL_ROLES)[number];

export const ROLE_BADGE_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  "정회원":      { label: "정회원",      bg: "rgba(255,207,13,0.18)",  color: "#FFCF0D" },
  "VIP":         { label: "VIP",         bg: "rgba(167,139,250,0.2)",  color: "#c4b5fd" },
  "미스터홈즈":  { label: "미스터홈즈",  bg: "rgba(52,211,153,0.18)",  color: "#34d399" },
  "미스터홈즈센터": { label: "MR센터",   bg: "rgba(52,211,153,0.18)",  color: "#34d399" },
  "멘토스쿨":   { label: "멘토스쿨",    bg: "rgba(251,146,60,0.18)",  color: "#fb923c" },
  "스텝":        { label: "스텝",        bg: "rgba(167,139,250,0.18)", color: "#a78bfa" },
};
