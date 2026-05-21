/**
 * 주차장 설치기준 데이터 — 주차장법 시행령 별표1 + 서울특별시 주차장 설치 및 관리 조례.
 *
 * 시행령 값은 「주차장법 시행령」(대통령령) 별표1 부설주차장 설치기준에 따른 일반론,
 * 서울값은 「서울특별시 주차장 설치 및 관리에 관한 조례」(서울조례)의 강화 기준에 따른 일반론입니다.
 *
 * 실제 인허가 시 자치구·용도지구·세부 시설 분류에 따라 달라질 수 있으므로
 * 학습용·사업타당성 사전검토용으로 사용하고, 최종 인허가 전에 해당 지자체 건축과·교통과 확인을 권장합니다.
 */

export type ParkingUsageCode =
  | "단독주택"
  | "공동주택"
  | "다세대연립"
  | "다가구"
  | "도시형생활주택"
  | "오피스텔"
  | "근린1"
  | "근린2"
  | "판매"
  | "업무"
  | "의료"
  | "운동문화"
  | "숙박"
  | "종교"
  | "공장창고";

export type ParkingMode = "area" | "progressive" | "tieredHousehold";

export type AreaTier = {
  /** 전용면적 상한(㎡). null이면 그 이상 전부. */
  upTo: number | null;
  /** 세대당 대수 */
  ratio: number;
};

export type ProgressiveSpec = {
  /** 산정 기준 면적의 시작(㎡) — 이 이하는 0대 */
  baseStart: number;
  /** 시작 임계값(㎡) — baseStart 초과 이 값 이하는 firstSpaces 대 */
  firstUpTo: number;
  /** 시작 구간 대수 */
  firstSpaces: number;
  /** 시작 임계값 초과 시 N㎡당 1대 추가 */
  addPerArea: number;
};

interface BaseStandard {
  code: ParkingUsageCode;
  label: string;
  /** 산정 기준이 무엇인지 사용자에게 설명하는 짧은 문구 */
  unitLabel: string;
  /** 시행령 별표1의 항목 표시 */
  legalBasis: string;
  /** 실무 노트 (선택) */
  note?: string;
}

export interface AreaStandard extends BaseStandard {
  mode: "area";
  /** 시행령: N㎡당 1대 */
  decreeAreaPerSpace: number;
  /** 서울 조례: N㎡당 1대 (강화된 값) */
  seoulAreaPerSpace: number;
}

export interface ProgressiveStandard extends BaseStandard {
  mode: "progressive";
  decree: ProgressiveSpec;
  seoul: ProgressiveSpec;
}

export interface TieredStandard extends BaseStandard {
  mode: "tieredHousehold";
  decreeTiers: AreaTier[];
  seoulTiers: AreaTier[];
}

export type ParkingStandard =
  | AreaStandard
  | ProgressiveStandard
  | TieredStandard;

export const PARKING_STANDARDS: Record<ParkingUsageCode, ParkingStandard> = {
  단독주택: {
    code: "단독주택",
    label: "단독주택",
    unitLabel: "시설면적(㎡), 누진 산정",
    mode: "progressive",
    decree: {
      baseStart: 50,
      firstUpTo: 150,
      firstSpaces: 1,
      addPerArea: 100,
    },
    seoul: {
      baseStart: 50,
      firstUpTo: 150,
      firstSpaces: 1,
      addPerArea: 100,
    },
    legalBasis: "주차장법 시행령 별표1 제1호",
    note: "50㎡ 초과 150㎡ 이하는 1대, 150㎡ 초과분은 100㎡마다 1대 가산. 서울도 동일.",
  },

  공동주택: {
    code: "공동주택",
    label: "공동주택 (아파트)",
    unitLabel: "전용면적 구간별 세대당",
    mode: "tieredHousehold",
    decreeTiers: [
      { upTo: 60, ratio: 0.7 },
      { upTo: 85, ratio: 1.0 },
      { upTo: 135, ratio: 1.0 },
      { upTo: null, ratio: 1.5 },
    ],
    seoulTiers: [
      { upTo: 60, ratio: 0.8 },
      { upTo: 85, ratio: 1.0 },
      { upTo: 135, ratio: 1.2 },
      { upTo: null, ratio: 1.5 },
    ],
    legalBasis: "주택건설기준규정 제27조 + 시·도 조례",
    note: "전용면적 구간별 세대당 비율 가중합. 단지 전체 세대수 분포로 총 대수 산정.",
  },

  다세대연립: {
    code: "다세대연립",
    label: "다세대·연립주택",
    unitLabel: "전용면적 구간별 세대당",
    mode: "tieredHousehold",
    decreeTiers: [
      { upTo: 60, ratio: 0.7 },
      { upTo: 85, ratio: 1.0 },
      { upTo: 135, ratio: 1.0 },
      { upTo: null, ratio: 1.5 },
    ],
    seoulTiers: [
      { upTo: 60, ratio: 0.8 },
      { upTo: 85, ratio: 1.0 },
      { upTo: 135, ratio: 1.2 },
      { upTo: null, ratio: 1.5 },
    ],
    legalBasis: "주차장법 시행령 별표1 + 주택건설기준규정 제27조",
  },

  다가구: {
    code: "다가구",
    label: "다가구주택",
    unitLabel: "시설면적(㎡)당",
    mode: "area",
    decreeAreaPerSpace: 100,
    seoulAreaPerSpace: 100,
    legalBasis: "주차장법 시행령 별표1",
    note: "다가구주택은 단독주택 형태지만 부설주차장 산정에서는 시설면적 100㎡당 1대 기준이 일반적.",
  },

  도시형생활주택: {
    code: "도시형생활주택",
    label: "도시형생활주택",
    unitLabel: "시설면적(㎡)당",
    mode: "area",
    decreeAreaPerSpace: 100,
    seoulAreaPerSpace: 80,
    legalBasis: "주차장법 시행령 별표1 + 주택법 시행령",
    note: "원룸형은 1세대당 0.5대(전용 30㎡↓는 0.4대) 등 별도 기준. 단순 추정은 시설면적 기준 사용.",
  },

  오피스텔: {
    code: "오피스텔",
    label: "오피스텔",
    unitLabel: "전용면적 구간별 세대당",
    mode: "tieredHousehold",
    decreeTiers: [
      { upTo: 30, ratio: 0.5 },
      { upTo: 60, ratio: 0.8 },
      { upTo: null, ratio: 1.0 },
    ],
    seoulTiers: [
      { upTo: 30, ratio: 0.5 },
      { upTo: 60, ratio: 0.8 },
      { upTo: null, ratio: 1.0 },
    ],
    legalBasis: "주차장법 시행령 별표1 + 주택건설기준규정 제27조 준용",
    note: "오피스텔은 일반적으로 1세대당 1대 기준(서울). 전용면적이 작으면 0.5~0.8대로 완화 가능.",
  },

  근린1: {
    code: "근린1",
    label: "제1종 근린생활시설",
    unitLabel: "시설면적(㎡)당",
    mode: "area",
    decreeAreaPerSpace: 200,
    seoulAreaPerSpace: 134,
    legalBasis: "주차장법 시행령 별표1 제3호",
    note: "수퍼·휴게음식점·이용원·미용원·세탁소·의원 등.",
  },

  근린2: {
    code: "근린2",
    label: "제2종 근린생활시설",
    unitLabel: "시설면적(㎡)당",
    mode: "area",
    decreeAreaPerSpace: 200,
    seoulAreaPerSpace: 134,
    legalBasis: "주차장법 시행령 별표1 제3호",
    note: "일반음식점·학원·서점·기원·노래연습장 등. 일부 다중이용시설은 별도 강화.",
  },

  판매: {
    code: "판매",
    label: "판매시설",
    unitLabel: "시설면적(㎡)당",
    mode: "area",
    decreeAreaPerSpace: 150,
    seoulAreaPerSpace: 100,
    legalBasis: "주차장법 시행령 별표1 제2호",
    note: "대형마트·도매시장·소매시장 등. 1,000㎡ 이상은 별도 강화 가능.",
  },

  업무: {
    code: "업무",
    label: "업무시설 (오피스 빌딩)",
    unitLabel: "시설면적(㎡)당",
    mode: "area",
    decreeAreaPerSpace: 150,
    seoulAreaPerSpace: 100,
    legalBasis: "주차장법 시행령 별표1 제2호",
    note: "일반 사무실·금융업소 등. 서울 도심부는 100㎡당 1대 강화가 일반적.",
  },

  의료: {
    code: "의료",
    label: "의료시설",
    unitLabel: "시설면적(㎡)당",
    mode: "area",
    decreeAreaPerSpace: 150,
    seoulAreaPerSpace: 100,
    legalBasis: "주차장법 시행령 별표1 제2호",
    note: "병원·종합병원. 정신병원·요양병원·격리병원은 제외(다른 기준).",
  },

  운동문화: {
    code: "운동문화",
    label: "운동·문화 및 집회시설",
    unitLabel: "시설면적(㎡)당",
    mode: "area",
    decreeAreaPerSpace: 150,
    seoulAreaPerSpace: 100,
    legalBasis: "주차장법 시행령 별표1 제2호",
    note: "공연장·관람장·체육관 등. 골프장·옥외수영장은 별도(홀·정원 기준).",
  },

  숙박: {
    code: "숙박",
    label: "숙박시설",
    unitLabel: "시설면적(㎡)당",
    mode: "area",
    decreeAreaPerSpace: 200,
    seoulAreaPerSpace: 134,
    legalBasis: "주차장법 시행령 별표1 제3호",
    note: "호텔·여관·휴양콘도미니엄 등.",
  },

  종교: {
    code: "종교",
    label: "종교시설",
    unitLabel: "시설면적(㎡)당",
    mode: "area",
    decreeAreaPerSpace: 150,
    seoulAreaPerSpace: 100,
    legalBasis: "주차장법 시행령 별표1 제2호",
  },

  공장창고: {
    code: "공장창고",
    label: "공장·창고시설",
    unitLabel: "시설면적(㎡)당",
    mode: "area",
    decreeAreaPerSpace: 400,
    seoulAreaPerSpace: 350,
    legalBasis: "주차장법 시행령 별표1 제4호",
    note: "공장(아파트형 제외)·창고. 데이터센터·발전시설 등은 별도.",
  },
};

export const PARKING_USAGE_LIST: ParkingStandard[] = Object.values(
  PARKING_STANDARDS,
);

/** 주차구획 1대당 일반적인 소요 면적(㎡) — 구획 2.5×5m + 차로·회전공간 가중. */
export const SQM_PER_SPACE = 25;

/** 공동주택·다세대·연립·오피스텔 구간 라벨 (UI용) */
export function tierLabel(t: AreaTier, prev: AreaTier | undefined): string {
  if (t.upTo === null) {
    return prev ? `전용 ${prev.upTo}㎡ 초과` : `전체`;
  }
  if (!prev) {
    return `전용 ${t.upTo}㎡ 이하`;
  }
  return `전용 ${prev.upTo}~${t.upTo}㎡`;
}
