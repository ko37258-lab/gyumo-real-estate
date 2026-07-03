"use client";

import { ZONES } from "@/lib/zones";
import { PARKING_STANDARDS } from "@/lib/parking-standards";
import { lotPyToSqm, buildingFootprintSqm } from "@/lib/calc/coverage";
import { floorsFromFarAndCov } from "@/lib/calc/far";
import {
  calcArea,
  calcProgressive,
  calcTieredHousehold,
} from "@/lib/calc/parking";
import {
  applyPilotiDeduction,
  calculateFloor1Indoor,
  calculateGroundParking,
} from "@/lib/calc/groundParking";
import {
  calcActualGfaSqm,
  sunlightLossPct,
} from "@/lib/calc/sunlight";
import { calculateCost } from "@/lib/calc/cost";
import { calculateProfit } from "@/lib/calc/profit";
import { useSimulatorStore } from "@/store/simulator";
import { useCostStore } from "@/store/cost";
import { useProfitStore } from "@/store/profit";
import { useMarketStore } from "@/store/market";
import type { ReportInputs } from "@/lib/ai/types";
import { PY_TO_SQM } from "@/lib/constants";

/** 시뮬레이터·비용 store에서 PDF/AI용 ReportInputs를 합성. 클라이언트에서 호출. */
export function buildReportInputs(): ReportInputs {
  const sim = useSimulatorStore.getState();
  const cost = useCostStore.getState();

  const z = ZONES[sim.zone];
  const lotSqm = lotPyToSqm(sim.lotPy);
  const bldArea = buildingFootprintSqm(lotSqm, sim.covPct);
  const floors = floorsFromFarAndCov(sim.farPct, sim.covPct);
  const legalGfa = (lotSqm * sim.farPct) / 100;
  const northDepth = Math.sqrt(bldArea);
  const actualGfa = calcActualGfaSqm({
    bldAreaSqm: bldArea,
    floors,
    northDepthM: northDepth,
    sunlightOn: sim.sunOn && z.residential,
  });
  const lossPct = sim.sunOn && z.residential
    ? sunlightLossPct(legalGfa, actualGfa)
    : 0;

  // 주차 대수
  const std = PARKING_STANDARDS[sim.parkingUsage];
  const spaces =
    std.mode === "area"
      ? calcArea(legalGfa, sim.parkingAreaPerSpace).spaces
      : std.mode === "progressive"
        ? calcProgressive(legalGfa, sim.parkingProgressiveSpec).spaces
        : calcTieredHousehold(
            std.seoulTiers,
            sim.parkingHouseholds,
            sim.parkingTierRatios,
          ).spaces;

  const placement: ReportInputs["scale"]["parkingPlacement"] =
    sim.parkingMode === "ground"
      ? "above"
      : sim.parkingMode === "basement"
        ? "basement"
        : sim.parkingMode === "mixed"
          ? "mixed"
          : "none";

  // Day 10: 1층 분해
  const gp = calculateGroundParking({
    placement: sim.parkingMode,
    spaces,
    unitArea: sim.parkingUnitArea,
    pilotiMode: sim.parkingPilotiMode,
    groundRatioPct: sim.parkingGroundRatio,
  });
  const floor1Indoor = calculateFloor1Indoor(bldArea, gp.groundParkingArea);
  // 필로티 적용 시 연면적 차감 (시행령 119조 1항 4호) — 사용자에게 보이는 "실제 가능 연면적"에 반영.
  const actualGfaAfterPiloti = applyPilotiDeduction(
    actualGfa,
    gp.groundParkingArea,
    gp.isReducingFloor1,
  );

  const costResult = calculateCost(cost);

  // Day 12-B: 사업성 — touched=true일 때만 포함
  const profit = useProfitStore.getState();
  const totalBuildingCost =
    costResult.aboveCost +
    costResult.basementCost +
    costResult.parkingCost +
    costResult.softCost;
  const totalFees =
    costResult.farmCost + costResult.forestCost + costResult.devCharge;
  const landCostBase =
    sim.lotPy *
    profit.landPricePerPyeong *
    10000 *
    (1 + profit.landAcquisitionCost / 100);
  const baseProjectCost = landCostBase + totalBuildingCost + totalFees;
  const effectiveLoanAmountEok =
    profit.loanAmountOverride !== null
      ? profit.loanAmountOverride
      : (baseProjectCost * (profit.ltvRatio / 100)) / 1_0000_0000;

  const profitResult = profit.touched
    ? calculateProfit({
        landAreaPyeong: sim.lotPy,
        totalBuildingCost,
        totalFees,
        salesAvailableAreaPyeong: cost.abovePyeong,
        landPricePerPyeong: profit.landPricePerPyeong,
        landAcquisitionCost: profit.landAcquisitionCost,
        revenueModel: profit.revenueModel,
        salesPricePerPyeong: profit.salesPricePerPyeong,
        salesRate: profit.salesRate,
        monthlyRentPerPyeong: profit.monthlyRentPerPyeong,
        deposit: profit.deposit,
        annualOccupancy: profit.annualOccupancy,
        ltvRatio: profit.ltvRatio,
        loanAmountEok: effectiveLoanAmountEok,
        annualInterestRate: profit.annualInterestRate,
        loanPeriodYears: profit.loanPeriodYears,
        repaymentMethod: profit.repaymentMethod,
        projectDurationMonths: profit.projectDurationMonths,
        salesStartMonth: profit.salesStartMonth,
      })
    : null;

  // 주변 시세·임대료 (사업성 탭에서 조회된 경우)
  const marketState = useMarketStore.getState();
  const md = marketState.data;
  const market: ReportInputs["market"] = md
    ? {
        lawdCd: md.lawdCd,
        months: md.months,
        fetchedAt: md.fetchedAt,
        baseAddress: marketState.baseAddress ?? undefined,
        aptTrade: md.aptTrade
          ? {
              count: md.aptTrade.count,
              avgPy: md.aptTrade.avgPy,
              medianPy: md.aptTrade.medianPy,
              maxPy: md.aptTrade.maxPy,
              minPy: md.aptTrade.minPy,
            }
          : undefined,
        nrgTrade: md.nrgTrade
          ? {
              count: md.nrgTrade.count,
              avgPy: md.nrgTrade.avgPy,
              medianPy: md.nrgTrade.medianPy,
            }
          : undefined,
        aptRent: md.aptRent
          ? {
              jeonseCount: md.aptRent.jeonseCount,
              avgJeonseDeposit: md.aptRent.avgJeonseDeposit,
              wolseCount: md.aptRent.wolseCount,
              avgWolseDeposit: md.aptRent.avgWolseDeposit,
              avgMonthlyRent: md.aptRent.avgMonthlyRent,
              avgMonthlyRentPerPy: md.aptRent.avgMonthlyRentPerPy,
            }
          : undefined,
        offiRent: md.offiRent
          ? {
              wolseCount: md.offiRent.wolseCount,
              avgWolseDeposit: md.offiRent.avgWolseDeposit,
              avgMonthlyRent: md.offiRent.avgMonthlyRent,
              avgMonthlyRentPerPy: md.offiRent.avgMonthlyRentPerPy,
            }
          : undefined,
      }
    : undefined;

  return {
    address: sim.address || undefined,
    reviewDate: new Date().toISOString().slice(0, 10),
    market,
    scale: {
      landAreaSqm: lotSqm,
      landAreaPyeong: sim.lotPy,
      zoneCode: sim.zone,
      zoneName: z.name,
      coverRatio: sim.covPct,
      floorRatio: sim.farPct,
      roadWidth: sim.roadM,
      buildingArea: bldArea,
      legalFloorArea: legalGfa,
      actualFloorArea: actualGfaAfterPiloti,
      sunlightLoss: lossPct,
      parkingPlacement: placement,
      parkingSpaces: spaces,
      groundSpaces: gp.groundSpaces,
      basementSpaces: gp.basementSpaces,
      groundParkingArea: gp.groundParkingArea,
      floor1Indoor,
      isReducingFloor1: gp.isReducingFloor1,
      parkingUnitArea: sim.parkingUnitArea,
      pilotiMode: sim.parkingPilotiMode,
    },
    cost: {
      abovePyeong: cost.abovePyeong,
      basementPyeong: cost.basementPyeong,
      aboveUnit: cost.aboveUnit,
      basementPremium: cost.basementPremium,
      aboveCost: costResult.aboveCost,
      basementCost: costResult.basementCost,
      parkingCost: costResult.parkingCost,
      softCost: costResult.softCost,
      farmEnabled: cost.farmEnabled,
      farmCost: costResult.farmCost,
      forestEnabled: cost.forestEnabled,
      forestCost: costResult.forestCost,
      devEnabled: cost.devEnabled,
      devCharge: costResult.devCharge,
      total: costResult.total,
      totalArea: costResult.totalArea,
    },
    profit: profitResult
      ? {
          landPricePerPyeong: profit.landPricePerPyeong,
          landAcquisitionCost: profit.landAcquisitionCost,
          revenueModel: profit.revenueModel,
          salesPricePerPyeong: profit.salesPricePerPyeong,
          salesRate: profit.salesRate,
          monthlyRentPerPyeong: profit.monthlyRentPerPyeong,
          deposit: profit.deposit,
          annualOccupancy: profit.annualOccupancy,
          ltvRatio: profit.ltvRatio,
          loanAmountEok: effectiveLoanAmountEok,
          annualInterestRate: profit.annualInterestRate,
          loanPeriodYears: profit.loanPeriodYears,
          repaymentMethod: profit.repaymentMethod,
          projectDurationMonths: profit.projectDurationMonths,
          salesStartMonth: profit.salesStartMonth,
          landCost: profitResult.landCost,
          buildingCost: profitResult.buildingCost,
          feesTotal: profitResult.feesTotal,
          loanInterest: profitResult.loanInterest,
          totalProjectCost: profitResult.totalProjectCost,
          equity: profitResult.equity,
          loanAmount: profitResult.loanAmount,
          monthlyLoanPayment: profitResult.monthlyLoanPayment,
          totalRevenue: profitResult.totalRevenue,
          profitBeforeTax: profitResult.profitBeforeTax,
          tax: profitResult.tax,
          netProfit: profitResult.netProfit,
          roe: profitResult.roe,
          roic: profitResult.roic,
          irr: profitResult.irr,
          breakEvenSalesRate: profitResult.breakEvenSalesRate,
          costPerPyeong: profitResult.costPerPyeong,
          marginPerPyeong: profitResult.marginPerPyeong,
          marginPercent: profitResult.marginPercent,
          isLoss: profitResult.isLoss,
          isHighRisk: profitResult.isHighRisk,
        }
      : undefined,
  };
}

/** 평수→평 또는 ㎡→평 헬퍼 (PDF·dialog에서 사용). */
export function sqmToPy(sqm: number): number {
  return sqm / PY_TO_SQM;
}
