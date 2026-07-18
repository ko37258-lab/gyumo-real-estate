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

/**
 * 등급 표시용 단일 출처.
 *
 * 예전엔 관리자·마이페이지·회원표가 각자 목록을 들고 있어 서로 어긋났고,
 * DB CHECK 제약과도 달라 VIP·미스터홈즈센터·멘토스쿨 저장이 거부됐다.
 * 등급을 늘리거나 이름을 바꿀 때는 ALL_ROLES 와 DB 제약을 함께 고쳐야 한다.
 */
export const ROLE_META: Record<
  MemberRole,
  { color: string; desc: string }
> = {
  "일반회원":      { color: "#6b7280", desc: "가입 시 무료 3크레딧 (조회 3건)" },
  "정회원":        { color: "#FFCF0D", desc: "크레딧 충전 회원 · PDF 리포트 · 사업성 분석" },
  "VIP":           { color: "#c4b5fd", desc: "정회원 혜택 + 리포트 브랜드 편집" },
  "미스터홈즈센터": { color: "#34d399", desc: "미스터홈즈 FC 가맹점 전용" },
  "멘토스쿨":      { color: "#fb923c", desc: "부동산멘토스쿨 수강생 전용" },
  "스텝":          { color: "#a78bfa", desc: "내부 스텝 전용 · 관리자 기능 포함" },
};

/** 유료(정회원 이상) 등급 — 대시보드 집계용 */
export const PAID_ROLES: MemberRole[] = [
  "정회원",
  "VIP",
  "미스터홈즈센터",
  "멘토스쿨",
];

export function roleColor(role: string | null | undefined): string {
  return ROLE_META[(role ?? "일반회원") as MemberRole]?.color ?? "#6b7280";
}

export function roleDesc(role: string | null | undefined): string {
  return ROLE_META[(role ?? "일반회원") as MemberRole]?.desc ?? "";
}

export const ROLE_BADGE_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  "정회원":      { label: "정회원",      bg: "rgba(255,207,13,0.18)",  color: "#FFCF0D" },
  "VIP":         { label: "VIP",         bg: "rgba(167,139,250,0.2)",  color: "#c4b5fd" },
  "미스터홈즈":  { label: "미스터홈즈",  bg: "rgba(52,211,153,0.18)",  color: "#34d399" },
  "미스터홈즈센터": { label: "MR센터",   bg: "rgba(52,211,153,0.18)",  color: "#34d399" },
  "멘토스쿨":   { label: "멘토스쿨",    bg: "rgba(251,146,60,0.18)",  color: "#fb923c" },
  "스텝":        { label: "스텝",        bg: "rgba(167,139,250,0.18)", color: "#a78bfa" },
};
