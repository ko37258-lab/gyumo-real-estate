# 플렉시티(Flexity) 벤치마크 분석 — gyumo 고도화 로드맵

> 2026-07-17 실측 분석. 대상: https://flexity.app/urban/home?lot=1114014200100010020 (서울 중구 예장동 1-20)
> 목표: "지번 → 3D 가설계 + 사업성"까지 플렉시티 수준의 데이터 파이프라인을 gyumo에 구축.

---

## 1. 플렉시티 기술 스택 (실측)

| 레이어 | 구성 | 비고 |
|---|---|---|
| Frontend | React + Vite, MUI, `react-map-gl`(Mapbox GL), **Three.js + three-stdlib** | 우리는 Next.js + R3F — 동급 |
| 지도 | **네이버 지도 JS** (oapi.map.naver.com) + 지적편집도 타일(nrbe.pstatic.net) | 우리는 VWorld WMTS로 대체 가능 |
| 백엔드 | `app.flexity.app` (Django 추정 — trailing slash) | 우리는 Next.js API Routes |
| 3D 데이터 | VWorld 고정밀 3D(지형+주변건물) 공식 활용 (공개 소개서 기준) | LoD1 전국 / LoD3~4 도심 |
| 분석 | Sentry, GA4, Mixpanel, 채널톡 | |

## 2. 핵심 API 구조 (실측 — `/api/lot/{PNU}/`)

단일 lot API가 모든 데이터를 한 번에 반환:

```
geo_json / edited_geo_json / geo_json_union   ← 필지 폴리곤(연속지적도, GeoJSON) + bbox
daejang        ← 건축물대장: 주용도·연식·구조·지상/지하층수·연면적·동별·층별
details        ← 토지특성: 지목·공시지가(총액+단가)·이용상황·지세(평지)·형상(사다리형)·도로접면(세로한면(불))
details.use_plan ← 토지이용계획: 지역/지구/구역/기타 그룹핑 + 지구단위계획명·링크 + warnings
use_district.rules ← max_bcr / max_far (조례) + max_far_legal / max_bcr_legal (법정) + max_floor_level + 근거코드
use_district.available_types ← 건축 가능 용도 목록 (R0~R73 주거 / C0~C5 상업 / O0~O3 업무 / H5 숙박)
mix_use_area_set ← 둘 이상 용도지역 걸침: 각 용도지역별 면적 → 가중평균 자동 적용
max_parking_number / lot_estimated_price / owner_count
eum_link(토지이음) / plan_link(도시계획조례 law.go.kr)
```

### 실거래 API (실측)
- `/api/lot/{pnu}/price/` — **토지 추정가 방법론이 그대로 노출**:
  `추정가 = 개별공시지가 총액 × 주변 실거래 배율(ratio_price_to_jiga)`
  + `trade_history[]` (인근 필지 pnu·공시지가·실거래가·계약연월·배수)
- `/api/lot/{pnu}/building/price/` — 신축 시세 테이블: 용도별(단독/다가구/다세대/아파트/도생/오피스텔, 상가 1~3층+, 오피스) ㎡당 매매/임대 단가 → 사업성 분양가 자동 입력용

### UI 구성
- 좌 패널: 주소 + 용도지역 배지들 + [토지/건축물 정보 | 실거래 정보] 탭 + [기획설계 하기] CTA
- 우: 지도(지적편집도) + 레이어 토글(일반/위성/지적) + 필지 하이라이트
- 실거래 탭: 추정가 32.6억(공시지가 대비 2.4배) / 공시지가 13.7억(445만/㎡) / 기존건물 추정가 / 유사 거래 테이블
- 기획설계(로그인 필요): 2~3분 내 공동주택 배치안 + 사업성 리포트, 22개 용도, 37개 시군

## 3. 데이터 출처 매핑 (그들이 쓰는 것 → 우리가 쓸 것)

| 데이터 | 플렉시티 출처(추정) | gyumo 대응 | 상태 |
|---|---|---|---|
| 필지 폴리곤 | 연속지적도 | **VWorld `LP_PA_CBND_BUBUN` geometry=true** (기존 코드 있음) | ✅ 키 있음 — 즉시 |
| 토지특성(지목·공시지가·형상·도로접면·지세) | VWorld NED | VWorld NED `getLandCharacteristics` — **형상(tpgrphFrmCodeNm)·도로접면(roadSideCodeNm)·지세(tpgrphHgCodeNm) 필드 추가 활용** | ✅ 이미 호출 중, 필드만 추가 |
| 토지이용계획 전체(지역·지구·구역) | 토지이음(LURIS) | data.go.kr 국토부 토지이용규제(승인 필요) 또는 VWorld NED 토지이용계획 | 🔑 신청 필요 |
| 건축물대장(기존 건물) | 건축HUB | 이미 `/api/building` 구현됨 — **UI 노출만 안 됨** | ✅ 즉시 |
| 건축 인허가 | 건축HUB 인허가 | data.go.kr **15136267** 건축HUB_건축인허가정보 | 🔑 신청 필요 |
| 토지 실거래가 | 국토부 실거래 | data.go.kr **15126466** 토지 매매 실거래가 | 🔑 신청 필요 |
| 주택/상업 실거래(신축 시세) | 국토부 실거래 | 15126469(아파트)·15126463(상업업무용)·연립다세대 등 | 🔑 신청 필요 |
| 지도 타일 | 네이버 | VWorld WMTS (`api.vworld.kr/req/wmts/.../{layer}/{z}/{y}/{x}.png`) | ✅ 키 있음 |
| 3D 지형/주변건물 | VWorld 3D | VWorld 3D 데이터 API (DEM + LoD1 건물) | ✅ 키 있음 (후순위) |

## 4. gyumo 대비 갭 분석

| # | 플렉시티 기능 | gyumo 현재 | 갭 크기 | 난이도 |
|---|---|---|---|---|
| 1 | **필지 실형상 폴리곤 위 3D 매스** | 정사각형 가정 | ★★★ 최대 | 중 |
| 2 | 지도 클릭으로 필지 선택 | 주소 텍스트 입력 | ★★★ | 중상 |
| 3 | 토지이용계획 전체 표시(지구단위계획 경고 포함) | 용도지역 1개만 | ★★ | 하(API 승인 후) |
| 4 | 기존 건물(대장) 정보 카드 | API 있는데 UI 없음 | ★ | 하 |
| 5 | 인허가 이력 | 없음 | ★★ | 하(API 승인 후) |
| 6 | 실거래 + AI 추정가(공시지가×배율) | 없음 | ★★ | 중 |
| 7 | 신축 시세 테이블 → 분양가 자동 입력 | 사업성 탭 수동 입력 | ★★ | 중 |
| 8 | 둘 이상 용도지역 가중평균 | 단일 용도지역 | ★ | 중(폴리곤 교차) |
| 9 | 조례 vs 법정 상한 구분 + 근거 | 법정 상한만(서울 일부) | ★★ | 중(데이터 구축) |
| 10 | 공동주택 유닛 배치 가설계 | 매스만 | ★★★ | 상 |

**gyumo가 이미 앞서는 것**: 일조권 사선 시각화(2D 단면+3D), 주차 산정 15용도+조례, 비용·부담금(농지/산지/개발), IRR 사업성, PDF 리포트, 학습 패널(공법의 신 차별화).

## 5. 고도화 로드맵

- **Phase A — 필지 실형상 (즉시, 키 보유)** ✅ 2026-07-17 착수
  - VWorld 연속지적도 폴리곤 → store → 2D 평면도 실형상 + 3D ExtrudeGeometry 매스
  - 일조권: 폴리곤 북측 경계에서 후퇴(half-plane clip 근사)
  - 정북 자동 판별 기반 마련(폴리곤 좌표계 = 북=+y)
- **Phase B — 데이터 확장 (API 승인 후)**
  - 인허가 카드(`15136267`), 실거래+추정가(`15126466`), 신축 시세(주택·상업 실거래 집계)
  - NED 형상·도로접면·지세 필드 UI 노출
  - 기존 건물 대장 카드(이미 있는 /api/building 활용)
- **Phase C — 지도 UX**: VWorld WMTS 배경 + 지적 오버레이 + 필지 클릭 선택
- **Phase D — 가설계 v1**: 실형상 + 도로변 자동 인식 + 코어/주차 개략 배치 + 층별 평면
- **Phase E — 사업성 자동화**: 추정가·분양가 자동 제안 → IRR 원클릭

## 6. 운영자(대표님) 액션 아이템 — data.go.kr 활용신청 (모두 무료, DATAGO_KEY 재사용)

1. **국토교통부_건축HUB_건축인허가정보 서비스** — https://www.data.go.kr/data/15136267/openapi.do
2. **국토교통부_토지 매매 실거래가 자료** — https://www.data.go.kr/data/15126466/openapi.do
3. **국토교통부_연립다세대 매매 실거래가 자료** (신축 시세용) — data.go.kr에서 "연립다세대 매매 실거래" 검색
4. **국토교통부_상업업무용 부동산 매매 실거래가** — https://www.data.go.kr/data/15126463/openapi.do
5. (선택) **국토교통부_토지이용규제정보** — 토지이용계획 전체 표시용. 과거 이 키에서 미승인('Unexpected errors') → 활용신청 다시 확인

신청 즉시(1~2시간 내) 기존 `DATAGO_KEY`로 호출 가능해지는 구조. 승인되면 Claude에게 "N번 승인됐다"고 알려주면 바로 연동 구현.

## 7. 참고 소스

- 플렉시티 서비스 소개서(PDF): http://img.esfair.kr/fms/Uploadfiles/online/619/245606/Product/20231024125549_onlinefile_cpy_1.pdf
- 서울건축사신문 — AI 기획설계 플랫폼: https://www.siranews.co.kr/news/articleView.html?idxno=2218
- VWorld WMTS/3D: https://github.com/V-world/V-world_API_sample , https://www.vw-lab.com/53 (건물), https://www.vw-lab.com/52 (DEM)
- 건축HUB OPEN API: https://www.hub.go.kr/portal/psg/idx-intro-openApi.do
