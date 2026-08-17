// ⑥ 가설계 — 법정 승용승강기 설치 의무 (건축법 제64조 + 건축물의 설비기준
// 등에 관한 규칙 별표 1의2).
//
// 목적: 가설계가 세대수만 뽑고 "그 세대수가 실제 지어질 수 있는 건물인지"를
// 검증하지 않던 문제를 보완한다. 6층 이상 건물에 승강기가 들어갈 자리(코어
// 면적)가 없으면 그 가설계는 애초에 성립하지 않는 안이었다는 뜻이다.

import type { ParkingUsageCode } from "@/lib/parking-standards";

/** 승강기 1대당 개략 점유면적(㎡) — 승강로+승강장 홀 포함 실무 통상치.
 *  법정 수치가 아니라 참고용 — UI에 반드시 "참고용" 명시. */
export const ELEVATOR_UNIT_SQM = 6;

type ElevatorGroup = "group1" | "group2" | "group3";

/**
 * 별표 1의2 용도 그룹 매핑.
 * gyumo의 15개 용도군을 별표의 3개 그룹으로 근사한다.
 * "운동문화"는 그룹1(공연장 등)과 그룹3(체육관 등)이 혼재된 gyumo 자체
 * 분류라 세분 불가 — 더 흔한 케이스인 그룹3(체육관 등)으로 근사한다.
 */
const GROUP_OF: Record<ParkingUsageCode, ElevatorGroup> = {
  판매: "group1",
  의료: "group1",
  업무: "group2",
  오피스텔: "group2", // 건축법상 오피스텔은 업무시설로 분류
  숙박: "group2",
  위락: "group2",
  공동주택: "group3",
  다세대연립: "group3",
  다가구: "group3",
  도시형생활주택: "group3",
  단독주택: "group3",
  근린1: "group3",
  근린2: "group3",
  운동문화: "group3", // 근사 — 위 주석 참고
  종교: "group3",
  공장: "group3",
  창고: "group3",
};

/** 그룹별 대수 산정 (거실면적 합계 기준, ㎡) */
function calcSpacesByGroup(group: ElevatorGroup, areaSqm: number): number {
  if (areaSqm <= 0) return 0;
  if (group === "group1") {
    if (areaSqm <= 3000) return 2;
    return 2 + Math.ceil((areaSqm - 3000) / 2000);
  }
  if (group === "group2") {
    if (areaSqm <= 3000) return 1;
    return 1 + Math.ceil((areaSqm - 3000) / 2000);
  }
  // group3
  if (areaSqm <= 3000) return 1;
  return 1 + Math.ceil((areaSqm - 3000) / 3000);
}

export type ElevatorRequirement = {
  /** 승강기 설치 의무 대상인지 (6층 이상 & 6층 이상 거실면적 합계 근사 확보) */
  required: boolean;
  /** 법정 최소 대수 */
  count: number;
  /** 대수 × 개략 점유면적(㎡) — 코어 면적과 비교용 */
  areaSqm: number;
  /** 6층 정확히인 경우, 시행령 89조 예외 대상일 수 있다는 안내 */
  possiblyExempt: boolean;
  basis: string;
};

/**
 * 법정 승강기 대수를 추정한다.
 *
 * @param floors 총 층수 (규모검토 산출값, 소수 가능)
 * @param floorAreaSqm 기준층 바닥면적(㎡) — "6층 이상 거실면적 합계"를
 *   (층수-5) × 기준층 면적으로 근사한다. 실제로는 층마다 면적이 다르고
 *   거실 외 면적(계단·주차 등)이 제외되므로 이 값은 근사치다.
 * @param usage 건축물 용도 (별표 1의2 그룹 매핑)
 */
export function calcElevatorRequirement(
  floors: number,
  floorAreaSqm: number,
  usage: ParkingUsageCode,
): ElevatorRequirement {
  const wholeFloors = Math.floor(floors);
  if (wholeFloors < 6 || floorAreaSqm <= 0) {
    return {
      required: false,
      count: 0,
      areaSqm: 0,
      possiblyExempt: false,
      basis: "6층 미만 — 건축법 제64조 승강기 설치 의무 없음",
    };
  }

  const floorsAbove6 = wholeFloors - 5; // 6층부터 최상층까지 층수
  const areaAbove6 = floorsAbove6 * floorAreaSqm;
  const group = GROUP_OF[usage];
  const count = calcSpacesByGroup(group, areaAbove6);

  return {
    required: true,
    count,
    areaSqm: count * ELEVATOR_UNIT_SQM,
    possiblyExempt: wholeFloors === 6,
    basis: `건축법 제64조 + 「건축물의 설비기준 등에 관한 규칙」 별표1의2 — 6층 이상 거실면적 합계 약 ${Math.round(areaAbove6).toLocaleString("ko-KR")}㎡ 기준`,
  };
}
