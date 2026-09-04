"use client";

// 위반건축물 이행강제금 산정 보고서 (PDF, A4 1~2쪽)
// 계산은 lib/calc/enforcementFine.ts 결과를 그대로 싣는다 — 여기서 다시 계산하지 않는다.

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { ensurePdfFonts } from "@/lib/pdf/fonts";
import { COLORS } from "@/lib/pdf/tokens";
import type { BrandConfig } from "@/lib/branding/types";
import type { FineResult } from "@/lib/calc/enforcementFine";

ensurePdfFonts();

export interface FineReportInput {
  address?: string;
  reviewDate: string;
  /** 입력 조건 — 표에 그대로 싣는 [항목, 값] 쌍 */
  conditions: Array<[string, string]>;
  result: FineResult;
}

const F = "Pretendard";
const s = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 30, paddingLeft: 28, paddingRight: 28, fontFamily: F, color: COLORS.DARK },
  band: { marginLeft: -28, marginRight: -28, marginTop: -30, paddingHorizontal: 28, paddingTop: 16, paddingBottom: 12, marginBottom: 16 },
  bandTitle: { color: "white", fontSize: 10, letterSpacing: 1.5, fontFamily: F },
  bandSub: { color: COLORS.CORAL_LIGHT, fontSize: 8, marginTop: 3, fontFamily: F },
  h1: { fontSize: 18, fontWeight: 700, marginBottom: 4, fontFamily: F },
  meta: { fontSize: 9, color: COLORS.GRAY, marginBottom: 12, fontFamily: F },
  h3: { fontSize: 11, fontWeight: 700, marginTop: 12, marginBottom: 5, fontFamily: F },
  table: { borderWidth: 1, borderColor: COLORS.LIGHT_GRAY, borderStyle: "solid" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: COLORS.LIGHT_GRAY, borderBottomStyle: "solid" },
  cellK: { width: "34%", padding: 6, backgroundColor: COLORS.CREAM, fontSize: 9, color: COLORS.GRAY, fontFamily: F },
  cellV: { width: "66%", padding: 6, fontSize: 9, fontFamily: F },
  th: { padding: 5, fontSize: 8.5, fontWeight: 700, backgroundColor: COLORS.CREAM, fontFamily: F },
  td: { padding: 5, fontSize: 8.5, fontFamily: F },
  kpi: { flex: 1, borderWidth: 1, borderColor: COLORS.LIGHT_GRAY, borderStyle: "solid", borderRadius: 4, padding: 10 },
  kpiLabel: { fontSize: 8.5, color: COLORS.GRAY, fontFamily: F },
  kpiValue: { fontSize: 16, fontWeight: 700, marginTop: 3, fontFamily: F },
  muted: { fontSize: 8, color: COLORS.GRAY, lineHeight: 1.5, fontFamily: F },
  body: { fontSize: 9, lineHeight: 1.55, fontFamily: F },
  footer: { position: "absolute", bottom: 12, left: 28, right: 28, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: COLORS.LIGHT_GRAY, paddingTop: 5 },
});

const won = (v: number) => `${Math.round(v).toLocaleString("ko-KR")}원`;
const eok = (v: number) =>
  Math.abs(v) >= 1e8
    ? `${(v / 1e8).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억원`
    : Math.abs(v) >= 1e4
      ? `${Math.round(v / 1e4).toLocaleString("ko-KR")}만원`
      : won(v);

export function EnforcementFineDocument({ input, brand }: { input: FineReportInput; brand: BrandConfig }) {
  const r = input.result;
  return (
    <Document title={`이행강제금 산정 보고서 ${input.reviewDate}`} author={`${brand.brandTagline} 시뮬레이터`}>
      <Page size="A4" style={s.page} wrap>
        <View style={[s.band, { backgroundColor: brand.primaryColor }]} fixed>
          <Text style={s.bandTitle}>{brand.companyNameEn} · {brand.brandTaglineEn}</Text>
          <Text style={s.bandSub}>ENFORCEMENT FINE ESTIMATE · 건축법 제80조</Text>
        </View>

        <Text style={s.h1}>위반건축물 이행강제금 산정 보고서</Text>
        <Text style={s.meta}>
          {input.address ? `대상: ${input.address} · ` : ""}검토일 {input.reviewDate} · 위반 유형: {r.type.label}
        </Text>

        <View style={{ flexDirection: "row", gap: 8 }} wrap={false}>
          <View style={[s.kpi, { backgroundColor: brand.primaryColor, borderColor: brand.primaryColor }]}>
            <Text style={[s.kpiLabel, { color: COLORS.CORAL_LIGHT }]}>1회 부과액</Text>
            <Text style={[s.kpiValue, { color: "white" }]}>{eok(r.perImposition)}</Text>
            <Text style={[s.kpiLabel, { color: COLORS.CORAL_LIGHT }]}>{won(r.perImposition)}</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>연간 부과액 ({r.timesPerYear}회/년)</Text>
            <Text style={s.kpiValue}>{eok(r.perYear)}</Text>
            <Text style={s.kpiLabel}>{won(r.perYear)}</Text>
          </View>
          <View style={s.kpi}>
            <Text style={s.kpiLabel}>{r.years}년 누적 (시정 없이 지속 시)</Text>
            <Text style={[s.kpiValue, { color: "#B91C1C" }]}>{eok(r.total)}</Text>
            <Text style={s.kpiLabel}>{won(r.total)}</Text>
          </View>
        </View>

        <View wrap={false}>
          <Text style={s.h3}>1. 입력 조건</Text>
          <View style={s.table}>
            {input.conditions.map(([k, v], i) => (
              <View key={i} style={[s.row, i === input.conditions.length - 1 ? { borderBottomWidth: 0 } : {}]}>
                <Text style={s.cellK}>{k}</Text>
                <Text style={s.cellV}>{v}</Text>
              </View>
            ))}
          </View>
        </View>

        <View wrap={false}>
          <Text style={s.h3}>2. 산정 과정</Text>
          <View style={s.table}>
            <View style={s.row}>
              <Text style={[s.th, { width: "6%" }]}>#</Text>
              <Text style={[s.th, { width: "26%" }]}>단계</Text>
              <Text style={[s.th, { width: "34%" }]}>산식</Text>
              <Text style={[s.th, { width: "16%", textAlign: "right" }]}>금액</Text>
              <Text style={[s.th, { width: "18%" }]}>근거</Text>
            </View>
            {r.steps.map((st, i) => (
              <View key={i} style={[s.row, i === r.steps.length - 1 ? { borderBottomWidth: 0 } : {}]}>
                <Text style={[s.td, { width: "6%" }]}>{i + 1}</Text>
                <Text style={[s.td, { width: "26%", fontWeight: 700 }]}>{st.label}</Text>
                <Text style={[s.td, { width: "34%" }]}>{st.formula}</Text>
                <Text style={[s.td, { width: "16%", textAlign: "right" }]}>{won(st.amount)}</Text>
                <Text style={[s.td, { width: "18%", color: COLORS.GRAY }]}>{st.basis}</Text>
              </View>
            ))}
          </View>
          <Text style={[s.muted, { marginTop: 3 }]}>
            ※ 기본액 → 주거용 특례(½) → 가중 → 감경 순으로 적용. 연간 = 1회 × 연 부과 횟수, 누적 = 연간 × 연수.
          </Text>
        </View>

        {r.warnings.length > 0 && (
          <View wrap={false}>
            <Text style={s.h3}>3. 유의사항</Text>
            {r.warnings.map((w, i) => (
              <Text key={i} style={[s.body, { color: "#991B1B" }]}>· {w}</Text>
            ))}
          </View>
        )}

        <View wrap={false}>
          <Text style={s.h3}>{r.warnings.length > 0 ? "4" : "3"}. 근거 법령 · 절차</Text>
          <Text style={s.body}>
            · 건축법 제80조①1호 — 건폐율·용적률 초과, 무허가·무신고 건축: 1㎡ 시가표준액 × 50% × 위반면적 × 시행령 제115조의3① 비율(건폐율 80% · 용적률 90% · 무허가 100% · 무신고 70%, 조례로 낮춰도 60% 이상)
          </Text>
          <Text style={s.body}>· 건축법 제80조①2호 · 시행령 별표 15 — 그 밖의 위반: 시가표준액의 10%(미사용승인 2%, 기타 3% 이하 조례)</Text>
          <Text style={s.body}>· 제80조① 단서 — 연면적(세대 면적) 60㎡ 이하 주거용 등은 각 호 금액의 ½ 범위에서 조례로 정하는 금액</Text>
          <Text style={s.body}>· 제80조② · 시행령 제115조의3② — 영리 목적·상습 위반 가중(현행 100% 범위 조례 → 2027.2.12 시행 개정: 50% 이상 100% 이하 의무)</Text>
          <Text style={s.body}>· 제80조의2 · 시행령 제115조의4 — 소유권 변경·임차인·소면적 등 75%(단서 해당 시 50%), 농어업용 1/5, 1992.6.1 이전 주거용 80/60% 감경. 가중 대상은 감경 제외</Text>
          <Text style={s.body}>· 제80조⑤ — 최초 시정명령일 기준 1년 2회 이내 조례 횟수만큼 반복 부과(2027.2.12부터 의무 + 다음 연도 가중). ⑥ 시정 시 새 부과 즉시 중지, 기부과분 징수</Text>
          <Text style={s.body}>· 절차: 시정명령(79조①) → 이행기한 → 문서 계고(80조③) → 부과(④) → 미납 시 「지방행정제재·부과금의 징수 등에 관한 법률」로 징수(⑦)</Text>
        </View>

        <View wrap={false} style={{ marginTop: 12, padding: 9, backgroundColor: COLORS.CREAM, borderLeftWidth: 3, borderLeftColor: brand.primaryColor, borderLeftStyle: "solid" }}>
          <Text style={s.muted}>
            본 보고서는 {brand.companyName} 부동산공법 시뮬레이터가 건축법령(법제처 2026.9 확인)에 따라 산정한 참고 자료입니다. 실제 부과액은 관할 지방자치단체 조례(비율·횟수·감경)와 「지방세법」 시가표준액, 허가권자의 판단에 따라 달라지며, 법률·세무 자문이나 행정처분의 근거가 아닙니다. 작성: {brand.brandTagline} {brand.authorName} · 법률자문: {brand.legalAdvisor}
          </Text>
        </View>

        <View style={s.footer} fixed>
          <Text style={s.muted}>{brand.corporationName} · 이행강제금 산정 보고서 · {input.reviewDate}</Text>
          <Text style={s.muted} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
