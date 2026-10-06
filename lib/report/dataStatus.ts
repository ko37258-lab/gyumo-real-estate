// 데이터 상태 판정 — 지번 조회 완료 / 초기 예시값 / 사용자 입력(미조회) 단일 판정원. (2026-10-05)
//
// 배경: 조회 전 초기 상태(예시 주소·예시 대지면적 등)로 한장 보고서를 만들면 제목이
// 실제 조회 결과처럼 보였다("서울특별시 강남구 역삼동 825-3"은 store 의 초기 예시값일 뿐인데
// 그대로 제목에 찍힘). 화면·한장 보고서·상세 보고서가 전부 이 판정 하나만 쓴다.
//
// 판정 3단계:
//  - fetched : 지번 조회(applyLotInfo)가 성공했고, 그 결과 주소가 현재 입력창 주소와 같다.
//  - manual  : 입력창에 주소 문자열이 있지만 조회된 적이 없다(또는 조회 후 주소를 다시 고쳐
//              조회 결과와 어긋난다) — "입력창에 문자열만 있다고 조회완료로 오인하지 않는다".
//  - example : 입력창이 비어 있거나 초기 예시 주소 그대로다.

/** store 초기값과 동일 — store/simulator.ts 가 이 값을 가져다 쓴다(값 중복 방지). */
export const EXAMPLE_ADDRESS = "서울특별시 강남구 역삼동 825-3";

export type AddressStatus = "fetched" | "manual" | "example";

export interface AddressStatusInput {
  /** 현재 주소 입력창 값 */
  address: string;
  /** 지번 조회(applyLotInfo)로 저장된 결과. 조회 전이면 null. */
  lotInfo: { address: string } | null;
}

/** 조회완료/예시값/사용자입력값 3단계 판정 — 화면·한장·상세 보고서 공용 단일 판정원. */
export function determineAddressStatus({ address, lotInfo }: AddressStatusInput): AddressStatus {
  const addr = (address ?? "").trim();
  if (lotInfo && addr.length > 0 && lotInfo.address.trim() === addr) return "fetched";
  if (!addr || addr === EXAMPLE_ADDRESS) return "example";
  return "manual";
}

export const ADDRESS_STATUS_LABEL: Record<AddressStatus, string> = {
  fetched: "조회값",
  manual: "입력값(미조회)",
  example: "예시값",
};

// 배지(상단에 눈에 띄게)와 제목(머리말 큰 글씨)은 서로 다른 문구를 쓴다 — 둘 다
// "주소 미조회 · 예시 조건 검토"를 쓰면 같은 말이 바로 아래에 두 번 찍힌다(2026-10-06 수정).
const FALLBACK_BADGE: Record<Exclude<AddressStatus, "fetched">, string> = {
  example: "주소 미조회 · 예시 조건 검토",
  manual: "주소 미조회 · 입력값 확인 필요",
};
const FALLBACK_TITLE: Record<Exclude<AddressStatus, "fetched">, string> = {
  example: "예시 조건 규모검토",
  manual: "확인 필요 규모검토",
};

export interface ReportTitleInfo {
  /** 보고서 상단에 쓸 제목 */
  title: string;
  /** 조회 완료 여부 */
  isVerified: boolean;
  /** 조회 전일 때 상단에 표시할 눈에 띄는 배지 문구. 조회완료면 null(배지 없음). */
  badgeLabel: string | null;
  /** manual 상태일 때 — 입력됐지만 미조회인 원문 주소를 보조로 보여주기 위한 문구 */
  addressNote?: string;
  status: AddressStatus;
}

/**
 * 보고서 제목 — 조회 전에는 주소 대신 "주소 미조회 · 예시 조건 검토"류로.
 * 사용자가 제목을 직접 입력했으면(userHeadline) 그 제목을 쓰되, 조회 전이면 배지는 그대로 유지한다.
 */
export function buildReportTitle(params: {
  status: AddressStatus;
  address: string;
  userHeadline?: string;
}): ReportTitleInfo {
  const headline = params.userHeadline?.trim();
  const addr = (params.address ?? "").trim();

  if (params.status === "fetched") {
    return {
      title: headline || addr || "주소 미입력",
      isVerified: true,
      badgeLabel: null,
      status: "fetched",
    };
  }

  return {
    title: headline || FALLBACK_TITLE[params.status],
    isVerified: false,
    badgeLabel: FALLBACK_BADGE[params.status],
    addressNote: params.status === "manual" && addr ? `입력된 주소: ${addr} (미조회)` : undefined,
    status: params.status,
  };
}
