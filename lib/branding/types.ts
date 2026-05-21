export interface BrandConfig {
  /** 회사명 (한국어) — 푸터·면책 등 본문 */
  companyName: string;
  /** 브랜드 태그라인 (한국어) — 헤더·페이지 상단 브랜드 라인 */
  brandTagline: string;
  /** 회사명 (영문) — 표지 상단 띠 */
  companyNameEn: string;
  /** 영문 태그라인 — 표지 상단 띠 두 번째 줄 */
  brandTaglineEn: string;
  /** 보고서 부제 (영문) — 표지 상단 띠 아래 */
  reportSubtitle: string;
  /** 작성자 (직책 포함) — 표지 푸터 */
  authorName: string;
  /** 법률 자문 — 표지 푸터 */
  legalAdvisor: string;
  /** 법인명 — 표지 푸터 두 번째 줄 + 면책 조항 */
  corporationName: string;
  /** 대표 정보 — 표지 푸터 */
  ceoTitle: string;
  /** 브랜드 메인 색상 (Hex) — 표지 상단 띠, 헤더 등 */
  primaryColor: string;
}
