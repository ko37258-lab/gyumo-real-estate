"use client";

// 🛰️ 위성 바닥 — VWorld WMTS 타일을 /api/tile 프록시로 받아 로컬 미터 좌표계 위에
// 타일별 평면으로 깐다 (z18 ≈ 0.24m/px). 규모검토 3D와 아파트 일조 보기가 공유한다.
// 좌표 규약: 로컬 x=동(+), y=북(+) → 씬에서는 (x, 높이, -북).

import { useEffect, useMemo, useState } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { Pt } from "@/lib/geo/parcel";

// ─────────────────────────────────────────────────────────────
// 🛰️ 위성 바닥 — VWorld WMTS 타일을 기존 /api/tile 프록시로 받아
// 필지 로컬 좌표계 위에 타일별 평면으로 깐다 (z18 ≈ 0.24m/px).
// ─────────────────────────────────────────────────────────────

interface GroundTileSpec {
  url: string;
  /** 로컬 미터 — 평면 중심/크기 */
  cx: number;
  cy: number; // 북(+) 기준
  w: number;
  h: number;
}

function groundTiles(centerLon: number, centerLat: number, halfM: number): GroundTileSpec[] {
  const Z = 18;
  const n = 2 ** Z;
  const latR = (centerLat * Math.PI) / 180;
  const xf = ((centerLon + 180) / 360) * n;
  const yf = ((1 - Math.asinh(Math.tan(latR)) / Math.PI) / 2) * n;
  // 타일 한 변의 실거리(m) — 위도 보정
  const tileM = (40075016.686 * Math.cos(latR)) / n;
  const span = Math.ceil(halfM / tileM) + 1;
  const cxTile = Math.floor(xf);
  const cyTile = Math.floor(yf);

  const tile2lon = (x: number) => (x / n) * 360 - 180;
  const tile2lat = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  const DEG = Math.PI / 180;
  const R = 6378137;
  const cos = Math.cos(centerLat * DEG);
  const toLocal = (lon: number, lat: number): Pt => [
    (lon - centerLon) * DEG * R * cos,
    (lat - centerLat) * DEG * R,
  ];

  const out: GroundTileSpec[] = [];
  for (let ty = cyTile - span; ty <= cyTile + span; ty++) {
    for (let tx = cxTile - span; tx <= cxTile + span; tx++) {
      const [x1, yTop] = toLocal(tile2lon(tx), tile2lat(ty));
      const [x2, yBot] = toLocal(tile2lon(tx + 1), tile2lat(ty + 1));
      const cx = (x1 + x2) / 2;
      const cy = (yTop + yBot) / 2;
      if (Math.abs(cx) - (x2 - x1) / 2 > halfM || Math.abs(cy) - (yTop - yBot) / 2 > halfM) continue;
      out.push({
        url: `/api/tile/Satellite/${Z}/${ty}/${tx}`,
        cx,
        cy,
        w: x2 - x1,
        h: yTop - yBot,
      });
    }
  }
  return out;
}

export function GroundImagery({
  centerLon,
  centerLat,
  halfM = 190,
}: {
  centerLon: number;
  centerLat: number;
  halfM?: number;
}) {
  const tiles = useMemo(
    () => groundTiles(centerLon, centerLat, halfM),
    [centerLon, centerLat, halfM],
  );
  return (
    <group>
      {tiles.map((t) => (
        <GroundTile key={t.url} spec={t} />
      ))}
    </group>
  );
}

function GroundTile({ spec }: { spec: GroundTileSpec }) {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  const invalidate = useThree((st) => st.invalidate);

  useEffect(() => {
    let alive = true;
    const loader = new THREE.TextureLoader();
    loader.load(spec.url, (t) => {
      if (!alive) {
        t.dispose();
        return;
      }
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      setTex(t);
      invalidate(); // frameloop="demand" — 텍스처 도착 시 다시 그리기
    });
    return () => {
      alive = false;
    };
  }, [spec.url, invalidate]);

  useEffect(() => {
    return () => {
      tex?.dispose();
    };
  }, [tex]);

  if (!tex) return null;
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[spec.cx, -0.15, -spec.cy]}
      receiveShadow
    >
      <planeGeometry args={[spec.w, spec.h]} />
      <meshStandardMaterial map={tex} roughness={1} />
    </mesh>
  );
}
