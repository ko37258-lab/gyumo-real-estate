"use client";

import dynamic from "next/dynamic";
import { useSimulatorStore } from "@/store/simulator";
import { ZONES } from "@/lib/zones";
import { FLOOR_HEIGHT_M, PY_TO_SQM } from "@/lib/constants";
import { buildingFootprintSqm, lotPyToSqm } from "@/lib/calc/coverage";
import { floorsFromFarAndCov, totalHeightM } from "@/lib/calc/far";
import { SUNLIGHT_THRESHOLD_M } from "@/lib/calc/sunlight";
import {
  calcArea,
  calcProgressive,
  calcTieredHousehold,
  groundParkingSqm,
} from "@/lib/calc/parking";
import { calculateGroundParking } from "@/lib/calc/groundParking";
import { PARKING_STANDARDS, SQM_PER_SPACE } from "@/lib/parking-standards";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const ScaleVisualizer3D = dynamic(
  () => import("@/components/simulator/ScaleVisualizer3D"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[480px] flex items-center justify-center text-[12px] text-muted-foreground bg-card border border-border rounded-md">
        3D 매스 로드 중...
      </div>
    ),
  },
);

const fmt = (n: number, d = 0) =>
  n.toLocaleString("ko-KR", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });

const MASS_FILL = "#F0997B";
const MASS_FILL_PARTIAL = "#F5C4B3";
const MASS_EDGE = "#4A1B0C";
const DANGER = "#E24B4A";

export function ScaleVisualizer() {
  const zone = useSimulatorStore((s) => s.zone);
  const lotPy = useSimulatorStore((s) => s.lotPy);
  const covPct = useSimulatorStore((s) => s.covPct);
  const farPct = useSimulatorStore((s) => s.farPct);
  const roadM = useSimulatorStore((s) => s.roadM);
  const sunOnRaw = useSimulatorStore((s) => s.sunOn);
  const parkingUsage = useSimulatorStore((s) => s.parkingUsage);
  const parkingAreaPerSpace = useSimulatorStore((s) => s.parkingAreaPerSpace);
  const parkingProgressiveSpec = useSimulatorStore(
    (s) => s.parkingProgressiveSpec,
  );
  const parkingHouseholds = useSimulatorStore((s) => s.parkingHouseholds);
  const parkingTierRatios = useSimulatorStore((s) => s.parkingTierRatios);
  const parkingMode = useSimulatorStore((s) => s.parkingMode);
  const parkingGroundRatio = useSimulatorStore((s) => s.parkingGroundRatio);
  const parkingUnitArea = useSimulatorStore((s) => s.parkingUnitArea);
  const parkingPilotiMode = useSimulatorStore((s) => s.parkingPilotiMode);

  const z = ZONES[zone];
  const sunOn = sunOnRaw && z.residential;

  const lotSqm = lotPyToSqm(lotPy);
  const bldArea = buildingFootprintSqm(lotSqm, covPct);
  const floors = floorsFromFarAndCov(farPct, covPct);
  const heightM = totalHeightM(floors);
  const northDepth = Math.sqrt(bldArea);

  // 주차 대수 → 필요 면적 → 지상/지하 분리
  const parkingStd = PARKING_STANDARDS[parkingUsage];
  const parkingGfa = lotSqm * farPct / 100; // legalGfa
  const spaces =
    parkingStd.mode === "area"
      ? calcArea(parkingGfa, parkingAreaPerSpace).spaces
      : parkingStd.mode === "progressive"
        ? calcProgressive(parkingGfa, parkingProgressiveSpec).spaces
        : calcTieredHousehold(
            parkingStd.seoulTiers,
            parkingHouseholds,
            parkingTierRatios,
          ).spaces;
  const totalParkingArea = spaces * SQM_PER_SPACE;
  const groundPark = groundParkingSqm(
    totalParkingArea,
    parkingMode,
    parkingGroundRatio,
  );
  const basementPark = totalParkingArea - groundPark;
  const pilotisFr = bldArea > 0 ? groundPark / bldArea : 0;
  const basementLv = bldArea > 0 ? basementPark / bldArea : 0;

  // Day 10: 1F 분해 (30㎡/대, 필로티 분기)
  const day10 = calculateGroundParking({
    placement: parkingMode,
    spaces,
    unitArea: parkingUnitArea,
    pilotiMode: parkingPilotiMode,
    groundRatioPct: parkingGroundRatio,
  });
  const day10ParkingFraction =
    bldArea > 0 && day10.groundParkingArea > 0
      ? Math.min(1, day10.groundParkingArea / bldArea)
      : 0;

  // 평면도 geometry
  const planCx = 175;
  const planCy = 195;
  const lotPx = 200;
  const lx = planCx - lotPx / 2;
  const ly = planCy - lotPx / 2;
  const bldScale = Math.sqrt(covPct / 100);
  const bldPx = lotPx * bldScale;
  const bx = planCx - bldPx / 2;
  const by = ly + (lotPx - bldPx) * 0.6;

  const planSunlight = (() => {
    if (!sunOn) return null;
    const maxSetback =
      heightM <= SUNLIGHT_THRESHOLD_M ? 1.5 : heightM / 2 - 1.5;
    const setbackPx = (maxSetback / Math.sqrt(lotSqm)) * lotPx;
    const limitY = ly + Math.min(setbackPx, lotPx * 0.3);
    return { maxSetback, limitY };
  })();

  const rPx = Math.min(roadM * 5, 60);
  const ry = ly + lotPx + 6;

  // 입면도 geometry
  const eL = 380;
  const eR = 660;
  const baseY = 310;
  const elevDepthPx = Math.min(220, northDepth * 5);
  const eBldL = eL + 30;
  const eBldR = eBldL + elevDepthPx;

  // 동적 수직 스케일 — 건물 top이 항상 viewBox 안(top margin 75px)에 들어가게.
  // mPx(m→px)와 phPx(층→px)를 함께 줄여서 일조권 사선·치수선·층 박스가 일관되게 축소됨.
  const TOP_MARGIN = 75;
  const availableH = baseY - TOP_MARGIN;
  const IDEAL_PH_PX = 22;
  const idealMPx = IDEAL_PH_PX / FLOOR_HEIGHT_M;
  const mPx =
    heightM > 0 && heightM * idealMPx > availableH
      ? availableH / heightM
      : idealMPx;
  const phPx = mPx * FLOOR_HEIGHT_M;

  const elevSunPath = (() => {
    if (!sunOn) return null;
    const sb15 = 1.5 * mPx;
    const h10px = SUNLIGHT_THRESHOLD_M * mPx;
    const sunStartY = baseY;
    const sunV1Y = baseY - h10px;
    const topY = baseY - heightM * mPx;
    let path = `M ${eBldL + sb15} ${sunStartY} L ${eBldL + sb15} ${sunV1Y}`;
    if (heightM > SUNLIGHT_THRESHOLD_M) {
      const extraH = heightM - SUNLIGHT_THRESHOLD_M;
      const sb2 = extraH * 0.5 * mPx;
      path += ` L ${eBldL + sb15 + sb2} ${topY}`;
    }
    return { d: path, sb15, topY };
  })();

  const elevFloors: React.ReactNode[] = [];
  const ceilFloors = Math.ceil(floors);
  for (let i = 0; i < ceilFloors; i++) {
    const fH = (i + 1) * FLOOR_HEIGHT_M;
    let setbackPx = 0;
    if (sunOn && fH > SUNLIGHT_THRESHOLD_M) setbackPx = (fH / 2 - 1.5) * mPx;
    else if (sunOn) setbackPx = 1.5 * mPx;
    const fL = sunOn ? eBldL + setbackPx : eBldL;
    let fW = eBldR - fL;
    if (fW < 0) fW = 0;
    const portion = i + 1 <= floors ? 1 : floors - i;
    if (portion <= 0) break;
    const actualH = phPx * portion;
    const actualY = baseY - i * phPx - actualH;
    const isPartial = portion < 1;
    elevFloors.push(
      <g key={i}>
        <rect
          x={fL}
          y={actualY}
          width={fW}
          height={actualH}
          fill={isPartial ? MASS_FILL_PARTIAL : MASS_FILL}
          stroke={MASS_EDGE}
          strokeWidth={0.5}
          strokeDasharray={isPartial ? "3 2" : undefined}
        />
        {phPx >= 14 && fW > 30 && (
          <text
            x={eBldR - 4}
            y={actualY + actualH / 2 + 3}
            textAnchor="end"
            style={{
              fontSize: 8,
              fill: MASS_EDGE,
              opacity: 0.6,
            }}
          >
            {i + 1}F
          </text>
        )}
      </g>,
    );
  }

  const topYf = baseY - heightM * mPx;
  const dimX = eBldR + 18;

  // 지상 주차장 (필로티) — 건물 바닥부터 pilotisFr * phPx 만큼 회색 오버레이.
  // Day 10 1F 분해가 활성이면 이건 건너뛰고 day10ParkingRect를 그림.
  const pilotisRect = (() => {
    if (day10ParkingFraction > 0) return null;
    if (pilotisFr <= 0) return null;
    const h = Math.min(pilotisFr, ceilFloors) * phPx;
    if (h <= 0) return null;
    return { x: eBldL, y: baseY - h, w: eBldR - eBldL, h };
  })();

  // Day 10: 1F 남측 일부에 주차 영역 (입면도에선 남=eBldR 쪽).
  const day10ParkingRect = (() => {
    if (day10ParkingFraction <= 0) return null;
    const fullW = eBldR - eBldL;
    const w = fullW * day10ParkingFraction;
    const h = phPx; // 1F 한 층 높이
    return { x: eBldR - w, y: baseY - h, w, h };
  })();

  // 지하 주차장 — baseY 아래에 회색 박스를 ceil(basementLv) 개 만큼.
  const basementBoxes: { y: number; h: number; label: string }[] = [];
  if (basementLv > 0) {
    const groundHatchH = 14;
    const startY = baseY + groundHatchH + 2;
    const maxBoxH = 14;
    const boxH = Math.min(phPx, maxBoxH);
    const ceilBs = Math.ceil(basementLv);
    for (let i = 0; i < ceilBs; i++) {
      const portion = i + 1 <= basementLv ? 1 : basementLv - i;
      if (portion <= 0) break;
      const y = startY + i * (boxH + 1);
      if (y + boxH > 358) break; // viewBox 끝
      basementBoxes.push({
        y,
        h: boxH * portion,
        label: `B${i + 1}`,
      });
    }
  }

  return (
    <div className="bg-secondary rounded-lg p-3.5">
      <Tabs defaultValue="2d">
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="text-xs text-muted-foreground font-medium">
            ④ 건축 가능 매스 시각화
          </div>
          <TabsList>
            <TabsTrigger value="2d">2D 도면</TabsTrigger>
            <TabsTrigger value="3d">3D 360°</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="2d">
      <svg
        width="100%"
        viewBox="0 0 680 360"
        role="img"
        className="block"
        aria-label="건축 가능 매스 시뮬레이션"
      >
        <title>건축 가능 매스 시뮬레이션</title>
        <desc>
          좌측 평면도와 우측 입면도. 일조권 사선제한이 적용되면 정북방향 상부가
          깎인 형태로 표현됩니다.
        </desc>
        <defs>
          <pattern
            id="road-h"
            patternUnits="userSpaceOnUse"
            width={7}
            height={7}
            patternTransform="rotate(45)"
          >
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={7}
              stroke="currentColor"
              strokeWidth={0.8}
              opacity={0.3}
            />
          </pattern>
          <pattern
            id="ground-h"
            patternUnits="userSpaceOnUse"
            width={5}
            height={5}
            patternTransform="rotate(45)"
          >
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={5}
              stroke="currentColor"
              strokeWidth={0.5}
              opacity={0.4}
            />
          </pattern>
          <pattern
            id="no-build"
            patternUnits="userSpaceOnUse"
            width={6}
            height={6}
          >
            <rect width={6} height={6} fill="#FCEBEB" opacity={0.5} />
            <line
              x1={0}
              y1={6}
              x2={6}
              y2={0}
              stroke={DANGER}
              strokeWidth={0.5}
              opacity={0.6}
            />
          </pattern>
          <pattern
            id="parking-h"
            patternUnits="userSpaceOnUse"
            width={5}
            height={5}
            patternTransform="rotate(45)"
          >
            <rect width={5} height={5} fill="#9CA3AF" opacity={0.35} />
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={5}
              stroke="#4B5563"
              strokeWidth={0.7}
              opacity={0.7}
            />
          </pattern>
        </defs>

        <text
          x={20}
          y={20}
          style={{ fontSize: 10, fontWeight: 500 }}
          className="fill-muted-foreground"
        >
          평면도 · TOP VIEW
        </text>
        <text
          x={380}
          y={20}
          style={{ fontSize: 10, fontWeight: 500 }}
          className="fill-muted-foreground"
        >
          정북단면 · NORTH ELEVATION
        </text>

        {/* 평면도 */}
        <g>
          <circle
            cx={48}
            cy={58}
            r={13}
            className="fill-card stroke-muted-foreground"
            strokeWidth={0.5}
          />
          <text
            x={48}
            y={54}
            textAnchor="middle"
            style={{ fontSize: 9, fontWeight: 500 }}
            className="fill-muted-foreground"
          >
            N
          </text>
          <polygon
            points="48,46 45,57 48,55 51,57"
            className="fill-muted-foreground"
          />
        </g>
        <text
          x={planCx}
          y={ly - 22}
          textAnchor="middle"
          style={{ fontSize: 9, fontWeight: 500, fill: DANGER }}
        >
          ↑ 정북방향 (인접대지)
        </text>
        <rect
          x={lx}
          y={ly}
          width={lotPx}
          height={lotPx}
          className="fill-card stroke-foreground/60"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
        <text
          x={planCx}
          y={ly - 6}
          textAnchor="middle"
          style={{ fontSize: 9 }}
          className="fill-muted-foreground"
        >
          대지경계선
        </text>

        {planSunlight && (
          <>
            <rect
              x={lx}
              y={ly}
              width={lotPx}
              height={planSunlight.limitY - ly}
              fill="url(#no-build)"
            />
            <line
              x1={lx}
              y1={planSunlight.limitY}
              x2={lx + lotPx}
              y2={planSunlight.limitY}
              stroke={DANGER}
              strokeWidth={1}
              strokeDasharray="3 2"
            />
            <text
              x={lx + lotPx - 4}
              y={planSunlight.limitY - 3}
              textAnchor="end"
              style={{ fontSize: 8, fill: DANGER }}
            >
              사선이격 {fmt(planSunlight.maxSetback, 1)}m
            </text>
          </>
        )}

        {day10ParkingFraction > 0 ? (
          (() => {
            // 평면도: 도로(남=하단) 쪽에 주차 띠 배치
            const parkH = Math.min(bldPx, bldPx * day10ParkingFraction);
            const indoorH = Math.max(0, bldPx - parkH);
            return (
              <>
                {/* 영업 가능 영역 (북쪽=상단) */}
                {indoorH > 0 && (
                  <rect
                    x={bx}
                    y={by}
                    width={bldPx}
                    height={indoorH}
                    fill={MASS_FILL}
                    stroke={MASS_EDGE}
                    strokeWidth={0.8}
                  />
                )}
                {/* 주차 영역 (남쪽=도로쪽 하단) — 사선 패턴 */}
                {parkH > 0 && (
                  <>
                    <rect
                      x={bx}
                      y={by + indoorH}
                      width={bldPx}
                      height={parkH}
                      fill="url(#parking-h)"
                      stroke="#993C1D"
                      strokeWidth={1}
                      strokeDasharray="4 3"
                      opacity={0.95}
                    />
                    {parkH >= 14 && bldPx > 40 && (
                      <text
                        x={planCx}
                        y={by + indoorH + parkH / 2 + 3}
                        textAnchor="middle"
                        style={{ fontSize: 9, fontWeight: 700, fill: "#993C1D" }}
                      >
                        🚗 주차 {day10.groundSpaces}대 · {fmt(day10.groundParkingArea, 0)}㎡
                      </text>
                    )}
                  </>
                )}
                {/* 영업 라벨 (충분히 클 때만) */}
                {indoorH >= 28 && bldPx > 50 && (
                  <>
                    <text
                      x={planCx}
                      y={by + indoorH / 2 - 2}
                      textAnchor="middle"
                      style={{ fontSize: 10, fontWeight: 500, fill: MASS_EDGE }}
                    >
                      영업 가능
                    </text>
                    <text
                      x={planCx}
                      y={by + indoorH / 2 + 10}
                      textAnchor="middle"
                      style={{ fontSize: 8, fill: MASS_EDGE }}
                    >
                      {fmt((bldArea - day10.groundParkingArea) / PY_TO_SQM, 0)}평
                    </text>
                  </>
                )}
              </>
            );
          })()
        ) : (
          <>
            <rect
              x={bx}
              y={by}
              width={bldPx}
              height={bldPx}
              fill={MASS_FILL}
              stroke={MASS_EDGE}
              strokeWidth={0.8}
            />
            {bldPx > 50 && (
              <>
                <text
                  x={planCx}
                  y={by + bldPx / 2 - 3}
                  textAnchor="middle"
                  style={{ fontSize: 11, fontWeight: 500, fill: MASS_EDGE }}
                >
                  건축면적
                </text>
                <text
                  x={planCx}
                  y={by + bldPx / 2 + 11}
                  textAnchor="middle"
                  style={{ fontSize: 9, fill: MASS_EDGE }}
                >
                  {fmt(bldArea / PY_TO_SQM, 0)}평
                </text>
              </>
            )}
          </>
        )}

        <rect
          x={lx}
          y={ry}
          width={lotPx}
          height={rPx}
          fill="url(#road-h)"
          className="text-muted-foreground stroke-muted-foreground"
          strokeWidth={0.5}
        />
        <text
          x={planCx}
          y={ry + rPx / 2 + 3}
          textAnchor="middle"
          style={{ fontSize: 10, fontWeight: 500 }}
          className="fill-muted-foreground"
        >
          전면도로 {roadM}m
        </text>

        {/* 입면도 */}
        <line
          x1={eL}
          y1={baseY}
          x2={eR}
          y2={baseY}
          className="stroke-foreground"
          strokeWidth={1}
        />
        <rect
          x={eL}
          y={baseY}
          width={eR - eL}
          height={14}
          fill="url(#ground-h)"
          className="text-muted-foreground"
        />
        <rect
          x={eBldR}
          y={baseY - 3}
          width={eR - eBldR - 2}
          height={3}
          className="fill-muted-foreground"
          opacity={0.5}
        />
        <text
          x={(eBldR + eR) / 2}
          y={baseY - 7}
          textAnchor="middle"
          style={{ fontSize: 8 }}
          className="fill-muted-foreground"
        >
          남측 도로
        </text>
        <rect
          x={eL}
          y={baseY - 3}
          width={eBldL - eL - 2}
          height={3}
          className="fill-muted-foreground"
          opacity={0.5}
        />
        <text
          x={(eL + eBldL) / 2}
          y={baseY - 7}
          textAnchor="middle"
          style={{ fontSize: 8, fill: DANGER }}
        >
          정북 인접대지
        </text>
        <line
          x1={eBldL}
          y1={baseY - 6}
          x2={eBldL}
          y2={baseY + 6}
          className="stroke-foreground/60"
          strokeWidth={1}
        />
        <line
          x1={eBldR}
          y1={baseY - 6}
          x2={eBldR}
          y2={baseY + 6}
          className="stroke-foreground/60"
          strokeWidth={1}
        />

        {elevSunPath && (
          <>
            <path
              d={elevSunPath.d}
              fill="none"
              stroke={DANGER}
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            <rect
              x={eBldL}
              y={elevSunPath.topY - 20}
              width={elevSunPath.sb15}
              height={baseY - elevSunPath.topY + 20}
              fill="url(#no-build)"
              opacity={0.5}
            />
          </>
        )}

        {elevFloors}

        {/* 지상 주차장 (필로티) 오버레이 */}
        {pilotisRect && (
          <g>
            <rect
              x={pilotisRect.x}
              y={pilotisRect.y}
              width={pilotisRect.w}
              height={pilotisRect.h}
              fill="url(#parking-h)"
              stroke="#4B5563"
              strokeWidth={0.8}
              strokeDasharray="3 2"
              opacity={0.95}
            />
            {pilotisRect.h >= 12 && pilotisRect.w > 40 && (
              <text
                x={pilotisRect.x + pilotisRect.w / 2}
                y={pilotisRect.y + pilotisRect.h / 2 + 3}
                textAnchor="middle"
                style={{ fontSize: 9, fontWeight: 500, fill: "#1F2937" }}
              >
                필로티 (지상주차)
              </text>
            )}
          </g>
        )}

        {/* Day 10: 1F 남측 주차 영역 (입면도) */}
        {day10ParkingRect && (
          <g>
            <rect
              x={day10ParkingRect.x}
              y={day10ParkingRect.y}
              width={day10ParkingRect.w}
              height={day10ParkingRect.h}
              fill="url(#parking-h)"
              stroke="#993C1D"
              strokeWidth={1.2}
              strokeDasharray="4 3"
              opacity={0.95}
            />
            {day10ParkingRect.h >= 10 && day10ParkingRect.w > 28 && (
              <text
                x={day10ParkingRect.x + day10ParkingRect.w / 2}
                y={day10ParkingRect.y + day10ParkingRect.h / 2 + 3}
                textAnchor="middle"
                style={{ fontSize: 8, fontWeight: 700, fill: "#993C1D" }}
              >
                🚗 1층 주차 {day10.groundSpaces}대
              </text>
            )}
          </g>
        )}

        {/* 지하 주차장 박스 */}
        {basementBoxes.map((b, i) => (
          <g key={`bs-${i}`}>
            <rect
              x={eBldL}
              y={b.y}
              width={eBldR - eBldL}
              height={b.h}
              fill="url(#parking-h)"
              stroke="#4B5563"
              strokeWidth={0.6}
              strokeDasharray="2 2"
              opacity={0.9}
            />
            {b.h >= 9 && (
              <text
                x={eBldL + 4}
                y={b.y + b.h / 2 + 3}
                style={{ fontSize: 8, fontWeight: 500, fill: "#1F2937" }}
              >
                {b.label}
              </text>
            )}
          </g>
        ))}

        {dimX < 660 && (
          <>
            <line
              x1={dimX}
              y1={topYf}
              x2={dimX}
              y2={baseY}
              className="stroke-muted-foreground"
              strokeWidth={0.5}
            />
            <line
              x1={dimX - 3}
              y1={topYf}
              x2={dimX + 3}
              y2={topYf}
              className="stroke-muted-foreground"
              strokeWidth={0.5}
            />
            <line
              x1={dimX - 3}
              y1={baseY}
              x2={dimX + 3}
              y2={baseY}
              className="stroke-muted-foreground"
              strokeWidth={0.5}
            />
            <text
              x={dimX + 5}
              y={(topYf + baseY) / 2 + 3}
              style={{ fontSize: 9 }}
              className="fill-muted-foreground"
            >
              {fmt(heightM, 1)}m
            </text>
          </>
        )}

        <text
          x={eBldL - 15}
          y={baseY + 22}
          style={{ fontSize: 9, fontWeight: 500, fill: DANGER }}
        >
          ← N
        </text>
        <text
          x={eBldR + 5}
          y={baseY + 22}
          style={{ fontSize: 9 }}
          className="fill-muted-foreground"
        >
          S →
        </text>
      </svg>

      <div className="flex gap-3.5 text-[10px] text-muted-foreground mt-2 flex-wrap">
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block w-2.5 h-2.5"
            style={{ background: MASS_FILL }}
          />
          건축 가능 매스
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block w-2.5 h-2.5 border"
            style={{ background: "#FCEBEB", borderColor: DANGER }}
          />
          일조권 제한 영역
        </span>
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block w-2.5 h-0.5"
            style={{ background: DANGER }}
          />
          일조권 사선
        </span>
        {(parkingMode === "ground" ||
          parkingMode === "mixed" ||
          parkingMode === "basement") && (
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-2.5 border border-dashed"
              style={{ background: "#9CA3AF55", borderColor: "#4B5563" }}
            />
            주차장 ({parkingMode === "ground"
              ? "지상"
              : parkingMode === "basement"
                ? "지하"
                : "혼합"})
          </span>
        )}
      </div>
        </TabsContent>

        <TabsContent value="3d">
          <ScaleVisualizer3D />
        </TabsContent>
      </Tabs>
    </div>
  );
}
