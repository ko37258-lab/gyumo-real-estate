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

/** 용도별 분양가·임대료 표 (플렉시티식 — /api/use-prices 스냅샷). */
export interface ReportUsePrices {
  periodMonths: number;
  baseAddress?: string;
  /** 만원/평 매매 (분양가 참고) */
  sale: Array<{
    label: string;
    manPerPy: number;
    count: number;
    areaBasis: string;
    basis: string;
    exclusive: boolean;
  }>;
  /** 만원/평 월세 (임대료 참고) */
  rentMonthly: Array<{
    label: string;
    manPerPy: number;
    count: number;
    areaBasis: string;
    basis: string;
    exclusive: boolean;
  }>;
  /** 상업 층별 매매 (만원/평) */
  commercial: Array<{ label: string; manPerPy: number; count: number; basis: string }>;
}

export interface ReportInputs {
  address?: string;
  reviewDate: string;
  /** 비용·부담금 페이지 포함 여부 (기본 true — 보고서 생성 시 체크 해제 가능) */
  includeCostPage?: boolean;
  /** 지번 조회 결과 (토지특성·추정가·신축시세·인허가) — 조회된 주소와 일치할 때만 포함. */
  land?: ReportLandInfo;
  /** 용도별 분양가·임대료 표 — 팝업에서 조회한 경우 선택 포함. */
  usePrices?: ReportUsePrices;
  /** 3D 매스 캡쳐 (base64 JPEG dataURL, 기본 뷰) — PDF에 임베드. AI 프롬프트에는 보내지 않음. */
  visualization3D?: string;
  /** 3D 다각도 캡쳐 — 기본(iso)·남측 정면·북측 정면 (플렉시티식 3컷) */
  visualization3DViews?: { iso?: string; south?: string; north?: string };
  /** 💰 분양·월세 수익 추정 — 주거계 용도 + 가설계 세대수 + 인근 실거래(use-prices) 있을 때 */
  revenue?: import("@/lib/report/revenue").ReportRevenue;
  /** 표지 위치도 (위성 타일 합성 base64 JPEG) — 실형상 조회 시 자동 생성 */
  locationMap?: string;
  scale: {
    landAreaSqm: number;
    landAreaPyeong: number;
    zoneCode: string;
    zoneName: string;
    coverRatio: number;
    floorRatio: number;
    /** 건폐율·용적률 근거 — 지자체 조례 자동 적용 시 그 출처, 아니면 시행령 상한임을 명시 */
    ordinanceSource?: string;
    roadWidth: number;
    buildingArea: number;
    legalFloorArea: number;
    actualFloorArea: number;
    sunlightLoss: number;
    parkingPlacement: "none" | "basement" | "above" | "mixed";
    parkingSpaces: number;
    /** 반올림 전 산정 대수 — 별표1 비고6 단서(총 1대 미만 → 0대) 검토용 */
    parkingRawSpaces?: number;
    /** Day 10: 1층 분해 (필로티/벽체식) */
    groundSpaces: number;
    basementSpaces: number;
    groundParkingArea: number;
    floor1Indoor: number;
    isReducingFloor1: boolean;
    parkingUnitArea: number;
    pilotiMode: boolean;
    /* ── 플렉시티식 상세 보고서 (2026-08-31) ── */
    /** 가정 층고(m) */
    floorHeightM?: number;
    /** 소수 층수 (예: 3.33) */
    floorsExact?: number;
    /** 적용 건폐율 상한(조례 우선) */
    legalCovMax?: number;
    /** 적용 용적률 상한(조례 우선) */
    legalFarMax?: number;
    /** 정북 일조 높이제한 적용 여부 (전용·일반주거 + 토글 ON) */
    sunlightApplied?: boolean;
    /** 적용한 일조 규칙 — revised(2026.11.12 시행 개정 후) / legacy(개정 전) */
    sunlightRule?: "revised" | "legacy";
    /** 개정 전·후 비교 (일조 적용 시) */
    sunlightCompare?: {
      legacyActualFloorArea: number;
      revisedActualFloorArea: number;
      legacyLoss: number;
      revisedLoss: number;
      byFloor: Array<{
        floor: number;
        heightM: number;
        legacyM: number;
        revisedM: number;
        gainM: number;
      }>;
    };
    /** 건축물 용도 라벨 (주차 기준 용도) */
    usageLabel?: string;
    /** 부설주차장 산정 근거 문구 */
    parkingBasisLabel?: string;
    /** 층별 개요표 */
    floorTable?: import("@/lib/report/floorTable").FloorTableResult;
    /** 북측 일조 영향 진단 (동지 9~15시) — 실형상 조회 시 */
    sunlightImpact?: import("@/lib/calc/shadowCheck").SunImpactResult;
    /** ⑥ 가설계 총 세대수 (주거계 용도·산출 가능 시) */
    totalUnits?: number;
    /** ⑥ 가설계 유닛 전용면적 ㎡ */
    unitExclusiveSqm?: number;
    /** 건물 총 높이 m (층수 × 층고) */
    heightM?: number;
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
