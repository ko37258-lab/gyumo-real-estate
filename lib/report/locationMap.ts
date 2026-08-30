"use client";

// 표지 위치도 — 위성 타일을 캔버스에 합성하고 대상 필지 외곽을 그려
// base64 JPEG 로 반환한다. 실형상(parcelShape) 조회가 있을 때만 동작.
//
// 타일은 기존 /api/tile 프록시(동일 출처, CDN 캐시)라 CORS·키 노출이 없다.
// 실패는 전부 null 로 조용히 — 위치도는 장식이지 보고서의 본질이 아니다.

import { useSimulatorStore } from "@/store/simulator";

const TILE = 256;
const Z = 17; // 3×3 타일 ≈ 주변 460m — 동네 맥락이 보이는 배율

export async function buildLocationMap(): Promise<string | null> {
  try {
    const shape = useSimulatorStore.getState().parcelShape;
    if (!shape || !shape.ringLonLat || shape.ringLonLat.length < 3) return null;

    const { centerLon, centerLat } = shape;
    const n = 2 ** Z;
    const latR = (centerLat * Math.PI) / 180;
    const xf = ((centerLon + 180) / 360) * n;
    const yf = ((1 - Math.asinh(Math.tan(latR)) / Math.PI) / 2) * n;

    const W = TILE * 3;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = W;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // 캔버스 원점(전역 픽셀 좌표) — 필지 중심이 정중앙에 오도록
    const originX = xf * TILE - W / 2;
    const originY = yf * TILE - W / 2;

    const txMin = Math.floor(originX / TILE);
    const tyMin = Math.floor(originY / TILE);
    const jobs: Promise<void>[] = [];
    for (let ty = tyMin; ty <= tyMin + 3; ty++) {
      for (let tx = txMin; tx <= txMin + 3; tx++) {
        jobs.push(
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, tx * TILE - originX, ty * TILE - originY);
              resolve();
            };
            img.onerror = () => resolve(); // 빠진 타일은 빈칸 — 전체 실패로 만들지 않음
            img.src = `/api/tile/Satellite/${Z}/${ty}/${tx}`;
          }),
        );
      }
    }
    await Promise.all(jobs);

    // 필지 외곽 (전역 픽셀 → 캔버스 좌표)
    const toPx = (lon: number, lat: number): [number, number] => {
      const gx = ((lon + 180) / 360) * n * TILE;
      const gy =
        ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n * TILE;
      return [gx - originX, gy - originY];
    };
    ctx.beginPath();
    shape.ringLonLat.forEach(([lon, lat], i) => {
      const [x, y] = toPx(lon, lat);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = "rgba(240, 153, 123, 0.35)";
    ctx.fill();
    ctx.strokeStyle = "#993C1D";
    ctx.lineWidth = 3;
    ctx.stroke();

    // 100m 스케일바 (우하단)
    const mPerPx = (40075016.686 * Math.cos(latR)) / n / TILE;
    const barPx = 100 / mPerPx;
    const bx = W - barPx - 18;
    const by = W - 22;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(bx - 6, by - 16, barPx + 12, 26);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + barPx, by);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "600 12px sans-serif";
    ctx.fillText("100m", bx + barPx / 2 - 16, by - 4);

    // 정북 표시 (좌상단)
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(12, 12, 30, 34);
    ctx.fillStyle = "#fff";
    ctx.font = "700 14px sans-serif";
    ctx.fillText("N", 20, 40);
    ctx.beginPath();
    ctx.moveTo(27, 16);
    ctx.lineTo(21, 26);
    ctx.lineTo(33, 26);
    ctx.closePath();
    ctx.fill();

    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return null;
  }
}
