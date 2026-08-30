// data.go.kr 응답의 "키 죽음"을 판정하는 공용 헬퍼.
//
// 2026-08-31 사고: gyumo의 DATAGO_KEY가 무효화됐는데 응답 XML의 오류를
// 조용히 버리고 "표본 0건"으로 집계·캐시해, 몇 주간 시세 기능 전체가
// 데이터 없음으로 위장 실패했다. 실패는 실패로 드러나야 한다.

const KEY_FAIL_MARKS = [
  "SERVICE_KEY_IS_NOT_REGISTERED",
  "SERVICE KEY IS NOT REGISTERED",
  "등록되지 않은 서비스키",
  "OpenAPI_ServiceResponse", // 게이트웨이 오류 래퍼 (코드 12·20·22·30·31 등)
  "LIMITED_NUMBER_OF_SERVICE_REQUESTS", // 일일 한도 초과
];

/** 키·계정·한도 문제면 사유 문자열, 정상(또는 단순 자료 없음)이면 null */
export function datagoKeyFail(body: string): string | null {
  if (!body) return null;
  for (const mark of KEY_FAIL_MARKS) {
    if (body.includes(mark)) {
      if (body.includes("LIMITED_NUMBER")) return "일일 요청 한도 초과";
      if (body.includes("OpenAPI_ServiceResponse")) {
        const m = body.match(/<returnAuthMsg>([^<]+)<|"returnAuthMsg"\s*:\s*"([^"]+)"/);
        return (m && (m[1] || m[2])) || "공공데이터 게이트웨이 오류";
      }
      return "등록되지 않은 인증키 (활용신청·키 교체 필요)";
    }
  }
  return null;
}
