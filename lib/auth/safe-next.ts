/**
 * 로그인·동의 후 돌아갈 경로를 우리 사이트 안으로 한정한다.
 *
 * next 는 주소창(쿼리스트링)에서 넘어오는 값이라 그대로 redirect 하면
 * `?next=https://악성사이트` 로 사용자를 외부에 내보낼 수 있다(오픈 리다이렉트).
 * 로그인 직후 넘어가는 흐름이라 피싱에 쓰이기 좋으므로 반드시 걸러야 한다.
 * `//evil.com` 도 브라우저가 외부 도메인으로 해석하므로 함께 막는다.
 */
export function safeNext(value: unknown, fallback = "/simulator"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
