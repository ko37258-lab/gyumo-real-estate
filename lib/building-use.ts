// 건축물 용도 → 시각화 스타일 매핑
// ⑤ 주차 산정의 15개 용도(ParkingUsageCode)를 6개 용도군으로 묶어
// 매스 색상·입면(창문) 스타일·아이콘·라벨을 부여한다.
// 규모검토(④ 매스 시각화 2D/3D)가 이 데이터로 용도별로 다르게 그려진다.

import type { ParkingUsageCode } from "@/lib/parking-standards";

export type UseGroup =
  | "residential" // 주거
  | "office" // 업무·오피스텔
  | "retail" // 근린·판매
  | "lodging" // 숙박
  | "civic" // 의료·문화·종교
  | "industrial"; // 공장·창고

/** 입면(창문) 스타일 — 2D 정북단면 렌더에 사용 */
export type FacadeStyle =
  | "punched" // 주거: 규칙적인 작은 창 (펀치드 윈도)
  | "grid" // 업무: 촘촘한 커튼월 격자
  | "storefront" // 상가: 1층 통유리 + 상층 펀치드
  | "band" // 숙박·문화: 가로 리본 창
  | "sparse"; // 공장: 성긴 창

/** 15개 용도 → 6개 용도군 */
export const USE_GROUP_OF: Record<ParkingUsageCode, UseGroup> = {
  단독주택: "residential",
  공동주택: "residential",
  다세대연립: "residential",
  다가구: "residential",
  도시형생활주택: "residential",
  오피스텔: "office",
  업무: "office",
  근린1: "retail",
  근린2: "retail",
  판매: "retail",
  의료: "civic",
  운동문화: "civic",
  종교: "civic",
  숙박: "lodging",
  공장창고: "industrial",
};

/** 건물 위에 표시할 짧은 용도 라벨 */
export const USE_SHORT_LABEL: Record<ParkingUsageCode, string> = {
  단독주택: "단독주택",
  공동주택: "공동주택",
  다세대연립: "다세대·연립",
  다가구: "다가구주택",
  도시형생활주택: "도시형생활",
  오피스텔: "오피스텔",
  업무: "업무시설",
  근린1: "제1종근생",
  근린2: "제2종근생",
  판매: "판매시설",
  의료: "의료시설",
  운동문화: "운동·문화",
  숙박: "숙박시설",
  종교: "종교시설",
  공장창고: "공장·창고",
};

export type UseGroupStyle = {
  key: UseGroup;
  /** 용도군 표시명 */
  label: string;
  /** 이모지 아이콘 */
  icon: string;
  /** 매스 그라디언트 3-stop (위→중간→아래) */
  gradTop: string;
  gradMid: string;
  gradBottom: string;
  /** 매스 외곽선 */
  edge: string;
  /** 창문 채움 */
  glass: string;
  glassStroke: string;
  facade: FacadeStyle;
};

export const USE_GROUP_STYLE: Record<UseGroup, UseGroupStyle> = {
  residential: {
    key: "residential",
    label: "주거",
    icon: "🏠",
    gradTop: "#F8BB9C",
    gradMid: "#F0997B",
    gradBottom: "#DD7A54",
    edge: "#4A1B0C",
    glass: "#B7D4EC",
    glassStroke: "#7FA6C8",
    facade: "punched",
  },
  office: {
    key: "office",
    label: "업무·오피스텔",
    icon: "🏢",
    gradTop: "#A9C4DE",
    gradMid: "#6A93BC",
    gradBottom: "#456B90",
    edge: "#18293B",
    glass: "#CFE6FA",
    glassStroke: "#89B0D2",
    facade: "grid",
  },
  retail: {
    key: "retail",
    label: "근린·판매",
    icon: "🏪",
    gradTop: "#7FD6B9",
    gradMid: "#42B08E",
    gradBottom: "#2E8168",
    edge: "#123F32",
    glass: "#D6F4EB",
    glassStroke: "#7FC9B2",
    facade: "storefront",
  },
  lodging: {
    key: "lodging",
    label: "숙박",
    icon: "🏨",
    gradTop: "#CFAAE6",
    gradMid: "#A379C6",
    gradBottom: "#7F57A2",
    edge: "#34214C",
    glass: "#EEDFF7",
    glassStroke: "#B98FD4",
    facade: "band",
  },
  civic: {
    key: "civic",
    label: "의료·문화·종교",
    icon: "🏥",
    gradTop: "#F2A9C1",
    gradMid: "#D96E93",
    gradBottom: "#B34F73",
    edge: "#4A1526",
    glass: "#FBE0EA",
    glassStroke: "#E093AF",
    facade: "band",
  },
  industrial: {
    key: "industrial",
    label: "공장·창고",
    icon: "🏭",
    gradTop: "#BEC5CD",
    gradMid: "#8C949E",
    gradBottom: "#656D77",
    edge: "#2A2F35",
    glass: "#DDE3E9",
    glassStroke: "#A6AEB8",
    facade: "sparse",
  },
};

/** 용도 코드 → 시각화 스타일 + 짧은 라벨 */
export function getUseStyle(
  code: ParkingUsageCode,
): UseGroupStyle & { usageLabel: string } {
  const group = USE_GROUP_OF[code];
  return { ...USE_GROUP_STYLE[group], usageLabel: USE_SHORT_LABEL[code] };
}
