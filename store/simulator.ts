"use client";

import { create } from "zustand";
import { ZONES, type ZoneCode } from "@/lib/zones";
import {
  PARKING_STANDARDS,
  type ParkingUsageCode,
  type ProgressiveSpec,
} from "@/lib/parking-standards";
import { resolveAreaPerSpace } from "@/lib/parking-regions";
import type { ParkingMode } from "@/lib/calc/parking";
import type { ParcelShape } from "@/lib/geo/parcel";

export type LotInfo = {
  address: string;
  lotSqm: number;
  zone: ZoneCode;
  roadM: number;
  northAzimuth?: number;
  source: "mock" | "vworld";
  pnu?: string;
  publicPricePerSqm?: number;  // 공시지가 원/㎡ (VWorld NED)
  publicPriceYear?: number;
};

/** 합필 구성 필지 — 2개 이상일 때 2D/3D에 필지 경계 표시 */
export type MergedParcel = {
  label: string;   // 지번 표시 (예: "825-3")
  areaSqm: number;
};

type SimulatorState = {
  address: string;
  lotInfo: LotInfo | null;
  zone: ZoneCode;
  lotPy: number;
  covPct: number;
  farPct: number;
  roadM: number;
  sunOn: boolean;
  /** 서울도심(사대문 안) 특례 적용 — zone.floorRatioCBD 사용 */
  isCBD: boolean;

  // ⑤ 주차장 산정
  parkingUsage: ParkingUsageCode;
  parkingAreaPerSpace: number;
  parkingProgressiveSpec: ProgressiveSpec;
  parkingHouseholds: number[];
  parkingTierRatios: number[];
  /** 주차장 배치 형식 */
  parkingMode: ParkingMode;
  /** 혼합 모드일 때 지상 비율(%) */
  parkingGroundRatio: number;
  /** 지상주차 1대당 표준 면적(㎡) — 서울시 기준 30 (주차칸 + 차로·회전반경) */
  parkingUnitArea: number;
  /** 필로티 구조 여부 — true: 건축면적 제외, false: 벽체식 산입 */
  parkingPilotiMode: boolean;
  /** 지번 조회로 확정된 법정동코드 (지자체 주차 조례 자동 적용용). null = 미조회 → 서울 기준 */
  parkingLawdCd: string | null;

  /** 3D Canvas의 toDataURL 캡쳐 함수 — Canvas 마운트 시 등록, 언마운트 시 null. */
  capture3D: (() => string) | null;

  /** 합필 구성 필지 (2개 이상일 때만 시각화에 경계 표시, 빈 배열 = 단일 필지) */
  mergedParcels: MergedParcel[];

  /** 연속지적도 실형상 폴리곤 (지번 조회 성공 시 세팅, null = 정사각형 가정) */
  parcelShape: ParcelShape | null;

  setAddress: (v: string) => void;
  setMergedParcels: (parcels: MergedParcel[]) => void;
  applyLotInfo: (info: LotInfo) => void;
  setZone: (z: ZoneCode) => void;
  setLotPy: (v: number) => void;
  setCovPct: (v: number) => void;
  setFarPct: (v: number) => void;
  setRoadM: (v: number) => void;
  setSunOn: (v: boolean) => void;
  setIsCBD: (v: boolean) => void;

  setParkingUsage: (code: ParkingUsageCode) => void;
  setParkingAreaPerSpace: (v: number) => void;
  setParkingProgressiveSpec: (spec: ProgressiveSpec) => void;
  setParkingHousehold: (index: number, v: number) => void;
  setParkingTierRatio: (index: number, v: number) => void;
  setParkingMode: (mode: ParkingMode) => void;
  setParkingGroundRatio: (v: number) => void;
  setParkingUnitArea: (v: number) => void;
  setParkingPilotiMode: (v: boolean) => void;
  setCapture3D: (fn: (() => string) | null) => void;
  setParcelShape: (shape: ParcelShape | null) => void;
};

const initialParking = (() => {
  const usage: ParkingUsageCode = "업무";
  const s = PARKING_STANDARDS[usage];
  const danok = PARKING_STANDARDS.단독주택;
  const gongdong = PARKING_STANDARDS.공동주택;
  if (s.mode !== "area" || danok.mode !== "progressive" || gongdong.mode !== "tieredHousehold") {
    throw new Error("parking-standards.ts shape mismatch");
  }
  return {
    parkingUsage: usage,
    parkingAreaPerSpace: s.seoulAreaPerSpace,
    parkingProgressiveSpec: { ...danok.seoul },
    parkingHouseholds: gongdong.seoulTiers.map(() => 0),
    parkingTierRatios: gongdong.seoulTiers.map((t) => t.ratio),
    parkingMode: "basement" as ParkingMode,
    parkingGroundRatio: 30,
    parkingUnitArea: 30,
    parkingPilotiMode: true,
    parkingLawdCd: null as string | null,
  };
})();

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  address: "서울특별시 강남구 역삼동 825-3",
  lotInfo: null,
  zone: "2il",
  lotPy: 200,
  covPct: ZONES["2il"].maxCov,
  farPct: ZONES["2il"].defFar,
  roadM: 6,
  sunOn: ZONES["2il"].residential,
  isCBD: false,
  ...initialParking,
  capture3D: null,
  mergedParcels: [],
  parcelShape: null,

  setAddress: (v) => set({ address: v }),
  setMergedParcels: (parcels) => set({ mergedParcels: parcels }),

  applyLotInfo: (info) => {
    const z = ZONES[info.zone];
    const lawdCd = info.pnu ? info.pnu.slice(0, 5) : null;
    const next: Partial<SimulatorState> = {
      address: info.address,
      lotInfo: info,
      zone: info.zone,
      lotPy: Math.round(info.lotSqm / 3.305785),
      covPct: z.maxCov,
      farPct: Math.min(z.defFar, z.farMax),
      roadM: info.roadM,
      sunOn: z.residential,
      parkingLawdCd: lawdCd,
    };
    // 지자체 조례 기준으로 주차 원단위 자동 갱신 (area 모드 용도만)
    const usage = get().parkingUsage;
    if (PARKING_STANDARDS[usage].mode === "area") {
      next.parkingAreaPerSpace = resolveAreaPerSpace(usage, lawdCd).areaPerSpace;
    }
    set(next);
  },

  setZone: (code) => {
    const z = ZONES[code];
    const { covPct, farPct } = get();
    set({
      zone: code,
      covPct: Math.min(covPct, z.maxCov) || z.maxCov,
      farPct:
        farPct >= z.farMin && farPct <= z.farMax
          ? farPct
          : Math.min(z.defFar, z.farMax),
      sunOn: z.residential,
    });
  },

  setLotPy: (v) => {
    if (Number.isFinite(v)) set({ lotPy: v });
  },
  setCovPct: (v) => {
    if (Number.isFinite(v)) set({ covPct: v });
  },
  setFarPct: (v) => {
    if (Number.isFinite(v)) set({ farPct: v });
  },
  setRoadM: (v) => {
    if (Number.isFinite(v)) set({ roadM: v });
  },
  setSunOn: (v) => set({ sunOn: v }),
  setIsCBD: (v) => set({ isCBD: v }),

  // 주차장 — 용도 변경 시 해당 지자체(미조회 시 서울) 기준값으로 user-editable 필드 리셋
  setParkingUsage: (code) => {
    const s = PARKING_STANDARDS[code];
    const next: Partial<SimulatorState> = { parkingUsage: code };
    if (s.mode === "area") {
      next.parkingAreaPerSpace = resolveAreaPerSpace(
        code,
        get().parkingLawdCd,
      ).areaPerSpace;
    } else if (s.mode === "progressive") {
      next.parkingProgressiveSpec = { ...s.seoul };
    } else {
      next.parkingHouseholds = s.seoulTiers.map(() => 0);
      next.parkingTierRatios = s.seoulTiers.map((t) => t.ratio);
    }
    set(next);
  },

  setParkingAreaPerSpace: (v) => {
    if (Number.isFinite(v) && v > 0) set({ parkingAreaPerSpace: v });
  },

  setParkingProgressiveSpec: (spec) => set({ parkingProgressiveSpec: spec }),

  setParkingHousehold: (index, v) => {
    if (!Number.isFinite(v) || v < 0) return;
    const arr = [...get().parkingHouseholds];
    arr[index] = v;
    set({ parkingHouseholds: arr });
  },

  setParkingTierRatio: (index, v) => {
    if (!Number.isFinite(v) || v < 0) return;
    const arr = [...get().parkingTierRatios];
    arr[index] = v;
    set({ parkingTierRatios: arr });
  },

  setParkingMode: (mode) => set({ parkingMode: mode }),

  setParkingGroundRatio: (v) => {
    if (!Number.isFinite(v)) return;
    set({ parkingGroundRatio: Math.max(0, Math.min(100, v)) });
  },

  setParkingUnitArea: (v) => {
    if (!Number.isFinite(v) || v <= 0) return;
    set({ parkingUnitArea: Math.max(15, Math.min(60, v)) });
  },

  setParkingPilotiMode: (v) => set({ parkingPilotiMode: v }),

  setCapture3D: (fn) => set({ capture3D: fn }),

  setParcelShape: (shape) => set({ parcelShape: shape }),
}));
