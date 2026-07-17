@AGENTS.md

# 건축가능 규모검토 PJ (gyumo)

> **디벨로퍼·토지투자자의 첫 번째 의사결정 도구**
> 지번 한 줄 → 30초 안에 사업성까지

이 파일은 Claude Code가 매 세션 자동으로 읽는 프로젝트 컨텍스트입니다. 작업 진행에 따라 계속 업데이트하세요.

---

## 1. 프로젝트 개요

### 운영자
- **미스터홈즈 (미스터홈즈) FC** / 고상철 대표 (高相喆)
- 부동산공법 28년 강의 · "공법의 신" 브랜드
- 인하대학교 정책대학원 부동산학과 초빙교수
- 법무법인 윤강 부동산관련법률 고문

### 타깃 사용자 (우선순위)
1. 일반 디벨로퍼·토지투자자 (메인)
2. 미스터홈즈 가맹점 중개사 (가맹가치 강화)
3. 부동산멘토스쿨 수강생 (마케팅 채널)

### 비즈니스 모델 (Freemium)
| 플랜 | 가격 | 혜택 |
|---|---|---|
| Free | 0원 | 일 3건 조회, 기본 시뮬레이션 |
| Pro | 월 19,900원 | 무제한 조회, PDF 리포트, 사업성 분석, 이력 저장 |
| Business | 월 99,000원 | Pro + 팀 5명, 비교분석, API |
| 미스터홈즈 가맹점 | 무료 | Pro 자동 부여 |
| 부동산멘토스쿨 | 3개월 무료 | Pro 체험 |

### 서비스 범위
- 전국 (VWorld 오픈 API 기반)
- 서울/광역시: 도시계획조례 강화 규정 별도 반영

---

## 2. 기술 스택

```
Frontend  : Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
UI        : Tailwind CSS v4 + shadcn/ui (base-ui)
State     : zustand 5
3D        : Three.js (Phase 3)
Backend   : Supabase (Auth + Postgres + Edge Functions)
배포      : Netlify
결제      : 토스페이먼츠
AI        : Anthropic Claude API
지번/지도 : VWorld 오픈 API
보조 데이터: 공공데이터포털 (건축물대장, 공시지가)
```

미스터홈즈 contract system과 동일 스택 — 인증·DB 패턴·UI 컴포넌트 재사용 가능.

---

## 3. 핵심 기능 로드맵

### Phase 1 (v0.1 → v0.3 · 1~2주차) ← **현재 단계**
- [x] 용도지역 13개 프리셋
- [x] 건폐율·용적률·도로폭 조정 슬라이더
- [x] 일조권 사선제한 시각화 (2023.9.12 개정 10m 기준 반영)
- [x] 평면도 + 정북단면 입면도
- [x] `prototype.html`을 Next.js 컴포넌트로 분해 (2026-05-20)
- [x] 주차장 산정 (15개 용도) + 학습 패널 (2026-05-21)
- [x] 일조권 학습 패널 (2026-05-21)
- [x] 주차장 배치 형식(없음/지하/지상/혼합) + 분양 가능 연면적 (2026-05-21)
- [x] 3D 360° 시각화 (Three.js + React Three Fiber + drei) (2026-05-21)
- [x] 5단계 통합 도구 구조(규모/비용/사업성 탭) + 비용·부담금 시뮬레이션 (2026-05-21, Day 4-A)
- [ ] 사업성 분석(IRR·손익분기) — Phase 5
- [x] 지번 조회 → 면적·용도지역(비도시 포함)·공시지가·지목 자동 입력 (VWorld NED, 2026-06-15)
- [ ] 서울/광역시 도시계획조례 강화 적용

### Phase 2 (v0.3 · 3주차)
- [ ] 정북방향 자동 판별 (지적도 좌표)
- [ ] 도로너비 가산 적용 (도로 반대편 인접대지 제외)
- [ ] 채광방향 일조권 (공동주택용)
- [ ] 가각전제 자동 컷팅

### Phase 3 (v0.5)
- [ ] Three.js 3D 매스 모델
- [ ] 사업성 분석 (토지비·공사비·분양가·IRR·손익분기)
- [ ] PDF 리포트 (미스터홈즈 브랜드)

### Phase 4 (v1.0)
- [ ] 회원·즐겨찾기 (Supabase Auth)
- [ ] 비교·공유
- [ ] 법무법인 윤강 자문 신청 연동
- [ ] iOS/Android 앱 (Capacitor)

---

## 4. 용도지역 데이터 (Phase 1)

`lib/zones.ts`에 다음 13개를 데이터로 작성할 것:

| 코드 | 명칭 | 건폐율 최대 | 용적률 범위 | 일조권 |
|---|---|---|---|---|
| `1jeon` | 제1종전용주거지역 | 50% | 50~100% | ✅ |
| `2jeon` | 제2종전용주거지역 | 50% | 100~150% | ✅ |
| `1il` | 제1종일반주거지역 | 60% | 100~200% | ✅ |
| `2il` | 제2종일반주거지역 | 60% | 150~250% | ✅ |
| `3il` | 제3종일반주거지역 | 50% | 200~300% | ✅ |
| `junju` | 준주거지역 | 70% | 200~500% | ✅ |
| `gunin` | 근린상업지역 | 70% | 200~900% | ❌ |
| `ilsang` | 일반상업지역 | 80% | 300~1,300% | ❌ |
| `jungsang` | 중심상업지역 | 90% | 400~1,500% | ❌ |
| `yutong` | 유통상업지역 | 80% | 200~1,100% | ❌ |
| `jongon` | 전용공업지역 | 70% | 150~300% | ❌ |
| `ilbgon` | 일반공업지역 | 70% | 200~350% | ❌ |
| `jungon` | 준공업지역 | 70% | 200~400% | ❌ |

---

## 5. 법령 근거 (UI에 반드시 인용)

- **용도지역별 건폐율**: 국토계획법 시행령 제84조
- **용도지역별 용적률**: 국토계획법 시행령 제85조
- **일조권 사선제한**: 건축법 제61조 + 시행령 제86조 제1항
  - 9m 이하 부분: 인접대지경계선에서 1.5m 이상 이격
  - 9m 초과 부분: 해당 높이의 1/2 이상 이격
- **도시계획조례**: 서울·광역시 강화 규정 별도 반영
- **검증 자문**: 법무법인 윤강 (부동산관련법률 고문)

---

## 6. 폴더 구조 (제안)

```
gyumo/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx              # 랜딩
│   │   └── pricing/page.tsx
│   ├── (app)/
│   │   ├── simulator/page.tsx    # 메인 시뮬레이터
│   │   ├── history/page.tsx      # 조회 이력 (Pro)
│   │   └── report/[id]/page.tsx  # PDF 리포트
│   ├── api/
│   │   ├── lot/route.ts          # 지번 → 용도지역 조회
│   │   ├── geocode/route.ts      # 주소 → 좌표
│   │   └── webhooks/toss/route.ts
│   └── layout.tsx
├── components/
│   ├── simulator/
│   │   ├── AddressLookup.tsx
│   │   ├── ZoneSelector.tsx
│   │   ├── ControlPanel.tsx
│   │   ├── ScaleVisualizer.tsx
│   │   ├── ResultMetrics.tsx
│   │   └── LegalBasis.tsx
│   └── ui/                       # shadcn/ui
├── lib/
│   ├── zones.ts                  # 용도지역 13개 데이터
│   ├── calc/
│   │   ├── coverage.ts           # 건폐율 계산
│   │   ├── far.ts                # 용적률 계산
│   │   └── sunlight.ts           # 일조권 사선 계산
│   ├── vworld.ts                 # VWorld API 래퍼
│   └── supabase.ts
├── store/
│   └── simulator.ts              # zustand
├── prototype.html                # v0.1 위젯 (분해 대상)
├── CLAUDE.md                     # 이 파일
└── README.md
```

---

## 7. 작업 우선순위 (3주 스프린트)

### Week 1 · 베이스 + 시뮬레이터 (Day 1~7)

**Day 1 (시작)**
```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint
npx shadcn@latest init
npx shadcn@latest add slider select switch button input card label
npm install zustand
```

**Day 2~3**
- `prototype.html`을 읽고 다음 6개 컴포넌트로 분해:
  - `<AddressLookup />` — 지번 입력 + 조회 버튼 (mock으로 시작)
  - `<ZoneSelector />` — 13개 용도지역 Select
  - `<ControlPanel />` — 대지면적·건폐율·용적률·도로·일조권 토글
  - `<ScaleVisualizer />` — SVG 평면도 + 입면도
  - `<ResultMetrics />` — 5개 메트릭 카드
  - `<LegalBasis />` — 법령 근거 박스
- zustand store: `useSimulatorStore` 작성
- `lib/zones.ts`에 13개 용도지역 데이터
- `lib/calc/sunlight.ts`에 일조권 계산 함수

**Day 4~5**
- 랜딩 페이지 (히어로 / 기능 3개 / 가격 / CTA)
- shadcn/ui 일관된 스타일링

**Day 6~7**
- Supabase 프로젝트 생성, 연결
- Netlify 배포, 임시 도메인 공개

### Week 2 · VWorld 연동 (Day 8~14)

**전제**: VWorld 인증키 도착 (Day 1 신청 → Day 5~6 도착)

- `lib/vworld.ts` — 지오코더 + 토지이용계획 API 래퍼
- `app/api/lot/route.ts` — 지번 → {area, zone, road} 응답
- Supabase에 조회 결과 캐싱 테이블
- mock 데이터를 실제 응답으로 교체
- 13개 용도지역 정밀 계산 로직
- 서울/광역시 조례 강화 규정

### Week 3 · 결제 + 사업성 + 베타 (Day 15~21)

- 토스페이먼츠 연동 (정기결제 빌링키)
- 사업성 분석 모듈 (토지비·공사비·IRR)
- React-PDF로 미스터홈즈 브랜드 리포트
- 부동산멘토스쿨 수강생 30명 베타 오픈

---

## 8. 환경변수 (`.env.local`)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# 외부 API
VWORLD_API_KEY=                  # https://www.vworld.kr 신청
PUBLIC_DATA_API_KEY=             # https://www.data.go.kr 신청
ANTHROPIC_API_KEY=

# 결제
TOSS_CLIENT_KEY=
TOSS_SECRET_KEY=
```

---

## 9. 참고 자료

- VWorld 개발자센터: https://www.vworld.kr/dev/v4dv_intro_s001.do
- 공공데이터포털: https://www.data.go.kr
- 토스페이먼츠 문서: https://docs.tosspayments.com
- 미스터홈즈 contract system: 동일 조직 내 참고용 레포

---

## 10. 작업 로그

- **2026-07-17 (3)** — **신축 시세 자동 제안 + Phase A/B 프로덕션 배포·검증 완료**.
  - **app/api/newbuild-price/route.ts 신규**: 연립다세대 매매(`RTMSDataSvcRHTrade`)·전월세(`RTMSDataSvcRHRent`, 월세0=전세만)·상업업무용(`RTMSDataSvcNrgTrade`) 최근 6개월 병렬 집계(~3.2s). 주거 매매는 준공 5년 이내 신축급 우선(3건 미만 시 전체 연식), 표본은 같은 법정동 3건 이상→시군구 완화. 상가는 층별(1층/2층/3층+/지하) ㎡당 중앙값 — 플렉시티 `/building/price/` 대응.
  - **LandLookup**: "🏘️ 신축 시세 참고" 카드(주거 매매/전세 + 상가 층별) + **원클릭 사업성 연동 버튼 2종** — [평당 토지가로 적용](추정가→`landPricePerPyeong` 만원/평), [평당 분양가로 적용](주거 매매 ㎡당×3.3058→`salesPricePerPyeong`). 적용 후 ✓ 표시, 재조회 시 리셋.
  - 실측(성내동 562): 주거 매매(신축급) 1,243만/㎡×21건→평당 분양가 4,110만 제안, 전세 657만/㎡×270건, 상가 1층 628만/2층 306만/3층+ 277만.
  - **배포**: `9aeeb06` push → GitHub 자동배포가 **프로덕션 직행**(gyumo.vercel.app alias 자동, Promote 불필요 — 이 프로젝트는 real-estate-infographic과 다름). 프로덕션 검증 3종 그린: ① `kind=parcel` 실키로 성내동 562 실제 지적 링 반환(Phase A 실형상 완전 작동) ② permits 정상(**Vercel DATAGO_KEY = 승인 키와 동일 계정, 교체 불필요**) ③ land-trades 정상.
  - git push가 credential manager 프롬프트로 hang → `GIT_TERMINAL_PROMPT=0` 필요 (gh 키링 인증 존재).

- **2026-07-17 (2)** — **Phase B: 건축 인허가 이력 + 토지 실거래·추정가** (운영자 data.go.kr 활용신청 승인 완료 — 인허가 15136267·토지 15126466·연립다세대 매매/전월세·상업업무용).
  - **app/api/permits/route.ts 신규**: 건축HUB 건축인허가 기본개요(`ArchPmsHubService/getApBasisOulnInfo`) — PNU 분해(시군구5+법정동5+platGb1+bun4+ji4) → 허가일·실착공일·사용승인일·건축구분·주용도·연면적·세대수, 최신 허가일 desc. 라이브 검증: 성내동 562 → 2건(2013-08-30 허가, 신축 공동주택 연면적 403.15㎡).
  - **app/api/land-trades/route.ts 신규**: 토지 매매 실거래(`RTMSDataSvcLandTrade`, XML) — 최근 12개월 병렬 조회(~4.7s) 후 플렉시티 방법론 재현: 같은 법정동→같은 용도지역(3건 미만 시 동전체→시군구 단계 완화) + 지분거래 제외 + **특수지목(도로·구거·하천·제방·묘지) 무조건 제외**(도로 683만 vs 대 2,816만/㎡ 중앙값 붕괴 실측) + <15㎡ 자투리 제외(2건 이상 남을 때만). ㎡당 중앙값 × 면적 = 추정가, 공시지가 총액 대비 배수(`ratioToJiga`). 표본 0건이면 추정가 미제공(정직 우선). 검증: 성내동 562 → 대 2건 중앙값 2,649만/㎡ → 53.4억(공시 4.54배), basis "같은 법정동 (용도지역 무관) · 건축지목" 투명 표시.
  - **⚠ data.go.kr 실거래 API는 UA 없는 요청을 WAF가 차단**("Request Blocked") — fetch에 User-Agent 헤더 필수 (실측).
  - **LandLookup**: 조회 Promise.all에 `/api/permits` 추가, 조회 후 `/api/land-trades`(동명은 refined 주소에서 추출, zone·면적·공시지가 전달). 카드 2종 신규 — "📋 건축 인허가 이력"(상태 배지 사용승인/착공/허가 + 허가일·구분·주용도·연면적, 최근 3건) + "💹 토지 실거래 기반 추정가"(추정가·공시 대비 배수·㎡당 중앙값·근거·최근 거래 4건 + 감정평가 아님 면책).
  - 키: data.go.kr 계정 공통키 1개로 5종 모두 커버(대표님 승인, 기존 DATAGO_KEY와 동일 여부는 Vercel 대시보드에서 확인 — 다르면 교체 필요). 로컬 `.env.local` DATAGO_KEY 실키로 교체(gitignore).
  - 검증: tsc 0 / eslint 0 / `next build` ✓ 17 routes(+permits, +land-trades) / permits·land-trades 로컬 라이브 200. UI 카드는 지번 조회가 로그인 게이트라 브라우저 미확인 — 배포 후 운영자 확인 필요.
  - 미착수(다음): 연립다세대 매매/전월세·상업업무용 → 신축 분양가·임대료 자동 제안(사업성 탭 연동), 토지이용계획 전체 표시, 지도 필지 클릭(Phase C).

- **2026-07-17** — 플렉시티 벤치마크 분석 + **Phase A: 필지 실형상(연속지적도 폴리곤) 2D/3D**.
  - **벤치마크**: flexity.app 실측 분석 → `docs/flexity-benchmark.md`. 핵심 발견 — 단일 lot API(`/api/lot/{PNU}/`)에 필지 GeoJSON·건축물대장·토지특성(형상/도로접면/지세)·토지이용계획 그룹·조례/법정 상한 분리·건축가능용도·둘 이상 용도지역 가중평균·주차상한 포함. 토지 추정가 = 공시지가 × 인근 실거래 배율(`ratio_price_to_jiga`), 신축 시세 테이블(`/building/price/`)로 분양가 자동화. 지도=네이버, 3D=VWorld. 갭 분석 + Phase A~E 로드맵 + 운영자 API 신청 목록(인허가 15136267, 토지실거래 15126466 등) 문서화.
  - **lib/geo/parcel.ts 신규**: 경위도 링→로컬 미터(x=동+, y=북+, 원점=무게중심) equirectangular 변환, shoelace 면적, bounds, centroid, `clipPolygonBelowY`(일조권 북측 후퇴 half-plane 클리핑), `scalePolygon`(√건폐율 footprint 근사), `buildParcelShape`.
  - **데이터 파이프라인**: `fetchVworldParcelPolygon`(LP_PA_CBND_BUBUN attrFilter=pnu, geometry=true) → `/api/vworld?kind=parcel` → `lib/vworld.ts fetchParcelPolygon` → `store.parcelShape` (LandLookup 조회 시 자동 세팅, 합필은 v1 미지원=null).
  - **2D ScaleVisualizer**: parcelShape 있으면 평면도가 실형상 — 대지경계선 폴리곤 path + 일조권 해칭(clipPath 폴리곤 클리핑, 후퇴선=최북단−이격) + footprint(√cov 축소) + 주차 띠(남측, fp 클리핑) + 헤더 "📐 실제 지적 형상 반영 (N㎡)" 배지. 입면 northDepth도 fp bounds 기준.
  - **3D ScaleVisualizer3D**: `ParcelLot`(ShapeGeometry 대지 + 점선 외곽), `ParcelMass`/`ExtrudedFloor`(층별 ExtrudeGeometry, 일조권은 층높이별 `clipPolygonBelowY` 후퇴, 유리 밴드 1.015 스케일, rotateX(-π/2)로 y_north→−z 매핑), 도로/인도/정북화살표 위치를 폴리곤 bounds 기준(southZ/northZ)으로. 실형상 모드에선 사각 envelope 생략.
  - **DevParcelMock**: `?mockParcel=1` + NODE_ENV=development에서 사다리꼴 mock(311.54㎡) 주입 — 로컬 VWorld 키 placeholder(실키는 Vercel Production 전용, sensitive라 pull 불가) 우회 검증용.
  - 검증: tsc 0 / eslint 0(신규·수정 파일) / 로컬 브라우저 — 2D 실형상 사다리꼴+일조 해칭+사선이격 4.3m 라벨 ✓, 3D 실형상 압출+"업무시설 · 실형상" 라벨 ✓, 콘솔 에러 0. ⚠️ 실 PNU 폴리곤은 프로덕션(키 있는 환경) 배포 후 확인 필요.
  - 미해결: `attrFilter pnu` 실키 검증(로컬 placeholder라 INVALID_KEY), MarketInsight.tsx 기존 lint 에러(set-state-in-effect, 이번 작업 무관).

- **2026-06-15** — 비도시 용도지역 + 토지데이터 NED 통합 + **Netlify→Vercel 이전**.
  - **Fix A — 비도시 용도지역 5종 + 지목 약어 매핑** (`1d05b8b`):
    - `lib/zones.ts`: 계획관리(건폐 40%/용적 100%)·생산관리·보전관리·농림·자연환경보전(나머지 20%/80%) 추가. 국토계획법 시행령 제84·85조 상한. `ZoneCategory`에 `"management"` 추가, ZoneSelector 드롭다운 자동 노출(16→21종).
    - `lib/jimok.ts`: `JIMOK_ALIAS`(지적법 부호 28종) + `normalizeJimok()` — VWorld jibun 단축어 환원(임→임야, 장→공장용지, 차→주차장 등). `getJimokInfo`/`isBuiltJimok`/`fetchVworldLandChar`가 정규화 거침.
  - **토지데이터 NED 통합** (`b698dca`): 면적·용도지역·공시지가·지목을 VWorld **NED `getLandCharacteristics`** 단일 호출로 통합(`lib/vworld-data.ts` `fetchVworldLandChar` 재작성). 응답 필드 `lndpclAr`(면적)·`pblntfPclnd`(공시지가)·`lndcgrCodeNm`(지목)·`prposArea1Nm`(용도지역, 비도시 포함). stdrYear 생략→최신연도 행. PNU는 `toVworldPnu`로 변환(평지 0→1/산 1→2). 폐기: `LT_C_UQ111`(비도시 NOT_FOUND)·폴리곤 면적 근사계산. `/api/landarea`는 건축물대장+NED 병합(면적은 건축물대장 우선→NED 폴백, 용도지역·공시지가·지목은 NED). `LandLookup`은 용도지역을 NED 우선→좌표기반 폴백.
    - **조사 결론**: 토지특성·개별공시지가는 2024.1 data.go.kr→VWorld 이전(data.go.kr는 LINK만). 토지이용규제 15058410은 DATAGO_KEY로 `Unexpected errors`(미구독) — 미사용. getLandCharacteristics는 **VWorld API**(VWORLD_KEY 전용, DATAGO_KEY는 `INVALID_KEY`).
    - 로컬 5종 검증: 성내동(제2종일반주거)·역삼동(일반상업)·파주(계획관리)·춘천 산1(임야/계획관리)·순천(자연녹지) 면적·용도지역·공시지가(2026) 정상.
  - **Netlify→Vercel 이전** (`49ff431`): Netlify 벨로쉬 팀 크레딧 소진으로 배포 중단 → Vercel 이전. **핵심: `vercel.json` `regions:["icn1"]`(서울)** — API route가 한국 IP(AWS ap-northeast-2)에서 실행돼 VWorld NED 해외 IP 차단 우회(Netlify는 서울 리전 없어 막혔던 것). **프록시 불필요.** 라이브 **https://gyumo.vercel.app** (`kosangchuls-projects/gyumo`, GitHub 자동배포 연결). production 실측: 파주→계획관리지역 624㎡, 역삼동 나대지→일반상업 394.8㎡·공시지가 90,770,000(2026). 환경변수 4종(DATAGO_KEY·KAKAO_KEY·VWORLD_KEY·VWORLD_DOMAIN) Production 등록. ⚠️ Vercel env는 PowerShell 파이프 시 BOM(U+FEFF) 혼입 → bash `printf '%s'`로 등록. VWORLD_DOMAIN은 `gyumo-mr-k.netlify.app` 유지(VWorld는 domain 파라미터 값만 검증). 구 Netlify 사이트는 미사용.
  - 검증: tsc 0 / eslint 0 / `next build` 13 routes. (909F1919 키 테스트 보류.)

- **2026-06-09** — 면적 조회 장애 진단 + VWorld 토지특성정보(나대지 면적·공시지가) 통합.
  - **진단 (라이브 호출)**: "면적 안 들어옴" 증상의 원인은 **건축물대장 API가 아님** — getBrTitleInfo는 `resultCode:"00" NORMAL SERVICE`로 완전 정상(성내동 562 PNU `1174010800005620000` → platArea **201.6㎡** 라이브 확인, Node/undici 3/3). 트래픽 한도(`LIMITED_NUMBER_OF_SERVICE_REQUESTS`)·키 미인가 아님. 성내동 562가 0건이던 건 법정동코드 오해(성내동=`1174010800`, `1174010100` 아님)였고, 역삼동 825-3은 표제부가 **진짜 0건(나대지)**. data.go.kr이 헤더 최소 요청(urllib)엔 **빈 200 응답**을 반환하는 현상 재현 → 현 코드가 이를 "면적없음"으로 조용히 삼킴(= production "200인데 빈 값" 증상). `/api/landuse`·`/api/landprice` 503은 LandUseService·NSDI 개별공시지가가 이 키에 **미승인**("Unexpected errors" 500) — 토지특성정보가 VWorld로 이전된 배경과 일치.
  - **lib/vworld-data.ts 신규 (서버사이드 전용)**: VWorld 데이터 API 래퍼. `LP_PA_CBND_BUBUN`(면적·개별공시지가 `jiga`·지목 `jibun`) + `LT_C_UQ111`(용도지역 `uname`). 면적은 속성에 없어 `geometry=true` 폴리곤을 위도보정 평면근사로 계산(성내동 562 201.6㎡ 일치, 역삼 825-3 394.8㎡). **VWorld PNU는 11번째 자리 1=일반토지/2=산**(건축물대장 PNU의 0/1과 다름) → `toVworldPnu()` 변환 필수. 키 `VWORLD_DATA_KEY`(신규) → 없으면 `VWORLD_KEY` fallback. 502 회피 위해 `Referer: VWORLD_DOMAIN` 헤더. `callVworldData`가 전송실패·빈응답=throw(transient), status!=OK=null(데이터없음)로 구분.
  - **app/api/vworld/route.ts 신규**: VWorld 서버 프록시 — `?kind=landchar&pnu=` / `?kind=zone&x&y` / `?kind=roads&x&y`. **브라우저 직접 호출(CORS) 제거**.
  - **lib/vworld.ts 전면 교체**: api.vworld.kr 직접 호출 + JSONP + `NEXT_PUBLIC_VWORLD_KEY` 전부 삭제 → `/api/vworld` 서버 프록시만 호출하는 얇은 래퍼. 콘솔 CORS 에러(LP_PA_C·LT_C_UQ) 잔재 해소.
  - **app/api/landarea/route.ts 강화**: 캐시 TTL **6h→24h**, 소스에 **VWorld 토지특성정보 추가**(우선순위 건축물대장→VWorld, 나대지 면적+공시지가 자동 입력). 빈/비정상 응답을 "나대지(정상 0건)"와 구분해 **transient 재시도(2회 백오프)** + 마지막 성공 캐시 stale 제공 + `transient:true`+"잠시 후 다시" 메시지(200평 기본값 회피). 응답에 `price`(공시지가)·`priceYear`·`jimok` 추가.
  - **components/simulator/LandLookup.tsx**: 모든 조회를 서버 경유로 — 죽은 `/api/landuse`·`/api/landprice` 호출 제거, 면적·공시지가·지목은 `/api/landarea`, 용도지역·도로는 `/api/vworld`. 공시지가 카드(VWorld·연도 표시), transient 시 "⏳ 잠시 후 다시" 안내.
  - **환경변수**: `.env.local`·`.env.local.example`에 `VWORLD_DATA_KEY=`(신규 키 자리, 비면 VWORLD_KEY fallback) 추가. (둘 다 `.env*`로 gitignore — 커밋 안 됨.) ⚠️ **운영자 조치**: 발급받은 새 VWorld 키를 `.env.local`과 Netlify 환경변수에 `VWORLD_DATA_KEY`로 등록.
  - 검증: tsc 0 / eslint 0 / `next build` 13 routes ✓. `next start` 스모크 — 성내동562=201.6(building)·역삼825-3=394.8(vworld)+공시지가 85,100,000·용도지역 제2종일반주거지역·캐시 `cached:true`·미등록 PNU graceful "면적 정보 없음" 모두 확인.

- **2026-05-22** — Day 14 stellar(real-estate-infographic) 통합 1단계 — Option C 데이터 레이어 이식.
  - **빌드 사전 점검 (TS 에러 3건 fix)**:
    - `components/ui/button.tsx`: `asChild` prop 지원 추가 — base-ui `render` prop으로 위임 (Slot 패턴). 마케팅 페이지·Nav·ReportDialog 등 6곳에서 사용 중이라 일괄 호환.
    - `components/simulator/cost/CostResults.tsx`: recharts `formatter` 타입 가드 (`(v) => formatEok(typeof v === "number" ? v : Number(v))`).
    - `store/simulator.ts`: `PARKING_STANDARDS[code]` union narrowing 명시 (`if (s.mode !== "area" || danok.mode !== "progressive" || gongdong.mode !== "tieredHousehold") throw`).
  - **API Route 4개** stellar netlify functions → Next.js App Router:
    - `app/api/geocode/route.ts` — 카카오 로컬 API (주소 → x, y, PNU). `KAKAO_KEY` 환경변수.
    - `app/api/landuse/route.ts` — data.go.kr 토지이용규제 (PNU → 용도지역명). `DATAGO_KEY`.
    - `app/api/landprice/route.ts` — NSDI 개별공시지가 (5년 fallback). `DATAGO_KEY`.
    - `app/api/building/route.ts` — 건축HUB 건축물대장 (표제부 + 층별 + 시가표준). `DATAGO_KEY`.
    - 변환 패턴: `event.queryStringParameters` → `new URL(request.url).searchParams`, Netlify `{statusCode, body}` → `NextResponse.json(data, {status})`, CJS → ESM, TypeScript.
  - **lib/jimok.ts 신규** — stellar `LandRiskCheck.jsx`에서 추출. `JIMOK_INFO` (28 지목) + `BUILT_JIMOK` (건축물 존재 추정 지목 10개) + `getJimokInfo`/`isBuiltJimok` 헬퍼. `JimokValue`/`JimokRisk` 타입.
  - **lib/zones.ts 확장** — `findZoneCodeByName(apiZoneName)` 추가. `ZONE_NAME_MAP` 13 매핑 (도시지역만, 비도시 4종은 null 반환 → UI에서 경고). 정확 일치 → 부분 일치 fallback.
  - **lib/vworld.ts 신규** — stellar `lib/vworld.js` JSONP 패턴 그대로 TypeScript 포팅. `fetchParcelInfo`/`fetchNearbyRoads`/`fetchZoneByCoord` + `hasVworldKey`. `NEXT_PUBLIC_VWORLD_KEY` (build 시 인라인). `domain=${window.location.hostname}` 파라미터 (반드시 client component에서 호출).
  - **components/simulator/LandLookup.tsx 신규** — `AddressLookup.tsx` 교체. 흐름: 주소 → `/api/geocode` → (x,y,PNU) → 클라이언트에서 `fetchParcelInfo`/`fetchNearbyRoads`/`fetchZoneByCoord` + 서버에서 `/api/landuse`/`/api/landprice` 동시 호출 → UI 카드 3종 (기본 정보·지목·도로 판정) + 공시지가 박스 + zone 매핑 시 `applyLotInfo`로 store 자동 채움. 부분 실패는 errors[] 누적 후 노란 경고. `hasVworldKey()` false면 키 설정 안내 박스.
  - **도로 판정 로직** (LandRiskCheck.jsx에서 추출): `directRoad || (isBuiltJimok && hasBuilding 추정)` = 접면 / `!accessible && totalParcels >= 8` = 맹지 / 나머지 = 확인 필요. 4 상태 색상: ok 초록/warn 빨강/uncertain 호박.
  - **시뮬레이터 페이지**: `app/(app)/simulator/page.tsx`의 `<AddressLookup />` → `<LandLookup />` 교체. 기존 mock fallback은 lotInfo.source==='mock'일 때만 보이도록 유지.
  - **환경 변수**: stellar 클론 폴더에 `.env*` 파일 없음(Netlify 대시보드 관리). `gyumo/.env.local.example` 생성 — 3 키 placeholder. 실제 값은 stellar Netlify 사이트(siteId 68f55019-f48d-4e9a-ab64-2eaa18db25b5)에서 가져와야 함.
  - **stellar에서 안 가져온 것** (Option C 원칙 준수): 자체 Auth/Admin/Payment 모달, useFavorites/useHistory/useMembership hooks, InvestmentAnalysis/InvestmentGrade/BuildingMatrix 컴포넌트, 자체 useTheme(gyumo 5 테마와 충돌), MapView, Google Translate 위젯 (gyumo는 자체 차단), Vite 빌드 시스템.
  - 검증: `npm run build` ✓ 11 라우트 (4 신규 API + 기존 7), `npm run lint` 0 errors. 기존 모든 기능(시뮬레이션·비용·사업성·PDF·5 테마·🎨 토글·탭 ①②③)은 미변경.
- **2026-05-22** — Day 13 후속: 슬라이더 마커·탭 카드 분리·헤더 테마 토글.
  - **[A] 슬라이더 스케일 정상화** — `SliderInputPair`에 `markers?: { position, label, color }[]` + `shadeAboveMarker?: boolean` 추가. 건폐율 슬라이더 `max={100}`(이전 `z.maxCov`)로 통일, 법정 한도는 빨강 세로 마커 + `법정 60%` 호버 라벨로 표시. 마커 position 초과 영역은 `linear-gradient(rgba(239,68,68,0.18) → rgba(220,38,38,0.55))`로 음영 처리. 용적률도 동일 — `max={1500}` + 법정 한도 마커. 초과 시 hint에 `⚠ 법정 한도 N% 초과 — 인허가 불가 (시뮬레이션 전용)` 빨강.
  - **[B] 탭 시각 분리 강화** — `TabsList`의 `bg-[var(--info-bg)] p-1.5 rounded-xl`를 `bg-transparent gap-3 p-0`로 교체 (코랄 가로 라인 제거). `StepTrigger` 리뉴얼: 비활성 `opacity-60` + 회색 번호 배지(`bg-muted-foreground/60`), 활성 `bg-gradient-to-br from-card to-[var(--info-bg)]` + `border-[var(--info)] shadow-lg` + 코랄 번호 배지. 각 탭이 독립 카드처럼 보이고 단계감 시각화.
  - **[C] 헤더 ThemeQuickToggle 드롭다운** — `components/theme/ThemeQuickToggle.tsx` 신규. useState 기반 controlled open + useEffect로 click-outside/Esc 처리 (set-state-in-effect 회피, 이벤트 핸들러에서만 setState). 트리거: 🎨 + 현재 테마명 (md 이상). 드롭다운(z-50): 5 테마 ul + 각 항목에 3색 점 + 이름·설명 + ✓ 활성 마크. 하단에 ⚙️ 자세한 설정(/settings) 링크. 클릭 시 `setActiveThemeId(id)` + open=false. `app/(app)/simulator/page.tsx` 헤더에 `<ReportDialog /> <ThemeQuickToggle /> <Link href="/settings">⚙️</Link>` 순으로 배치.
  - 검증: lint 0 errors / `/simulator` SSR: "법정 60%" ×1, "법정 250%" ×1, `#DC2626` ×6, `linear-gradient` ×2 (마커 + 음영), `data-[state=inactive]:opacity-60` ×6 + `bg-gradient-to-br` ×6 (3 탭), "화면 색상 테마 선택" ×1, `aria-haspopup` ×6, `ThemeQuickToggle` ×2.
- **2026-05-22** — Day 13 탭 단계 번호 + 건폐율/용적률 추천 알림 + 5 화면 테마.
  - **[A] 탭 ①②③ 배지** — `app/(app)/simulator/page.tsx`의 `TabsList`를 grid-cols-3 + `bg-[var(--info-bg)] rounded-xl`로 리뉴얼. 신규 `StepTrigger` 헬퍼: 원형 코랄 배지(w-7 h-7, `bg-[var(--info)]`) + 라벨 + 부제(`hidden md:block`) + 활성 시 `bg-card`, `border-[var(--info)]`, `shadow-sm`. 3 단계 카피: 규모 검토(건폐율·용적률·일조) / 비용·부담금(건축비·농지·산지·개발) / 사업성 분석(IRR·수익률·대출).
  - **[B] ControlPanel 추천 알림** — `RegulationHint` 헬퍼 신규. 건폐율 < `z.maxCov × 0.8` 또는 용적률 < `z.farMax × 0.8`일 때 호박색 박스 자동 등장 — "법정 최대 X% 대비 Y%로 설정됨" + "현재 N평 / 법정 최대 사용 시 M평" + "법정 최대 X%로 설정 →" 버튼(즉시 setter 호출). 슬라이더 hint도 "법정 최대 X% (1층 N평)" / "법정 …% (연면적 M평)"로 평수 노출.
  - **[C-1] 테마 시스템 인프라**: `lib/theme/themes.ts` (5 테마 × 11 색상 토큰 — mrhomes/forest/midnight/lightclean/premium), `lib/theme/storage.ts` (`useActiveThemeId` = useSyncExternalStore + `gyumo:theme-changed` 이벤트), `components/theme/ThemeBootstrap.tsx` (`<head>` inline script로 LocalStorage → `<html data-theme>` 즉시 설정 — FOUC 방지), `app/layout.tsx` `<html data-theme="mrhomes">` 기본.
  - **[C-2] globals.css 테마별 CSS 변수** — `[data-theme="X"] { --background; --foreground; --card; --secondary; --muted; --border; --info; --info-foreground; --info-bg; ... }` 5 selector. mrhomes는 코랄(#993C1D + #FAECE7 + #F5F3EE) 명시, midnight는 `--primary`/`--popover`까지 dark 변환.
  - **[C-3] /settings 테마 카드** — `components/settings/ThemeCard.tsx` 신규, `grid-cols-2 md:grid-cols-5` 5 옵션. 각 옵션이 자기 테마 색으로 미리보기 — 3색 점(primary/Dark/accent) + 이모지+이름 + 설명. 활성 시 scale-[1.02] + "✓ 사용 중" 배지. 클릭 즉시 `setActiveThemeId(id)` → `<html data-theme>` 갱신 → 모든 CSS 변수 자동 전환 → 새로고침 후에도 LocalStorage 유지.
  - **PDF 색상은 별도**: 화면 테마는 UI만, PDF 보고서는 Day 7 `BrandConfig.primaryColor` 우선 (사용자 명세대로 분리).
  - 검증: lint 0 errors / `/simulator` SSR: `data-theme` ×4, 탭 부제 각 ×2, `rounded-full` ×16(원형 배지) / `/settings` SSR: "🎨 화면 색상 테마" ×1, 5 테마 라벨 모두 노출, "✓ 사용 중" 배지 ×1.
- **2026-05-20** — 프로젝트 시작. v0.1 위젯 프로토타입 완성 (`prototype.html`). claude.ai 채팅에서 PRD·디자인·로드맵 확정 → Claude Code로 이전.
- **2026-05-20** — Day 1 부트스트랩 완료. Next.js 16.2.6 + React 19 + Tailwind 4 + Turbopack. shadcn/ui (`base-nova` preset, base color `neutral`, `@base-ui/react` 기반) + 7개 컴포넌트(slider/select/switch/button/input/card/label). zustand 5 설치. CNA가 생성한 `AGENTS.md`(Next 16 경고)는 보존, CNA `README.md`는 `README.nextjs.md`로 보관. shadcn CLI v4 모델 변경으로 `new-york + stone` 직접 선택 불가 → globals.css 톤 조정은 Day 2 작업으로 미룸.
- **2026-05-20** — Day 2~3 완료. `next.config.ts`에 `turbopack.root` 명시(상위 lockfile 경고 해소). `globals.css` 색 토큰을 프로토타입의 warm cream(`oklch(0.937 0.013 88)` 등) + info(blue)/success(green)/destructive(red)로 재정의. `lib/zones.ts`(13개 용도지역), `lib/calc/{coverage,far,sunlight}.ts`(일조권 사선제한 계산), `store/simulator.ts`(zustand) 작성. `components/simulator/`에 6개 컴포넌트(`AddressLookup`/`ZoneSelector`/`ControlPanel`/`ScaleVisualizer`/`ResultMetrics`/`LegalBasis`) 분해. `app/(app)/simulator/page.tsx` 조립, `app/page.tsx`는 `/simulator`로 redirect. base-ui `<SelectValue>`가 raw value를 렌더링하는 이슈는 render prop으로 해결. lint 통과, `/simulator` HTTP 200 확인.
- **2026-05-20** — Day 4 완료. `app/(marketing)/page.tsx` 랜딩 페이지(Hero + 기능 3개 + 권위/신뢰 섹션 + 요금제 티저 + Final CTA). `app/(marketing)/pricing/page.tsx` 상세 요금제(Free/Pro/Business + 가맹점/멘토스쿨 + FAQ 4개). `components/marketing/{Nav,Footer}.tsx` + `app/(marketing)/layout.tsx`로 공통 헤더·푸터. 라우트 충돌 회피를 위해 `app/page.tsx` 삭제(`/`는 (marketing) 그룹의 page.tsx로 해석). 모든 라우트(`/`, `/pricing`, `/simulator`) HTTP 200, lint 통과. 운영자 인용(고상철 高相喆, 공법의 신, 28년 강의, 인하대 정책대학원, 법무법인 윤강) 모든 페이지 반영.
- **2026-05-21** — 슬라이더 버그 fix & 용적률 1500% 통일. (1) base-ui Slider `onValueChange` 시그니처 양쪽 처리(`Array.isArray(v) ? v[0] : v`) + store setter에 `Number.isFinite` 가드. (2) 용적률 슬라이더 max를 zone과 무관하게 1500% 고정, hint는 법정 범위 그대로, 법정 초과 시 값 아래에 빨강 `⚠ 법정 한계(N%) 초과` 노출. (3) `ScaleVisualizer`의 `mPx`를 `phPx/FLOOR_HEIGHT_M`로 연동해서 sunlight 사선·치수선까지 모두 한 번에 축소 — 1500%/낮은 covPct(최대 150층 케이스까지) viewBox 안에 들어옴.
- **2026-05-21** — 주차장 산정 ⑤ 섹션 + 학습 패널 추가. `lib/parking-standards.ts`에 15개 용도(단독·공동·다세대연립·다가구·도시형생활·오피스텔·근린1·근린2·판매·업무·의료·운동문화·숙박·종교·공장창고), 3가지 mode(area / progressive 단독 / tieredHousehold 공동·오피스텔), 시행령 + 서울조례 강화값. `lib/calc/parking.ts`에 `calcArea`/`calcProgressive`/`calcTieredHousehold` + 25㎡/대 + 지하 권장 로직(>60%). `store/simulator.ts`에 `parkingUsage`/`parkingAreaPerSpace`/`parkingProgressiveSpec`/`parkingHouseholds`/`parkingTierRatios` + 용도 변경 시 서울값으로 user-editable 필드 리셋. `components/ui/sheet.tsx`(base-ui Dialog 기반 자작, shadcn CLI 사용 못해서 직접 작성). `components/simulator/ParkingLearnSheet.tsx` 8개 섹션(주차장법 3단 구조 / 19조+별표1 / 용도별 표 비교 / 산정방법 / 면제·완화 / 실무 팁 / FAQ / 법령 원문) — 부동산공법 28년 강의 톤. `components/simulator/ParkingCalculator.tsx` 시행령(읽기전용) vs 적용기준(편집) 카드 + mode별 UI 자동 전환 + 필요 주차면적/1층 대비/지하 권장 요약 카드. `LegalBasis`에 주차장법 항목 2줄 추가. 검증: 업무/1,652.89㎡/100㎡당 → 17대 ✓ / 134㎡당 → 13대 ✓ / 시행령 150㎡당 → 12대 ✓ / 단독주택 누진(120→1, 250→2, 350→3, 30→0) ✓ / 공동주택 가중합 ✓. lint 통과.
- **2026-05-21** — 시뮬레이터 3 작업(A/B/C).
  - **[A] 일조권 9m → 10m 개정 반영.** `lib/calc/sunlight.ts`에 `SUNLIGHT_THRESHOLD_M = 10` 상수 도입, 건축법 시행령 86조 1항 (2023.9.12 개정). `ScaleVisualizer.tsx`의 정북 사선 vertical leg + plan view maxSetback 모두 10m 기준으로 재계산. 일반적인 3.5m 층고 건물에서는 fH=9~10 구간 층이 없어 수치적 변화는 미미하지만 SVG의 vertical leg는 +5px 만큼 위로 이동.
  - **[B] 일조권 학습 Sheet.** `components/simulator/SunlightLearnSheet.tsx` (주차장 학습과 동일 패턴) 8개 섹션 — 법적 구조(헌법 35조→61조→86조+환경권 판례) / 2023.9.12 개정 / 정북 86조 1항 / 채광 86조 3항(인동거리·회전배치) / 적용 제외 86조 2항(도로·공원·철도·비주거·2m 이하) / 정남 특례 86조 4항 / 실무 팁 / FAQ + 법령 원문 링크. `ControlPanel`의 일조권 토글 옆에 [📚 일조권 공부하기] 트리거 + 텍스트에 "2023.9.12 개정 10m 기준" 명시.
  - **[C] 주차장 배치 형식 토글 + 분양 가능 연면적.** `parkingMode` (none/basement/ground/mixed) + `parkingGroundRatio` 0~100 store 추가. `lib/calc/parking.ts`에 `groundParkingSqm`/`basementParkingSqm`/`salableGfaSqm` (건축법 시행령 119조 1항 4호: 지하 연면적 제외) 추가. `ParkingCalculator`에 4-buttons segmented `ModeToggle` + 혼합 모드의 지상 비율 슬라이더, 메트릭 카드 3→4개로 확장(필요/1층 대비/**분양 가능(녹색)**/**차이**). `ScaleVisualizer`에 `parking-h` pattern + 필로티 오버레이 (1F~ 위쪽 회색 해칭) + 지하 박스 (baseY 아래 N층 회색 박스). `LegalBasis`에 일조권 줄을 "2023.9.12 개정, 10m 기준"으로 갱신 + 지하 119조 1항 4호 한 줄 추가.
  - **검증**: lint 통과 / SSR에 "2023.9.12 개정 ×3, 일조권 공부하기 ×1, 주차장 배치 형식 ×1, 분양 가능 연면적 ×1, 법정 vs 분양 차이 ×1, 119조 1항 4호 ×2, parking-h pattern ×3, 필로티 ×1" 모두 노출. 분양 가능 연면적 계산: 지하 1,653㎡(법정 그대로) / 지상 1,228㎡ (1,653 − 17대×25㎡ = 1,228, 사용자 기대치 1,253은 16대 기준이고 17대×25=425 차감 시 1,228이 정확) / 혼합 30% 지상 1,525㎡.
- **2026-05-21** — 3D 360° 시각화 추가. `three@0.184` + `@react-three/fiber@9.6` + `@react-three/drei@10.7` + `@types/three` 설치 (R3F v9는 React 19 호환). `components/ui/tabs.tsx` shadcn CLI로 추가(base-ui Tabs 기반). `components/simulator/ScaleVisualizer3D.tsx` 신규 — `<Canvas>` 480px(데스크탑)/360px(모바일), `OrbitControls`로 마우스 회전·줌·이동, 4 카메라 프리셋(`기본 뷰`/`위에서`/`남쪽 정면`/`북쪽 정면`) + 자동 회전 토글, `useFrame`+`Vector3.lerp(0.08)` 부드러운 보간. 요소: 흰색 대지 plane + 점선 외곽선(drei `Line` dashed), 회색 도로 plane, 층별 `BoxGeometry` 매스(일조권 setback만큼 정북깊이 감소), 정북 화살표+한글 "N"·"정북"(drei `Text`), 일조권 사선 envelope(수직 plane + tilted plane custom BufferGeometry, opacity 0.15 빨강), 지상 필로티(1F 회색 transparent 0.7) + 지하 박스(B1·B2 라벨), `Grid` 옅게(모바일은 끔). 조명: ambient 0.55 + directional 1.0 남동+보조 0.25 북서. `dpr={[1,2]}` 고해상도. 카메라 fov=35, 거리 10~500 제한. `ScaleVisualizer.tsx`에 shadcn Tabs 추가(2D 도면 / 3D 360°), 3D는 `next/dynamic` + `ssr:false`로 lazy 로드. 검증: lint 통과(0 errors 0 warnings) / `/simulator` 200 / SSR에 Tabs 마크업 `data-slot=tabs/list/trigger×2/content` 정상 / `2D 도면`·`3D 360°` ×1 / 모든 store 값 그대로 사용(별도 3D state 없음, 일조권·주차 형식 슬라이더 변경 시 3D도 즉시 반영). 노이즈: `THREE.Clock deprecated` (R3F 9.6 upstream, 무해) · 브라우저 확장 `data-hwp-extension` 하이드레이션 mismatch(외부 확장 원인).
- **2026-05-21** — Day 4-A 비용·부담금 시뮬레이션. `recharts` 설치. `lib/calc/cost.ts` (`CostInputs` 26개 필드 / `calculateCost` / `formatWon`·`formatEok`). `store/cost.ts` (zustand, `enabled` 3개 기본 `false`로 41.06억 일치). `components/simulator/cost/`에 7개 파일: `SliderInputRow`(Slider+Input 페어, 양방향 동기), `FeeSection`(부담금 공통 헤더+체크박스), `BasicCostInputs` 7필드 / `FarmlandFee` 5필드 / `ForestFee` 6필드 / `DevelopmentFee` 5필드, `CostResults`(총비용 보드 + 7카드 + Recharts 수평막대 + 3 학습 탭 + 3 details), `CostSimulator`(2-col 반응형, 우측 sticky 결과). `app/(app)/simulator/page.tsx` 최상위 Tabs 3개(🏗️ 규모 검토 / 💰 비용·부담금 / 📊 사업성 분석 — 마지막은 `disabled` + "곧 출시" placeholder). 검증: 기본값 SSR 마크업에 **41.06억원 ×1 정확 일치** ✓ (`direct 36.66 + soft 4.40`, enabled 3개 모두 off). 모든 enabled on 시 41.80억. lint 0 errors 0 warnings. Tabs 3 trigger, panel은 active만 lazy 렌더 (base-ui 기본 동작).
- **2026-05-21** — Day 4-B 부담금 3종 학습 Sheet. `components/simulator/cost/`에 `FarmlandLearnSheet.tsx` (액센트 `#d97757`, 농지법 38조+시행령 53조), `ForestLearnSheet.tsx` (액센트 `#9b6b46`, 산지관리법 19조+시행령 24조), `DevelopmentLearnSheet.tsx` (액센트 `#b6573e`, 개발이익환수법 5조) 추가. 각각 일조권·주차장 Sheet와 동일한 8섹션 native `<details>` 패턴 (법적구조·적용대상·계산공식+예시·단가요율·감면예외·신고납부·실무팁·FAQ + 법령 원문 톤). `FeeSection`에 `learnSheet`와 `accentColor` slot 추가 — 헤더 좌측 (제목 옆)에 트리거 버튼, 부담금별 액센트 컬러로 보더·배경 동적 적용 (기존 단일 `#D97757`에서 3색으로 분기). 3 fee 컴포넌트에서 `accentColor`와 `learnSheet` prop 전달. 검증: lint 0 errors / SSR에 "공부하기" ×3, 각 부담금 액센트 컬러(#d97757/#9b6b46/#b6573e) ×2씩(border+background), 41.06억 기본값 영향 없음 ✓. Sheet 콘텐츠는 닫힘 상태에서 portal 미마운트(base-ui 기본 동작)이므로 SSR에는 없고 클릭 시 슬라이드 인.
- **2026-05-21** — Day 12-B 사업성 데이터를 PDF + AI 프롬프트에 통합.
  - **타입**: `ReportInputs.profit?` 옵셔널 필드 추가 (입력값 14 + 결과 19, 총 33 필드).
  - **store/profit.ts**: `touched: boolean` 플래그 추가 — 어떤 setter라도 호출 시 자동 true, `reset()`은 false로. 사용자가 사업성 탭을 한 번도 안 조작하면 false 유지.
  - **buildReportInputs**: `useProfitStore.getState()` 호출 → `touched`가 true일 때만 `calculateProfit` 실행 + `ReportInputs.profit`에 합성. 미조작 시 `undefined`로 PDF에서 자동 생략.
  - **PDF 신규 ProfitPage** (`input.profit` 있을 때 AppendixPage 직전 삽입, 페이지 4가 됨):
    - (a) 총 사업비 구성 — 4행 표(토지/건축/부담금/대출이자) + 코랄 합계 박스
    - (b) 자금 조달 — 자기자본 + 대출 (LTV·금리·기간·방식) 2 미니카드
    - (c) 예상 수익 — 수익 모델(분양/임대/혼합) 박스 + 큰 금액
    - (d) 수익률 지표 — IRR(코랄 풀필 큰 박스) + ROE + 손익분기 분양률 3 카드
    - (e) 평당 마진 — 평당 사업비/분양가/마진(코랄 강조, 음수 빨강)
    - 경고 박스 — isLoss 빨강 / isHighRisk 노랑 / OK 초록 ✅
  - **PDF SummaryPage**: 핵심 수치 표 아래에 `<ProfitKpiBox>` 추가 — IRR·순이익·ROE·손익분기 4 미니 KPI. IRR/순이익 색상 동적.
  - **AI 시스템 프롬프트**: "사업성 평가 가이드" 섹션 추가 (IRR 15~25%·ROE 30~80%·BE 70/90%·마진 30/15% 기준) + "사업성 데이터 있을 때 분석 항목 가중치" 섹션 (summary/risks/recommendations/nextSteps/oneLiner에 사업성 비중 명시).
  - **AI 유저 프롬프트**: `buildProfitSection(p)` 헬퍼 추가 → `input.profit` 있을 때 17줄 사업성 데이터 블록 (토지·수익·대출·이자·총사업비·자기자본·순이익·IRR·ROE·ROIC·BE·평당사업비/마진·분양시점) + `isLoss`/`isHighRisk` 플래그 자동 마킹.
  - **ReportDialog ready view**: 전문 한 줄 의견 박스 아래에 📊 사업성 핵심 3-grid 박스 (IRR·순이익·BE) — input.profit 있을 때만.
  - 검증: lint 0 errors / `/simulator` 200 / profit.touched=false 기본 상태에서 buildReportInputs.profit === undefined → PDF에서 ProfitPage·KpiBox 자동 생략, AI 프롬프트에 사업성 섹션 미포함. 사용자가 사업성 탭에서 슬라이더 한 번이라도 조작 → touched=true → PDF 4번 페이지 등장.
- **2026-05-21** — Day 12-A Phase 5 사업성 분석 모듈 구현 (📊 탭 활성화).
  - **계산 라이브러리** 신규: `lib/calc/irr.ts` (Newton-Raphson, 발산 시 -99%/1000% 클램프) · `lib/calc/loan.ts` (`bullet`/`amortized`/`graceThenAmortized` 3 방식 월 상환액 + 사업기간 동안 총 이자) · `lib/calc/profit.ts` (`calculateProfit({landAreaPyeong, totalBuildingCost, totalFees, salesAvailableAreaPyeong, ...사용자입력}) → {landCost, buildingCost, feesTotal, loanInterest, totalProjectCost, equity, loanAmount, monthlyLoanPayment, totalRevenue, annualRevenue, profitBeforeTax, tax(22%), netProfit, roe, roic, irr, breakEvenSalesRate, costPerPyeong, marginPerPyeong, marginPercent, isLoss, isHighRisk}`). 수익 모델 3가지: `sales`/`rent`/`mixed`.
  - **store/profit.ts**: 14필드 + `loanAmountOverride: number|null` 패턴(null이면 LTV×base 자동, number면 사용자 직접). 기본값 (landPricePerPyeong 4000, salesPricePerPyeong 4500, salesRate 90, ltvRatio 60, annualInterestRate 6, loanPeriodYears 3, repaymentMethod 'bullet', projectDurationMonths 18).
  - **6 컴포넌트** `components/simulator/profit/`:
    - `LandCostInputs` — 평당 토지가(slider 100~30,000 / input 0~200,000), 부대비(0~20%, input 0~50%) + "기본 토지비 / 총 토지비" 자동 박스.
    - `SalesRevenueInputs` — 수익 모델 3-button(sales/rent/mixed) + 모델별 슬라이더 동적 표시 (분양가·분양률 또는 월세·보증금·가동률).
    - `LoanCalculator` — LTV ↔ loanAmount **양방향 동기화**: LTV 변경 → override=null로 리셋, loanAmount 변경 → override 설정 + LTV 표시값 재계산. 상환방식 3-button + 금리 안내 "💰 한국은행 기준금리 3.25% (2026.5)".
    - `ScheduleInputs` — 사업 기간(6~48개월) + 분양 시작 시점(±12개월, 음수=선분양/양수=후분양 hint 동적).
    - `ProfitResults` — 4 핵심 카드(총사업비/예상수익/순이익/IRR), 6 세부, 경고 박스(isLoss → 빨강·breakEven>90% 또는 isHighRisk → 노랑·OK → 초록), 대출 요약. IRR 색상 동적: <0 빨강, <10 회색, <20 코랄, ≥20 코랄 bold.
    - `ProfitAnalyzer` — 메인 컨테이너. simulator(`lotPy`) + cost(`abovePyeong`, `calculateCost`)에서 자동 연동. 좌(입력 4) / 우(sticky 결과) 반응형. "기본값으로" 리셋 버튼.
  - **모든 입력 = Day 11 `SliderInputPair`** (슬라이더+키보드 입력 양방향, clamp, border flash). inputMin/Max로 슬라이더 5~10배 확장 (예: 평당 토지가 100~200,000 만원).
  - **simulator/page.tsx**: `<TabsTrigger value="profit" disabled>...곧 출시</TabsTrigger>` → `<TabsTrigger value="profit">📊 사업성 분석</TabsTrigger>`. TabsContent stub 제거하고 `<ProfitAnalyzer />`.
  - 검증: lint 0 errors / 토지비 200평×4000×1.05 = **84.00억** ✓ / IRR 100만→110만 1년 = **10.00%** ✓, 2년 121만 = 10%, 200만 1년 = 100% ✓ / SSR(defaultValue를 잠시 profit으로): "사업성 분석 (Phase 5)" ×1, 4 카드 헤더 ×1 each, "총 사업비"·"예상 수익"·"순이익"·"IRR (연)"·"ROE"·"손익분기 분양률" 노출, 84 ×4(토지비), 기본값으로 손실 케이스라 "⚠️ 손실 예상" 박스 노출. defaultValue 원복.
- **2026-05-21** — Day 11 슬라이더+Input 페어 통합 (키보드 직접 입력 강화).
  - **공통 컴포넌트** `components/ui/slider-input-pair.tsx` 신규 — `SliderInputPair { value, onChange, min, max, step, unit, label, tooltip, hint, conversion, disabled, inputMin, inputMax, inputWidthClass }`. 핵심 동작: 슬라이더 드래그는 controlled (즉시 onChange), Input은 로컬 editing 상태(`useState<string|null>`)로 타이핑 중에는 유지 → blur/Enter 시 commit. parseFloat + clamp(effectiveMin..effectiveMax) + 범위 밖이면 input border `border-amber-500 ring-2 ring-amber-200` 1초 깜빡. Escape 시 editing 취소. ⓘ 툴팁은 native `<abbr title>`. layout — 라벨+Input 한 줄(우측 unit/conversion stack), 슬라이더 단독 줄, hint는 슬라이더 아래.
  - **ControlPanel.tsx** — 자체 인라인 `Row` 제거하고 SliderInputPair로 4개(대지면적·건폐율·용적률·전면도로) 교체. inputMin/Max로 슬라이더 범위의 2~25배 확장 (예: 대지 0~5만 평, 용적률 0~3000%, 전면도로 0~100m). 용적률의 법정 초과 경고는 hint 영역에 `text-destructive`로 표시.
  - **BasicCostInputs** (7필드) / **FarmlandFee** (5) / **ForestFee** (6) / **DevelopmentFee** (5) — SliderInputRow를 모두 SliderInputPair로 교체 + 각 항목 inputMin/Max 확장. 큰 숫자 필드(공시지가·만원 단위 지가)는 `inputWidthClass="w-28"`로 폭 확보.
  - **ParkingCalculator** 인라인 슬라이더 2개(혼합 지상 비율, 1대당 점유 면적)도 SliderInputPair로 교체. 1대당 점유 면적은 inputMin=10/inputMax=50(슬라이더 25~35)으로 자유도 ↑.
  - **평당 공사비 (aboveUnit)** 특별 처리 — `tooltip="공사비 시세 참고: 일반 800~1,200, 고급 1,500~2,000, 특수 2,500+ 만원/평"` + `hint="💡 일반 5~10층 건물 기준 시장 평균 800~1,200만원/평. 고급·특수 자재 시 더 높음."` + `inputMin=100/inputMax=10000` (대표 강조).
  - **cost/SliderInputRow.tsx** 는 backward-compat re-export로 변경 (`export { SliderInputPair as SliderInputRow } from "@/components/ui/slider-input-pair"`).
  - 검증: lint 0 errors / `/simulator` 200, 4개 라벨(대지면적·건폐율·용적률·전면도로) + Input `type="number"` ×5 SSR 노출. ESLint set-state-in-effect 회피 — useEffect 없이 `editing=null` 패턴으로 외부 value 변경 자동 반영. Input `inputMode="decimal"` 추가로 모바일 숫자 키보드 + 소수점 지원.
- **2026-05-21** — Day 10 개정: 필로티 의미 정정 + 1층 영업 가능 면적 KPI 카드.
  - **모델 변경** (사용자 새 명세 따름):
    - 1층 영업 가능 면적 = 1층 건축면적 − 지상주차 점유면적 (필로티 무관, 주차로 잠긴 만큼 영업 불가)
    - **필로티 효과는 별개**: 시행령 119조 1항 4호 — 필로티 활성 시 연면적에서 1층 주차면적 추가 차감
    - 벽체식: 영업 면적은 동일하게 줄지만 연면적은 그대로
  - **계산**: `calculateFloor1Indoor(building, parking)`에서 pilotiMode 인자 제거(항상 차감). 새 `applyPilotiDeduction(floorArea, parking, isActive)` 헬퍼 추가. `buildInput`이 `actualGfa`에 필로티 차감 적용 → `actualFloorArea` 필드는 필로티 반영값으로 출력. `ResultMetrics`에도 같은 보정 직접 호출.
  - **UI**: 슬라이더 범위 25~35(이전 20~50), 안내 "자주식 평행 28~32, 직각 25~30, 기계식 15~20㎡ 참고". 필로티 토글 라벨 "필로티 (연면적 제외)" / "벽체식 (연면적 산입)", 안내 "벽 없는 개방형 + 주차 외 다른 용도 없을 때 적용 가능 (건축법 시행령 119조 1항 4호)". 필로티 활성 시 결과 박스 "✓ 필로티 적용 — 연면적에서 N㎡ 추가 차감".
  - **Floor1BreakdownCard**: 라벨 "1층 실내 가용면적" → "1층 영업 가능 면적", 주차 행 항상 차감(필로티 무관), 0일 때 빨강 박스 + "1층 전체 주차 — 영업 공간 없음" + "주차대수 또는 1대당 면적 조정 검토" 안내, 필로티 적용 시 코랄 강조 "✓ 필로티 적용: 연면적에서 추가 N㎡ 제외".
  - **ResultMetrics**: 새 KPI 카드 "**1층 영업 가능 면적**" — 정상 시 info 톤·"주차 N대 (X㎡) 제외" 부가, 0일 때 destructive 톤·"1층 전체 주차 — 영업 공간 없음" 부가. "실제 가능 연면적" 카드 값은 필로티 보정 적용된 `actualGfaShown` 표시, sub는 필로티 활성 시 "일조권+필로티 차감 (1층 주차 N㎡ 제외)" 안내.
  - **PDF**: 산정 결과 표 라벨 "1층 실내 가용면적" → "1층 영업 가능 면적" (0일 때 ⚠️ prefix), 주차 행은 항상 차감(필로티 무관). 산정 결과 표 직후 필로티 활성 시 코랄 박스 — "✓ 필로티 구조 적용: 1층 주차 N㎡가 연면적에서 추가 제외됩니다 (시행령 119조 1항 4호 — 벽 없는 개방형 주차 전용 구조 조건 충족 시)".
  - **2D 평면도(top view) 1층 분리** (입면도 분리는 기존 유지): 건축면적 box가 day10ParkingFraction > 0이면 두 영역으로 — 북측(상단) 영업 가능 코랄 + 남측(도로쪽 하단) 주차 사선 패턴 + "🚗 주차 N대 · X㎡" 라벨. 미배치 시 기존 단일 box.
  - **AI 프롬프트**: 시스템 프롬프트에 "1층 영업 가능 면적이 매우 작거나 0인 경우 영업·임대 수익 손실 리스크로 반드시 지적할 것" + "필로티 적용 시 연면적 차감 효과(시행령 119조 1항 4호)와 그에 따른 분양 가능 면적 감소도 고려할 것" 추가. 유저 프롬프트 라벨 "1층 실내 가용면적" → "1층 영업 가능 면적", 0이면 "⚠ 1층 전체 주차 — 영업 공간 없음" 마크, 필로티 적용 별도 행 "필로티 적용: 예/아니오 (연면적에서 N㎡ 추가 제외, 시행령 119조 1항 4호)".
  - 검증: lint 0 errors / `/simulator` 200, "1층 영업 가능 면적" KPI 카드 SSR 노출 + "주차 미배치 — 전체 1층 사용" 부가 (기본 mode=basement 상태).
- **2026-05-21** — Day 10 1층 지상주차 분리 + 1층 실내 가용면적 산출 + 시각화·PDF 반영 (초안).
  - **근거**: 건축법 시행령 제119조 제1항 제2호 가목 (4) — 필로티 구조 주차장은 건축면적 산정에서 제외.
  - **lib/calc/groundParking.ts** 신규 — `calculateGroundParking({placement, spaces, unitArea, pilotiMode, groundRatioPct})` → `{groundSpaces, basementSpaces, groundParkingArea, isReducingFloor1, legalBasis}`. `calculateFloor1Indoor(building, groundParking, isReducing)` — 필로티 모드면 building−parking, 벽체식이면 building 그대로 (사용자 명세).
  - **store**: `parkingUnitArea`(기본 30, 서울 표준), `parkingPilotiMode`(기본 true) 추가 + setter. 기존 25㎡/대(`SQM_PER_SPACE`)는 일반 footprint 추정용으로 유지하고 30㎡는 1층 layout 전용.
  - **ParkingCalculator UI**: 주차 배치 형식 토글 아래에 🚗 1층 지상주차 면적 산정 카드 (mode=ground/mixed일 때만). 1대당 면적 슬라이더(20~50, 기본 30) + 1대당 정보 ("주차칸 12.5 + 차로·회전 17.5"). 필로티/벽체식 2-button 토글 + 시행령 119조 1항 2호 가목 (4) 인용. 실시간 결과 박스: 지상 N대 (Xm² = Y평) · 지하 N대 + 필로티/벽체 안내. `Floor1BreakdownCard` 신규(같은 파일 helper): 법정 건축면적 / └ 1층 지상주차 면적 / ✓ 1층 실내 가용면적 (vs 벽체식: 차감 안 됨 hint) + ⚖️ legalBasis.
  - **ReportInputs.scale** 확장: `groundSpaces`/`basementSpaces`/`groundParkingArea`/`floor1Indoor`/`isReducingFloor1`/`parkingUnitArea`/`pilotiMode` 7개 필드. `buildInput.ts`가 `calculateGroundParking` + `calculateFloor1Indoor`로 채움. AI 프롬프트(`buildUserPrompt`)에 1층 분해 3줄(법정 건축면적 / 지상주차 + 필로티/벽체 / 1층 실내 가용 + 119조 인용) + 주차 배치 3분할(지상 N + 지하 M, 총 X) 추가.
  - **PDF (ReportDocument.ScalePage)** — (b) 산정 결과 표에 `groundParkingArea > 0` 시 2행 추가: `└ 1층 지상주차 (N대 × 30㎡, 필로티/벽체식)` + `✓ 1층 실내 가용면적`. `SunlightDiagram`에 buildingArea/groundParkingArea/showParking props 추가 — 1층 남측에 사선 패턴 + 점선 보더 + 🚗 1층 주차 라벨 (parkingFraction × 290px 폭). 하단 주석에 필로티/벽체식 구분 노출.
  - **3D ScaleVisualizer3D.BuildingMass**: 1F(i=0)에서 `day10ParkingFraction > 0`이면 단일 박스 대신 **분리 렌더** — 북측 실내(코랄, fully opaque) + 남측 주차(`PARKING_COLOR` transparent 0.25(필로티)/0.55(벽체식)) + `BoxEdges` 점선 보더 + drei `<Html>` 라벨 "🚗 1층 주차 N대 (필로티/벽체식)". 기존 pilotisFloors 오버레이는 Day 10 분리 활성 시 1F에서 스킵 (중복 회피). 2층 이상은 그대로.
  - **2D ScaleVisualizer**(정북단면도): `day10ParkingFraction > 0`이면 기존 `pilotisRect` 스킵, 대신 `day10ParkingRect` (남측 끝부터 1F 높이만큼) 사선 패턴 + 빨강 점선 보더 + 🚗 라벨.
  - 검증: lint **0 errors, 0 warnings** / `/simulator` HTTP 200 / 기본 mode=basement 상태라 Day 10 UI는 클라이언트 모드 토글 후 노출 (인터랙티브). buildInput·prompts·ReportDocument TypeScript 모두 컴파일 통과 = 데이터 흐름 정상.
- **2026-05-21** — Day 9 브랜딩 톤 통일 ("AI" → "전문/종합") + 분석 엔진 표시 제거 + 대기 UX 강화.
  - **PDF 텍스트**: 표지 부제 "AI 종합 분석" → "종합 분석", 표지 박스 "AI 한 줄 의견" → "전문 한 줄 의견", 1.검토 요약 박스 "AI 종합 의견" → "전문 종합 의견", 4번 페이지 제목 "4. AI 종합 분석" → "4. 부동산 IT 전문 종합 분석", 4번 페이지 하단 "분석 엔진: Google Gemini 2.5 Flash · 날짜" 메타블록 **완전 삭제**, 부록 면책 조항 "공법의 신 시뮬레이터의 자동 산정 결과와 AI 분석을 기반으로" → "부동산공법 데이터 분석 도구의 산정 결과와 전문 종합 분석을 기반으로".
  - **ReportDialog UI**: DialogDescription에서 "AI가" 주어 제거 → "현재 입력 데이터를 종합 분석하여...". IdleView 카드는 provider별 엔진명("Google Gemini 2.5 Flash 사용" 등) 제거하고 **단순화**: 키 등록 시 "✓ 분석 준비 완료", 미등록 시 "분석 도구가 설정되지 않았습니다". 시작 버튼 "🤖 AI 분석 시작" → "📊 전문 분석 시작", "AI 없이 PDF만" → "분석 없이 PDF만". 진행 단계 텍스트 "3/4 Gemini 2.5 Flash 분석 중..." → "3/4 전문 종합 분석 중...". ReadyView "AI 한 줄 의견" → "전문 한 줄 의견", 메타정보 "분석 엔진: Google Gemini 2.5 Flash · 날짜시각" → "분석일: 날짜"(엔진명 + 시각 제거).
  - **대기 UX 강화 (AnalyzingView)**: `useState` + `useEffect`로 1초마다 elapsed 카운트. 단계별 누적 진행률 (각 단계 25%, 3단계는 elapsed에 비례 0~25%) — `progressPercent = (stepNum-1)*25 + stepProgress`, 최대 95%로 캡. 진행률 바: `linear-gradient(90deg, #F0997B, #993C1D)` + `transition: 700ms`. 단계별 안심 메시지 (4단): <10s "입력 데이터 정밀 검토" / <25s "부동산공법 데이터 종합 분석" / <40s "결과 생성 중" / >=40s "곧 완료". 경과 시간 카운터 `경과 N초 · 평균 15~30초 소요`.
  - **백엔드는 변경 없음** — Gemini/Claude 호출 그대로, 사용자 표면에서만 엔진명·"AI" 표현 제거. /settings 페이지의 "AI API 키 설정" 헤더는 키 관리 기능 컨텍스트로 의도적으로 유지 (이번 작업 범위 외).
  - 검증: lint 0 errors / `/simulator` SSR에 "보고서 생성" trigger ×1, "AI"/"Gemini"/"Claude" 단어 **0회** 노출 ✓. Dialog 내부 카피는 닫힘 상태에서 base-ui Portal 미마운트라 SSR 비노출 — 인터랙티브 확인 필요.
- **2026-05-21** — Day 8 KPI 잘림 fix + 3D 매스 PDF 임베드.
  - **[A] SummaryPage KPI 2x2 그리드**: 기존 고정 폭 78pt × 4카드는 긴 한국어 ("제2종일반주거지역" 등)가 옆 카드를 침범. `Kpi2` 컴포넌트 신규 (flex:1 자동 분배, padding 14, 텍스트 22pt 기본 + valueFontSize prop으로 16pt 다운스케일). 4열 1행 → 2행 2카드 구조로 재구성, 카드 폭 ~78mm로 2배 확보. 용도지역 카드는 valueFontSize=15로 긴 명칭 수용 + sub에 `건폐율 60% · 용적률 250%` 부가 정보. 미사용된 기존 `KpiCard` 컴포넌트 삭제. accentColor 그대로 brand.primaryColor 전달.
  - **[B] 3D 매스 PDF 임베드**: `store/simulator.ts`에 `capture3D: (() => string) | null` + `setCapture3D` 추가. `ScaleVisualizer3D.tsx`의 `<Canvas>`에 `gl={{ preserveDrawingBuffer: true, antialias: true }}` 추가(toDataURL 활성) + `<CaptureRegistrar />` 자식 컴포넌트(useThree → gl.domElement.toDataURL("image/png") 함수를 mount 시 store에 등록, unmount 시 null로 해제). `lib/ai/types.ts`의 `ReportInputs`에 `visualization3D?: string` (base64 PNG dataURL) 추가. `ReportDialog`의 `handleStart`를 4단계로 확장: ① 3D 매스 캡쳐(`tryCapture3D` — `activateTabByText(["규모 검토"])` → 150ms 대기 → `activateTabByText(["3D 360°"])` → 700ms Canvas 마운트·첫 프레임 대기 → `useSimulatorStore.getState().capture3D?.()` 호출) ② 데이터 수집 ③ AI 분석(이미지는 AI에 전달 안 함 — `built` 그대로 사용, 본문 가벼움 유지) ④ 결과 + visualization3D를 input에 주입. `handleSkip`도 동일하게 캡쳐 후 PDF만. 캡쳐 실패는 `console.warn`만 출력하고 graceful — PDF에 (d) 섹션이 안 들어감. `ReportDocument`의 `ScalePage`에 `(d) 3D 매스 시각화` 섹션 — `input.visualization3D ? <View wrap={false}>...<PdfImage src={...} height=180 objectFit=contain />...</View> : null`. PDF 임포트에 `Image as PdfImage` 추가. IdleView 본문에 💡 안내 추가 ("현재 화면의 3D 매스 모습이 함께 캡쳐됩니다. 분석 전에 원하는 각도로 회전해 두세요").
  - 검증: lint 0 errors / `/simulator` 200, "보고서 생성"·"규모 검토"·"3D 360°" Tabs SSR 정상 / Node 스모크는 JSX·alias 컴파일 비용으로 생략(기존 6페이지 toBuffer는 Day 6에서 확인). 인터랙티브 검증(2x2 잘림 해결·캡쳐 이미지·4단계 진행·캡쳐 실패시 graceful)은 사용자 브라우저에서 확인.
- **2026-05-21** — Day 7 화이트라벨 + PDF 메모리 누수 fix.
  - **화이트라벨**: `lib/branding/{types,defaults,storage}.ts` 신규 — `BrandConfig` 10필드(companyName/Tagline KR·EN, reportSubtitle, authorName, legalAdvisor, corporationName, ceoTitle, primaryColor) + LocalStorage + `gyumo:brand-changed` 이벤트로 같은 탭 동기화 + `useBrandConfig`(useSyncExternalStore). `components/settings/BrandCard.tsx`(10 필드 입력 + 색상 picker + 저장/리셋, dirty 표시). `/settings` 페이지 하단에 카드 추가. `ReportDocument.tsx`는 prop으로 `brand?: BrandConfig` 받고, 미제공 시 `getBrandConfig()` 호출. 6개 페이지 함수(`CoverPage`/`SummaryPage`/`ScalePage`/`CostPage`/`AIPage`/`AppendixPage`)와 `FixedHeader`에 brand 전파. 하드코딩 텍스트 교체: 표지 상단 띠("MR. HOMES · 공법의 신" → `${companyNameEn} · ${brandTaglineEn}`), 표지 부제(`reportSubtitle`), 표지 푸터 2줄(`brandTagline + authorName + legalAdvisor`, `corporationName + ceoTitle`), 모든 페이지 헤더(`companyNameEn · brandTagline`), 부록 면책 조항(`corporationName`). primaryColor 적용: 표지 상단 띠 배경, 표지 정보 박스 좌측 보더, oneLiner 박스 라벨 색, 페이지 헤더 브랜드 텍스트 색, KPI accent 카드 배경/보더, AI 종합 의견 박스 좌측 보더, 핵심 리스크 번호 배지, 총 사업비 박스 배경, 다음 단계 ☐ 아이콘 색.
  - **PDF 메모리 누수 fix**: 증상 — PDF 다운로드/인쇄 후 시뮬레이터 페이지 멈춤. 원인 — `PDFDownloadLink`가 React 트리에 영구 마운트되어 입력 변경 시마다 PDF 컨텍스트를 재생성·메모리 점유. 해결: `PDFDownloadLink`를 완전 제거하고 `handleDownload`/`handlePrint`를 이벤트 콜백 안에서 `await import("@react-pdf/renderer")` → `pdf().toBlob()` → `URL.createObjectURL` → `<a>` 클릭/`window.open` → `finally`에서 `setTimeout(URL.revokeObjectURL, ...)` + blob/url 참조 null. 다운로드는 500ms, 인쇄는 30초(미리보기 시간 확보) 후 revoke. `pdfStatus` state 추가로 버튼 disabled 처리, 에러 시 `console.error` + alert.
  - 검증: lint 0 errors / `/settings` 200, 브랜드 카드 SSR(10 필드 + 색상 + "기본값(미스터홈즈)으로" 버튼 + #993C1D ×4 노출, 모든 기본값 placeholder·initial value 표시) / `/simulator` 200, "PDFDownloadLink" 마크업 사라짐 확인. 인터랙티브 검증: PDF 다운로드 후 시뮬레이터 페이지 응답성·메모리 변화는 사용자 브라우저에서 확인 필요.
- **2026-05-21** — Day 6 후속 수정 (면적 단위 통일 + 다이얼로그 무반응 fix).
  - **면적 단위 통일**: `lib/utils/area.ts` 신규 — `formatArea(sqm)` "661.16㎡ (200평)", `formatPyeongAsArea(py)` "991.7㎡ (300평)", `pyeongToSqmDisplay`/`sqmToPyeongDisplay`로 input 옆 라이브 변환. PDF `ReportDocument` — 표지/요약 KPI/규모 검토(입력·산정)/비용(지상·지하 평수)/총 사업비 박스 모두 ㎡ (평) 포맷. AI 프롬프트 `buildUserPrompt`도 동일 포맷 + ㎡당 사업비 추가. 시뮬레이터 `ResultMetrics` 카드 4개(대지/건축/법정/실제) `formatArea`로 교체. `SliderInputRow`에 `conversion` slot 추가 — `BasicCostInputs`의 abovePyeong·basementPyeong은 `(991.7㎡)` 보조 표시, `Farmland/ForestFee`의 farmArea·forestArea는 `(200평)` 보조. `CostResults` 총 연면적 줄도 `formatPyeongAsArea`로 갱신.
  - **다이얼로그 무반응 버그**: 원인 — `ReportDialogTrigger`가 trigger를 별도 `<Dialog>` root에 넣고 content를 다른 `<Dialog>` root에 넣은 구조. base-ui Dialog Root는 자체 컨텍스트로 trigger·content를 묶기 때문에 분리 root는 trigger 클릭이 content를 열지 못함(또는 비활성 버튼 상태로 표시). 수정: `ReportDialog`를 단일 컴포넌트로 합쳐 trigger와 content를 같은 `<Dialog open onOpenChange>` root 안에 통합. `useActiveProvider` hook(`useSyncExternalStore` 기반)으로 키 상태를 SSR-safe 구독. `useEffect` 대신 `onOpenChange` 이벤트 핸들러에서 에러→idle 초기화(set-state-in-effect 회피). `handleStart`는 즉시 `setStatus("analyzing")` + 200ms 대기로 UI 갱신 보장, 모든 단계에 `console.log("[ReportDialog] ...")` 추가, Dialog 하단에 항상 표시되는 디버그 details 패널(현재 상태·활성 provider·키 마스킹·최근 에러) 추가. 검증: lint 0 errors / `/simulator` 200 / 단일 button 마크업으로 trigger 렌더(이중 Dialog root 제거 확인) / "200평" ×3, "㎡ (" ×4 SSR 노출.
- **2026-05-21** — Day 6 컨설팅 PDF 출력 + AI 종합 분석. `@react-pdf/renderer` + `@google/generative-ai` + `@anthropic-ai/sdk` + shadcn `dialog`/`sonner` 설치. `lib/ai/keys.ts` LocalStorage 키 관리 + `useSyncExternalStore` 기반 SSR-safe hooks(`useGeminiKey`/`useClaudeKey`/`useActiveProvider`) + 변경 시 `gyumo:keys-changed` 이벤트로 같은 탭 동기화. `lib/ai/types.ts` (`ReportInputs` 규모+비용 합산, `AIAnalysis` summary/risks[3]/recommendations[3]/costAdequacy/nextSteps[3]/oneLiner). `lib/ai/prompts.ts` 시스템 프롬프트("부동산공법 28년 경력 컨설턴트") + JSON 스키마 강제 + buildUserPrompt(현재 store 값을 풀어 자연어 prompt로). `app/api/ai/analyze/route.ts` 서버 API — Gemini는 `gemini-2.5-flash` + `responseMimeType:application/json` + `systemInstruction`, Claude는 `claude-3-5-sonnet-20241022`. 키 보안 위해 모든 외부 호출이 본 서버 경유, 본 서버는 키를 로그에 남기지 않음. `lib/ai/analyze.ts` 클라이언트 analyzeReport + testKey (Gemini는 브라우저 직접, Claude는 서버 경유). `app/(app)/settings/page.tsx` 2 카드 (Gemini 1순위 + Claude 2순위) + 입력/저장/삭제/테스트 + 발급 링크 + 마스킹 표시. `lib/pdf/fonts.ts` Pretendard woff 등록 (jsdelivr CDN) + hyphenation 비활성. `lib/pdf/tokens.ts` 색·치수. `components/report/ReportDocument.tsx` 7페이지(표지+요약+규모+비용+AI(있을때)+부록) — 모든 표/박스/차트/카드에 `wrap={false}`, 표지 외 모든 페이지 fixed 헤더·푸터 + `pageNumber/totalPages`. SVG 직접 렌더: 일조권 사선 정북단면도, 비용 분해 수평 막대 차트(부담금 비활성시 자동 제외), 코랄 풀블리드 표지 띠. `lib/report/buildInput.ts` store→ReportInputs 합성. `components/report/ReportDialog.tsx` 4 상태(idle/analyzing/ready/error) + 키 상태 카드 + 단계 표시 + AI 결과 미리보기 + PDFDownloadLink(`next/dynamic` ssr:false) + 인쇄(`pdf().toBlob() → window.open`). 시뮬레이터 헤더 우측에 `보고서 생성` 버튼 + ⚙️ → `/settings` 링크. 검증: lint 0 errors / `/settings` `/simulator` 모두 HTTP 200 / Node에서 `@react-pdf/renderer.renderToBuffer`로 6페이지 미니멀 문서 정상 생성(4.4KB) — PDF 툴체인 동작 확인. 7페이지 실문서·페이지 잘림 여부·AI 호출 결과는 사용자 브라우저에서 API 키 등록 후 인터랙티브 검증 필요.

---

## 11. Claude Code 작업 시 주의사항

1. **`prototype.html`을 절대 수정하지 말 것** — v0.1 참고 원본. React 컴포넌트는 `app/(app)/simulator/`에 새로 작성.
2. **법령 인용은 정확하게** — 운영자가 "공법의 신" 브랜드이므로 부정확한 조문 인용은 신뢰도 치명타.
3. **"Mr. Holmes" 금지** — 브랜드명은 항상 **"미스터홈즈 (미스터홈즈)"**.
4. **고상철 한자**는 **高相喆** (相, 尙 아님).
5. 모든 UI 텍스트는 한국어 우선, 영문 보조.
6. 결제·개인정보 다루는 부분은 Supabase RLS 정책 필수.
