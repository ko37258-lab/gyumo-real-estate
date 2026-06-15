// 지목별 투자 가치·리스크 매핑 + 도로 판정 보조 데이터.
// stellar(real-estate-infographic) LandRiskCheck.jsx에서 추출.

export type JimokValue =
  | "high"
  | "medium-high"
  | "medium"
  | "low-medium"
  | "low"
  | "none";

export type JimokRisk =
  | "low"
  | "medium"
  | "medium-high"
  | "high"
  | "n/a";

export interface JimokInfo {
  value: JimokValue;
  emoji: string;
  desc: string;
  risk: JimokRisk;
}

export const JIMOK_INFO: Record<string, JimokInfo> = {
  대: { value: "high", emoji: "🏠", desc: "건축 가능. 주거·상업·산업 모두 활용 가능한 최우선 지목", risk: "low" },
  잡종지: { value: "medium-high", emoji: "🏗️", desc: "지목변경 가능성 큼. 대지화 시 가치 상승", risk: "medium" },
  공장용지: { value: "high", emoji: "🏭", desc: "산업단지·물류 활용", risk: "low" },
  창고용지: { value: "high", emoji: "📦", desc: "산업·물류 활용", risk: "low" },
  학교용지: { value: "medium", emoji: "🏫", desc: "공익 목적. 매매 제한적", risk: "medium" },
  전: { value: "medium", emoji: "🌾", desc: "농지. 농지법 적용. 농업진흥구역이면 전용 어려움", risk: "medium-high" },
  답: { value: "medium", emoji: "🌾", desc: "논. 농지법 적용. 농지전용허가 필요", risk: "medium-high" },
  과수원: { value: "medium", emoji: "🍎", desc: "농지. 농지법 적용", risk: "medium-high" },
  목장용지: { value: "low-medium", emoji: "🐄", desc: "농지 또는 임야 성격", risk: "medium" },
  임야: { value: "low", emoji: "⛰️", desc: "산림법 적용. 형질변경·건축 매우 제한적", risk: "high" },
  도로: { value: "none", emoji: "🛣️", desc: "도로 자체. 건축 불가", risk: "n/a" },
  하천: { value: "none", emoji: "💧", desc: "하천부지. 건축 불가", risk: "n/a" },
  구거: { value: "none", emoji: "💧", desc: "수로. 건축 불가", risk: "n/a" },
  유지: { value: "low", emoji: "💧", desc: "저수지·연못. 건축 제한적", risk: "high" },
  제방: { value: "none", emoji: "🌊", desc: "제방. 건축 불가", risk: "n/a" },
  주차장: { value: "medium", emoji: "🅿️", desc: "주차 전용. 다른 용도 활용 제한", risk: "medium" },
  주유소용지: { value: "medium", emoji: "⛽", desc: "주유소 전용", risk: "medium" },
  공원: { value: "low", emoji: "🌳", desc: "공원시설. 건축 매우 제한적", risk: "high" },
  체육용지: { value: "low", emoji: "⚽", desc: "체육시설용", risk: "medium" },
  유원지: { value: "low", emoji: "🎡", desc: "관광·유원지용", risk: "medium" },
  종교용지: { value: "low", emoji: "⛪", desc: "종교시설용", risk: "medium" },
  사적지: { value: "none", emoji: "🏛️", desc: "문화재. 개발 불가", risk: "n/a" },
  묘지: { value: "low", emoji: "⚰️", desc: "묘지. 매우 제한적", risk: "high" },
  염전: { value: "low", emoji: "🧂", desc: "염전. 매우 제한적", risk: "high" },
  양어장: { value: "low", emoji: "🐟", desc: "양어장. 매우 제한적", risk: "high" },
  철도용지: { value: "none", emoji: "🚂", desc: "철도시설용. 건축 불가", risk: "n/a" },
  수도용지: { value: "none", emoji: "🚰", desc: "상수도시설용", risk: "n/a" },
  광천지: { value: "low", emoji: "⛲", desc: "광천. 매우 제한적", risk: "high" },
};

/**
 * 지목 부호(약어) → 정식 명칭 매핑.
 *
 * 배경: VWorld LP_PA_CBND_BUBUN의 jibun 필드는 지번 끝에 지목을 표기하는데,
 *   "대"처럼 정식명과 약어가 같은 경우도 있지만 대부분은 1글자 부호로 온다.
 *   (예: "578-11전" → 전(정식), "산12임" → 임(=임야), "장"(=공장용지))
 *   지적법 시행령 제58조의 지목 부호 28종을 정식 명칭으로 환원한다.
 *
 * 약어와 정식명이 동일한 지목(전·답·대·도로 등)은 JIMOK_INFO에서 직접 매칭되므로 생략.
 */
export const JIMOK_ALIAS: Record<string, string> = {
  과: "과수원",
  목: "목장용지",
  임: "임야",
  광: "광천지",
  염: "염전",
  장: "공장용지",
  학: "학교용지",
  차: "주차장",
  주: "주유소용지",
  창: "창고용지",
  철: "철도용지",
  제: "제방",
  천: "하천",
  구: "구거",
  유: "유지",
  양: "양어장",
  수: "수도용지",
  공: "공원",
  체: "체육용지",
  원: "유원지",
  종: "종교용지",
  사: "사적지",
  묘: "묘지",
  잡: "잡종지",
  // 도로는 부호도 "도"이지만 jibun이 "도"로 끝나는 경우가 흔해 명시 (JIMOK_INFO에 "도로"로 존재)
  도: "도로",
};

/** 지목명(약어 또는 정식명) → 정식 명칭으로 정규화. */
export function normalizeJimok(name: string | null | undefined): string {
  if (!name) return "";
  const trimmed = name.trim();
  if (JIMOK_INFO[trimmed]) return trimmed; // 이미 정식명
  return JIMOK_ALIAS[trimmed] ?? trimmed; // 약어면 환원, 미지정이면 원본
}

export const VALUE_LABEL: Record<JimokValue, string> = {
  high: "높음",
  "medium-high": "중상",
  medium: "중간",
  "low-medium": "중하",
  low: "낮음",
  none: "없음 (건축 불가)",
};

export const RISK_LABEL: Record<JimokRisk, string> = {
  low: "낮음 ✅",
  medium: "보통 ⚠️",
  "medium-high": "높음 ⚠️",
  high: "매우 높음 ⛔",
  "n/a": "해당 없음",
};

/**
 * 건축물이 존재해야만 성립하는 지목 — 도로 접면이 사실상 보장됨.
 * VWorld의 도로 조회가 누락되더라도 이 지목이면 접도 추정 가능.
 */
export const BUILT_JIMOK: ReadonlyArray<string> = [
  "대",
  "공장용지",
  "창고용지",
  "학교용지",
  "주차장",
  "주유소용지",
  "종교용지",
  "체육용지",
  "유원지",
  "잡종지",
];

export function getJimokInfo(name: string | null | undefined): JimokInfo {
  const normalized = normalizeJimok(name);
  if (!normalized)
    return { value: "low", emoji: "❓", desc: "지목 정보 미확인", risk: "medium" };
  return (
    JIMOK_INFO[normalized] ?? {
      value: "low",
      emoji: "❓",
      desc: "지목 정보 미확인",
      risk: "medium",
    }
  );
}

export function isBuiltJimok(name: string | null | undefined): boolean {
  const normalized = normalizeJimok(name);
  return !!normalized && BUILT_JIMOK.includes(normalized);
}
