/** 1평 = 3.305785㎡ */
export const SQM_PER_PYEONG = 3.305785;

export function sqmToPyeong(sqm: number): number {
  return sqm / SQM_PER_PYEONG;
}
export function pyeongToSqm(pyeong: number): number {
  return pyeong * SQM_PER_PYEONG;
}

/** "661.16㎡ (200평)" — ㎡ 단위 입력값 → 표시. */
export function formatArea(sqm: number, sqmDecimals = 2): string {
  if (!Number.isFinite(sqm) || sqm <= 0) return "0㎡ (0평)";
  const pyeong = sqmToPyeong(sqm);
  const sqmStr = sqm.toLocaleString("ko-KR", {
    maximumFractionDigits: sqmDecimals,
  });
  const pyeongStr = pyeong.toLocaleString("ko-KR", {
    maximumFractionDigits: 0,
  });
  return `${sqmStr}㎡ (${pyeongStr}평)`;
}

/** "991.7㎡ (300평)" — 평 단위 입력값 → 표시. */
export function formatPyeongAsArea(pyeong: number): string {
  if (!Number.isFinite(pyeong) || pyeong <= 0) return "0㎡ (0평)";
  const sqm = pyeongToSqm(pyeong);
  const sqmStr = sqm.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
  const pyeongStr = pyeong.toLocaleString("ko-KR", {
    maximumFractionDigits: 0,
  });
  return `${sqmStr}㎡ (${pyeongStr}평)`;
}

/** 평 → "(991.7㎡)" 짧은 변환 표시용. */
export function pyeongToSqmDisplay(pyeong: number, decimals = 1): string {
  if (!Number.isFinite(pyeong) || pyeong <= 0) return "(0㎡)";
  return `(${pyeongToSqm(pyeong).toLocaleString("ko-KR", { maximumFractionDigits: decimals })}㎡)`;
}

/** ㎡ → "(200평)" 짧은 변환 표시용. */
export function sqmToPyeongDisplay(sqm: number): string {
  if (!Number.isFinite(sqm) || sqm <= 0) return "(0평)";
  return `(${sqmToPyeong(sqm).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}평)`;
}

/* ── ㎡↔평 표시 단위 토글 지원 (store/unit.ts와 함께 사용) ─────────────── */

export type AreaUnit = "sqm" | "py";

/** 단위 토글 반영 면적 표시 — sqm: "661.2㎡ (200평)" / py: "200평 (661.2㎡)" */
export function formatAreaBy(sqm: number, unit: AreaUnit, sqmDecimals = 1): string {
  if (!Number.isFinite(sqm) || sqm <= 0) return unit === "py" ? "0평 (0㎡)" : "0㎡ (0평)";
  const sq = sqm.toLocaleString("ko-KR", { maximumFractionDigits: sqmDecimals });
  const py = sqmToPyeong(sqm).toLocaleString("ko-KR", { maximumFractionDigits: 0 });
  return unit === "py" ? `${py}평 (${sq}㎡)` : `${sq}㎡ (${py}평)`;
}

/** 단위 토글 반영 짧은 면적 — sqm: "330.5㎡" / py: "100평" */
export function formatAreaShortBy(sqm: number, unit: AreaUnit): string {
  if (!Number.isFinite(sqm) || sqm <= 0) return unit === "py" ? "0평" : "0㎡";
  return unit === "py"
    ? `${sqmToPyeong(sqm).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}평`
    : `${sqm.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}㎡`;
}

/** ㎡당 단가(원) → 단위 토글 반영 만원 표기 — sqm: "606만원/㎡" / py: "2,004만원/평" */
export function formatManPerBy(wonPerSqm: number, unit: AreaUnit): string {
  if (!Number.isFinite(wonPerSqm) || wonPerSqm <= 0) return "—";
  const won = unit === "py" ? wonPerSqm * SQM_PER_PYEONG : wonPerSqm;
  return `${Math.round(won / 10000).toLocaleString("ko-KR")}만원/${unit === "py" ? "평" : "㎡"}`;
}

/** 짧은 버전 — "606만/㎡" / "2,004만/평" */
export function formatManPerShortBy(wonPerSqm: number, unit: AreaUnit): string {
  if (!Number.isFinite(wonPerSqm) || wonPerSqm <= 0) return "—";
  const won = unit === "py" ? wonPerSqm * SQM_PER_PYEONG : wonPerSqm;
  return `${Math.round(won / 10000).toLocaleString("ko-KR")}만/${unit === "py" ? "평" : "㎡"}`;
}

/**
 * 원 단위 금액을 콤마 + 읽기 쉬운 괄호 병기로.
 *   6,061,000원 (약 606만원) / 1,222,000,000원 (약 12.2억원)
 */
export function formatWonSmart(won: number): string {
  if (!Number.isFinite(won) || won === 0) return "0원";
  const comma = Math.round(won).toLocaleString("ko-KR");
  if (Math.abs(won) >= 1e8) {
    return `${comma}원 (약 ${(won / 1e8).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}억원)`;
  }
  if (Math.abs(won) >= 1e4) {
    return `${comma}원 (약 ${Math.round(won / 1e4).toLocaleString("ko-KR")}만원)`;
  }
  return `${comma}원`;
}
