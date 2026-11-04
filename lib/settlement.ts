// 취락지구 — 용도지역 위에 얹혀 건폐율·용적률을 바꾸는 용도지구 (2026-11-04)
//
// 계기: 제주시 한경면 조수리 364-3 — 토지이용계획확인서는 「계획관리지역, 자연취락지구」인데
// 계획관리지역만 보고 건폐율 40%·용적률 80%로 계산했다. 맞는 값은 60%·100%다.
// 372law.com(real-estate-infographic src/lib/settlement.js)과 같은 규칙·같은 표를 쓴다.
//
// 근거(법제처 2026-11-04 확인)
//  · 건폐율: 국토계획법 시행령 제84조④1호 — 취락지구 60% 이하에서 조례로. 집단취락지구는 개발제한구역법령을 따른다.
//  · 용적률: 시행령 제85조에 취락지구 특례가 없다 → 조례가 따로 정한 곳(제주·대전·광주·인천·예산)만 달라지고 나머지는 용도지역 값.
//  · 건축물: 시행령 제78조①·별표 23 — 4층 이하, 건축 가능 용도 제한(층수·용도는 자동 계산하지 않고 안내만).
//  · 일부만 걸치면(저촉) 국토계획법 제84조에 따라 면적별로 달라져 자동으로 정할 수 없다 → 값을 바꾸지 않고 시나리오로만 보여준다.

import densityRaw from "./data/settlement-density.json";
import { ZONE_KEY } from "./ordinance-db";
import type { ZoneCode } from "./zones";

type RawRule = {
  n: string;
  law: string;
  d: string;
  bc: number;
  byZone?: Record<string, number>;
  far?: Record<string, number>;
  note?: string;
  art?: string;
  /** 조례가 「영 제84조제4항을 따른다」고만 적음(60%) */
  refDecree?: boolean;
  /** 조례에서 취락지구 건폐율 조항을 못 찾음(시행령 상한 60%로 계산, 확인 필요) */
  none?: boolean;
};

const REGIONS = densityRaw.regions as unknown as Record<string, RawRule>;

export const SETTLEMENT_CHECKED_AT = densityRaw.checkedAt;

// 자연취락지구는 녹지·관리·농림·자연환경보전지역에 지정된다(시행령 제31조②8호)
const SETTLEMENT_ZONE_KEYS = new Set(["pres_g", "prod_g", "nat_g", "pres_m", "prod_m", "plan_m", "agri", "env"]);

const LAW_URL = "https://www.law.go.kr/";
const ordinanceUrl = (law: string) =>
  `https://www.law.go.kr/자치법규/${encodeURIComponent(law.replace(/\s/g, ""))}`;

export type SettlementHit = {
  name: string;
  kind: "natural" | "group";
  partial: boolean;
};

export type SettlementRule = SettlementHit & {
  /** true 일 때만 bc·far 를 계산에 쓴다. 일부 저촉·합필은 false 로 시나리오만 */
  applied: boolean;
  merged: boolean;
  bc: number | null;
  far: number | null;
  baseCov: number;
  baseFar: number;
  floorsMax: number | null;
  source: string;
  url: string;
  note: string;
  /** 조례 조항을 못 찾아 시행령 상한으로 계산했는지 */
  unverified: boolean;
};

export function isSettlementZone(zone: ZoneCode): boolean {
  return SETTLEMENT_ZONE_KEYS.has(ZONE_KEY[zone]);
}

/** 토지이용계획 목록에서 취락지구를 찾는다. 접함은 지정된 것이 아니므로 뺀다. 전부 포함을 일부 저촉보다 먼저. */
export function findSettlement(useAttrs: string[] | null | undefined): SettlementHit | null {
  let partial: SettlementHit | null = null;
  for (const raw of useAttrs ?? []) {
    const s = String(raw);
    if (!s.includes("취락지구") || s.includes("접함")) continue;
    const hit: SettlementHit = {
      name: s.replace(/\((저촉|포함|해당)\)/g, "").trim(),
      kind: s.includes("집단취락") ? "group" : "natural",
      partial: s.includes("저촉"),
    };
    if (!hit.partial) return hit;
    if (!partial) partial = hit;
  }
  return partial;
}

/** 이 필지의 취락지구 건폐율·용적률. baseCov·baseFar 는 용도지역 값(조례 → 시행령 순으로 이미 정한 값) */
export function settlementDensity(p: {
  pnu: string | null | undefined;
  zone: ZoneCode;
  useAttrs: string[] | null | undefined;
  baseCov: number;
  baseFar: number;
  merged?: boolean;
}): SettlementRule | null {
  const hit = findSettlement(p.useAttrs);
  if (!hit) return null;
  const merged = Boolean(p.merged);
  if (hit.kind === "group") {
    return {
      ...hit,
      applied: false,
      merged,
      bc: null,
      far: null,
      baseCov: p.baseCov,
      baseFar: p.baseFar,
      floorsMax: null,
      source: "국토계획법 시행령 제84조④1호",
      url: LAW_URL,
      note: "집단취락지구는 개발제한구역법령을 따릅니다. 자동 계산에 넣지 않았습니다.",
      unverified: false,
    };
  }
  if (!isSettlementZone(p.zone)) return null;

  const code = String(p.pnu ?? "");
  const rule = REGIONS[code.slice(0, 5)] ?? REGIONS[code.slice(0, 2)] ?? null;
  const zoneKey = ZONE_KEY[p.zone];
  const unverified = !rule || Boolean(rule.none);
  let source = "국토계획법 시행령 제84조④1호 상한";
  if (rule && !rule.none) {
    source = rule.refDecree ? `${rule.law} ${rule.art} → 시행령 제84조④1호` : `${rule.law} ${rule.art}`;
  }
  return {
    ...hit,
    applied: !hit.partial && !merged,
    merged,
    bc: rule?.byZone?.[zoneKey] ?? rule?.bc ?? 60,
    far: rule?.far?.[zoneKey] ?? p.baseFar,
    baseCov: p.baseCov,
    baseFar: p.baseFar,
    floorsMax: 4,
    source,
    url: rule ? ordinanceUrl(rule.law) : LAW_URL,
    note: rule?.note ?? "",
    unverified,
  };
}

/** 이 필지에 실제 적용할 상한 — 취락지구가 필지 전체에 걸릴 때만 그 값, 아니면 조례·시행령 값 */
export function limitsWithSettlement(
  baseCov: number,
  baseFar: number,
  settlement: SettlementRule | null | undefined,
): { cov: number; far: number } {
  if (settlement?.applied && settlement.bc != null && settlement.far != null) {
    return { cov: settlement.bc, far: settlement.far };
  }
  return { cov: baseCov, far: baseFar };
}

/** 보고서·AI 근거 문구 — 상한 근거 뒤에 덧붙인다 */
export function settlementSourceText(s: SettlementRule | null | undefined): string {
  if (!s) return "";
  if (s.applied) {
    const check = s.unverified ? ", 조례 확인 필요" : "";
    return `${s.name} 반영 — 건폐율 ${s.baseCov}→${s.bc}%, 용적률 ${s.baseFar}→${s.far}% (${s.source}${check})`;
  }
  if (s.kind === "group") return `${s.name} — 개발제한구역법령 적용, 자동 계산 미반영`;
  if (s.partial) return `${s.name} 일부 저촉 — 면적에 따라 달라져 자동 계산 미반영 (국토계획법 제84조)`;
  return `${s.name} — 합필이라 자동 계산 미반영`;
}
