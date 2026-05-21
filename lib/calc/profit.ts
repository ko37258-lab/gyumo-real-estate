import { calculateIRR } from "./irr";
import {
  calculateMonthlyPayment,
  calculateTotalInterest,
  type RepaymentMethod,
} from "./loan";

export type RevenueModel = "sales" | "rent" | "mixed";

export interface ProfitInputs {
  // 자동 연동 (props로 주입)
  landAreaPyeong: number;
  totalBuildingCost: number; // 원 단위 (지상+지하+주차+부대)
  totalFees: number; // 원 단위 (부담금)
  salesAvailableAreaPyeong: number; // 분양 가능 연면적 (평)

  // 사용자 입력
  landPricePerPyeong: number; // 만원/평
  landAcquisitionCost: number; // %
  revenueModel: RevenueModel;
  salesPricePerPyeong: number; // 만원/평
  salesRate: number; // %
  monthlyRentPerPyeong: number; // 만원/평/월
  deposit: number; // 보증금 (월세 X개월분)
  annualOccupancy: number; // %
  ltvRatio: number; // %
  loanAmountEok: number; // 억원 (사용자가 직접 입력)
  annualInterestRate: number; // %
  loanPeriodYears: number;
  repaymentMethod: RepaymentMethod;
  projectDurationMonths: number;
  salesStartMonth: number; // 준공 기준 ±개월
}

export interface ProfitResult {
  landCost: number;
  buildingCost: number;
  feesTotal: number;
  loanInterest: number;
  totalProjectCost: number;
  equity: number;
  loanAmount: number; // 원 단위
  monthlyLoanPayment: number;
  totalRevenue: number;
  annualRevenue: number;
  profitBeforeTax: number;
  tax: number;
  netProfit: number;
  roe: number;
  roic: number;
  irr: number; // %
  breakEvenSalesRate: number; // %
  costPerPyeong: number; // 만원/평
  marginPerPyeong: number; // 만원/평
  marginPercent: number; // %
  isLoss: boolean;
  isHighRisk: boolean;
}

const CORPORATE_TAX_RATE = 0.22;

export function calculateProfit(i: ProfitInputs): ProfitResult {
  // 1. 토지비 (원 단위)
  const landCostRaw = i.landAreaPyeong * i.landPricePerPyeong * 10000;
  const landCostWithFee = landCostRaw * (1 + i.landAcquisitionCost / 100);

  // 2. 부분 사업비 (이자 제외)
  const subTotal = landCostWithFee + i.totalBuildingCost + i.totalFees;

  // 3. 대출 금액 (원 단위)
  const loanAmount = i.loanAmountEok * 1_0000_0000; // 1억 = 100,000,000원

  // 4. 대출 이자 (사업 기간 동안)
  const loanInterest = calculateTotalInterest(
    loanAmount,
    i.annualInterestRate / 100,
    i.projectDurationMonths / 12,
    i.repaymentMethod,
  );

  const monthlyLoanPayment = calculateMonthlyPayment(
    loanAmount,
    i.annualInterestRate / 100,
    i.loanPeriodYears,
    i.repaymentMethod,
  );

  // 5. 총 사업비 (이자 포함)
  const totalProjectCost = subTotal + loanInterest;

  // 6. 자기자본
  const equity = Math.max(0, totalProjectCost - loanAmount);

  // 7. 수익 계산
  let totalRevenue = 0;
  let annualRevenue = 0;
  if (i.revenueModel === "sales") {
    totalRevenue =
      i.salesAvailableAreaPyeong *
      i.salesPricePerPyeong *
      10000 *
      (i.salesRate / 100);
  } else if (i.revenueModel === "rent") {
    annualRevenue =
      i.salesAvailableAreaPyeong *
      i.monthlyRentPerPyeong *
      10000 *
      12 *
      (i.annualOccupancy / 100);
    const depositTotal =
      i.salesAvailableAreaPyeong *
      i.monthlyRentPerPyeong *
      10000 *
      i.deposit;
    // 단순 합산: 분석 기간 동안 임대수익 + 보증금 회수
    totalRevenue = annualRevenue * i.loanPeriodYears + depositTotal;
  } else {
    // mixed — 분양 50% + 임대 50% 단순화
    const half = i.salesAvailableAreaPyeong / 2;
    const salesPart =
      half * i.salesPricePerPyeong * 10000 * (i.salesRate / 100);
    annualRevenue =
      half * i.monthlyRentPerPyeong * 10000 * 12 * (i.annualOccupancy / 100);
    const depositPart = half * i.monthlyRentPerPyeong * 10000 * i.deposit;
    totalRevenue =
      salesPart + annualRevenue * i.loanPeriodYears + depositPart;
  }

  // 8. 세전 이익
  const profitBeforeTax = totalRevenue - totalProjectCost;
  const tax = Math.max(0, profitBeforeTax * CORPORATE_TAX_RATE);
  const netProfit = profitBeforeTax - tax;

  // 9. 수익률
  const roe = equity > 0 ? (netProfit / equity) * 100 : 0;
  const roic = totalProjectCost > 0 ? (netProfit / totalProjectCost) * 100 : 0;

  // 10. IRR — 단순 현금흐름 모델
  const exitMonth = Math.max(
    1,
    i.projectDurationMonths + i.salesStartMonth,
  );
  const irr = calculateIRR([
    { month: 0, amount: -equity },
    { month: exitMonth, amount: netProfit + equity }, // 자기자본 + 순이익 회수
  ]);

  // 11. 손익분기 분양률
  const fullRevenue =
    i.salesAvailableAreaPyeong * i.salesPricePerPyeong * 10000;
  const breakEvenSalesRate =
    fullRevenue > 0 ? (totalProjectCost / fullRevenue) * 100 : 0;

  // 12. 평당 사업비 vs 분양가 마진
  const costPerPyeong =
    i.salesAvailableAreaPyeong > 0
      ? totalProjectCost / i.salesAvailableAreaPyeong / 10000
      : 0;
  const marginPerPyeong = i.salesPricePerPyeong - costPerPyeong;
  const marginPercent =
    i.salesPricePerPyeong > 0
      ? (marginPerPyeong / i.salesPricePerPyeong) * 100
      : 0;

  return {
    landCost: landCostWithFee,
    buildingCost: i.totalBuildingCost,
    feesTotal: i.totalFees,
    loanInterest,
    totalProjectCost,
    equity,
    loanAmount,
    monthlyLoanPayment,
    totalRevenue,
    annualRevenue,
    profitBeforeTax,
    tax,
    netProfit,
    roe,
    roic,
    irr,
    breakEvenSalesRate,
    costPerPyeong,
    marginPerPyeong,
    marginPercent,
    isLoss: netProfit < 0,
    isHighRisk: i.salesRate < breakEvenSalesRate * 1.1,
  };
}
