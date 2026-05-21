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
