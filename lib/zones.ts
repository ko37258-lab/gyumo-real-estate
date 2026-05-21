/**
 * 서울특별시 용도지역 건폐율·용적률 상한
 *
 * 출처: 서울특별시 도시계획 조례 (2026년 기준)
 * 검토: 고상철 대표 (공법의 신, 28년 경력)
 * 최종 갱신: 2026-05-22
 *
 * 참고:
 * - 자치구별로 추가 변형이 있을 수 있음 (강남구, 송파구 등)
 * - 정비사업·지구단위계획 등으로 한도 상향 가능 (별도 검토 필요)
 * - 서울도심(사대문 안 — 종로구·중구 일부)은 floorRatioCBD 적용
 * - 비도시지역(관리·농림·자연환경)은 gyumo 미지원
 */

export type ZoneCode =
  // 주거
  | "1jeon"
  | "2jeon"
  | "1il"
  | "2il"
  | "3il"
  | "junju"
  // 상업
  | "gunin"
  | "ilsang"
  | "jungsang"
  | "yutong"
  // 공업
  | "jongon"
  | "ilbgon"
  | "jungon"
  // 녹지
  | "bojeon"
  | "saengsan"
  | "jayeon";

export type ZoneCategory = "residential" | "commercial" | "industrial" | "green";

export type Zone = {
  code: ZoneCode;
  name: string;
  /** 건폐율 상한 (%, 서울 조례) */
  coverRatioMax: number;
  /** 용적률 상한 (%, 서울 조례 일반) */
  floorRatioMax: number;
  /** 서울도심(사대문 안) 특례 용적률 — 있는 경우만 */
  floorRatioCBD?: number;
  category: ZoneCategory;
  /** VWorld·data.go.kr 응답 변형 매핑용 — 표준 name 외 별칭 */
  aliases?: string[];

  // ─── backward compat (기존 컴포넌트가 참조하는 필드 — derived) ───
  /** = coverRatioMax */
  maxCov: number;
  /** = floorRatioMax */
  farMax: number;
  /** 용적률 슬라이더 최소 — 보통 50% */
  farMin: number;
  /** 초기 슬라이더 기본값 — 일반적으로 floorRatioMax */
  defFar: number;
  /** category === 'residential' — 일조권 사선 적용 여부 */
  residential: boolean;
};

/** 내부 헬퍼 — backward-compat 필드 자동 채움. */
function zone(
  z: Omit<Zone, "maxCov" | "farMax" | "farMin" | "defFar" | "residential">,
): Zone {
  return {
    ...z,
    maxCov: z.coverRatioMax,
    farMax: z.floorRatioMax,
    farMin: 50,
    defFar: z.floorRatioMax,
    residential: z.category === "residential",
  };
}

export const ZONES: Record<ZoneCode, Zone> = {
  // ─── 주거지역 (서울 조례) ─────────────────────────────
  "1jeon": zone({
    code: "1jeon",
    name: "제1종전용주거지역",
    coverRatioMax: 50,
    floorRatioMax: 100,
    category: "residential",
    aliases: ["1종전용주거", "1종전용주거지역"],
  }),
  "2jeon": zone({
    code: "2jeon",
    name: "제2종전용주거지역",
    coverRatioMax: 40,
    floorRatioMax: 120,
    category: "residential",
    aliases: ["2종전용주거", "2종전용주거지역"],
  }),
  "1il": zone({
    code: "1il",
    name: "제1종일반주거지역",
    coverRatioMax: 60,
    floorRatioMax: 150,
    category: "residential",
    aliases: ["1종일반주거", "1종일주", "1종일반주거지역"],
  }),
  "2il": zone({
    code: "2il",
    name: "제2종일반주거지역",
    coverRatioMax: 60,
    floorRatioMax: 200,
    category: "residential",
    aliases: ["2종일반주거", "2종일주", "2종일반주거지역"],
  }),
  "3il": zone({
    code: "3il",
    name: "제3종일반주거지역",
    coverRatioMax: 50,
    floorRatioMax: 250,
    category: "residential",
    aliases: ["3종일반주거", "3종일주", "3종일반주거지역"],
  }),
  junju: zone({
    code: "junju",
    name: "준주거지역",
    coverRatioMax: 60,
    floorRatioMax: 400,
    category: "residential",
    aliases: ["준주거"],
  }),

  // ─── 상업지역 (서울 조례, 서울도심 특례 분리) ─────────
  jungsang: zone({
    code: "jungsang",
    name: "중심상업지역",
    coverRatioMax: 60,
    floorRatioMax: 1000,
    floorRatioCBD: 800,
    category: "commercial",
    aliases: ["중심상업"],
  }),
  ilsang: zone({
    code: "ilsang",
    name: "일반상업지역",
    coverRatioMax: 60,
    floorRatioMax: 800,
    floorRatioCBD: 600,
    category: "commercial",
    aliases: ["일반상업", "상업지역(일반)"],
  }),
  gunin: zone({
    code: "gunin",
    name: "근린상업지역",
    coverRatioMax: 60,
    floorRatioMax: 600,
    floorRatioCBD: 500,
    category: "commercial",
    aliases: ["근린상업"],
  }),
  yutong: zone({
    code: "yutong",
    name: "유통상업지역",
    coverRatioMax: 60,
    floorRatioMax: 600,
    floorRatioCBD: 500,
    category: "commercial",
    aliases: ["유통상업"],
  }),

  // ─── 공업지역 (서울 조례) ─────────────────────────────
  jongon: zone({
    code: "jongon",
    name: "전용공업지역",
    coverRatioMax: 60,
    floorRatioMax: 200,
    category: "industrial",
    aliases: ["전용공업"],
  }),
  ilbgon: zone({
    code: "ilbgon",
    name: "일반공업지역",
    coverRatioMax: 60,
    floorRatioMax: 200,
    category: "industrial",
    aliases: ["일반공업"],
  }),
  jungon: zone({
    code: "jungon",
    name: "준공업지역",
    coverRatioMax: 60,
    floorRatioMax: 400,
    category: "industrial",
    aliases: ["준공업"],
  }),

  // ─── 녹지지역 (서울 조례 — 시뮬레이션 한도, 실무 인허가 시 별도 검토) ─
  bojeon: zone({
    code: "bojeon",
    name: "보전녹지지역",
    coverRatioMax: 20,
    floorRatioMax: 50,
    category: "green",
    aliases: ["보전녹지"],
  }),
  saengsan: zone({
    code: "saengsan",
    name: "생산녹지지역",
    coverRatioMax: 20,
    floorRatioMax: 50,
    category: "green",
    aliases: ["생산녹지"],
  }),
  jayeon: zone({
    code: "jayeon",
    name: "자연녹지지역",
    coverRatioMax: 20,
    floorRatioMax: 50,
    category: "green",
    aliases: ["자연녹지"],
  }),
};

export const ZONE_LIST: Zone[] = Object.values(ZONES);

export const ZONE_LABEL = (z: Zone) =>
  `${z.name} (건폐율 ${z.coverRatioMax}% · 용적률 ${z.floorRatioMax.toLocaleString("ko-KR")}%${z.floorRatioCBD ? ` / 도심 ${z.floorRatioCBD}%` : ""})`;

/**
 * API 응답 zone 이름 → ZoneCode 매핑.
 * 1) name 정확 일치
 * 2) aliases 일치
 * 3) 부분 매칭 (응답이 "·" 등 보조 문자 포함하는 경우)
 */
export function findZoneCodeByName(
  apiZoneName: string | null | undefined,
): ZoneCode | null {
  if (!apiZoneName) return null;
  const trimmed = apiZoneName.trim();

  // 1) 정확 일치
  for (const z of ZONE_LIST) {
    if (z.name === trimmed) return z.code;
  }
  // 2) 별칭
  for (const z of ZONE_LIST) {
    if (z.aliases?.some((a) => a === trimmed)) return z.code;
  }
  // 3) 부분 매칭 — 응답이 zone 이름을 포함
  for (const z of ZONE_LIST) {
    if (trimmed.includes(z.name)) return z.code;
  }
  // 4) 별칭 부분 매칭
  for (const z of ZONE_LIST) {
    if (z.aliases?.some((a) => trimmed.includes(a))) return z.code;
  }
  return null;
}

/** 서울도심(사대문 안) 자동 추정 — 자치구 기준 약식. 실제 행정동 경계는 별도 데이터 필요. */
export function isLikelyCBD(address: string | null | undefined): boolean {
  if (!address) return false;
  return /\b종로구\b|\b중구\b/.test(address);
}

/**
 * CBD 토글 + 용도지역을 받아 실효 용적률 상한 반환.
 * CBD가 적용되고 zone에 floorRatioCBD가 있으면 그 값, 아니면 일반 floorRatioMax.
 */
export function getEffectiveFloorRatioMax(
  zone: Zone,
  isCBD: boolean,
): number {
  if (isCBD && zone.floorRatioCBD) return zone.floorRatioCBD;
  return zone.floorRatioMax;
}
