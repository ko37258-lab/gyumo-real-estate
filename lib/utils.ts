import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 날짜를 항상 한국 시간대(KST) 기준 "YYYY. M. D."로 포맷.
 * `toLocaleDateString`을 옵션 없이 쓰면 서버(UTC)와 브라우저(KST)의 시간대가
 * 달라 하이드레이션 불일치가 나서 클라이언트 컴포넌트의 인터랙션(링크 등)이
 * 죽을 수 있다. timeZone을 고정해 서버·클라이언트 출력이 항상 동일하게 만든다.
 */
export function formatDateKST(input: string | number | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(d);
}
