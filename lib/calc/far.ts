import { FLOOR_HEIGHT_M } from "@/lib/constants";

export function legalGfaSqm(lotSqm: number, farPct: number) {
  return (lotSqm * farPct) / 100;
}

export function floorsFromFarAndCov(farPct: number, covPct: number) {
  const effCov = Math.min(covPct, farPct);
  return farPct / effCov;
}

export function totalHeightM(floors: number) {
  return floors * FLOOR_HEIGHT_M;
}
