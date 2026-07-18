// 크레딧(정회원) 시스템 상수 — 요금제·입금 계좌·안내 문구.
//
// ⚠ 운영자 조치: 아래 BANK_INFO를 실제 입금 계좌로 교체하세요.
//   (환경변수 NEXT_PUBLIC_BANK_* 가 있으면 그 값을 우선 사용합니다.)

export const SIGNUP_CREDITS = 3; // 가입 시 무료 지급 (1회)
export const CREDIT_VALID_MONTHS = 2; // 승인(지급) 후 유효기간
export const CREDIT_PER_LOOKUP = 1; // 조회 1건당 소모 크레딧

export type CreditPlanId = "10" | "30";

export interface CreditPlan {
  id: CreditPlanId;
  /** 표시 라벨 */
  label: string;
  /** 입금액(원) */
  priceWon: number;
  /** 지급 크레딧 */
  credits: number;
  /** 부가 설명 */
  note?: string;
}

export const CREDIT_PLANS: CreditPlan[] = [
  { id: "10", label: "10회 신청", priceWon: 10000, credits: 12, note: "2크레딧 보너스" },
  { id: "30", label: "30회 신청", priceWon: 25000, credits: 36, note: "6크레딧 보너스 · 가장 이득" },
];

export function getPlan(id: string): CreditPlan | undefined {
  return CREDIT_PLANS.find((p) => p.id === id);
}

/** 입금 계좌 — 환경변수로 덮어쓸 수 있음 (Vercel에 NEXT_PUBLIC_BANK_* 설정 시 우선). */
export const BANK_INFO = {
  bank: process.env.NEXT_PUBLIC_BANK_NAME || "카카오뱅크",
  account: process.env.NEXT_PUBLIC_BANK_ACCOUNT || "3333-37-3784694",
  holder: process.env.NEXT_PUBLIC_BANK_HOLDER || "고상철",
};

/** 신청 화면에 표시할 안내 문구 (운영자 지정 원문 유지). */
export const CREDIT_NOTICE = [
  "신청 후 2개월 동안 사용해야 합니다.",
  "승인 후 2개월이 지나면 크레딧은 자동으로 사라집니다.",
  "크레딧 구매는 계좌로 송금 후 아래에 성함과 전화번호 뒤 4자리를 입력해주세요.",
  "확인 후 3시간 안에 크레딧이 지급됩니다.",
];

export function formatWon(won: number): string {
  return `${won.toLocaleString("ko-KR")}원`;
}
