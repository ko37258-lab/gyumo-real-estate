/**
 * Newton-Raphson IRR.
 * cashflows의 month는 0부터의 경과월 (예: month=0 초기투자, month=18 회수).
 * 반환: 연 IRR (%) 단위. 발산 시 0% 반환.
 */
export function calculateIRR(
  cashflows: Array<{ month: number; amount: number }>,
  guess = 0.1,
  maxIterations = 100,
  tolerance = 0.0001,
): number {
  if (cashflows.length < 2) return 0;
  // 양수·음수 흐름이 모두 있어야 의미가 있음
  const hasNegative = cashflows.some((c) => c.amount < 0);
  const hasPositive = cashflows.some((c) => c.amount > 0);
  if (!hasNegative || !hasPositive) return 0;

  let rate = guess;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let dnpv = 0;

    for (const cf of cashflows) {
      const t = cf.month / 12; // 연 단위
      const factor = Math.pow(1 + rate, t);
      npv += cf.amount / factor;
      dnpv += (-t * cf.amount) / (factor * (1 + rate));
    }

    if (Math.abs(npv) < tolerance) {
      return rate * 100;
    }

    if (dnpv === 0) break;
    rate = rate - npv / dnpv;

    // 발산 방지 — 비현실적 범위는 안정값으로 클램프 후 종료
    if (!Number.isFinite(rate) || rate < -0.99 || rate > 10) {
      return rate < 0 ? -99 : 1000; // 손실 시 -99%, 극단 수익 시 1000% 표시
    }
  }

  return rate * 100;
}
