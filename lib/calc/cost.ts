/**
 * 비용·부담금 시뮬레이션 — 디벨로퍼 사업타당성 사전검토용.
 *
 * 수치는 모두 수업·사전검토 기준이며, 실제 부담금·공사비는 사업유형·자치단체 고시·
 * 산림청·국토부·기획재정부 등 관할청 확인이 필요합니다.
 */

export interface CostInputs {
  // 기본 건축비
  abovePyeong: number;
  basementPyeong: number;
  aboveUnit: number;
  basementPremium: number;
  softRate: number;
  parkingSpaces: number;
  parkingUnit: number;

  // 농지보전부담금
  farmEnabled: boolean;
  farmArea: number;
  farmPrice: number;
  farmRate: number;
  farmCap: number;
  farmDiscount: number;

  // 대체산림자원조성비
  forestEnabled: boolean;
  forestArea: number;
  forestBase: number;
  forestPrice: number;
  forestPublicRate: number;
  forestAddRate: number;
  forestDiscount: number;

  // 개발부담금
  devEnabled: boolean;
  endLandValue: number;
  startLandValue: number;
  normalIncrease: number;
  devCost: number;
  devRate: number;
}

export interface CostResult {
  totalArea: number;
  aboveCost: number;
  basementCost: number;
  parkingCost: number;
  directCost: number;
  softCost: number;
  farmCost: number;
  forestCost: number;
  devCharge: number;
  total: number;
  // 부담금 학습 패널용 중간값
  farmUnit: number;
  forestUnit: number;
  devGain: number;
}

const manwon = (v: number) => v * 10000;

export function calculateCost(i: CostInputs): CostResult {
  const totalArea = i.abovePyeong + i.basementPyeong;
  const aboveCost = manwon(i.abovePyeong * i.aboveUnit);
  const basementCost = manwon(
    (i.basementPyeong * i.aboveUnit * i.basementPremium) / 100,
  );
  const parkingCost = manwon(i.parkingSpaces * i.parkingUnit);
  const directCost = aboveCost + basementCost + parkingCost;
  const softCost = (directCost * i.softRate) / 100;

  const farmUnit = Math.min((i.farmPrice * i.farmRate) / 100, i.farmCap);
  const farmCost = i.farmEnabled
    ? i.farmArea * farmUnit * (1 - i.farmDiscount / 100)
    : 0;

  const forestUnit =
    (i.forestBase + (i.forestPrice * i.forestPublicRate) / 100) *
    (1 + i.forestAddRate / 100);
  const forestCost = i.forestEnabled
    ? i.forestArea * forestUnit * (1 - i.forestDiscount / 100)
    : 0;

  const devGain = Math.max(
    0,
    manwon(i.endLandValue - i.startLandValue - i.normalIncrease - i.devCost),
  );
  const devCharge = i.devEnabled ? (devGain * i.devRate) / 100 : 0;

  const total = directCost + softCost + farmCost + forestCost + devCharge;

  return {
    totalArea,
    aboveCost,
    basementCost,
    parkingCost,
    directCost,
    softCost,
    farmCost,
    forestCost,
    devCharge,
    total,
    farmUnit,
    forestUnit,
    devGain,
  };
}

/** 원 단위 — "1,234,567원" */
export function formatWon(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

/** 큰 금액 표시 — 1억 이상이면 "41.06억원", 아니면 원 단위. */
export function formatEok(value: number): string {
  if (value >= 100000000) {
    return `${(value / 100000000).toLocaleString("ko-KR", {
      maximumFractionDigits: 2,
    })}억원`;
  }
  return formatWon(value);
}
