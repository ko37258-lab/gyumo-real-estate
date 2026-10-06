"use client";

// 한장 요약 보고서 (A4 가로 1장) — "간단히 보고할 때" 쓰는 브리핑 시트. (2026-09-21)
//
// 값은 전부 buildOnePagerFields(ReportInputs) 에서 온다 = 화면·기존 PDF와 같은 계산원.
// 하단 띠에 작성자 인적사항(ReporterProfile)을 넣고, 확인 전 전제를 같은 장에 남긴다.

import {
  Document,
  Image as PdfImage,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { ensurePdfFonts } from "@/lib/pdf/fonts";
import { COLORS } from "@/lib/pdf/tokens";
import type { ReportInputs } from "@/lib/ai/types";
import type { BrandConfig } from "@/lib/branding/types";
import { DEFAULT_BRAND } from "@/lib/branding/defaults";
import {
  buildOnePagerFields,
  type OnePagerFields,
  type OnePagerRow,
} from "@/lib/report/onePager";
import { EMPTY_REPORTER, hasReporterInfo, type ReporterProfile } from "@/lib/report/reporter";
import { buildReportTitle } from "@/lib/report/dataStatus";

ensurePdfFonts();

const VERDICT_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  hold: { bg: "#F1EFEA", fg: "#6B6357", label: "판정 보류" },
  loss: { bg: "#FBE9E4", fg: "#98311B", label: "손실" },
  risk: { bg: "#FBF1E0", fg: "#8A5A12", label: "여유 부족" },
  ok: { bg: "#EAF1EC", fg: "#2F5D3F", label: "이익 발생" },
};

const s = StyleSheet.create({
  page: {
    fontFamily: "Pretendard",
    color: COLORS.DARK,
    backgroundColor: COLORS.WHITE,
    paddingTop: 18,
    // 하단 인적사항 띠(absolute)가 차지하는 높이만큼 비워 둔다 — 본문이 띠 밑으로 깔리면 안 됨
    paddingBottom: 78,
    paddingHorizontal: 22,
  },

  /* 머리말 */
  head: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  title: { fontSize: 17, fontWeight: 700, letterSpacing: -0.3 },
  subtitle: { fontSize: 8.5, color: COLORS.GRAY, marginTop: 3 },
  unverifiedBadge: {
    alignSelf: "flex-start",
    marginBottom: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 3,
    backgroundColor: "#F59E0B",
  },
  unverifiedBadgeText: { fontSize: 7.5, fontWeight: 700, color: COLORS.WHITE },
  addressNote: { fontSize: 7.5, color: "#8A5A12", marginTop: 2 },
  brandBox: { alignItems: "flex-end" },
  brandName: { fontSize: 10, fontWeight: 700, color: COLORS.CORAL_DARK },
  brandSub: { fontSize: 7.5, color: COLORS.GRAY, marginTop: 2 },
  rule: { height: 2.2, backgroundColor: COLORS.CORAL_DARK, marginTop: 7 },
  ruleThin: { height: 0.6, backgroundColor: COLORS.LIGHT_GRAY, marginTop: 1.5 },

  /* KPI */
  kpiRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  kpi: {
    flex: 1,
    backgroundColor: COLORS.CREAM,
    borderLeftWidth: 2.5,
    borderLeftColor: COLORS.CORAL_DARK,
    paddingVertical: 6.5,
    paddingHorizontal: 8,
  },
  kpiLabel: { fontSize: 7.5, color: COLORS.GRAY, letterSpacing: 0.3 },
  kpiValue: { fontSize: 13.5, fontWeight: 700, marginTop: 2 },
  kpiSub: { fontSize: 6.8, color: COLORS.GRAY, marginTop: 2, lineHeight: 1.3 },

  /* 본문 3열 */
  cols: { flexDirection: "row", gap: 8, marginTop: 8, flexGrow: 1 },
  col: { flexDirection: "column" },
  cardWrap: { flexDirection: "column" },
  card: {
    borderWidth: 0.8,
    borderColor: COLORS.LIGHT_GRAY,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 5,
    marginBottom: 6,
    flexDirection: "column",
  },
  cardHead: {
    fontSize: 8.5,
    fontWeight: 700,
    color: COLORS.WHITE,
    backgroundColor: COLORS.CORAL_DARK,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexGrow: 1,
    paddingVertical: 2.6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#EFEDE9",
    gap: 6,
  },
  // 층별 개요처럼 행 수가 많을 수 있는 표에 쓰는 압축 행 — 위아래 여백만 줄인다(글자 크기는 그대로).
  rowCompact: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexGrow: 1,
    paddingVertical: 1,
    borderBottomWidth: 0.4,
    borderBottomColor: "#EFEDE9",
    gap: 6,
  },
  rowLabel: { fontSize: 8, color: COLORS.GRAY, width: 74 },
  rowLabelNarrow: { fontSize: 8, color: COLORS.GRAY, width: 44 },
  rowValueBox: { flex: 1, alignItems: "flex-end" },
  rowValue: { fontSize: 8.8, fontWeight: 700, textAlign: "right" },
  rowNote: { fontSize: 6.6, color: "#8C867C", textAlign: "right", marginTop: 1.2, lineHeight: 1.25 },

  /* 판정 */
  verdict: { marginTop: 2, paddingVertical: 4, paddingHorizontal: 7, borderRadius: 3 },
  verdictTitle: { fontSize: 8.6, fontWeight: 700 },
  verdictReason: { fontSize: 6.9, marginTop: 2, lineHeight: 1.35 },

  /* 이미지 — 칸을 남는 높이만큼 늘리지 않는다(이미지 위아래 빈 공간이 커지는 원인이었음).
     칸 높이는 이미지 자체 높이(+캡션)만큼만 차지하고, 같은 열 아래의 사업비·사업성 카드가
     나머지 공간을 가져간다. */
  imgBox: {
    borderWidth: 0.8,
    borderColor: COLORS.LIGHT_GRAY,
    borderRadius: 3,
    padding: 4,
    marginBottom: 5,
    flexDirection: "column",
    justifyContent: "center",
  },
  img: { width: "100%", objectFit: "contain" },
  imgCap: { fontSize: 6.8, color: COLORS.GRAY, marginTop: 3, textAlign: "center" },

  /* 전제 */
  cautionBox: {
    marginTop: 1,
    flexDirection: "column",
    justifyContent: "center",
    backgroundColor: "#FAF8F4",
    borderWidth: 0.6,
    borderColor: "#EDE9E1",
    borderRadius: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cautionHead: { fontSize: 7.5, fontWeight: 700, color: "#8A5A12", marginBottom: 2 },
  cautionItem: { fontSize: 6.9, color: COLORS.GRAY, lineHeight: 1.4 },

  /* 꼬리말 — 작성자 인적사항 */
  footer: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 14,
  },
  footerRule: { height: 1.6, backgroundColor: COLORS.CORAL_DARK },
  footerBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 5,
  },
  office: { fontSize: 9, fontWeight: 700 },
  officeSub: { fontSize: 7, color: COLORS.GRAY, marginTop: 2, lineHeight: 1.35 },
  personRow: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  personTitles: { fontSize: 7.5, color: COLORS.GRAY, paddingBottom: 1.5 },
  personName: { fontSize: 13, fontWeight: 700, letterSpacing: 1 },
  personContact: { fontSize: 9, fontWeight: 700, color: COLORS.CORAL_DARK, paddingBottom: 1 },
  personSub: { fontSize: 7, color: COLORS.GRAY, marginTop: 2, textAlign: "right" },
  disclaimer: { fontSize: 6.2, color: "#9A948B", marginTop: 4, lineHeight: 1.35 },
});

function Rows({
  rows,
  max,
  compact,
  narrowLabel,
}: {
  rows: OnePagerRow[];
  max: number;
  /** 행이 많을 수 있는 표(예: 층별 개요)용 — 위아래 여백만 줄인다 */
  compact?: boolean;
  /** 라벨이 짧은 표(예: "1F~13F")용 — 라벨 칸 폭을 줄여 값·비고에 더 넓은 공간을 준다 */
  narrowLabel?: boolean;
}) {
  const rowStyle = compact ? s.rowCompact : s.row;
  const labelStyle = narrowLabel ? s.rowLabelNarrow : s.rowLabel;
  return (
    <>
      {rows.slice(0, max).map((r, i) => (
        <View
          key={`${r.label}-${i}`}
          style={[rowStyle, i === Math.min(rows.length, max) - 1 ? { borderBottomWidth: 0 } : {}]}
          wrap={false}
        >
          <Text style={labelStyle}>{r.label}</Text>
          <View style={s.rowValueBox}>
            <Text style={s.rowValue}>{r.value}</Text>
            {r.note ? <Text style={s.rowNote}>{r.note}</Text> : null}
          </View>
        </View>
      ))}
    </>
  );
}

/** grow: 남는 세로 공간을 이 카드가 얼마나 가져갈지(0이면 내용 높이 그대로) */
function Card({
  title,
  grow = 0,
  children,
}: {
  title: string;
  grow?: number;
  children: React.ReactNode;
}) {
  return (
    <View style={[s.cardWrap, grow ? { flexGrow: grow } : {}]} wrap={false}>
      <Text style={s.cardHead}>{title}</Text>
      <View
        style={[
          s.card,
          { borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
          grow ? { flexGrow: 1 } : {},
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export interface OnePagerProps {
  input: ReportInputs;
  brand?: BrandConfig;
  reporter?: ReporterProfile;
  /** 상단 제목 대신 쓸 사용자 문구 (선택) */
  headline?: string;
  /** 한 줄 코멘트 (선택) */
  comment?: string;
}

export function OnePagerDocument({
  input,
  brand = DEFAULT_BRAND,
  reporter = EMPTY_REPORTER,
  headline,
  comment,
}: OnePagerProps) {
  const f: OnePagerFields = buildOnePagerFields(input);
  const images: Array<{ src: string; cap: string }> = [];
  if (input.locationMap) images.push({ src: input.locationMap, cap: "위치도 (위성)" });
  if (input.visualization3D)
    images.push({ src: input.visualization3D, cap: "배치 매스 (입력 조건 기준 추정 형상)" });
  const v = f.verdict ? VERDICT_STYLE[f.verdict.kind] : null;
  const cautionShown = f.cautions.slice(0, 4);
  const cautionRest = f.cautions.length - cautionShown.length;
  const hasReporter = hasReporterInfo(reporter);
  // 제목 — 조회 전(예시값·미조회 입력)이면 주소를 제목으로 쓰지 않고, 사용자가 상단 제목을
  // 직접 입력했어도 "예시 조건 검토" 배지는 그대로 남긴다(단일 판정원: lib/report/dataStatus).
  const titleInfo = buildReportTitle({
    status: input.addressStatus ?? f.addressStatus,
    address: input.address ?? "",
    userHeadline: headline,
  });

  return (
    <Document
      title={`${titleInfo.title} 규모검토 요약`}
      author={reporter.name || brand.authorName}
      creator="MR.K 건축가능 규모검토"
    >
      <Page size="A4" orientation="landscape" style={s.page}>
        {/* 머리말 */}
        <View style={s.head}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            {!titleInfo.isVerified && titleInfo.badgeLabel ? (
              <View style={s.unverifiedBadge}>
                <Text style={s.unverifiedBadgeText}>⚠ {titleInfo.badgeLabel}</Text>
              </View>
            ) : null}
            <Text style={s.title}>{titleInfo.title}</Text>
            {titleInfo.addressNote ? (
              <Text style={s.addressNote}>{titleInfo.addressNote}</Text>
            ) : null}
            <Text style={s.subtitle}>{f.subtitle}</Text>
          </View>
          <View style={s.brandBox}>
            <Text style={s.brandName}>
              {brand.companyName} · {brand.brandTagline}
            </Text>
            <Text style={s.brandSub}>건축가능 규모검토 요약 · 검토일 {f.reviewDate}</Text>
          </View>
        </View>
        <View style={s.rule} />
        <View style={s.ruleThin} />

        {/* 핵심 4칸 */}
        <View style={s.kpiRow}>
          {f.kpis.map((k) => (
            <View key={k.label} style={s.kpi}>
              <Text style={s.kpiLabel}>{k.label}</Text>
              <Text style={s.kpiValue}>{k.value}</Text>
              {k.sub ? <Text style={s.kpiSub}>{k.sub}</Text> : null}
            </View>
          ))}
        </View>

        {/* 3열 — 각 열에 "고정 내용 카드"는 grow 없이(자기 내용만큼만), 그 아래 "남는 공간을
            받는 요소" 하나만 grow=1을 준다. 두 요소가 같은 열에서 grow를 나눠 가지면(예: 토지
            개요 grow=3 + 확인 전 전제 grow=1) 내용이 적은 카드가 여백을 거의 다 먹어버려서
            빈 공간이 커지고, 다른 열이 길어지면 그 카드까지 같이 2쪽으로 밀려난다 — 이번에
            고친 버그. */}
        <View style={s.cols}>
          <View style={[s.col, { flex: 1 }]}>
            <Card title="토지 개요">
              <Rows rows={f.landRows} max={8} />
            </Card>
            {comment?.trim() ? (
              <Card title="검토 의견">
                <Text style={{ fontSize: 7.8, lineHeight: 1.5, color: COLORS.DARK }}>
                  {comment.trim()}
                </Text>
              </Card>
            ) : null}
            {/* 확인 전 전제 — 좌측 열 안에 둔다(전폭 블록으로 두면 1장을 넘김). 이 열에서
                유일하게 남는 세로 공간을 받는 요소. */}
            {cautionShown.length > 0 ? (
              <View style={[s.cautionBox, { flexGrow: 1 }]} wrap={false}>
                <Text style={s.cautionHead}>확인 전 전제 — 바뀌면 규모·사업성이 달라집니다</Text>
                {cautionShown.map((c, i) => (
                  <Text key={i} style={s.cautionItem}>
                    · {c}
                  </Text>
                ))}
                {cautionRest > 0 ? (
                  <Text style={s.cautionItem}>· 외 {cautionRest}건 — 상세 보고서 참조</Text>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={[s.col, { flex: 1.08 }]}>
            <Card title="건축 가능 규모 (입력 조건 기준 추정)">
              <Rows rows={f.scaleRows} max={8} />
            </Card>
            {/* 층별 개요 — 이 열에서 남는 공간을 받는 요소. 행이 많아질 수 있어 압축 행(rowCompact)
                + 짧은 라벨 칸(narrowLabel)을 쓴다. */}
            {f.floorRows.length > 0 ? (
              <Card title="층별 개요 (요약)" grow={1}>
                <Rows rows={f.floorRows} max={6} compact narrowLabel />
                {f.floorRowsOmitted > 0 ? (
                  <Text style={{ fontSize: 6.4, color: COLORS.GRAY, marginTop: 1 }}>
                    외 {f.floorRowsOmitted}개 구간 — 상세 보고서 참조
                  </Text>
                ) : null}
              </Card>
            ) : null}
          </View>

          {images.length > 0 || f.costRows.length > 0 ? (
            <View style={[s.col, { flex: 1.02 }]}>
              {images.map((im) => (
                <View key={im.cap} style={s.imgBox} wrap={false}>
                  <PdfImage
                    src={im.src}
                    style={[s.img, { height: images.length > 1 ? 86 : 116 }]}
                  />
                  <Text style={s.imgCap}>{im.cap}</Text>
                </View>
              ))}
              {/* 사업비·사업성 — 위에 이미지가 있으면 그 아래에, 없으면 이 열 전체를 쓴다.
                  이 열에서 남는 공간을 받는 요소라, 예전처럼 이미지 칸 위아래가 비지 않는다. */}
              {f.costRows.length > 0 ? (
                <Card title="사업비 · 사업성" grow={1}>
                  <Rows rows={f.costRows} max={4} />
                  {v && f.verdict ? (
                    <View style={[s.verdict, { backgroundColor: v.bg }]}>
                      {/* 배지(판정 종류)와 제목을 한 번씩만 — "판정 보류 — 사업성 판정 보류…" 처럼
                          같은 말이 중복 출력되던 문제를 막기 위해 제목 문구에 배지 라벨을 섞지 않는다. */}
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <Text
                          style={{
                            fontSize: 6.8,
                            fontWeight: 700,
                            color: COLORS.WHITE,
                            backgroundColor: v.fg,
                            paddingHorizontal: 5,
                            paddingVertical: 1.5,
                            borderRadius: 2,
                          }}
                        >
                          {v.label}
                        </Text>
                        <Text style={[s.verdictTitle, { color: v.fg }]}>{f.verdict.title}</Text>
                      </View>
                      {f.verdict.reason ? (
                        <Text style={[s.verdictReason, { color: v.fg }]}>{f.verdict.reason}</Text>
                      ) : null}
                    </View>
                  ) : null}
                </Card>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* 꼬리말 — 작성자 인적사항 */}
        <View style={s.footer} fixed>
          <View style={s.footerRule} />
          <View style={s.footerBody}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={s.office}>
                {reporter.officeName || brand.corporationName}
                {reporter.officeBranch ? `  ${reporter.officeBranch}` : ""}
              </Text>
              <Text style={s.officeSub}>
                {[reporter.officeAddress, reporter.regNo ? `등록번호 ${reporter.regNo}` : ""]
                  .filter(Boolean)
                  .join("  ·  ") || "설정에서 사무소 정보를 입력하면 이 줄에 표시됩니다."}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <View style={s.personRow}>
                {reporter.titles ? <Text style={s.personTitles}>{reporter.titles}</Text> : null}
                <Text style={s.personName}>{reporter.name || brand.authorName}</Text>
                {reporter.phone ? <Text style={s.personContact}>{reporter.phone}</Text> : null}
              </View>
              {reporter.email ? <Text style={s.personSub}>{reporter.email}</Text> : null}
              {!hasReporter ? (
                <Text style={s.personSub}>작성자 정보 미입력 — 한장 보고서 창에서 입력</Text>
              ) : null}
            </View>
          </View>
          <Text style={s.disclaimer}>
            본 요약은 입력 조건에 따른 추정치이며 인허가 가능 규모를 보장하지 않습니다. 지구단위계획·건축선·조례
            등 개별 규제와 현황 측량 결과에 따라 달라질 수 있어, 실제 사업 판단 전 건축사 검토가 필요합니다.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
