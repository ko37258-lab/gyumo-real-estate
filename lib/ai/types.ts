/** ① 지번 조회(LandLookup) 결과 스냅샷 — 토지특성·실거래 추정가·신축시세·인허가. */
export interface ReportLandInfo {
  address: string;
  pnu: string;
  fetchedAt: string;
  areaSqm: number;
  mergedCount?: number;
  jimok?: string;
  zone?: string;
  publicPricePerSqm?: number; // 원/㎡
  publicPriceYear?: number;
  roadSide?: string; // 도로접면 (예: 세로(가))
  landShape?: string; // 토지형상 (예: 세로장방)
  landHeight?: string; // 지세 (예: 평지)
  landUseSituation?: string; // 토지이용상황 (예: 단독주택)
  useAttrs?: string[]; // 토지이용계획 지역·지구 목록
  roadVerdict?: string; // 접도 판정 라벨
  landTrades?: {
    sampleCount: number;
    periodMonths: number;
    basis: string;
    medianUnitWon: number; // ㎡당 중앙값 원
    estimatedPrice: number; // 추정 토지가 원
    jigaTotal: number; // 공시지가 총액 원
    ratioToJiga: number; // 추정가/공시지가 배수
  };
  newbuild?: {
    periodMonths: number;
    resTradeUnitWon: number; // 주거 매매 ㎡당 원
    resTradeCount: number;
    resJeonseUnitWon: number;
    resJeonseCount: number;
    comF1UnitWon: number; // 상가 1층 ㎡당 원
    comF1Count: number;
  };
  buildingPrice?: { value: number; method: string };
  permits?: Array<{
    status: string; // 사용승인/착공/허가
    permitDay: string;
    archGb: string;
    mainUse: string;
    totArea: number;
  }>;
}

export interface ReportInputs {
  address?: string;
  reviewDate: string;
  /** 지번 조회 결과 (토지특성·추정가·신축시세·인허가) — 조회된 주소와 일치할 때만 포함. */
  land?: ReportLandInfo;
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

  /** 주변 시세·임대료 (국토교통부 실거래가, 시군구 단위) — 사업성 탭에서 조회된 경우 포함. */
  market?: {
    lawdCd: string;
    months: number;
    fetchedAt: string;
    baseAddress?: string;
    /** 만원/평 */
    aptTrade?: { count: number; avgPy: number; medianPy: number; maxPy: number; minPy: number };
    nrgTrade?: { count: number; avgPy: number; medianPy: number };
    aptRent?: {
      jeonseCount: number;
      avgJeonseDeposit: number;
      wolseCount: number;
      avgWolseDeposit: number;
      avgMonthlyRent: number;
      avgMonthlyRentPerPy: number;
    };
    offiRent?: {
      wolseCount: number;
      avgWolseDeposit: number;
      avgMonthlyRent: number;
      avgMonthlyRentPerPy: number;
    };
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
