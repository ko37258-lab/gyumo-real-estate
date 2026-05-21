export type RepaymentMethod = "bullet" | "amortized" | "graceThenAmortized";

/** 월 상환액 (원금+이자, 원 단위). bullet은 매월 이자만. */
export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  years: number,
  method: RepaymentMethod,
): number {
  if (principal <= 0 || years <= 0) return 0;
  const monthlyRate = annualRate / 12;
  const months = years * 12;

  if (method === "bullet") {
    return principal * monthlyRate;
  }

  if (method === "amortized") {
    if (monthlyRate === 0) return principal / months;
    return (
      (principal *
        monthlyRate *
        Math.pow(1 + monthlyRate, months)) /
      (Math.pow(1 + monthlyRate, months) - 1)
    );
  }

  if (method === "graceThenAmortized") {
    const graceMonths = 12;
    const remainingMonths = Math.max(1, months - graceMonths);
    if (monthlyRate === 0) return principal / remainingMonths;
    return (
      (principal *
        monthlyRate *
        Math.pow(1 + monthlyRate, remainingMonths)) /
      (Math.pow(1 + monthlyRate, remainingMonths) - 1)
    );
  }

  return 0;
}

/** 사업 기간 동안 발생한 총 이자(원 단위). years는 사업 기간(년). */
export function calculateTotalInterest(
  principal: number,
  annualRate: number,
  years: number,
  method: RepaymentMethod,
): number {
  if (principal <= 0 || years <= 0 || annualRate <= 0) return 0;

  if (method === "bullet") {
    return principal * annualRate * years;
  }

  const monthlyPayment = calculateMonthlyPayment(
    principal,
    annualRate,
    years,
    method,
  );
  if (method === "graceThenAmortized") {
    const graceInterest = principal * annualRate; // 1년 거치 이자
    const remainingMonths = Math.max(0, years * 12 - 12);
    return graceInterest + monthlyPayment * remainingMonths - principal;
  }

  const months = years * 12;
  return monthlyPayment * months - principal;
}
