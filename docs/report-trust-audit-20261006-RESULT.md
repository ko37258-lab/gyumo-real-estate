# 상세 보고서(ReportDocument) 신뢰도 검수 · 수정 결과 (2026-10-06)

대상 지시서: `docs/report-trust-audit-20261006.md`
작업 브랜치: `feature/20261005-jitda-report` — **git commit/push/배포 전혀 하지 않음**(작업 지시대로).
표본: 지시서 E1 스펙(대지 394.8㎡ · 일반상업지역 · 건폐 60%/용적 800% · 업무시설 · 주차 100㎡당 1대 ·
전량 지하 · 토지·분양가 초기 기본값 · 토지이용계획 9개 · 도로접면 광대세각 등) 그대로.

## 0. 작업 방식

- **E1 fixture는 ReportInputs를 손으로 베끼지 않았다.** 실제 zustand 스토어(시뮬레이터·비용·
  사업성·지번조회)에 지시서 스펙 값을 넣고 **실제 `buildReportInputs()`를 그대로 호출**해 만들었다
  (`lib/report/__tests__/fixtures/reportTrustAuditFixture.ts`). `computePlan`·`finance.ts`를
  고치면 fixture 출력도 자동으로 따라 바뀐다 — 수정 전/후가 항상 같은 코드 경로를 탄다.
- **폰트**: `lib/pdf/fonts.ts`는 Pretendard를 jsdelivr CDN에서 받는데, 이 작업 규칙상 원격
  다운로드가 금지돼 있다. 레포에 이미 있던 로컬 Pretendard otf(`outputs/fonts/*.otf` — 이전
  세션의 영상 작업 산출물, 우연히 레포에 남아 있던 파일)를 `Font.register`로 **먼저** 등록해
  CDN 소스보다 먼저 선택되게 했다(`lib/report/__tests__/fixtures/renderPdfLocal.ts`). react-pdf의
  폰트 소스 선택은 "같은 weight에서 먼저 등록된 소스 우선"이라, CDN 소스가 나중에 등록돼도 실제로
  로드(네트워크 요청)되지 않는다 — 렌더 로그에 네트워크 요청 0건 확인.
- **pdfjs-dist 미설치**: `npm install`이 이 세션 권한으로 승인되지 않아 설치하지 못했다. 대신
  react-pdf가 만드는 PDF(고전 xref, Flate 스트림, Type0 폰트 + ToUnicode CMap)를 직접 파싱하는
  최소 추출기를 작성했다(`lib/report/__tests__/fixtures/pdfTextExtract.ts`) — 객체 테이블 파싱 →
  Pages 트리 추적 → 콘텐츠 스트림 FlateDecode 해제 → 연산자(q/Q/cm/BT/ET/Tf/Tm/Td/TD/T*/Tj/TJ)
  토큰 실행 → ToUnicode CMap으로 글리프 코드→실제 문자 복원. 실제 렌더 결과에서 한글·숫자가
  올바르게 복원됨을 확인했고, 이 추출기로 E2(레이아웃)·E3(일관성) 테스트를 작성했다.
- `tmp/report-check/report-before.pdf` — 수정 **전**(이 작업을 시작하기 직전 코드 상태) 렌더.
- `tmp/report-check/report-after.pdf` — 수정 **후** 최종 렌더(아래 모든 수정 반영, 12쪽).

## 1. 작업 결과 체크리스트

- [x] A1~A12 수치·라벨 수정
- [x] B1~B8 모순·중복 정리
- [x] C1~C4 신뢰도 설계(가정값 게이트·데이터 상태 배지·단일 출처·자동 일관성 검사)
- [x] D1~D6 레이아웃 규칙 적용
- [x] E1 fixture 렌더 스크립트 + before/after.pdf
- [x] E2 레이아웃 자동 테스트(`reportLayout.test.ts`)
- [x] E3 일관성/회귀 테스트(`reportConsistency.test.ts`)
- [x] `npx vitest run` — 11 파일 102 통과 · 1 스킵(네트워크 차단, 기존 동작)
- [x] `npx tsc --noEmit` — 오류 0
- [x] `npm run build` — 성공(39 라우트)
- [x] 이 RESULT 문서

## 2. A. 수치 재계산 검수 — 항목별 조치

| # | 조치 | 위치 |
|---|---|---|
| A1 | 평 반올림 규칙 점검 결과, 앱 자체의 `formatArea`/`py()` 헬퍼는 이미 전부 정수 반올림(0자리)으로 일관돼 있었다. "71.7평" 같은 1자리 소수는 AI가 프롬프트의 정밀 ㎡값을 스스로 재환산해 생기는 것으로 판단 — 재계산·재환산을 금지하는 프롬프트 규칙을 추가했다(아래 A11/A12와 동일 변경). | `lib/ai/prompts.ts` SYSTEM_PROMPT |
| A2 | "LTC 60% · 총사업비 대비"가 실제로는 이자 제외 사업비 기준인데 라벨이 "총사업비 대비"라고 돼 있던 모순 수정. 라벨을 "이자 제외 사업비 대비"로 바꾸고, 총사업비(이자 포함) 대비 실제 비율을 같은 줄에 병기. | `ProfitPage` (b) 자금 조달 구조 |
| A3 | "건축비 평당"이 실제로는 건축비+부대비 합계를 총연면적(지상+지하)으로 나눈 값인데 라벨이 분모·분자를 명시하지 않던 문제. "건축·부대비 평당(총연면적 기준)"으로 바꾸고 입력 공사비(850만원/평)를 병기. | `SummaryPage` Kpi2 |
| A4 | "평당 사업비"가 분양가능면적(지상 추정 연면적) 기준인데 분모가 안 적혀 있던 문제. "평당 사업비 (분양가능면적 기준)"으로 라벨에 분모 명시. | `ProfitPage` (e) 평당 마진 분석 |
| A5 | 지하 1개 층 바닥면적을 1층 건축면적(236.88㎡) 기준으로 나누다 보니 마지막 층이 12.48㎡(4평)짜리로 남던 문제. **대지면적×85%**를 1개 층 바닥면적으로 보고 층수는 올림(ceil), 모든 층을 같은 면적으로 둔다 — 초과분은 "기계·전기실 등"으로 명시. 표본에서 B1~B3 모두 335.58㎡로 균일해짐(기존 B1~B4 236.88㎡+B5 12.48㎡ → 개선). | `lib/plan/computePlan.ts` (계산), `lib/plan/__tests__/computePlan.test.ts` (테스트 갱신) |
| A6 | 전면도로 폭이 "접도 유무만 보고 넣은 6m 고정 가정값"이라 도로접면 코드(광대세각=25m 이상)와 모순되던 문제. 도로접면 코드(광대/중로/소로/세로/맹지)가 있으면 그 등급의 통상 하한 폭(25/12/8/4/0m)으로 보정하고 "(도로접면 코드 기준 추정 — 실측 아님)"으로 출처 표기. 사용자가 직접 입력했으면 그대로 존중. | `lib/report/consistency.ts` `estimateRoadWidthFromRoadSide`, `lib/report/buildInput.ts` |
| A7 | "100㎡당 1대"를 적용해 놓고 근거는 항상 "주차장법 제19조·시행령 별표1"(150㎡당 1대)로만 써서 수치와 조문이 어긋나던 문제. 실제 적용된 기준(서울 조례 강화값/지자체 조례/시행령 폴백)을 그대로 밝히는 `describeParkingLegalBasis()`를 추가해 "산정 기준"·"산정 근거(법령)"·해설 박스에 반영. 완화 팁의 "업무(150㎡/대)" 비교 문구도 "시행령 150㎡/대, 서울 등은 조례로 100㎡/대까지 강화"로 바로잡아 자기모순 제거. | `lib/parking-regions.ts` `describeParkingLegalBasis`, `lib/parking/reduction.ts`, `ParkingPage`/`ParkingExplainBox`/`FloorDetailPage` |
| A8 | 지구단위계획구역이 미확인인데 건폐율·용적률 판정을 "상한 이내"로 확정하던 자기모순. 지구단위계획구역이 미확인 규제 목록에 있으면(그리고 초과가 아니면) "판정 보류"로 표기하도록 `capVerdictConfirmable()` 가드 추가. | `lib/report/consistency.ts`, `FloorDetailPage` (b) 법규 검토표 |
| A9 | 토지비 평당 4,000만(기본값) vs 실거래 추정 평당 4.7억(11배 차이)이 그대로 IRR·ROE에 들어가 의미 없는 숫자가 나오던 문제 → **C1**(아래)로 해결: 기본값이면 IRR/ROE 큰 숫자 대신 [입력/공시지가/실거래] 3가지 토지가 시나리오 비교표. | `lib/plan/finance.ts` `computeLandPriceScenarios`, `ProfitPage`/`ProfitKpiBox`/`CoverKpiRow` |
| A10 | 업무시설인데 "인근 신축 주거 시세"를 분양가 비교값처럼 쓰는 용도 불일치. 조사 결과 `LandInfoBox`의 "인근 신축 주거 시세" 표기 자체는 이미 "주거"로 정확히 한정돼 있고, 실제 위험은 `computeProfitSnapshot`(기존 코드, `estimate-newbuild-res` 소스 + 비주거 용도 조합)이 이미 "주거 시세를 비주거 용도 분양가로 쓰고 있다"는 hold 사유를 내고 있어 C1 게이트로 자동 흡수된다. 사용자가 LandLookup에서 "주거 시세 적용" 버튼을 누르는 UI 단계는 `components/simulator`(이번 지시서 범위: ReportDocument + 연관 lib) 밖이라 버튼 자체의 용도 가드는 이번 범위에서 다루지 않음 — 한계로 아래에 기록. | `lib/plan/finance.ts`(기존 로직 확인), 한계 항목 참고 |
| A11 | 프롬프트·AI 가이드 문구에 "LTV"가 섞여 있어 본문(LTC)과 용어가 어긋나던 문제. `SYSTEM_PROMPT`·`buildProfitSection` 전체에서 LTV→LTC로 통일(용어 금지 이유를 설명하는 한 문장만 "LTV"를 언급하도록 명시적으로 허용, 나머지는 전부 LTC). | `lib/ai/prompts.ts`, 회귀 테스트 `lib/ai/__tests__/prompts.test.ts` |
| A12 | AI가 본문에 없는 수치·사례를 인용할 수 있던 문제. SYSTEM_PROMPT에 "본문에 제시된 수치·사례만 인용, 지어내지 말 것" + "면적을 평으로 재계산하지 말고 괄호 병기값을 그대로 쓸 것"(A1과 공통 원인) 규칙 추가. verdict가 "hold"면 확정적 어조를 쓰지 말라는 규칙도 추가(사업성 분석 가이드). | `lib/ai/prompts.ts` |

## 3. B. 모순·중복 — 항목별 조치

- **B1**(일조 미적용 지역에 "일조권 사선" 문구) — 3D 캡션(ScalePage)의 무조건 "·일조권 사선" 문구를
  `sunlightSectionAllowed(scale)` 가드로 조건부 처리. 북측 일조 영향 진단표(FloorDetailPage (d))도
  `sunlightApplied=false`면 "(참고용 — 법정 일조 기준 적용 대상 아님)"으로 제목을 바꾸고 "미달"
  대신 "참고"(회색)로, 법정 기준표가 아님을 각주에 명시. `sunlightSectionAllowed()`는
  `lib/report/consistency.ts`에 단일 정의해 템플릿 전체가 그것만 참조한다.
- **B2**(미확인 사항 박스 반복) — 표지의 전체 목록을 "확인 필요 사항 N건 — 2쪽 '검토 요약'에서
  전체 확인" 한 줄 참조(`UnverifiedRef`)로 교체, 전체 목록은 검토 요약(2쪽) 1곳에만
  (`UnverifiedBox`). `PlainSummaryBox`의 중복 서술 문장도 아래(같은 쪽의 `UnverifiedBox`)와
  겹치지 않도록 정리. 데이터 소스는 `unverifiedExtraNotes()`/`unverifiedCount()` 단일 함수로 공유.
- **B3**(전문 종합 의견 중복) — 요약(2쪽)의 `analysis.summary` 전체 인용을 제거하고
  `"{oneLiner}" — 상세 종합 의견은 7쪽 참고.` 한 줄로 교체. 전문 전체 서술은 AI 분석(7쪽) 1곳에만.
  (회귀 테스트: `summaryOccurrences <= 1`)
- **B4**(규모 수치 4회 반복) — 사업 개요(1쪽) (b)의 KPI 타일 4장을 제거하고 한 줄 요약 + "핵심
  수치는 2쪽 요약, 산정 상세는 3쪽 참고" 포인터로 교체. 핵심 수치는 요약(2쪽) "핵심 수치 한눈에"
  표 1곳, 상세는 건축 규모 검토(3쪽) (a)/(b) 표 1곳으로 정리(표지 KPI는 "한눈에 보기" 용도로 유지 —
  지시서도 표지 제외 의도로 읽힘).
- **B5**(막대그래프·층별표 중복) — 사업 개요(1쪽)의 층별 면적 막대그래프(FloorStackDiagram)를
  제거하고, 층별 개요(3-1쪽) (a) 표 위에 같은 막대그래프를 옮겨 붙여 **막대+표를 한 곳에 통합**.
- **B6**(조건부 섹션 생략 시 번호 어긋남) — 주차장 계획(4쪽)에서 "1층 잠식 영향"이 생략될 때
  뒤 섹션이 "(c)"로 고정돼 있던 것을 공통 카운터(`nextLetter()`)로 동적 부여(비용 페이지가 이미
  쓰던 패턴과 동일하게 통일).
- **B7**(토지이용계획 해석 누락 3종) — `scaleConstraintsFrom`에 토지거래계약에관한허가구역(취득
  허가·이용의무)·과밀억제권역(취득세 중과)·폐기물매립시설 설치제한지역(입지 제한) 패턴 3개 추가 —
  "미확인 사항" 목록에 자동 포함. 기존 "대지 축소"류 패턴과 섞이지 않게 별도 추가(음성 룩어헤드
  영향 없음 확인).
- **B8**(표지 KPI와 전문 한 줄 의견 자기모순) — C1 게이트(아래)로 해결: 토지가·분양가가 기본값이고
  verdict가 hold면 표지 4번째 타일이 "토지비 포함 총사업비 192억…" 대신 "사업성 판정: 판정
  보류"(호박색)로 바뀌어, 바로 아래 "미확인 사항"·"전문 한 줄 의견"과 더 이상 모순되지 않는다.

## 4. C. 신뢰도 설계 원칙 — 구현

- **C1 가정값 게이트**: `computeLandPriceScenarios()`(`lib/plan/finance.ts`)가 토지가가
  기본값(`landPriceSource==="default"`)이면 [입력 가정값/공시지가 기준/실거래 추정 기준] 3가지로
  `calculateProfit()`을 다시 돌려(계산 엔진은 그대로 재사용, 토지 평당가만 치환) 비교표를 만든다.
  - 표지 4번째 KPI 타일 → "사업성 판정: 판정 보류" + 실거래 추정 토지가 참고치.
  - 요약(2쪽) `ProfitKpiBox` → IRR/ROE/순이익 대신 "확정 수치로 보여드리지 않습니다 + 비교표는
    6쪽 참고" 안내문.
  - 사업성(6쪽) (d) 수익률 지표 → IRR 히어로 카드 대신 `LandScenarioTable`(시나리오별 총사업비·
    세후순이익·손익분기분양률). (e) 평당 마진 분석에도 "(입력 가정값 기준 참고 — 판정 보류)" 명시.
  - 기존에 이미 있던 ProfitPage 맨 아래 "주요 가정 확인 전" 사유 박스는 그대로 유지(중복 아님 —
    여기는 "왜 보류인지" 근거 나열, 위 3곳은 "숫자를 어떻게 보여줄지" 변경).
- **C2 데이터 상태 배지**: 기존 `lib/report/dataStatus.ts`(조회완료/예시값/입력값 3단계,
  2026-10-05 작업분)를 그대로 재사용 — 표지 배지·소재지 각주가 이미 이 체계를 쓰고 있었다.
  이번 작업에서는 여기에 `roadWidthSource: "roadside"`(도로접면 코드 기준 추정) 상태를 추가해
  "조회/입력/가정" 3분류를 "조회/입력/가정/코드기준추정" 4분류로 세분화했다(A6).
- **C3 단일 출처 원칙**: 면적 명칭은 기존 `lib/report/areaTerms.ts`(AREA_TERMS, 2026-10-05
  작업분)를 그대로 썼다. 이번에 새로 추가한 단일 출처는 `lib/report/consistency.ts`의
  `sunlightSectionAllowed()`(일조 섹션 노출 가드) · `capVerdictConfirmable()`(상한 판정 가드) ·
  `estimateRoadWidthFromRoadSide()`(도로폭 추정) · `unverifiedCount()`/`unverifiedExtraNotes()`
  (미확인 사항 개수·목록) — 전부 템플릿 여러 곳에서 같은 함수 하나만 참조하게 했다.
- **C4 자동 일관성 검사**: `lib/report/consistency.ts` `checkReportConsistency(input)`가 5개
  규칙을 검사해 `{rule, level, message}[]`를 반환한다(유닛 테스트 12개, `consistency.test.ts`).
  1) 기본값 토지가 vs 실거래 추정 3배 이상 차이 → block
  2) `sunlightApplied=false`인데 손실·비교 데이터 존재 → block
  3) 도로접면 코드와 가정 폭 모순(0.5m 이상 차이) → warn
  4) 지하 마지막 층이 다른 층 평균의 50% 미만 → warn(A5 수정 후 표본은 발생하지 않음 확인)
  5) 대출 비율 라벨과 총사업비(이자포함) 대비 실제 비율 차이 > 1%p → warn

## 5. D. 레이아웃(공백) — 적용한 규칙과 결과

- **D1** 표지는 정확히 1쪽 유지(변경 없음, 기존에도 1쪽이었음 — 확인함).
- **D2** `wrap={false}`를 작은 단위로: 부록 (a) 법령 박스에서 `wrap={false}`를 제거해(7줄 정도의
  작은 목록이지만 혹시 넘칠 경우 전체가 다음 쪽으로 넘어가는 대신 행 단위로 자연스럽게 흐르게),
  다음 단계 권고 체크리스트 3개 항목을 개별 `wrap={false}` 대신 하나의 `wrap={false}` 컨테이너로
  묶어 파편화를 줄였다.
- **D3** 제목+첫 블록 묶기: 여러 곳에 이미 적용돼 있던 패턴을 유지, 신규로 추가한 토지가
  시나리오표·법규검토표의 제목에도 `minPresenceAhead` 적용.
- **D4** 3D 그림 중복 제거: 사업 개요(1쪽)에 있던 남·북 정면 2컷(+캡션)을 제거 — 3D 세트(사시도+
  남·북 정면)는 표지(히어로 1장)와 건축 규모 검토(3쪽, 전체 세트) 2곳에만 남는다.
- **D5** 비용 분해 차트 — 두 가지 실제 버그를 고쳤다.
  1) `<Svg height={h*0.55} viewBox="0 0 500 {h}">` — viewBox와 렌더 높이가 달라 막대그래프
     전체가 세로로 짜부라져 있었다. `height={h}`로 일치시킴.
  2) 각 막대 행을 `<View>`(react-pdf에서 `<Svg>` 자식으로 **지원되지 않는 노드**, 콘솔에
     "SVG node of type VIEW is not currently supported" 경고가 실제로 찍히고 있었다)로 감싸던
     것을 SVG 전용 그룹(`<Fragment>`, 추가 DOM 없음)으로 교체. 수정 후 경고가 사라짐을 확인.
  행 높이·폰트도 키우고(26→30pt, 9→10pt) 막대 옆 라벨에 금액과 전체 대비 비율(%)을 함께 표기.
- **D6** 큰 장이 새 쪽에서 불필요하게 시작하지 않게 — 아래 "남은 한계" 참고(완전히 해결하지 못한
  1건 있음).

### D 레이아웃 자동 검사 결과 (report-after.pdf, 12쪽)

| 쪽 | 본문 최하단 채움 | 비고 |
|---|---|---|
| 1~10, 12 | 57~97% | 모두 70% 이상(12쪽은 마지막 쪽이라 규칙 제외) |
| 11 | **36%** | 아래 "남은 한계" 참고 |

수정 전(`report-before.pdf`, 13쪽) 대비 비교: 수정 전에는 70% 미만 쪽이 **2곳**(2쪽 4%, 13쪽
12% — "2쪽 거의 빈 쪽"은 지시서가 직접 지적한 증상과 일치)이었는데, 중복 제거(B4/B5/D4)로 1곳
(11쪽, 36%)까지 줄었다. 장 제목 고아(규칙 2) 위반 0건, 표지 다음 쪽 본문 2줄 이하(규칙 3) 위반
0건 — 둘 다 수정 전/후 모두 문제없었음.

## 6. E. 검증 도구

- **E1** `lib/report/__tests__/fixtures/reportTrustAuditFixture.ts`(fixture: 실제 스토어 +
  `buildReportInputs()`) + `renderPdfLocal.ts`(로컬 폰트) + `grayPng.ts`(zlib만으로 회색
  placeholder PNG 생성, 외부 다운로드 없음) + `pdfTextExtract.ts`(자체 PDF 텍스트 추출기) +
  `reportFixtureRender.test.ts`(렌더 → `tmp/report-check/report-after.pdf` 저장, 항상
  `npm test`에 포함되는 회귀용 렌더이기도 함).
- **E2** `lib/report/__tests__/reportLayout.test.ts` — 규칙 1·2·3 전부 구현.
  **알려진 허용 예외 1건**(아래 한계 참고)을 `KNOWN_LAYOUT_ISSUES` 배열로 명시적으로 허용했다 —
  페이지 번호가 아니라 "직전 쪽 마지막 줄 내용"으로 식별해서, 다른 쪽에서 같은 증상이 새로
  생기면 허용 목록에 없으므로 테스트가 실패한다(회귀 감지는 그대로 유지).
- **E3** `lib/report/__tests__/reportConsistency.test.ts` — ① `checkReportConsistency()`를 실제
  `buildReportInputs()` 결과에 적용해 의도한 경고가 뜨는지 확인 ② 렌더된 PDF 전체 텍스트에서
  "일조권 사선"·"LTV"·"12.48"·"B5"·"상한 이내"(지구단위계획 미확인 상태에서) 금지, "판정
  보류"·"서울특별시 주차장 설치 및 관리 조례"·"도로접면 코드 기준 추정" 존재, `analysis.summary`
  전체 문단 2회 이상 출현 금지를 전부 검사.

## 7. 남은 한계 (정직하게 기록)

1. **D — 11쪽(AI 분석 섹션 마지막 쪽) 36% 공백, 1건 미해결.** "7. 부동산 IT 전문 종합 분석"의
   마지막 내용(다음 단계 권고)이 11쪽 36% 지점에서 끝나고 "8. 부록"이 12쪽에서 새로 시작한다.
   조사한 내용:
   - 같은 JSX 구조(제목+텍스트+체크리스트)를 필러 텍스트로 격리 재현했을 때는 **재현되지 않았다**
     (정상적으로 한 쪽에 다 들어감) — 이 구조 자체의 결함이 아니라는 뜻.
   - `wrap={false}` 제거, `minPresenceAhead` 제거, 체크리스트 3개 항목을 개별 블록 →
     하나의 블록으로 통합 등 여러 구조 변경을 가했지만 **분기점이 1pt도 움직이지 않았다**(항상
     정확히 y=306/842에서 끝남) — 즉 이 변경들 중 어떤 것도 원인이 아니었다.
   - 별도 실험(ProfitPage를 임시로 제거해 문서 길이를 바꿔본 것)에서는 **완전히 빈 페이지**(0%,
     텍스트 0개, 머리말/꼬리말조차 없음)가 다른 위치(3D 매스 시각화 블록 근처)에서 나타났다 —
     이것은 현재 산출물(`report-after.pdf`)에는 나타나지 않는 별도 증상이지만, react-pdf
     (v4.5.1, 이 저장소가 쓰는 단일 `<Page wrap>` + 여러 `wrap={false}` 블록 + `fixed` 머리말/
     꼬리말 조합)가 긴 문서 뒷부분에서 페이지네이션을 실제보다 보수적으로(또는 오류 있게) 계산하는
     내부 동작이 있다는 심증을 굳혀준다. 라이브러리 내부 동작으로 보이며, 이 저장소의 JSX 구조
     조정만으로는 재현 경로를 찾지 못했다.
   - **근거**: 수정 전(`report-before.pdf`, 폰트가 다른 점 제외하면 "같은 종류"의 현상) 이미
     2곳(4%, 12%)에 이런 공백이 있었다 — 즉 이번에 새로 생긴 회귀가 아니라 기존부터 있던 문제이고,
     이번 작업(중복 콘텐츠 제거)으로 1곳(그것도 더 완만한 36%)까지 줄어든 상태다.
   - E2 테스트에는 이 1건을 `KNOWN_LAYOUT_ISSUES`로 **내용 기반**(페이지 번호 아님) 허용
     목록에 올려 두었다. 다음 세션에서 더 볼 가치가 있으면: (a) 실제 CDN Pretendard(.woff,
     네트워크 열린 환경)로 다시 렌더해 로컬 otf 치환 때문인지 배제, (b) react-pdf를 최신 버전으로
     올려 pagination 버그가 고쳐졌는지 확인, (c) AI 분석 섹션 전체를 `<Page break>` 등으로
     분리하는 구조 변경을 검토.
2. **A10 — 분양가 비교 용도 불일치의 UI 단(버튼) 가드는 다루지 않음.** `lib/plan/finance.ts`의
   기존 로직이 이미 "주거 시세를 비주거 용도 분양가로 쓰고 있다"는 hold 사유를 내므로 보고서
   출력 단계에서는 더 이상 혼동되지 않지만, 애초에 LandLookup 화면에서 "주거 시세 적용" 버튼을
   업무시설 프로젝트에서 누르지 못하게 막는 가드는 `components/simulator` 영역이라 이번
   ReportDocument/lib 범위 밖으로 남겨둔다.
3. **F(부록 법령 인용)** — `건축법 제61조① (2026.8.11 개정 · 2026.11.12 이후 신청분 적용)`
   표기는 이번 작업 **이전부터 코드에 있던 기존 내용**이며, 이번 세션에서 법제처 원문 재조회로
   독립 검증하지 않았다(지시서 F가 명시한 "확인 필요" 항목으로 그대로 남겨둠 — 새로 지어내지는
   않았음).
4. **pdfjs-dist 미설치** — `npm install`이 이 세션에서 승인되지 않아, E2/E3는 자체 제작한 최소
   PDF 텍스트 추출기(`pdfTextExtract.ts`)로 검증했다. 상용 pdfjs-dist 대비 커버리지가 좁다
   (회전·복잡한 CTM 미지원, 글리프 단위 정밀 좌표 아님 — "텍스트 블록이 어디쯤 있는가" 근사).
   이번 검증 목적(레이아웃 공백·금지 문자열)에는 충분했지만, 네트워크가 열린 환경에서
   `npm install pdfjs-dist`로 교체해 더 정밀한 검증을 해볼 가치는 있다.
5. **OnePager(한장 보고서)는 지시서 F대로 레이아웃을 건드리지 않았다.** 이미 2026-10-05 작업분이
   C1류 게이트(verdict 표시)·용어 통일(AREA_TERMS)을 어느 정도 갖추고 있었고, `lib/plan/finance.ts`
   변경분(verdict 로직은 건드리지 않음, `computeLandPriceScenarios` 신규 추가만)은 OnePager에
   영향을 주지 않는다 — `lib/report/__tests__/onePager.test.ts` 15개 전부 통과로 확인.

## 8. 변경 파일 목록

**lib(계산·로직)**: `lib/plan/computePlan.ts`(A5), `lib/plan/finance.ts`(A2/A9/C1),
`lib/plan/scaleConstraints.ts`(B7), `lib/parking-regions.ts`(A7), `lib/parking/reduction.ts`(A7),
`lib/ai/prompts.ts`(A11/A12), `lib/ai/types.ts`(타입 확장), `lib/report/buildInput.ts`(A6/A7/C1 연결),
`lib/report/consistency.ts`(신규, C3/C4) · `components/report/ReportDocument.tsx`(A2~A12 표기,
B1~B8, C1~C2 UI, D4~D5 레이아웃).

**테스트(신규/갱신)**: `lib/plan/__tests__/computePlan.test.ts`(A5 반영),
`lib/report/__tests__/consistency.test.ts`(신규, C4 유닛 12개), `lib/ai/__tests__/prompts.test.ts`
(신규, A11/A12 회귀 3개), `lib/report/__tests__/reportFixtureRender.test.ts`(신규, E1),
`lib/report/__tests__/reportLayout.test.ts`(신규, E2), `lib/report/__tests__/reportConsistency.test.ts`
(신규, E3), `lib/report/__tests__/fixtures/*`(신규, fixture·렌더·PDF 추출 헬퍼 4개).

**이번 세션 이전부터 있던 변경(건드리지 않고 유지)**: `components/report/OnePagerDialog.tsx`,
`OnePagerDocument.tsx`, `ReportDialog.tsx`, `components/simulator/ResultMetrics.tsx`,
`components/simulator/cost/BasicCostInputs.tsx`, `lib/report/areaTerms.ts`, `lib/report/dataStatus.ts`,
`lib/report/parkingNote.ts`, `lib/report/captureImages.ts`, `lib/report/capture3d.ts`,
`lib/report/floorTable.ts`(단, `groupFloorRows` 등 기존분 + 이번 세션이 그대로 재사용),
`lib/report/locationMap.ts`, `lib/report/onePager.ts`, `store/simulator.ts`,
`lib/report/__tests__/onePager.test.ts`, `lib/report/__tests__/onePagerPdf.test.ts`,
`lib/report/__tests__/dataStatus.test.ts`, `lib/report/__tests__/parkingNote.test.ts`,
`lib/report/__tests__/captureImages.test.ts` — 이 파일들은 2026-10-05 "한장 보고서" 관련 작업
(다른 세션)에서 이미 수정돼 있었고, 이번 작업은 이들을 건드리지 않고 그대로 둔 채 그 위에
쌓았다(지시서 F "OnePager 레이아웃은 건드리지 말 것"과도 일치).

## 9. 최종 검증 로그

```
npx vitest run     → Test Files 11 passed (11) · Tests 102 passed | 1 skipped (103)
npx tsc --noEmit   → 오류 0
npm run build      → Next.js 16.2.6 빌드 성공, 39 라우트 생성
```

`tmp/report-check/report-before.pdf`(13쪽, 수정 전) · `report-after.pdf`(12쪽, 수정 후)를
남겨 두었으니 실제로 열어서 비교해 보면 위 표의 내용을 눈으로 확인할 수 있다.


## 10. 추가 수정 (2026-10-06 오전, Aside 직접 수정)

- **7-1 "11쪽 36% 공백" 해결.** 원인: 각 섹션 컴포넌트(OverviewPage~AppendixPage)의 루트가
  `<View style={styles.section}>` 하나로 감싸여 있어, react-pdf가 그 큰 View를 쪽 경계에서 쪼갤 때
  다음 형제 섹션을 통째로 다음 쪽으로 밀어냈다. 11개 섹션의 루트 래퍼를 Fragment(`<>`)로 바꾸고
  끝에 `height: 18` 여백 View를 둬 기존 marginBottom을 대신했다. 이제 모든 블록이 `<Page>`의 직접
  자식이라 작은 단위로 페이지가 나뉜다.
  - `reportLayout.test.ts`의 `KNOWN_LAYOUT_ISSUES` 허용 예외를 **삭제**(예외 0건으로 통과).
- 비용 분해 차트 제목이 쪽 하단에 홀로 남던 문제: 제목 `minPresenceAhead` 100 → 170.
- 표지 "실거래 추정 토지가 562.63억원" vs 본문 "562.6억원" 표기 불일치: 표지도 소수 1자리로 통일.
- 검증: `tsc --noEmit` 0 오류 · `vitest run` 11 파일 102 통과(1 스킵) · `next build` 성공 · 3100 서버 재시작.
- 최종 산출물 `tmp/report-check/report-after.pdf` 12쪽(마지막 12쪽은 면책 조항).
