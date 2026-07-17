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
import { getUseStyle, type FacadeStyle } from "@/lib/building-use";
import {
  scalePolygon,
  polygonBounds,
  polygonCentroid,
  lonLatToLocal,
  type Pt,
} from "@/lib/geo/parcel";
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

// 자동차 색상 팔레트 (index 순환)
const CAR_PALETTE = ["#DC2626", "#2563EB", "#E2E8F0", "#64748B", "#0F766E", "#D97706", "#1E293B"];

// 위에서 본 자동차 (평면도용)
function SvgCarTop({ cx, cy, w = 9, h = 14, color = "#374151" }: { cx: number; cy: number; w?: number; h?: number; color?: string }) {
  return (
    <g>
      <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} rx={2.2} fill={color} stroke="#00000033" strokeWidth={0.4} />
      {/* 앞유리 */}
      <rect x={cx - w / 2 + 1.2} y={cy - h / 2 + 2} width={w - 2.4} height={h * 0.24} rx={0.8} fill="#BFDBFE" opacity={0.9} />
      {/* 뒷유리 */}
      <rect x={cx - w / 2 + 1.2} y={cy + h / 2 - h * 0.18 - 1.2} width={w - 2.4} height={h * 0.16} rx={0.8} fill="#BFDBFE" opacity={0.7} />
      {/* 루프 하이라이트 */}
      <rect x={cx - w / 2 + 1.5} y={cy - h * 0.08} width={w - 3} height={h * 0.2} rx={0.8} fill="#ffffff" opacity={0.18} />
    </g>
  );
}

// 옆에서 본 자동차 (입면도용)
function SvgCarSide({ x, bottomY, scale = 1, color = "#374151" }: { x: number; bottomY: number; scale?: number; color?: string }) {
  const s = scale;
  const bw = 14 * s, bh = 5.5 * s, rw = 8.5 * s, rh = 4 * s, wr = 2 * s;
  return (
    <g>
      <rect x={x} y={bottomY - bh - wr * 0.6} width={bw} height={bh} rx={2 * s} fill={color} stroke="#00000033" strokeWidth={0.4} />
      <rect x={x + 2.2 * s} y={bottomY - bh - rh - wr * 0.6 + 0.5} width={rw} height={rh} rx={1.4 * s} fill={color} />
      <rect x={x + 3 * s} y={bottomY - bh - rh - wr * 0.6 + 1.2 * s} width={3.2 * s} height={rh - 1.8 * s} rx={0.6} fill="#BFDBFE" opacity={0.9} />
      <rect x={x + 7 * s} y={bottomY - bh - rh - wr * 0.6 + 1.2 * s} width={2.6 * s} height={rh - 1.8 * s} rx={0.6} fill="#BFDBFE" opacity={0.75} />
      <circle cx={x + 3 * s} cy={bottomY} r={wr} fill="#111827" />
      <circle cx={x + 3 * s} cy={bottomY} r={wr * 0.45} fill="#9CA3AF" />
      <circle cx={x + bw - 3 * s} cy={bottomY} r={wr} fill="#111827" />
      <circle cx={x + bw - 3 * s} cy={bottomY} r={wr * 0.45} fill="#9CA3AF" />
    </g>
  );
}

const DANGER = "#E24B4A";

// 용도별 입면(창문) 렌더. 정북단면도의 각 층에 용도군 특성에 맞는 창을 그린다.
function renderFacade(
  facade: FacadeStyle,
  floorIndex: number,
  fL: number,
  actualY: number,
  fW: number,
  actualH: number,
  glass: string,
  glassStroke: string,
): React.ReactNode {
  if (actualH < 10 || fW < 20) return null;

  const win = (
    winW: number,
    gapW: number,
    maxCount: number,
    winHRatio: number,
    maxWinH: number,
    rows = 1,
  ): React.ReactNode => {
    const pitch = winW + gapW;
    const count = Math.min(Math.floor((fW - gapW) / pitch), maxCount);
    if (count < 1) return null;
    const winH = Math.min(actualH * winHRatio, maxWinH);
    const startX = fL + (fW - (count * pitch - gapW)) / 2;
    const rowGap = 3;
    const totalH = rows * winH + (rows - 1) * rowGap;
    const startY = actualY + (actualH - totalH) / 2;
    const out: React.ReactNode[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < count; c++) {
        out.push(
          <rect
            key={`${r}-${c}`}
            x={startX + c * pitch}
            y={startY + r * (winH + rowGap)}
            width={winW}
            height={winH}
            rx={0.8}
            fill={glass}
            stroke={glassStroke}
            strokeWidth={0.4}
            opacity={0.95}
          />,
        );
      }
    }
    return out;
  };

  const ribbon = (): React.ReactNode => {
    const bW = Math.max(0, fW - 8);
    const bH = Math.min(actualH * 0.42, 8);
    const bY = actualY + (actualH - bH) / 2;
    const seg = Math.max(1, Math.floor(bW / 10));
    return (
      <g>
        <rect
          x={fL + 4}
          y={bY}
          width={bW}
          height={bH}
          rx={1}
          fill={glass}
          stroke={glassStroke}
          strokeWidth={0.5}
          opacity={0.95}
        />
        {Array.from({ length: seg - 1 }, (_, k) => (
          <line
            key={k}
            x1={fL + 4 + ((k + 1) * bW) / seg}
            y1={bY}
            x2={fL + 4 + ((k + 1) * bW) / seg}
            y2={bY + bH}
            stroke={glassStroke}
            strokeWidth={0.4}
            opacity={0.6}
          />
        ))}
      </g>
    );
  };

  switch (facade) {
    case "grid": // 업무: 촘촘한 커튼월 격자
      return win(7.5, 5.5, 14, 0.52, 10, actualH > 26 ? 2 : 1);
    case "punched": // 주거: 규칙적 작은 창
      return win(9, 12, 8, 0.42, 9, 1);
    case "storefront": {
      // 상가: 1층은 통유리, 상층은 펀치드
      if (floorIndex === 0) {
        const gW = Math.max(0, fW - 8);
        const gH = Math.min(actualH * 0.7, actualH - 4);
        if (gW < 6 || gH < 4) return null;
        const cols = Math.max(1, Math.floor(gW / 16));
        return (
          <g>
            <rect
              x={fL + 4}
              y={actualY + actualH - gH - 2}
              width={gW}
              height={gH}
              rx={1}
              fill={glass}
              stroke={glassStroke}
              strokeWidth={0.6}
              opacity={0.95}
            />
            {Array.from({ length: cols - 1 }, (_, k) => (
              <line
                key={k}
                x1={fL + 4 + ((k + 1) * gW) / cols}
                y1={actualY + actualH - gH - 2}
                x2={fL + 4 + ((k + 1) * gW) / cols}
                y2={actualY + actualH - 2}
                stroke={glassStroke}
                strokeWidth={0.5}
                opacity={0.7}
              />
            ))}
          </g>
        );
      }
      return win(8, 7, 12, 0.46, 9, 1);
    }
    case "band": // 숙박·문화: 가로 리본 창
      return ribbon();
    case "sparse": // 공장: 성긴 창
      return win(6, 20, 4, 0.3, 6, 1);
  }
}

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
  const mergedParcels = useSimulatorStore((s) => s.mergedParcels);
  const parcelShape = useSimulatorStore((s) => s.parcelShape);

  const z = ZONES[zone];
  const sunOn = sunOnRaw && z.residential;

  // 건축물 용도별 시각화 스타일 (색·외곽선·창문·입면·아이콘)
  const useStyle = getUseStyle(parkingUsage);
  const massEdge = useStyle.edge;

  const lotSqm = lotPyToSqm(lotPy);
  const bldArea = buildingFootprintSqm(lotSqm, covPct);
  const floors = floorsFromFarAndCov(farPct, covPct);
  const heightM = totalHeightM(floors);

  // 실형상 footprint (건폐율 √배 축소 근사) — 있으면 입면 깊이도 실형상 기준
  const bldScaleFactor = Math.sqrt(Math.max(covPct, 1) / 100);
  const parcelFp = parcelShape
    ? scalePolygon(parcelShape.pts, bldScaleFactor)
    : null;
  const parcelFpBounds = parcelFp ? polygonBounds(parcelFp) : null;
  const northDepth = parcelFpBounds
    ? parcelFpBounds.maxY - parcelFpBounds.minY
    : Math.sqrt(bldArea);

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

  // ── 실형상 평면 지오메트리 (연속지적도 폴리곤 → SVG 좌표 변환) ──
  // 로컬 미터(x=동+, y=북+) → SVG(x=우+, y=하+). 북=위이므로 y 부호 반전.
  const parcelPlan = (() => {
    if (!parcelShape || !parcelFp || !parcelFpBounds) return null;
    const b = parcelShape.bounds;
    const w = b.maxX - b.minX;
    const h = b.maxY - b.minY;
    if (w <= 0 || h <= 0) return null;
    const s = lotPx / Math.max(w, h); // m → px
    const cx0 = (b.minX + b.maxX) / 2;
    const cy0 = (b.minY + b.maxY) / 2;
    const toSvg = ([x, y]: Pt): [number, number] => [
      planCx + (x - cx0) * s,
      planCy - (y - cy0) * s,
    ];
    const pathOf = (pts: Pt[]) =>
      pts
        .map((p, i) => {
          const [sx, sy] = toSvg(p);
          return `${i === 0 ? "M" : "L"}${sx.toFixed(1)} ${sy.toFixed(1)}`;
        })
        .join(" ") + " Z";
    // 일조권 후퇴선: 필지 최북단에서 maxSetback(m)만큼 남쪽
    const sunSvgY = planSunlight
      ? planCy - (b.maxY - planSunlight.maxSetback - cy0) * s
      : null;
    const topSvgY = planCy - (b.maxY - cy0) * s;
    // footprint svg bbox (주차 띠 배치용)
    const fpTopY = planCy - (parcelFpBounds.maxY - cy0) * s;
    const fpBotY = planCy - (parcelFpBounds.minY - cy0) * s;
    const fpLeftX = planCx + (parcelFpBounds.minX - cx0) * s;
    const fpRightX = planCx + (parcelFpBounds.maxX - cx0) * s;
    // 합필 구성 필지 경계선 + 라벨 (union 형상일 때만)
    const memberOverlays = parcelShape.members
      ? parcelShape.members.map((m) => {
          const localPts = m.ring.map((p) =>
            lonLatToLocal(parcelShape, p),
          ) as Pt[];
          const c = polygonCentroid(localPts);
          return { path: pathOf(localPts), labelXY: toSvg(c), label: m.label };
        })
      : null;
    return {
      parcelPath: pathOf(parcelShape.pts),
      fpPath: pathOf(parcelFp),
      sunSvgY,
      topSvgY,
      fpTopY,
      fpBotY,
      fpLeftX,
      fpRightX,
      centroid: toSvg([0, 0]),
      memberOverlays,
    };
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
          fill={isPartial ? useStyle.gradTop : "url(#mass-grad)"}
          stroke={massEdge}
          strokeWidth={0.5}
          strokeDasharray={isPartial ? "3 2" : undefined}
        />
        {/* 용도별 유리창(입면) */}
        {!isPartial &&
          renderFacade(
            useStyle.facade,
            i,
            fL,
            actualY,
            fW,
            actualH,
            useStyle.glass,
            useStyle.glassStroke,
          )}
        {phPx >= 14 && fW > 30 && (
          <text
            x={eBldR - 4}
            y={actualY + actualH / 2 + 3}
            textAnchor="end"
            style={{
              fontSize: 8,
              fill: massEdge,
              opacity: 0.85,
              paintOrder: "stroke",
              stroke: "#ffffff",
              strokeWidth: 2,
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
            {parcelShape && (
              <span
                className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: "#2563EB18", color: "#2563EB" }}
              >
                📐 {parcelShape.isMerged
                  ? `합필 ${parcelShape.members?.length ?? 0}필지 실형상`
                  : "실제 지적 형상 반영"} ({parcelShape.areaSqm.toLocaleString("ko-KR")}㎡)
              </span>
            )}
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
          <linearGradient id="mass-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={useStyle.gradTop} />
            <stop offset="55%" stopColor={useStyle.gradMid} />
            <stop offset="100%" stopColor={useStyle.gradBottom} />
          </linearGradient>
          <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#CFE5F7" stopOpacity={0.95} />
            <stop offset="100%" stopColor="#CFE5F7" stopOpacity={0} />
          </linearGradient>
          <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#4A1B0C" floodOpacity="0.28" />
          </filter>
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
        {parcelPlan ? (
          <>
            <clipPath id="parcel-clip">
              <path d={parcelPlan.parcelPath} />
            </clipPath>
            <path
              d={parcelPlan.parcelPath}
              className="fill-card stroke-foreground/60"
              strokeWidth={1}
              strokeDasharray="4 3"
            />
            {/* 합필 구성 필지 경계선 + 지번 라벨 */}
            {parcelPlan.memberOverlays?.map((m, i) => (
              <g key={`member-${i}`}>
                <path
                  d={m.path}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth={1}
                  strokeDasharray="5 3"
                  opacity={0.75}
                />
                <text
                  x={m.labelXY[0]}
                  y={m.labelXY[1]}
                  textAnchor="middle"
                  style={{
                    fontSize: 7.5,
                    fontWeight: 700,
                    fill: "#2563EB",
                    paintOrder: "stroke",
                    stroke: "#ffffff",
                    strokeWidth: 2.2,
                  }}
                >
                  {String.fromCharCode(65 + i)} {m.label}
                </text>
              </g>
            ))}
            <text
              x={planCx}
              y={ly - 6}
              textAnchor="middle"
              style={{ fontSize: 9 }}
              className="fill-muted-foreground"
            >
              {parcelShape?.isMerged
                ? `대지경계선 (합필 ${parcelShape.members?.length ?? 0}필지 실형상)`
                : "대지경계선 (실제 지적 형상)"}
            </text>
          </>
        ) : (
          <>
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
          </>
        )}

        {planSunlight && parcelPlan?.sunSvgY != null ? (
          <>
            {/* 실형상: 필지 최북단 − 이격거리 라인 북쪽을 폴리곤에 클리핑해 해칭 */}
            <rect
              x={lx - 10}
              y={parcelPlan.topSvgY - 2}
              width={lotPx + 20}
              height={Math.max(0, parcelPlan.sunSvgY - parcelPlan.topSvgY + 2)}
              fill="url(#no-build)"
              clipPath="url(#parcel-clip)"
            />
            <line
              x1={lx}
              y1={parcelPlan.sunSvgY}
              x2={lx + lotPx}
              y2={parcelPlan.sunSvgY}
              stroke={DANGER}
              strokeWidth={1}
              strokeDasharray="3 2"
            />
            <text
              x={lx + lotPx - 4}
              y={parcelPlan.sunSvgY - 3}
              textAnchor="end"
              style={{ fontSize: 8, fill: DANGER }}
            >
              사선이격 {fmt(planSunlight.maxSetback, 1)}m
            </text>
          </>
        ) : planSunlight ? (
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
        ) : null}

        {parcelPlan ? (
          (() => {
            // ── 실형상 건축면적 footprint ──
            const fpH = parcelPlan.fpBotY - parcelPlan.fpTopY;
            const stripH = fpH * day10ParkingFraction;
            const [ccx, ccy] = parcelPlan.centroid;
            return (
              <>
                <path
                  d={parcelPlan.fpPath}
                  fill="url(#mass-grad)"
                  stroke={massEdge}
                  strokeWidth={0.8}
                  filter="url(#soft-shadow)"
                />
                {/* 1층 지상주차 띠 (남측=하단, footprint에 클리핑) */}
                {stripH > 0 && (
                  <>
                    <clipPath id="fp-clip">
                      <path d={parcelPlan.fpPath} />
                    </clipPath>
                    <g clipPath="url(#fp-clip)">
                      <rect
                        x={parcelPlan.fpLeftX - 2}
                        y={parcelPlan.fpBotY - stripH}
                        width={parcelPlan.fpRightX - parcelPlan.fpLeftX + 4}
                        height={stripH + 2}
                        fill="url(#parking-h)"
                        stroke="#993C1D"
                        strokeWidth={1}
                        strokeDasharray="4 3"
                        opacity={0.95}
                      />
                    </g>
                    {stripH >= 12 && (
                      <text
                        x={ccx}
                        y={parcelPlan.fpBotY - 5}
                        textAnchor="middle"
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          fill: "#993C1D",
                          paintOrder: "stroke",
                          stroke: "#ffffff",
                          strokeWidth: 2.5,
                        }}
                      >
                        🚗 주차 {day10.groundSpaces}대 · {fmt(day10.groundParkingArea, 0)}㎡
                      </text>
                    )}
                  </>
                )}
                <text
                  x={ccx}
                  y={ccy - 5}
                  textAnchor="middle"
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    fill: massEdge,
                    paintOrder: "stroke",
                    stroke: "#ffffff",
                    strokeWidth: 2.5,
                  }}
                >
                  건축면적 {fmt(bldArea / PY_TO_SQM, 0)}평
                </text>
                <text
                  x={ccx}
                  y={ccy + 9}
                  textAnchor="middle"
                  style={{
                    fontSize: 8.5,
                    fontWeight: 700,
                    fill: massEdge,
                    paintOrder: "stroke",
                    stroke: "#ffffff",
                    strokeWidth: 2.5,
                  }}
                >
                  {useStyle.icon} {useStyle.usageLabel}
                </text>
              </>
            );
          })()
        ) : day10ParkingFraction > 0 ? (
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
                    fill="url(#mass-grad)"
                    stroke={massEdge}
                    strokeWidth={0.8}
                    filter="url(#soft-shadow)"
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
                    {/* 주차선 + 위에서 본 자동차 */}
                    {parkH >= 18 && bldPx >= 16 && (() => {
                      const CW = 9, CH = 13, GX = 4, GY = 4;
                      const cols = Math.max(1, Math.floor((bldPx - 4) / (CW + GX)));
                      const rows = Math.max(1, Math.floor((parkH - 4) / (CH + GY)));
                      const shown = Math.min(day10.groundSpaces, cols * rows);
                      const slotLines = Array.from({ length: cols - 1 }, (_, c) => (
                        <line
                          key={`sl-${c}`}
                          x1={bx + 2 + (c + 1) * (CW + GX) - GX / 2}
                          y1={by + indoorH + 2}
                          x2={bx + 2 + (c + 1) * (CW + GX) - GX / 2}
                          y2={by + indoorH + Math.min(parkH - 2, rows * (CH + GY) + 2)}
                          stroke="#ffffff"
                          strokeWidth={0.8}
                          opacity={0.85}
                        />
                      ));
                      const cars = Array.from({ length: shown }, (_, i) => {
                        const col = i % cols;
                        const row = Math.floor(i / cols);
                        return (
                          <SvgCarTop
                            key={i}
                            cx={bx + 2 + col * (CW + GX) + CW / 2 + GX / 2}
                            cy={by + indoorH + 3 + row * (CH + GY) + CH / 2}
                            color={CAR_PALETTE[i % CAR_PALETTE.length]}
                          />
                        );
                      });
                      return (
                        <>
                          {slotLines}
                          {cars}
                        </>
                      );
                    })()}
                    {parkH >= 14 && bldPx > 40 && (
                      <text
                        x={planCx}
                        y={by + indoorH + parkH - 4}
                        textAnchor="middle"
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          fill: "#993C1D",
                          paintOrder: "stroke",
                          stroke: "#ffffff",
                          strokeWidth: 2.5,
                        }}
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
                      style={{ fontSize: 10, fontWeight: 500, fill: massEdge }}
                    >
                      영업 가능
                    </text>
                    <text
                      x={planCx}
                      y={by + indoorH / 2 + 10}
                      textAnchor="middle"
                      style={{ fontSize: 8, fill: massEdge }}
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
              fill="url(#mass-grad)"
              stroke={massEdge}
              strokeWidth={0.8}
              filter="url(#soft-shadow)"
            />
            {bldPx > 50 && (
              <>
                <text
                  x={planCx}
                  y={by + bldPx / 2 - 3}
                  textAnchor="middle"
                  style={{ fontSize: 11, fontWeight: 500, fill: massEdge }}
                >
                  건축면적
                </text>
                <text
                  x={planCx}
                  y={by + bldPx / 2 + 11}
                  textAnchor="middle"
                  style={{ fontSize: 9, fill: massEdge }}
                >
                  {fmt(bldArea / PY_TO_SQM, 0)}평
                </text>
                <text
                  x={planCx}
                  y={by + bldPx / 2 + 24}
                  textAnchor="middle"
                  style={{
                    fontSize: 8.5,
                    fontWeight: 700,
                    fill: massEdge,
                    paintOrder: "stroke",
                    stroke: "#ffffff",
                    strokeWidth: 2.5,
                  }}
                >
                  {useStyle.icon} {useStyle.usageLabel}
                </text>
              </>
            )}
          </>
        )}

        {/* 합필 필지 경계선 + 라벨 (정사각형 근사 모드 전용 — 실형상은 memberOverlays로 표시) */}
        {!parcelPlan && mergedParcels.length >= 2 && (() => {
          const total = mergedParcels.reduce((s, p) => s + p.areaSqm, 0);
          if (total <= 0) return null;
          const items: React.ReactNode[] = [];
          let acc = 0;
          mergedParcels.forEach((p, i) => {
            const startX = lx + (acc / total) * lotPx;
            acc += p.areaSqm;
            const endX = lx + (acc / total) * lotPx;
            if (i < mergedParcels.length - 1) {
              items.push(
                <line
                  key={`mb-${i}`}
                  x1={endX}
                  y1={ly}
                  x2={endX}
                  y2={ly + lotPx}
                  stroke="#2563EB"
                  strokeWidth={1.3}
                  strokeDasharray="6 4"
                  opacity={0.8}
                />,
              );
            }
            if (endX - startX >= 22) {
              items.push(
                <text
                  key={`ml-${i}`}
                  x={(startX + endX) / 2}
                  y={ly + 11}
                  textAnchor="middle"
                  style={{
                    fontSize: 7.5,
                    fontWeight: 700,
                    fill: "#2563EB",
                    paintOrder: "stroke",
                    stroke: "#ffffff",
                    strokeWidth: 2.2,
                  }}
                >
                  {String.fromCharCode(65 + i)} {p.label}
                </text>,
                <text
                  key={`ma-${i}`}
                  x={(startX + endX) / 2}
                  y={ly + 20}
                  textAnchor="middle"
                  style={{
                    fontSize: 6.5,
                    fill: "#2563EB",
                    paintOrder: "stroke",
                    stroke: "#ffffff",
                    strokeWidth: 2,
                  }}
                >
                  {fmt(p.areaSqm, 0)}㎡
                </text>,
              );
            }
          });
          items.push(
            <text
              key="mbadge"
              x={lx + 3}
              y={ly + lotPx - 5}
              style={{
                fontSize: 8.5,
                fontWeight: 700,
                fill: "#2563EB",
                paintOrder: "stroke",
                stroke: "#ffffff",
                strokeWidth: 2.5,
              }}
            >
              🔗 합필 {mergedParcels.length}필지
            </text>,
          );
          return <g>{items}</g>;
        })()}

        <rect
          x={lx}
          y={ry}
          width={lotPx}
          height={rPx}
          fill="url(#road-h)"
          className="text-muted-foreground stroke-muted-foreground"
          strokeWidth={0.5}
        />
        {/* 도로 중앙선 (황색 점선) */}
        {rPx >= 16 && (
          <line
            x1={lx + 5}
            y1={ry + rPx / 2}
            x2={lx + lotPx - 5}
            y2={ry + rPx / 2}
            stroke="#F2C744"
            strokeWidth={1.6}
            strokeDasharray="9 7"
            opacity={0.9}
          />
        )}
        <text
          x={planCx}
          y={ry + rPx / 2 + 3}
          textAnchor="middle"
          style={{
            fontSize: 10,
            fontWeight: 500,
            paintOrder: "stroke",
            stroke: "var(--card)",
            strokeWidth: 3,
          }}
          className="fill-muted-foreground"
        >
          전면도로 {roadM}m
        </text>

        {/* 입면도 — 하늘 + 태양 (남측) */}
        <rect x={372} y={30} width={300} height={baseY - 30} fill="url(#sky-grad)" rx={6} />
        <g opacity={0.95}>
          <circle cx={645} cy={55} r={9} fill="#FBBF24" />
          <circle cx={645} cy={55} r={9} fill="#FDE68A" opacity={0.5} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4;
            return (
              <line
                key={i}
                x1={645 + Math.cos(a) * 12}
                y1={55 + Math.sin(a) * 12}
                x2={645 + Math.cos(a) * 16.5}
                y2={55 + Math.sin(a) * 16.5}
                stroke="#FBBF24"
                strokeWidth={1.8}
                strokeLinecap="round"
              />
            );
          })}
          <text x={645} y={82} textAnchor="middle" style={{ fontSize: 7.5, fill: "#B45309" }}>
            남측 채광
          </text>
        </g>
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

        {/* 용도 배지 — 건물 상단에 아이콘 + 용도명 */}
        <text
          x={(eBldL + eBldR) / 2}
          y={Math.max(topYf - 6, 42)}
          textAnchor="middle"
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            fill: massEdge,
            paintOrder: "stroke",
            stroke: "#ffffff",
            strokeWidth: 3,
          }}
        >
          {useStyle.icon} {useStyle.usageLabel}
        </text>

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
            {/* 옆에서 본 자동차 아이콘 */}
            {pilotisRect.h >= 14 && pilotisRect.w >= 20 && (() => {
              const carW = 16, gap = 4;
              const cols = Math.max(1, Math.floor((pilotisRect.w - 6) / (carW + gap)));
              const shown = Math.min(spaces, cols);
              return Array.from({ length: shown }, (_, i) => (
                <SvgCarSide
                  key={i}
                  x={pilotisRect.x + 3 + i * (carW + gap)}
                  bottomY={pilotisRect.y + pilotisRect.h - 1}
                  color={CAR_PALETTE[i % CAR_PALETTE.length]}
                />
              ));
            })()}
            {pilotisRect.h >= 12 && pilotisRect.w > 40 && (
              <text
                x={pilotisRect.x + pilotisRect.w / 2}
                y={pilotisRect.y + 9}
                textAnchor="middle"
                style={{ fontSize: 8, fontWeight: 500, fill: "#1F2937" }}
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
            {/* 옆에서 본 자동차 아이콘 */}
            {day10ParkingRect.h >= 14 && day10ParkingRect.w >= 18 && (() => {
              const carW = 16, gap = 4;
              const cols = Math.max(1, Math.floor((day10ParkingRect.w - 4) / (carW + gap)));
              const shown = Math.min(day10.groundSpaces, cols);
              return Array.from({ length: shown }, (_, i) => (
                <SvgCarSide
                  key={i}
                  x={day10ParkingRect.x + 2 + i * (carW + gap)}
                  bottomY={day10ParkingRect.y + day10ParkingRect.h - 1}
                  color={CAR_PALETTE[i % CAR_PALETTE.length]}
                />
              ));
            })()}
            {day10ParkingRect.h >= 10 && day10ParkingRect.w > 28 && (
              <text
                x={day10ParkingRect.x + day10ParkingRect.w / 2}
                y={day10ParkingRect.y + 8}
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
            style={{ background: useStyle.gradMid }}
          />
          {useStyle.icon} {useStyle.usageLabel} 매스
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
        {mergedParcels.length >= 2 && (
          <span className="inline-flex items-center gap-1">
            <span
              className="inline-block w-2.5 h-0.5"
              style={{ background: "#2563EB" }}
            />
            합필 필지 경계 ({mergedParcels.length}필지)
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
