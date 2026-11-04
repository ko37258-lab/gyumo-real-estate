// VWorld 응답의 "키 죽음"을 판정하는 공용 헬퍼 (data.go.kr 쪽은 lib/datago-fail.ts).
//
// 2026-10-19 사고: 운영 VWORLD_KEY 가 INVALID_KEY 로 거절되는데 응답을 "자료 없음"으로 삼켜
// 17일 동안 면적·용도지역·지적도가 빈 채로 나갔고, 화면은 "나대지이거나 미등록"이라 안내했으며
// 그 빈 결과를 24시간 캐시했다. 키 오류는 자료 없음이 아니라 장애로 올려야 한다.

const KEY_FAIL_REASONS: Record<string, string> = {
  INVALID_KEY: "VWorld 에 등록되지 않은 인증키 (만료·삭제 여부 확인, 키 교체 필요)",
  INCORRECT_KEY: "인증키와 도메인이 맞지 않음 (VWORLD_DOMAIN 확인)",
  UNAVAILABLE_KEY: "임시로 사용할 수 없는 인증키",
  OVER_REQUEST_LIMIT: "VWorld 일일 요청 한도 초과",
  NO_KEY: "VWORLD_KEY 환경변수 미설정",
};

export class VworldKeyError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(`${code} — ${KEY_FAIL_REASONS[code] ?? "VWorld 인증 오류"}`);
    this.name = "VworldKeyError";
    this.code = code;
  }
}

/**
 * 키·한도 오류 코드면 그 코드, 정상(또는 단순 자료 없음)이면 null.
 *   NED      { landUses: { resultCode: "INCORRECT_KEY", resultMsg } }
 *   req/data { response: { status: "ERROR", error: { code: "INCORRECT_KEY", text } } }
 */
export function vworldKeyFailCode(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  for (const v of Object.values(data as Record<string, unknown>)) {
    if (!v || typeof v !== "object") continue;
    const o = v as { resultCode?: unknown; error?: { code?: unknown } };
    const code = String(o.resultCode ?? o.error?.code ?? "");
    if (code in KEY_FAIL_REASONS) return code;
  }
  return null;
}

export function throwIfVworldKeyFail(data: unknown): void {
  const code = vworldKeyFailCode(data);
  if (code) throw new VworldKeyError(code);
}
