"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Grid, Text, Line } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { useSimulatorStore } from "@/store/simulator";
import { ZONES } from "@/lib/zones";
import { FLOOR_HEIGHT_M } from "@/lib/constants";
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
import { getUseStyle } from "@/lib/building-use";
import {
  scalePolygon,
  clipPolygonBelowY,
  polygonBounds,
  lonLatToLocal,
  type ParcelShape,
  type Pt,
} from "@/lib/geo/parcel";

const DANGER = "#E24B4A";
const PARKING_COLOR = "#9CA3AF";
const PARKING_EDGE = "#4B5563";
const ROAD_COLOR = "#8B8D91";
const LOT_COLOR = "#fbfaf6";
const GLASS_COLOR = "#9CC3E5";
const CAR_COLORS = ["#DC2626", "#2563EB", "#F1F5F9", "#64748B", "#0F766E", "#D97706", "#1E293B"];

type PresetKey = "iso" | "top" | "south" | "north";

const PRESETS: Record<PresetKey, [number, number, number]> = {
  iso: [40, 35, 40],
  top: [0, 70, 0.5],
  south: [0, 18, 55],
  north: [0, 18, -55],
};

const PRESET_LABEL: Record<PresetKey, string> = {
  iso: "기본 뷰",
  top: "위에서",
  south: "남쪽 정면",
  north: "북쪽 정면",
};

export default function ScaleVisualizer3D() {
  const [preset, setPreset] = useState<PresetKey>("iso");
  const [autoRotate, setAutoRotate] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div className="rounded-md overflow-hidden border border-border bg-card">
      <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 border-b border-border bg-secondary/40">
        {(["iso", "top", "south", "north"] as PresetKey[]).map((k) => (
          <Button
            key={k}
            size="xs"
            variant={preset === k ? "secondary" : "ghost"}
            onClick={() => setPreset(k)}
            className="text-[11px]"
          >
            {k === "iso"
              ? "🏠 "
              : k === "top"
                ? "⬆ "
                : k === "south"
                  ? "← "
                  : "→ "}
            {PRESET_LABEL[k]}
          </Button>
        ))}
        <div className="flex-1" />
        <Button
          size="xs"
          variant={autoRotate ? "secondary" : "ghost"}
          onClick={() => setAutoRotate((v) => !v)}
          className="text-[11px]"
        >
          🔄 자동 회전 {autoRotate ? "ON" : "OFF"}
        </Button>
      </div>
      <div
        style={{
          height: isMobile ? 360 : 480,
          background: "linear-gradient(180deg, #cfe3f5 0%, #e8eee6 55%, #f5f3ee 100%)",
        }}
      >
        <Canvas
          frameloop="demand"
          shadows
          dpr={[1, 2]}
          performance={{ min: 0.5 }}
          camera={{ position: PRESETS.iso, fov: 35, near: 0.1, far: 2000 }}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
        >
          <Suspense fallback={null}>
            <Scene
              preset={preset}
              autoRotate={autoRotate}
              showGrid={!isMobile}
            />
            <CaptureRegistrar />
          </Suspense>
        </Canvas>
      </div>
      <div className="px-2.5 py-1.5 text-[10.5px] text-muted-foreground border-t border-border bg-secondary/40 flex flex-wrap items-center gap-3">
        <span>마우스: 드래그 회전 · 휠 줌 · 우클릭 이동</span>
        <span>•</span>
        <span>모든 값은 좌측 슬라이더·토글로 실시간 반영</span>
      </div>
    </div>
  );
}

function Scene({
  preset,
  autoRotate,
  showGrid,
}: {
  preset: PresetKey;
  autoRotate: boolean;
  showGrid: boolean;
}) {
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

  const lotSqm = lotPyToSqm(lotPy);
  const bldArea = buildingFootprintSqm(lotSqm, covPct);
  const floors = floorsFromFarAndCov(farPct, covPct);
  const heightM = totalHeightM(floors);

  const lotSide = Math.sqrt(lotSqm); // 정사각형 대지 단순화
  const bldSide = Math.sqrt(bldArea);

  // 건물 위치: 대지 내부에서 남쪽으로 60% 오프셋 (정북에 여유 두기)
  const bldOffsetZ = (lotSide - bldSide) * 0.1; // +z = 남쪽

  // 건축물 용도별 3D 색상/라벨
  const useStyle = getUseStyle(parkingUsage);

  // 주차 대수 → 지상/지하 면적
  const parkingStd = PARKING_STANDARDS[parkingUsage];
  const gfa = lotSqm * farPct / 100;
  const spaces =
    parkingStd.mode === "area"
      ? calcArea(gfa, parkingAreaPerSpace).spaces
      : parkingStd.mode === "progressive"
        ? calcProgressive(gfa, parkingProgressiveSpec).spaces
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
  const pilotisFloors = bldArea > 0 ? groundPark / bldArea : 0;
  const basementLv = bldArea > 0 ? basementPark / bldArea : 0;

  // Day 10: 1F 분해 — 30㎡/대 + 필로티 분기 (시행령 119조 1항 2호 가목 4)
  const gp = calculateGroundParking({
    placement: parkingMode,
    spaces,
    unitArea: parkingUnitArea,
    pilotiMode: parkingPilotiMode,
    groundRatioPct: parkingGroundRatio,
  });
  const day10ParkingFraction =
    bldArea > 0 && gp.groundParkingArea > 0
      ? Math.min(1, gp.groundParkingArea / bldArea)
      : 0;

  // 실형상 폴리곤 있으면 남/북 경계를 폴리곤 bounds 기준으로 (z = -y_north)
  const pb = parcelShape ? parcelShape.bounds : null;
  const southZ = pb ? -pb.minY : lotSide / 2;
  const northZ = pb ? -pb.maxY : -lotSide / 2;

  // 도로: 대지 남쪽
  const roadDepth = Math.min(roadM, 25);
  const roadZ = southZ + roadDepth / 2;

  return (
    <>
      <ambientLight intensity={0.5} color="#fff7ec" />
      <directionalLight
        position={[28, 42, 20]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-camera-far={200}
        shadow-bias={-0.0005}
      />
      <directionalLight position={[-15, 20, -15]} intensity={0.25} />

      <CameraRig preset={preset} autoRotate={autoRotate} />

      {showGrid && (
        <Grid
          args={[200, 200]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#d4d0c4"
          sectionSize={10}
          sectionThickness={1}
          sectionColor="#b0aa9a"
          fadeDistance={120}
          fadeStrength={1}
          position={[0, -0.02, 0]}
          infiniteGrid={false}
        />
      )}

      {/* 주변 지반 (그림자 수신) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 0]} receiveShadow>
        <planeGeometry args={[240, 240]} />
        <meshStandardMaterial color="#e9ebe0" roughness={1} />
      </mesh>

      {/* 대지 — 실형상 폴리곤 있으면 실제 지적 모양으로 */}
      {parcelShape ? (
        <ParcelLot shape={parcelShape} />
      ) : (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
            <planeGeometry args={[lotSide, lotSide]} />
            <meshStandardMaterial color={LOT_COLOR} roughness={1} />
          </mesh>
          <LotBoundary side={lotSide} />
        </>
      )}

      {/* 합필 필지 경계 (지면 점선 + 라벨) */}
      {mergedParcels.length >= 2 && (() => {
        const total = mergedParcels.reduce((s, p) => s + p.areaSqm, 0);
        if (total <= 0) return null;
        const items: React.ReactNode[] = [];
        let acc = 0;
        mergedParcels.forEach((p, i) => {
          const x0 = -lotSide / 2 + (acc / total) * lotSide;
          acc += p.areaSqm;
          const x1 = -lotSide / 2 + (acc / total) * lotSide;
          if (i < mergedParcels.length - 1) {
            items.push(
              <Line
                key={`mb-${i}`}
                points={[
                  [x1, 0.03, -lotSide / 2],
                  [x1, 0.03, lotSide / 2],
                ]}
                color="#2563EB"
                lineWidth={1.8}
                dashed
                dashSize={0.9}
                gapSize={0.6}
              />,
            );
          }
          if (x1 - x0 > lotSide * 0.12) {
            items.push(
              <Text
                key={`mt-${i}`}
                position={[(x0 + x1) / 2, 0.04, lotSide / 2 - 1.6]}
                rotation={[-Math.PI / 2, 0, 0]}
                fontSize={Math.min(1.3, lotSide * 0.045)}
                color="#2563EB"
                anchorX="center"
                anchorY="middle"
              >
                {`${String.fromCharCode(65 + i)} ${p.label}`}
              </Text>,
            );
          }
        });
        items.push(
          <Text
            key="mbadge"
            position={[0, 0.04, -lotSide / 2 + 1.5]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={Math.min(1.5, lotSide * 0.05)}
            color="#2563EB"
            anchorX="center"
            anchorY="middle"
          >
            {`합필 ${mergedParcels.length}필지`}
          </Text>,
        );
        return <group>{items}</group>;
      })()}

      {/* 인도 (대지-도로 사이) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, southZ + 0.7]} receiveShadow>
        <planeGeometry args={[lotSide + 6, 1.4]} />
        <meshStandardMaterial color="#d8d5ca" roughness={1} />
      </mesh>

      {/* 도로 (남쪽) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, roadZ + 1.4]}
        receiveShadow
      >
        <planeGeometry args={[lotSide + 6, roadDepth]} />
        <meshStandardMaterial color={ROAD_COLOR} roughness={0.95} />
      </mesh>
      {/* 도로 중앙선 (황색 점선) */}
      {roadDepth >= 5 && (
        <Line
          points={[
            [-(lotSide + 6) / 2 + 0.5, 0.02, roadZ + 1.4],
            [(lotSide + 6) / 2 - 0.5, 0.02, roadZ + 1.4],
          ]}
          color="#F2C744"
          lineWidth={2.5}
          dashed
          dashSize={1.4}
          gapSize={1.0}
        />
      )}
      <RoadLabel side={lotSide} z={roadZ + 1.4} text={`전면도로 ${roadM}m`} />

      {/* 가로수 */}
      {lotSide > 10 && (
        <>
          <TreeMesh position={[-lotSide / 2 - 3, 0, -lotSide / 2 + 2]} scale={Math.min(1.5, lotSide / 16)} />
          <TreeMesh position={[lotSide / 2 + 3, 0, -lotSide / 2 + 4]} scale={Math.min(1.3, lotSide / 18)} />
          <TreeMesh position={[-lotSide / 2 - 3.4, 0, 1]} scale={Math.min(1.4, lotSide / 17)} />
          <TreeMesh position={[lotSide / 2 + 3.2, 0, lotSide / 4]} scale={Math.min(1.5, lotSide / 16)} />
          <TreeMesh position={[-lotSide / 2 - 2.8, 0, lotSide / 2 - 1.5]} scale={Math.min(1.2, lotSide / 19)} />
        </>
      )}

      {/* 정북 표시 */}
      <NorthArrow z={northZ - 4} />

      {/* 건물 매스 — 실형상 폴리곤 있으면 실제 지적 모양으로 압출 */}
      {parcelShape ? (
        <ParcelMass
          shape={parcelShape}
          covPct={covPct}
          floors={floors}
          sunOn={sunOn}
          massColor={useStyle.gradMid}
          glassColor={useStyle.glass}
          edgeColor={useStyle.edge}
          useIcon={useStyle.icon}
          useLabel={useStyle.usageLabel}
        />
      ) : (
        <BuildingMass
          bldSide={bldSide}
          floors={floors}
          offsetZ={bldOffsetZ}
          sunOn={sunOn}
          pilotisFloors={pilotisFloors}
          day10ParkingFraction={day10ParkingFraction}
          day10IsPiloti={gp.isReducingFloor1}
          day10GroundSpaces={gp.groundSpaces}
          massColor={useStyle.gradMid}
          glassColor={useStyle.glass}
          edgeColor={useStyle.edge}
          useIcon={useStyle.icon}
          useLabel={useStyle.usageLabel}
        />
      )}

      {/* 일조권 사선면 (참고용 — 정북측 envelope)
          실형상 모드는 층별 클리핑으로 후퇴가 이미 표현되므로 envelope 생략 */}
      {sunOn && heightM > 0 && !parcelShape && (
        <SunlightEnvelope
          bldSide={bldSide}
          heightM={heightM}
          offsetZ={bldOffsetZ}
        />
      )}

      {/* 지하 주차장 박스 */}
      <BasementBoxes
        bldSide={bldSide}
        levels={basementLv}
        offsetZ={bldOffsetZ}
      />

      <OrbitControls
        makeDefault
        regress
        enableDamping
        dampingFactor={0.08}
        autoRotate={autoRotate}
        autoRotateSpeed={1.0}
        target={[0, Math.min(heightM * 0.4, 12), 0]}
        minDistance={10}
        maxDistance={500}
        maxPolarAngle={Math.PI / 2 - 0.02}
      />
    </>
  );
}

/** Canvas 마운트 시 toDataURL 캡쳐 함수를 simulator store에 등록, 언마운트 시 해제. */
function CaptureRegistrar() {
  const { gl } = useThree();
  useEffect(() => {
    const fn = () => gl.domElement.toDataURL("image/png");
    useSimulatorStore.getState().setCapture3D(fn);
    return () => {
      useSimulatorStore.getState().setCapture3D(null);
    };
  }, [gl]);
  return null;
}

function CameraRig({
  preset,
  autoRotate,
}: {
  preset: PresetKey;
  autoRotate: boolean;
}) {
  const { camera, invalidate } = useThree();
  const target = useRef(new THREE.Vector3(...PRESETS[preset]));
  const lerping = useRef(false);

  useEffect(() => {
    target.current.set(...PRESETS[preset]);
    lerping.current = true;
    invalidate(); // frameloop="demand" 모드에서 lerp 시작 트리거
  }, [preset, invalidate]);

  useFrame(() => {
    if (autoRotate) return; // OrbitControls가 회전 중일 때는 우리가 손대지 않음
    if (!lerping.current) return;
    camera.position.lerp(target.current, 0.08);
    if (camera.position.distanceTo(target.current) < 0.5) {
      camera.position.copy(target.current);
      lerping.current = false;
    } else {
      invalidate(); // lerp가 끝날 때까지 매 프레임 요청
    }
  });
  return null;
}

function LotBoundary({ side }: { side: number }) {
  const half = side / 2;
  const pts = useMemo(
    () => [
      [-half, 0.01, -half],
      [half, 0.01, -half],
      [half, 0.01, half],
      [-half, 0.01, half],
      [-half, 0.01, -half],
    ] as [number, number, number][],
    [half],
  );
  return (
    <Line
      points={pts}
      color="#666"
      lineWidth={1.4}
      dashed
      dashSize={0.8}
      gapSize={0.5}
    />
  );
}

function RoadLabel({
  side,
  z,
  text,
}: {
  side: number;
  z: number;
  text: string;
}) {
  return (
    <Text
      position={[0, 0.02, z]}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={Math.min(2, side * 0.06)}
      color="#5a5a5a"
      anchorX="center"
      anchorY="middle"
    >
      {text}
    </Text>
  );
}

function NorthArrow({ z }: { z: number }) {
  return (
    <group position={[0, 0.05, z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[1.6, 24]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <Line
        points={[
          [0, 0.06, 1.2],
          [0, 0.06, -1.2],
          [-0.5, 0.06, -0.6],
          [0, 0.06, -1.2],
          [0.5, 0.06, -0.6],
        ]}
        color={DANGER}
        lineWidth={2.5}
      />
      <Text
        position={[0, 0.07, 0.4]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={1.0}
        color={DANGER}
        anchorX="center"
        anchorY="middle"
      >
        N
      </Text>
      <Text
        position={[0, 0.07, 2.6]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.8}
        color="#5a5a5a"
        anchorX="center"
        anchorY="middle"
      >
        정북
      </Text>
    </group>
  );
}

function BuildingMass({
  bldSide,
  floors,
  offsetZ,
  sunOn,
  pilotisFloors,
  day10ParkingFraction,
  day10IsPiloti,
  day10GroundSpaces,
  massColor,
  glassColor,
  edgeColor,
  useIcon,
  useLabel,
}: {
  bldSide: number;
  floors: number;
  offsetZ: number;
  sunOn: boolean;
  pilotisFloors: number;
  day10ParkingFraction: number;
  day10IsPiloti: boolean;
  day10GroundSpaces: number;
  massColor: string;
  glassColor: string;
  edgeColor: string;
  useIcon: string;
  useLabel: string;
}) {
  const ceilFloors = Math.ceil(floors);
  const boxes: React.ReactNode[] = [];
  const bldCenterZ = offsetZ;

  for (let i = 0; i < ceilFloors; i++) {
    const fH = (i + 1) * FLOOR_HEIGHT_M;
    let setback = 0;
    if (sunOn && fH > SUNLIGHT_THRESHOLD_M) setback = fH / 2 - 1.5;
    else if (sunOn) setback = 1.5;

    const depth = Math.max(0, bldSide - setback);
    if (depth <= 0) continue;

    const portion = i + 1 <= floors ? 1 : floors - i;
    if (portion <= 0) break;
    const floorH = FLOOR_HEIGHT_M * portion;
    const y = i * FLOOR_HEIGHT_M + floorH / 2;
    const cz = bldCenterZ + setback / 2;

    // Day 10: 1F + 지상주차 있을 때 → 실내 + 주차 분리 렌더 (남측에 주차)
    const isFloor1Split =
      i === 0 && day10ParkingFraction > 0 && portion >= 1;

    if (isFloor1Split) {
      const parkingDepth = Math.min(depth, depth * day10ParkingFraction);
      const indoorDepth = Math.max(0, depth - parkingDepth);
      const indoorCz = cz - parkingDepth / 2;
      const parkingCz = cz + indoorDepth / 2;
      boxes.push(
        <group key={`f-${i}-split`}>
          {/* 실내 (북쪽) */}
          {indoorDepth > 0 && (
            <group position={[0, y, indoorCz]}>
              <mesh castShadow>
                <boxGeometry args={[bldSide, floorH, indoorDepth]} />
                <meshStandardMaterial color={massColor} roughness={0.85} />
              </mesh>
              {/* 유리창 밴드 */}
              {floorH >= 2.5 && (
                <mesh position={[0, floorH * 0.05, 0]}>
                  <boxGeometry args={[bldSide + 0.08, floorH * 0.4, indoorDepth + 0.08]} />
                  <meshStandardMaterial color={glassColor} roughness={0.12} metalness={0.35} />
                </mesh>
              )}
              <BoxEdges
                side={[bldSide, floorH, indoorDepth]}
                color={edgeColor}
              />
            </group>
          )}
          {/* 주차 (남쪽) — 와이어프레임 + 반투명 */}
          {parkingDepth > 0 && (
            <group position={[0, y, parkingCz]}>
              <mesh>
                <boxGeometry args={[bldSide, floorH, parkingDepth]} />
                <meshStandardMaterial
                  color={PARKING_COLOR}
                  transparent
                  opacity={day10IsPiloti ? 0.25 : 0.55}
                  roughness={0.8}
                />
              </mesh>
              <BoxEdges
                side={[bldSide, floorH, parkingDepth]}
                color={PARKING_EDGE}
              />
              {/* 3D 자동차 */}
              {day10GroundSpaces > 0 && (() => {
                const slotW = 2.6, slotD = 5.5;
                const cols = Math.max(1, Math.floor(bldSide / slotW));
                const rows = Math.max(1, Math.floor(parkingDepth / slotD));
                const shown = Math.min(day10GroundSpaces, cols * rows);
                return Array.from({ length: shown }, (_, i) => {
                  const col = i % cols;
                  const row = Math.floor(i / cols);
                  const cx = -bldSide / 2 + col * slotW + slotW / 2;
                  const cz = -parkingDepth / 2 + row * slotD + slotD / 2;
                  return (
                    <CarMesh
                      key={i}
                      position={[cx, -floorH / 2 + 0.07, cz]}
                      rotY={row % 2 === 1 ? Math.PI : 0}
                      color={CAR_COLORS[i % CAR_COLORS.length]}
                    />
                  );
                });
              })()}
              <Html
                position={[0, floorH / 2 + 0.3, 0]}
                center
                distanceFactor={30}
                style={{ pointerEvents: "none" }}
              >
                <div
                  style={{
                    background: "white",
                    border: "2px solid #d97757",
                    borderRadius: 4,
                    padding: "2px 6px",
                    fontSize: 11,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    color: "#993C1D",
                  }}
                >
                  🚗 1층 주차 {day10GroundSpaces}대
                  {day10IsPiloti ? " (필로티)" : " (벽체식)"}
                </div>
              </Html>
            </group>
          )}
        </group>,
      );
      continue;
    }

    // 기본 단일 박스 (1F 외 또는 주차 없을 때)
    const isPilotis = i + 1 <= pilotisFloors;
    const isPilotisPartial =
      !isPilotis && i < pilotisFloors && pilotisFloors < i + 1;
    // Day 10 분리가 켜졌으면 1F의 기존 pilotisOverlay는 끔 (중복 회피)
    const day10TookFloor1 = i === 0 && day10ParkingFraction > 0;
    const useOldPiloti = !day10TookFloor1;

    const color = useOldPiloti && isPilotis ? PARKING_COLOR : massColor;
    const edge = useOldPiloti && isPilotis ? PARKING_EDGE : edgeColor;

    boxes.push(
      <group key={`f-${i}`} position={[0, y, cz]}>
        <mesh castShadow>
          <boxGeometry args={[bldSide, floorH, depth]} />
          <meshStandardMaterial
            color={color}
            roughness={0.85}
            transparent={useOldPiloti && isPilotis}
            opacity={useOldPiloti && isPilotis ? 0.7 : 1}
          />
        </mesh>
        {/* 유리창 밴드 (일반 매스 층만) */}
        {portion >= 1 && !(useOldPiloti && isPilotis) && floorH >= 2.5 && (
          <mesh position={[0, floorH * 0.05, 0]}>
            <boxGeometry args={[bldSide + 0.08, floorH * 0.4, depth + 0.08]} />
            <meshStandardMaterial color={glassColor} roughness={0.12} metalness={0.35} />
          </mesh>
        )}
        <BoxEdges side={[bldSide, floorH, depth]} color={edge} />
        {useOldPiloti && isPilotisPartial && (
          <PilotisOverlay
            bldSide={bldSide}
            floorH={floorH}
            depth={depth}
            frac={pilotisFloors - i}
          />
        )}
      </group>,
    );
  }

  // 용도 배지 (건물 상단)
  if (floors > 0) {
    const hM = floors * FLOOR_HEIGHT_M;
    boxes.push(
      <Html
        key="use-label"
        position={[0, hM + 2.4, bldCenterZ]}
        center
        distanceFactor={34}
        style={{ pointerEvents: "none" }}
      >
        <div
          style={{
            background: "white",
            border: `2px solid ${massColor}`,
            borderRadius: 5,
            padding: "2px 7px",
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: "nowrap",
            color: edgeColor,
          }}
        >
          {useIcon} {useLabel}
        </div>
      </Html>,
    );
  }

  // 옥탑 (2층 이상일 때)
  if (floors >= 2) {
    const hM = floors * FLOOR_HEIGHT_M;
    let sb = 0;
    if (sunOn && hM > SUNLIGHT_THRESHOLD_M) sb = hM / 2 - 1.5;
    else if (sunOn) sb = 1.5;
    const depthTop = Math.max(0, bldSide - sb);
    if (depthTop > 3) {
      const czTop = bldCenterZ + sb / 2;
      const pw = Math.min(bldSide * 0.28, 5.5);
      const pd = Math.min(depthTop * 0.3, 4.5);
      boxes.push(
        <group key="penthouse" position={[-bldSide * 0.2, hM + 0.65, czTop - depthTop * 0.15]}>
          <mesh castShadow>
            <boxGeometry args={[pw, 1.3, pd]} />
            <meshStandardMaterial color="#E8E4DA" roughness={0.8} />
          </mesh>
          <BoxEdges side={[pw, 1.3, pd]} color={edgeColor} />
        </group>,
      );
    }
  }

  return <>{boxes}</>;
}

function BoxEdges({
  side,
  color,
}: {
  side: [number, number, number];
  color: string;
}) {
  const [sx, sy, sz] = side;
  const geo = useMemo(() => new THREE.BoxGeometry(sx, sy, sz), [sx, sy, sz]);
  return (
    <lineSegments>
      <edgesGeometry args={[geo]} />
      <lineBasicMaterial color={color} />
    </lineSegments>
  );
}

function PilotisOverlay({
  bldSide,
  floorH,
  depth,
  frac,
}: {
  bldSide: number;
  floorH: number;
  depth: number;
  frac: number;
}) {
  // 한 층 안에서 frac 부분만 회색 (1층 부분 필로티 등)
  const overlayH = floorH * frac;
  const yOffset = -floorH / 2 + overlayH / 2;
  return (
    <mesh position={[0, yOffset, 0]}>
      <boxGeometry args={[bldSide + 0.05, overlayH, depth + 0.05]} />
      <meshStandardMaterial
        color={PARKING_COLOR}
        roughness={0.85}
        transparent
        opacity={0.65}
      />
    </mesh>
  );
}

function SunlightEnvelope({
  bldSide,
  heightM,
  offsetZ,
}: {
  bldSide: number;
  heightM: number;
  offsetZ: number;
}) {
  // 정북 쪽 envelope: 지면(0~10m)은 1.5m 수직, 10m 위는 비스듬히 멀어짐.
  // 평면을 두 개 plane으로 나눠서 그리는 게 정확하지만 단순화하여 사선 부분만 그림.
  const half = bldSide / 2;
  const baseZ = -bldSide / 2 + offsetZ + 1.5;
  const topZ = -bldSide / 2 + offsetZ + 1.5 + Math.max(0, (heightM - SUNLIGHT_THRESHOLD_M) / 2);

  const bottomY = Math.min(heightM, SUNLIGHT_THRESHOLD_M);
  // 두 사각형:
  // 1) 수직 부분: y=0 to bottomY, z=baseZ
  // 2) 사선 부분: y=bottomY to heightM, z=baseZ to topZ
  return (
    <group>
      {/* 수직 사선면 */}
      {bottomY > 0 && (
        <mesh position={[0, bottomY / 2, baseZ]}>
          <planeGeometry args={[bldSide * 0.95, bottomY]} />
          <meshBasicMaterial
            color={DANGER}
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}
      {/* 기울어진 부분 */}
      {heightM > SUNLIGHT_THRESHOLD_M && (
        <TiltedPlane
          width={bldSide * 0.95}
          fromY={SUNLIGHT_THRESHOLD_M}
          toY={heightM}
          fromZ={baseZ}
          toZ={topZ}
        />
      )}
      {/* 경계 라인 */}
      <Line
        points={[
          [-half * 0.95, 0, baseZ],
          [-half * 0.95, bottomY, baseZ],
          ...(heightM > SUNLIGHT_THRESHOLD_M
            ? ([[-half * 0.95, heightM, topZ]] as [number, number, number][])
            : []),
        ]}
        color={DANGER}
        lineWidth={1.8}
        dashed
        dashSize={0.5}
        gapSize={0.3}
      />
      <Line
        points={[
          [half * 0.95, 0, baseZ],
          [half * 0.95, bottomY, baseZ],
          ...(heightM > SUNLIGHT_THRESHOLD_M
            ? ([[half * 0.95, heightM, topZ]] as [number, number, number][])
            : []),
        ]}
        color={DANGER}
        lineWidth={1.8}
        dashed
        dashSize={0.5}
        gapSize={0.3}
      />
    </group>
  );
}

function TiltedPlane({
  width,
  fromY,
  toY,
  fromZ,
  toZ,
}: {
  width: number;
  fromY: number;
  toY: number;
  fromZ: number;
  toZ: number;
}) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const w = width / 2;
    const verts = new Float32Array([
      -w, fromY, fromZ,
       w, fromY, fromZ,
       w, toY,   toZ,
      -w, toY,   toZ,
    ]);
    g.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    g.computeVertexNormals();
    return g;
  }, [width, fromY, toY, fromZ, toZ]);
  return (
    <mesh geometry={geom}>
      <meshBasicMaterial
        color={DANGER}
        transparent
        opacity={0.15}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}

function CarMesh({
  position,
  rotY = 0,
  color = "#DC2626",
}: {
  position: [number, number, number];
  rotY?: number;
  color?: string;
}) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* 차체 */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[1.7, 0.55, 4.1]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.25} />
      </mesh>
      {/* 루프 */}
      <mesh position={[0, 1.05, 0.25]} castShadow>
        <boxGeometry args={[1.5, 0.5, 2.1]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.2} />
      </mesh>
      {/* 앞 유리 */}
      <mesh position={[0, 1.05, -0.82]}>
        <boxGeometry args={[1.42, 0.42, 0.08]} />
        <meshStandardMaterial color={GLASS_COLOR} roughness={0.1} metalness={0.4} />
      </mesh>
      {/* 뒷 유리 */}
      <mesh position={[0, 1.05, 1.32]}>
        <boxGeometry args={[1.42, 0.36, 0.08]} />
        <meshStandardMaterial color={GLASS_COLOR} roughness={0.1} metalness={0.4} />
      </mesh>
      {/* 바퀴 4개 */}
      {([[-0.85, 1.3], [0.85, 1.3], [-0.85, -1.3], [0.85, -1.3]] as const).map(([wx, wz], i) => (
        <mesh key={i} position={[wx, 0.3, wz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.3, 0.22, 12]} />
          <meshStandardMaterial color="#1F2937" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function TreeMesh({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.2, 1.2, 8]} />
        <meshStandardMaterial color="#8B5E3C" roughness={0.95} />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <coneGeometry args={[1.0, 1.8, 8]} />
        <meshStandardMaterial color="#3E7C4F" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.7, 0]} castShadow>
        <coneGeometry args={[0.7, 1.3, 8]} />
        <meshStandardMaterial color="#4C9160" roughness={0.9} />
      </mesh>
    </group>
  );
}

function BasementBoxes({
  bldSide,
  levels,
  offsetZ,
}: {
  bldSide: number;
  levels: number;
  offsetZ: number;
}) {
  if (levels <= 0) return null;
  const ceilLv = Math.ceil(levels);
  const items: React.ReactNode[] = [];
  const boxH = FLOOR_HEIGHT_M * 0.9;
  for (let i = 0; i < ceilLv; i++) {
    const portion = i + 1 <= levels ? 1 : levels - i;
    if (portion <= 0) break;
    const h = boxH * portion;
    const y = -(i * boxH + h / 2) - 0.1;
    items.push(
      <group key={`b-${i}`} position={[0, y, offsetZ]}>
        <mesh>
          <boxGeometry args={[bldSide, h, bldSide]} />
          <meshStandardMaterial
            color={PARKING_COLOR}
            roughness={0.85}
            transparent
            opacity={0.8}
          />
        </mesh>
        <BoxEdges side={[bldSide, h, bldSide]} color={PARKING_EDGE} />
        {/* 지하 자동차 */}
        {h >= 2 && (() => {
          const slotW = 2.6, slotD = 5.5;
          const carCols = Math.max(1, Math.floor(bldSide / slotW));
          const carRows = Math.max(1, Math.floor(bldSide / slotD));
          const carsShown = Math.min(carCols * carRows, 8);
          return Array.from({ length: carsShown }, (_, ci) => {
            const col = ci % carCols;
            const row = Math.floor(ci / carCols);
            const cx = -bldSide / 2 + col * slotW + slotW / 2;
            const cz = -bldSide / 2 + row * slotD + slotD / 2;
            return (
              <CarMesh
                key={ci}
                position={[cx, -h / 2 + 0.07, cz]}
                rotY={row % 2 === 1 ? Math.PI : 0}
                color={CAR_COLORS[ci % CAR_COLORS.length]}
              />
            );
          });
        })()}
        <Text
          position={[0, 0, bldSide / 2 + 0.05]}
          fontSize={Math.min(1.4, h * 0.5)}
          color="#1F2937"
          anchorX="center"
          anchorY="middle"
        >
          {`B${i + 1}`}
        </Text>
      </group>,
    );
  }
  return <>{items}</>;
}

/* ───────── 실형상 (연속지적도 폴리곤) 렌더 — Phase A ─────────
   좌표 규약: 로컬 미터 (x=동+, y=북+) → three (x, -z). 압출은 +y(상공).
   Shape를 XY평면에 만들고 rotateX(-π/2)하면 y_north → -z(북), 압출 z → +y. */

function shapeFromPts(pts: Pt[]): THREE.Shape {
  const s = new THREE.Shape();
  pts.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
  s.closePath();
  return s;
}

/** 대지: 실제 지적 폴리곤 평면 + 점선 외곽 */
function ParcelLot({ shape }: { shape: ParcelShape }) {
  const geom = useMemo(() => {
    const g = new THREE.ShapeGeometry(shapeFromPts(shape.pts));
    g.rotateX(-Math.PI / 2);
    return g;
  }, [shape]);
  const outline = useMemo(
    () =>
      [...shape.pts, shape.pts[0]].map(
        ([x, y]) => [x, 0.06, -y] as [number, number, number],
      ),
    [shape],
  );
  return (
    <group>
      <mesh geometry={geom} position={[0, 0.015, 0]} receiveShadow>
        <meshStandardMaterial color={LOT_COLOR} roughness={1} />
      </mesh>
      <Line
        points={outline}
        color="#6b6357"
        lineWidth={1.6}
        dashed
        dashSize={1.2}
        gapSize={0.8}
      />
      {/* 합필 구성 필지 경계선 (union 형상일 때만, 파란 점선) */}
      {shape.members?.map((m, i) => (
        <Line
          key={`member-${i}`}
          points={[...m.ring, m.ring[0]].map((p) => {
            const [x, y] = lonLatToLocal(shape, p);
            return [x, 0.08, -y] as [number, number, number];
          })}
          color="#2563EB"
          lineWidth={1.4}
          dashed
          dashSize={0.9}
          gapSize={0.6}
        />
      ))}
    </group>
  );
}

/** 층 하나: 폴리곤 압출 + 유리 밴드 + 상단 윤곽선 */
function ExtrudedFloor({
  pts,
  baseY,
  h,
  color,
  glassColor,
  edgeColor,
  withGlass,
}: {
  pts: Pt[];
  baseY: number;
  h: number;
  color: string;
  glassColor: string;
  edgeColor: string;
  withGlass: boolean;
}) {
  const geom = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(shapeFromPts(pts), {
      depth: h,
      bevelEnabled: false,
    });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [pts, h]);
  const glassGeom = useMemo(() => {
    if (!withGlass) return null;
    const g = new THREE.ExtrudeGeometry(shapeFromPts(scalePolygon(pts, 1.015)), {
      depth: h * 0.4,
      bevelEnabled: false,
    });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [pts, h, withGlass]);
  const topOutline = useMemo(
    () =>
      [...pts, pts[0]].map(
        ([x, y]) => [x, baseY + h + 0.02, -y] as [number, number, number],
      ),
    [pts, baseY, h],
  );
  return (
    <group>
      <mesh geometry={geom} position={[0, baseY, 0]} castShadow>
        <meshStandardMaterial color={color} roughness={0.85} side={THREE.DoubleSide} />
      </mesh>
      {glassGeom && (
        <mesh geometry={glassGeom} position={[0, baseY + h * 0.3, 0]}>
          <meshStandardMaterial
            color={glassColor}
            roughness={0.12}
            metalness={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      <Line points={topOutline} color={edgeColor} lineWidth={1} />
    </group>
  );
}

/** 건물 매스: 실형상 footprint(√건폐율 축소 근사)를 층별 압출.
    일조권 사선은 층 높이별 후퇴선(최북단 − s)으로 폴리곤을 클리핑해 표현. */
function ParcelMass({
  shape,
  covPct,
  floors,
  sunOn,
  massColor,
  glassColor,
  edgeColor,
  useIcon,
  useLabel,
}: {
  shape: ParcelShape;
  covPct: number;
  floors: number;
  sunOn: boolean;
  massColor: string;
  glassColor: string;
  edgeColor: string;
  useIcon: string;
  useLabel: string;
}) {
  const fp = useMemo(
    () => scalePolygon(shape.pts, Math.sqrt(Math.max(covPct, 1) / 100)),
    [shape, covPct],
  );
  const fpBounds = useMemo(() => polygonBounds(fp), [fp]);

  const items: React.ReactNode[] = [];
  const ceilFloors = Math.ceil(floors);
  for (let i = 0; i < ceilFloors; i++) {
    const fH = (i + 1) * FLOOR_HEIGHT_M;
    let setback = 0;
    if (sunOn && fH > SUNLIGHT_THRESHOLD_M) setback = fH / 2 - 1.5;
    else if (sunOn) setback = 1.5;
    const pts =
      setback > 0 ? clipPolygonBelowY(fp, fpBounds.maxY - setback) : fp;
    if (pts.length < 3) break;
    const portion = i + 1 <= floors ? 1 : floors - i;
    if (portion <= 0) break;
    const floorH = FLOOR_HEIGHT_M * portion;
    items.push(
      <ExtrudedFloor
        key={i}
        pts={pts}
        baseY={i * FLOOR_HEIGHT_M}
        h={floorH}
        color={massColor}
        glassColor={glassColor}
        edgeColor={edgeColor}
        withGlass={portion >= 1 && floorH >= 2.5}
      />,
    );
  }

  const hM = floors * FLOOR_HEIGHT_M;
  return (
    <group>
      {items}
      {floors > 0 && (
        <Html
          position={[0, hM + 2.4, 0]}
          center
          distanceFactor={34}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              background: "white",
              border: `2px solid ${massColor}`,
              borderRadius: 5,
              padding: "2px 7px",
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: "nowrap",
              color: edgeColor,
            }}
          >
            {useIcon} {useLabel} · 실형상
          </div>
        </Html>
      )}
    </group>
  );
}
