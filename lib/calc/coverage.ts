import { PY_TO_SQM } from "@/lib/constants";

export function lotPyToSqm(py: number) {
  return py * PY_TO_SQM;
}

export function lotSqmToPy(sqm: number) {
  return sqm / PY_TO_SQM;
}

export function buildingFootprintSqm(lotSqm: number, covPct: number) {
  return (lotSqm * covPct) / 100;
}
