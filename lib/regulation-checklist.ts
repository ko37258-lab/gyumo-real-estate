/**
 * 규제 체크리스트 — 지번 조회 직후 "이 땅의 걸림돌"을 한눈에 보여준다.
 *
 * 조회 시점에 이미 확보된 데이터(지목·용도지역·토지이용계획 지역·지구
 * 목록·공시지가)만으로 판정한다. 새 API 호출 없이 즉시 계산되는 게 핵심 —
 * 사용자가 탭을 넘기지 않아도 "이 땅 농지네, 부담금 대략 얼마" "개발제한
 * 구역 걸려있네"를 3초 안에 알 수 있게 한다.
 *
 * ⚠ 전부 간이 추정이다. 정확한 부담금·저촉 여부는 관할 지자체 확인이 필요
 *   하다는 문구를 항상 같이 노출한다 (calculateCost 학습시트와 같은 원칙).
 */

import { FOREST_SURCHARGE_CAP } from "@/lib/calc/cost";
import type { ZoneCode } from "@/lib/zones";
import { ZONES } from "@/lib/zones";

export type ChecklistLevel = "danger" | "warning" | "info" | "ok";

export type ChecklistItem = {
  level: ChecklistLevel;
  icon: string;
  title: string;
  detail: string;
};

const LEVEL_ORDER: Record<ChecklistLevel, number> = {
  danger: 0,
  warning: 1,
  info: 2,
  ok: 3,
};

/**
 * 토지이용계획 지역·지구 목록에서 건축·개발에 실질적 제약을 거는 항목만
 * 추려 강조한다. 국토계획법·개발제한구역법·문화유산법 등에 흩어진 규제를
 * 사용자가 지자체별 조문을 몰라도 "위험 키워드"로 먼저 알아챌 수 있게 한다.
 */
const HIGH_RISK_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /개발제한구역/, label: "개발제한구역(그린벨트) — 건축이 원칙적으로 제한됩니다" },
  { pattern: /군사시설보호구역/, label: "군사시설보호구역 — 관할부대 협의 필요" },
  { pattern: /문화[유재]산?\s*보호구역|역사문화환경/, label: "문화유산 보호구역 — 문화재청 현상변경 허가 필요" },
  { pattern: /상수원보호구역/, label: "상수원보호구역 — 건축이 매우 제한적" },
  { pattern: /자연공원/, label: "자연공원구역 — 공원관리청 허가 필요" },
  { pattern: /하천구역|소하천구역/, label: "하천구역 — 하천점용허가 필요" },
  { pattern: /접도구역/, label: "접도구역 — 도로관리청 허가 필요" },
];
const MEDIUM_RISK_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /농업진흥구역/, label: "농업진흥구역 — 농지전용 요건이 까다롭습니다" },
  { pattern: /보전산지|공익용산지|임업용산지/, label: "보전산지 — 산지전용허가 요건이 강화됩니다" },
  { pattern: /배출시설설치제한지역|수질보전특별대책/, label: "수질보전 관련 규제지역" },
  { pattern: /지구단위계획구역/, label: "지구단위계획구역 — 별도 지침 확인 필요" },
];

function checkLandUsePlan(useAttrs: string[] | undefined): ChecklistItem[] {
  if (!useAttrs || useAttrs.length === 0) return [];
  const hits: ChecklistItem[] = [];
  const seen = new Set<string>();

  for (const attr of useAttrs) {
    for (const { pattern, label } of HIGH_RISK_PATTERNS) {
      if (pattern.test(attr) && !seen.has(label)) {
        seen.add(label);
        hits.push({ level: "danger", icon: "🚫", title: "저촉 지역·지구", detail: label });
      }
    }
    for (const { pattern, label } of MEDIUM_RISK_PATTERNS) {
      if (pattern.test(attr) && !seen.has(label)) {
        seen.add(label);
        hits.push({ level: "warning", icon: "⚠️", title: "저촉 지역·지구", detail: label });
      }
    }
  }
  return hits;
}

function checkFarmland(
  jimok: string | undefined,
  useAttrs: string[] | undefined,
  areaSqm: number,
  publicPricePerSqm: number | undefined,
): ChecklistItem | null {
  if (!jimok || !["전", "답", "과수원"].includes(jimok)) return null;

  const inZone = (useAttrs ?? []).some((a) => /농업진흥구역/.test(a));
  const rate = inZone ? 30 : 20;
  if (publicPricePerSqm && areaSqm > 0) {
    const unit = Math.min(publicPricePerSqm * (rate / 100), 50000);
    const won = Math.round(unit * areaSqm);
    return {
      level: "warning",
      icon: "🌾",
      title: "농지 — 농지보전부담금 예상",
      detail: `지목 ${jimok}(농지법 적용). ${inZone ? "농업진흥구역 안 30%" : "진흥구역 밖 20%"} 기준 약 ${(won / 1e4).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}만원 예상 (개별공시지가 × 적용률, ㎡당 상한 5만원 — 실제 부과액은 전용 시점 공시지가 기준)`,
    };
  }
  return {
    level: "warning",
    icon: "🌾",
    title: "농지 — 부담금 발생 예정",
    detail: `지목 ${jimok}(농지법 적용). ${inZone ? "농업진흥구역 안" : "진흥구역 밖"} — 전용 시 농지보전부담금 필요 (공시지가 미확보로 금액 미산출)`,
  };
}

function checkForest(
  jimok: string | undefined,
  useAttrs: string[] | undefined,
  areaSqm: number,
  publicPricePerSqm: number | undefined,
): ChecklistItem | null {
  if (jimok !== "임야") return null;

  const isPreserved = (useAttrs ?? []).some((a) => /보전산지|공익용산지|임업용산지/.test(a));
  const base = 8340 * (isPreserved ? 1.3 : 1);
  if (publicPricePerSqm && areaSqm > 0) {
    const surcharge = Math.min(publicPricePerSqm * 0.001, FOREST_SURCHARGE_CAP);
    const unit = base + surcharge;
    const won = Math.round(unit * areaSqm);
    return {
      level: "warning",
      icon: "⛰️",
      title: "산지 — 대체산림자원조성비 예상",
      detail: `지목 임야(산지관리법 적용). ${isPreserved ? "보전산지(+30%)" : "준보전산지"} 기준 약 ${(won / 1e4).toLocaleString("ko-KR", { maximumFractionDigits: 0 })}만원 예상 (2026년 산림청 고시 기준 — 실제 부과액은 전용 시점 고시 단가 기준)`,
    };
  }
  return {
    level: "warning",
    icon: "⛰️",
    title: "산지 — 부담금 발생 예정",
    detail: `지목 임야(산지관리법 적용). ${isPreserved ? "보전산지" : "준보전산지"} — 전용 시 대체산림자원조성비 필요 (공시지가 미확보로 금액 미산출)`,
  };
}

function checkSunlight(zoneCode: ZoneCode | undefined): ChecklistItem | null {
  if (!zoneCode) return null;
  const z = ZONES[zoneCode];
  if (!z) return null;
  if (z.sunlight) {
    return {
      level: "info",
      icon: "☀️",
      title: "정북 일조권 사선제한 대상",
      detail: `${z.name} — 건축법 시행령 제86조 1항 적용. ② 규모 검토 탭에서 층별 후퇴 반영값을 확인하세요.`,
    };
  }
  return null;
}

/**
 * 조회된 필지 데이터로 체크리스트를 만든다. 위험도 높은 순(danger → warning
 * → info → ok)으로 정렬하고, 아무 걸림돌이 없으면 안심 카드 하나를 준다.
 */
export function buildRegulationChecklist(input: {
  jimok?: string;
  useAttrs?: string[];
  areaSqm: number;
  publicPricePerSqm?: number;
  zoneCode?: ZoneCode;
}): ChecklistItem[] {
  const items: ChecklistItem[] = [
    ...checkLandUsePlan(input.useAttrs),
    checkFarmland(input.jimok, input.useAttrs, input.areaSqm, input.publicPricePerSqm),
    checkForest(input.jimok, input.useAttrs, input.areaSqm, input.publicPricePerSqm),
    checkSunlight(input.zoneCode),
  ].filter((x): x is ChecklistItem => x !== null);

  if (items.length === 0) {
    items.push({
      level: "ok",
      icon: "✅",
      title: "확인된 저촉 사항 없음",
      detail: "조회 범위 안에서는 특별한 규제 항목이 발견되지 않았습니다. 다만 조례·지구단위계획 등은 지자체 확인이 원칙입니다.",
    });
  }

  return items.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}
