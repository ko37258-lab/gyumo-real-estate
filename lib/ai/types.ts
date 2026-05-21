export interface ReportInputs {
  address?: string;
  reviewDate: string;
  /** 3D 매스 캡쳐 (base64 PNG dataURL) — PDF에 임베드. AI 프롬프트에는 보내지 않음. */
  visualization3D?: string;
  scale: {
    landAreaSqm: number;
    landAreaPyeong: number;
    zoneCode: string;
    zoneName: string;
    coverRatio: number;
    floorRatio: number;
    roadWidth: number;
    buildingArea: number;
    legalFloorArea: number;
    actualFloorArea: number;
    sunlightLoss: number;
    parkingPlacement: "none" | "basement" | "above" | "mixed";
    parkingSpaces: number;
    /** Day 10: 1층 분해 (필로티/벽체식) */
    groundSpaces: number;
    basementSpaces: number;
    groundParkingArea: number;
    floor1Indoor: number;
    isReducingFloor1: boolean;
    parkingUnitArea: number;
    pilotiMode: boolean;
  };
  cost: {
    abovePyeong: number;
    basementPyeong: number;
    aboveUnit: number;
    basementPremium: number;
    aboveCost: number;
    basementCost: number;
    parkingCost: number;
    softCost: number;
    farmEnabled: boolean;
    farmCost: number;
    forestEnabled: boolean;
    forestCost: number;
    devEnabled: boolean;
    devCharge: number;
    total: number;
    totalArea: number;
  };

  /** Day 12-B: 사업성 분석 데이터 — 사용자가 사업성 탭을 조작한 적 있을 때만 포함. */
  profit?: {
    // 입력
    landPricePerPyeong: number;
    landAcquisitionCost: number;
    revenueModel: "sales" | "rent" | "mixed";
    salesPricePerPyeong: number;
    salesRate: number;
    monthlyRentPerPyeong?: number;
    deposit?: number;
    annualOccupancy?: number;
    ltvRatio: number;
    /** 억원 단위 */
    loanAmountEok: number;
    annualInterestRate: number;
    loanPeriodYears: number;
    repaymentMethod: "bullet" | "amortized" | "graceThenAmortized";
    projectDurationMonths: number;
    salesStartMonth: number;

    // 결과 (원 단위)
    landCost: number;
    buildingCost: number;
    feesTotal: number;
    loanInterest: number;
    totalProjectCost: number;
    equity: number;
    loanAmount: number;
    monthlyLoanPayment: number;
    totalRevenue: number;
    profitBeforeTax: number;
    tax: number;
    netProfit: number;
    roe: number;
    roic: number;
    irr: number;
    breakEvenSalesRate: number;
    costPerPyeong: number;
    marginPerPyeong: number;
    marginPercent: number;
    isLoss: boolean;
    isHighRisk: boolean;
  };
}

export interface AIAnalysis {
  summary: string;
  risks: string[];
  recommendations: string[];
  costAdequacy: string;
  nextSteps: string[];
  oneLiner: string;
  provider: "gemini" | "claude";
  generatedAt: string;
}
