"use client";

import { ZONES } from "@/lib/zones";
import { PARKING_STANDARDS } from "@/lib/parking-standards";
import { sunlightLossPct, compareRulesByFloor } from "@/lib/calc/sunlight";
import { useSimulatorStore } from "@/store/simulator";
import { useCostStore } from "@/store/cost";
import { useProfitStore } from "@/store/profit";
import { useMarketStore } from "@/store/market";
import { useLandInfoStore } from "@/store/landinfo";
import { useUsePricesStore } from "@/store/useprices";
import type { ReportInputs } from "@/lib/ai/types";
import { PY_TO_SQM } from "@/lib/constants";
import { computeFloorTable } from "@/lib/report/floorTable";
import { checkNorthSunlight } from "@/lib/calc/shadowCheck";
import { calculateSchematic, RESIDENTIAL_USAGES } from "@/lib/calc/schematic";
import { estimateRevenue } from "@/lib/report/revenue";
import { computePlan, floorLabel } from "@/lib/plan/computePlan";
import { planInputsFromState } from "@/lib/plan/usePlan";
import { computeCostSnapshot, computeProfitSnapshot } from "@/lib/plan/finance";
import { scaleConstraintsFrom, ALWAYS_UNVERIFIED } from "@/lib/plan/scaleConstraints";
import { todayYmd } from "@/lib/calc/sunlight";

/** 시뮬레이터·비용 store에서 PDF/AI용 ReportInputs를 합성. 클라이언트에서 호출. */
export function buildReportInputs(): ReportInputs {
  const sim = useSimulatorStore.getState();
  const cost = useCostStore.getState();

  // ── 단일 계산원: 화면 KPI·2D·3D 와 같은 입력 → 같은 결과 ──
  const planInputs = planInputsFromState(sim);
  const plan = computePlan(planInputs);
  const z = ZONES[sim.zone];
  const lotSqm = plan.lotSqm;
  const bldArea = plan.footprintSqm;
  const floors = plan.floorsEquivalent;
  const legalGfa = plan.farCapSqm;
  const shapeForGfa = planInputs.shape ?? null;
  const sunlightApplied = planInputs.sunlightOn;
  const actualGfa = plan.aboveGroundSumSqm;
  const lossPct = sunlightApplied ? plan.sunlightLossPct : 0;
  // 개정 전·후 비교 — 반대 규칙으로 같은 계산원을 한 번 더
  const otherRule = sim.sunlightRule === "revised" ? "legacy" : "revised";
  const actualGfaOther = computePlan({ ...planInputs, sunlightRule: otherRule }).aboveGroundSumSqm;
  const legacyActualGfa = sim.sunlightRule === "revised" ? actualGfaOther : actualGfa;
  const revisedActualGfa = sim.sunlightRule === "revised" ? actualGfa : actualGfaOther;

  const std = PARKING_STANDARDS[sim.parkingUsage];
  const pk = plan.parking;
  const spaces = pk.requiredSpaces;
  const rawSpaces = pk.rawSpaces;

  const placement: ReportInputs["scale"]["parkingPlacement"] =
    sim.parkingMode === "ground"
      ? "above"
      : sim.parkingMode === "basement"
        ? "basement"
        : sim.parkingMode === "mixed"
          ? "mixed"
          : "none";

  const floorTable = computeFloorTable({
    bldAreaSqm: bldArea,
    floors,
    floorHeightM: sim.typicalFloorHeightM,
    floor1HeightM: sim.floor1HeightM,
    sunlightOn: sunlightApplied,
    groundParkingArea: pk.groundAreaSqm,
    pilotiMode: sim.parkingPilotiMode,
    basementParkingArea: pk.basementAreaSqm,
    basementLevels: plan.basement.levels,
    usageLabel: std.label,
    shape: shapeForGfa,
    rule: sim.sunlightRule,
  });
  // 북측 일조 영향 진단 — 실형상일 때만 (근사 박스 매스로는 위치 의미가 없음)
  let sunlightImpact;
  if (shapeForGfa && sim.parcelShape) {
    try {
      sunlightImpact = checkNorthSunlight({
        shape: shapeForGfa,
        bldAreaSqm: bldArea,
        floors,
        floorHeightM: sim.typicalFloorHeightM,
        sunlightOn: sunlightApplied,
        rule: sim.sunlightRule,
        latDeg: sim.parcelShape.centerLat,
        lonDeg: sim.parcelShape.centerLon,
      });
    } catch {
      sunlightImpact = undefined;
    }
  }

  const parkingBasisLabel = pk.basisLabel;

  // 비용 — 규모검토 수량 연결(지상·지하·주차) 후 계산. 화면 비용 탭과 같은 계산원.
  const costSnap = computeCostSnapshot(cost, cost.linked, plan);
  const costResult = costSnap.result;

  // 지번 조회 결과 — 현재 시뮬레이터 주소와 일치할 때만 포함 (다른 필지 데이터 오염 방지)
  const landData = useLandInfoStore.getState().data;
  const land =
    landData && sim.address && landData.address === sim.address
      ? landData
      : undefined;
  const constraints = scaleConstraintsFrom(land ? land.useAttrs ?? [] : undefined);

  // 사업성 — 화면 사업성 탭과 같은 계산원. 기본값이면 판정은 '보류'로 수록(수록 여부는 보고서 선택창에서).
  const profit = useProfitStore.getState();
  const profitSnap = computeProfitSnapshot({
        plan,
        cost: costSnap,
        profit,
        usage: sim.parkingUsage,
        unresolvedRegulations: constraints.fetched ? constraints.items.map((c) => c.label) : ["토지이용계획 미조회"],
      });
  const profitResult = profitSnap?.result ?? null;
  const effectiveLoanAmountEok = profitSnap?.loanAmountEok ?? 0;

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

  // 용도별 분양가·임대료 — 팝업에서 조회했고 같은 필지일 때만 포함
  const upState = useUsePricesStore.getState();
  const usePrices =
    upState.data && land && upState.pnu === land.pnu ? upState.data : undefined;

  // ⑥ 가설계 세대수 (주거계 용도) → 💰 수익 추정 (화면 카드와 같은 계산원 lib/report/revenue)
  const schematic = RESIDENTIAL_USAGES.includes(sim.parkingUsage)
    ? calculateSchematic({
        floorAreaSqm: bldArea,
        floors,
        exclusiveUnitSqm: sim.schematicUnitSqm,
        efficiencyPct: sim.schematicEfficiencyPct,
        groundPiloti:
          (sim.parkingMode === "ground" || sim.parkingMode === "mixed") && sim.parkingPilotiMode,
        usage: sim.parkingUsage,
      })
    : null;
  const totalUnits = schematic?.feasible ? schematic.totalUnits : undefined;
  const revenue =
    usePrices && totalUnits
      ? estimateRevenue({
          usePrices,
          usage: sim.parkingUsage,
          unitSqm: sim.schematicUnitSqm,
          efficiencyPct: sim.schematicEfficiencyPct,
          totalUnits,
        }) ?? undefined
      : undefined;

  return {
    address: sim.address || undefined,
    reviewDate: new Date().toISOString().slice(0, 10),
    land,
    usePrices,
    market,
    revenue,
    scale: {
      landAreaSqm: lotSqm,
      landAreaPyeong: plan.lotPy,
      zoneCode: sim.zone,
      zoneName: z.name,
      coverRatio: sim.covPct,
      floorRatio: sim.farPct,
      // 서울은 조례 DB(비서울 전용)가 아니라 zones.ts 정본(서울시 도시계획 조례)을 쓴다.
      // ordinance=null 을 "조례 미확인"으로 적으면 서울 필지에서 사실과 어긋난다.
      ordinanceSource: sim.ordinance
        ? sim.ordinance.hasPreciseSource
          ? `${sim.ordinance.regionName} 도시계획조례 (${sim.ordinance.source})`
          : `${sim.ordinance.regionName} 도시계획조례 (수치 검증 완료, 조문 링크 미확보)`
        : sim.parkingLawdCd?.startsWith("11")
          ? "서울특별시 도시계획 조례 (2026 기준 · 검토: 고상철 대표)"
          : "국토계획법 시행령 제84·85조 상한 기준 (해당 지자체 조례 미확인)",
      roadWidth: sim.roadM,
      buildingArea: bldArea,
      legalFloorArea: legalGfa,
      actualFloorArea: plan.estimatedFarAreaSqm,
      sunlightLoss: lossPct,
      parkingPlacement: placement,
      parkingSpaces: spaces,
      parkingRawSpaces: rawSpaces,
      groundSpaces: pk.groundSpaces,
      basementSpaces: pk.basementSpaces,
      groundParkingArea: pk.groundAreaSqm,
      floor1Indoor: plan.floor1NonParkingSqm,
      isReducingFloor1: pk.pilotiActive,
      parkingUnitArea: sim.parkingUnitArea,
      pilotiMode: sim.parkingPilotiMode,
      floorHeightM: sim.typicalFloorHeightM,
      floorsExact: floors,
      legalCovMax: sim.ordinance?.coverRatioMax ?? z.maxCov,
      legalFarMax: sim.ordinance?.floorRatioMax ?? z.farMax,
      sunlightApplied,
      sunlightRule: sim.sunlightRule,
      sunlightCompare: sunlightApplied
        ? {
            legacyActualFloorArea: legacyActualGfa,
            revisedActualFloorArea: revisedActualGfa,
            legacyLoss: sunlightLossPct(legalGfa, legacyActualGfa),
            revisedLoss: sunlightLossPct(legalGfa, revisedActualGfa),
            byFloor: compareRulesByFloor(floors, sim.typicalFloorHeightM),
          }
        : undefined,
      usageLabel: std.label,
      parkingBasisLabel,
      floorTable,
      sunlightImpact,
      totalUnits,
      unitExclusiveSqm: totalUnits ? sim.schematicUnitSqm : undefined,
      heightM: plan.heightM,
      floorCount: plan.floorCount,
      floorLabel: floorLabel(plan),
      floor1HeightM: sim.floor1HeightM,
      heightNote: plan.heightNote,
      lotAreaSource: sim.lotAreaSource,
      officialLotSqm: sim.officialLotSqm,
      shapeAreaSqm: sim.parcelShape?.areaSqm ?? null,
      roadWidthSource: sim.roadMSource,
      ruleBasisDate: sim.permitDate ?? todayYmd(),
      ruleBasisIsPermitDate: Boolean(sim.permitDate),
      parkingRoundingNote: pk.roundingNote,
      parkingWarnings: pk.warnings,
      basementLevels: plan.basement.levels,
      basementNote: plan.basement.note,
      totalFloorArea: plan.totalFloorAreaSqm,
      constraints: {
        fetched: constraints.fetched,
        items: constraints.items.map((c) => ({ label: c.label, effect: c.effect, where: c.where })),
      },
      alwaysUnverified: ALWAYS_UNVERIFIED.map((c) => ({ label: c.label, effect: c.effect, where: c.where })),
    },
    cost: {
      abovePyeong: costSnap.inputs.abovePyeong,
      basementPyeong: costSnap.inputs.basementPyeong,
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
      linkNotes: costSnap.linkNotes,
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
          verdict: profitSnap!.verdict,
          ltcPct: profitSnap!.ltcPct,
          pretaxMarginOnRevenuePct: profitSnap!.pretaxMarginOnRevenuePct,
          definitions: {
            margin: profitSnap!.marginDefinition,
            irr: profitSnap!.irrDefinition,
            interest: profitSnap!.interestNote,
            tax: profitSnap!.taxNote,
            saleableArea: profitSnap!.saleableAreaBasis,
          },
          landPriceSource: profitSnap!.landPriceSource,
          salesPriceSource: profitSnap!.salesPriceSource,
        }
      : undefined,
  };
}

/** 평수→평 또는 ㎡→평 헬퍼 (PDF·dialog에서 사용). */
export function sqmToPy(sqm: number): number {
  return sqm / PY_TO_SQM;
}
