"use client";

// 개발 전용 — 실형상 렌더 검증용 mock 폴리곤 주입.
// VWorld 실키는 Vercel Production에만 있어 로컬에서 폴리곤 API를 못 부르므로,
// `?mockParcel=1`일 때 사다리꼴 필지(약 306㎡, 예장동 1-20 유사)를 store에 넣는다.
// NODE_ENV=development에서만 동작 — 프로덕션 번들에서는 아무것도 하지 않는다.

import { useEffect } from "react";
import { useSimulatorStore } from "@/store/simulator";
import { buildParcelShape } from "@/lib/geo/parcel";

const BASE_LON = 126.99;
const BASE_LAT = 37.55;
const M_PER_DEG_LAT = 110946;
const M_PER_DEG_LON = 111320 * Math.cos((BASE_LAT * Math.PI) / 180);

/** 로컬 미터 좌표 → 경위도 (mock 생성용) */
const toLonLat = ([x, y]: [number, number]): [number, number] => [
  BASE_LON + x / M_PER_DEG_LON,
  BASE_LAT + y / M_PER_DEG_LAT,
];

// 사다리꼴 + 모서리 하나 꺾인 불규칙 필지 (남측 22m / 북측 13m / 깊이 17m)
const MOCK_RING_M: Array<[number, number]> = [
  [0, 0],
  [22, 0],
  [20.5, 9],
  [17, 17],
  [4, 17],
  [1.5, 8],
];

export function DevParcelMock() {
  const setParcelShape = useSimulatorStore((s) => s.setParcelShape);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!window.location.search.includes("mockParcel")) return;
    setParcelShape(buildParcelShape(MOCK_RING_M.map(toLonLat)));
    console.log("[DevParcelMock] 실형상 mock 폴리곤 주입됨");
  }, [setParcelShape]);

  return null;
}
