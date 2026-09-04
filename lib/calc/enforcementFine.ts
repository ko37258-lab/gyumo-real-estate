// 위반건축물 이행강제금 계산 — 건축법 제80조·제80조의2, 시행령 제115조의2·115조의3·115조의4, 별표 15.
//
// 법령 확인(법제처 MCP, 2026-09-04):
//  · 법 제80조① (현행 2026.2.27 시행본)
//      1호 건폐율·용적률 초과 / 무허가·무신고 건축: 1㎡ 시가표준액 × 50% × 위반면적 × 영 115조의3① 비율
//         (건폐율 초과 80% · 용적률 초과 90% · 무허가 100% · 무신고 70%, 조례로 낮출 수 있으나 60% 이상)
//      2호 그 밖의 위반: 시가표준액의 10% 범위에서 별표 15 금액
//      단서 연면적 60㎡ 이하 주거용 + 영 115조의2①(미사용승인·조경·높이·일조·조례) 주거용: 각 호 금액의 ½ 범위 조례
//  · 법 제80조② 가중 — 영 115조의3②(영리 용도변경>50㎡·영리 무허가 신·증축>50㎡·영리 세대수 5이상 증가·3년내 2회 이상)
//      현행: 100% 범위에서 조례 가중 / 2027.2.12 시행(법률 21880호): 50% 이상 100% 이하 가중 의무
//  · 법 제80조⑤ 반복 부과 — 연 2회 이내 조례 횟수. 2027.2.12부터 부과 의무 + 다음 연도부터 대통령령 가중(영 미제정)
//  · 법 제80조의2 감경 — 1호 농어업용 500㎡(수도권 외 1,000㎡) 이하 1/5 감경
//      2호 영 115조의4①(소유권 변경·임차인·30㎡ 이하·집합건물 5㎡ 이하·사용승인 당시 존재·가축분뇨 부칙): 75% 감경
//         (80조① 단서 해당 시 50%) · 조례 사유는 조례 비율. ⚠ 80조② 가중 대상은 2호 감경 제외
//      ② 1992.6.1 이전 위반 주거용: 85㎡ 이하 80% · 초과 60% 감경 (영 115조의4③)
//
// 이 파일은 의존성 없는 순수 함수 — node 로 바로 스모크 테스트 가능.

export type ViolationGroup = "area" | "standard";

export interface ViolationType {
  code: string;
  label: string;
  group: ViolationGroup;
  /** area 군: 법 80조①1호 비율(영 115조의3①). standard 군: 별표15 시가표준액 대비 비율 */
  rate: number;
  /** 조례로 낮출 수 있는 하한 (area 군만, 영 115조의3① 단서 60%) */
  rateFloor?: number;
  basis: string;
  /** 법 80조① 단서(주거용 ½ 특례) 대상인지 — 60㎡ 이하 주거용은 전 유형, 그 외는 영 115조의2① 유형만 */
  halfEligibleByDecree?: boolean;
  note?: string;
}

export const VIOLATION_TYPES: ViolationType[] = [
  { code: "cov", label: "건폐율 초과 건축", group: "area", rate: 0.8, rateFloor: 0.6, basis: "법 80조①1호 · 영 115조의3①1호 (80%)" },
  { code: "far", label: "용적률 초과 건축", group: "area", rate: 0.9, rateFloor: 0.6, basis: "법 80조①1호 · 영 115조의3①2호 (90%)" },
  { code: "nopermit", label: "허가 없이 건축(무허가 신축·증축)", group: "area", rate: 1.0, rateFloor: 0.6, basis: "법 80조①1호 · 영 115조의3①3호 (100%)" },
  { code: "noreport", label: "신고 없이 건축(무신고)", group: "area", rate: 0.7, rateFloor: 0.6, basis: "법 80조①1호 · 영 115조의3①4호 (70%)" },
  { code: "remodel", label: "무허가·무신고 대수선", group: "standard", rate: 0.10, basis: "별표15 1호 (시가표준액 10%)" },
  { code: "usechange", label: "무허가·무신고 용도변경", group: "standard", rate: 0.10, basis: "별표15 1의2호 (용도변경 부분 시가표준액 10%)", note: "시가표준액은 용도변경한 부분 기준" },
  { code: "nouseapproval", label: "사용승인 없이 사용", group: "standard", rate: 0.02, basis: "별표15 2호 (2%)", halfEligibleByDecree: true },
  { code: "landscape", label: "대지 조경 위반", group: "standard", rate: 0.10, basis: "별표15 3호 (위반 면적 해당 바닥면적 시가표준액 10%)", halfEligibleByDecree: true, note: "시가표준액은 조경의무 위반면적에 해당하는 바닥면적 기준" },
  { code: "line", label: "건축선 위반", group: "standard", rate: 0.10, basis: "별표15 4호 (10%)" },
  { code: "structure", label: "구조내력 기준 위반", group: "standard", rate: 0.10, basis: "별표15 5호 (10%)" },
  { code: "evac", label: "피난시설·방화구획·거실 기준 위반", group: "standard", rate: 0.10, basis: "별표15 6호 (10%)" },
  { code: "fire", label: "내화구조·방화벽 위반", group: "standard", rate: 0.10, basis: "별표15 7호 (10%)" },
  { code: "firezone", label: "방화지구 안 건축물 기준 위반", group: "standard", rate: 0.10, basis: "별표15 8호 (10%)" },
  { code: "finish", label: "마감재료 기준 위반", group: "standard", rate: 0.10, basis: "별표15 9호 (10%)" },
  { code: "height", label: "높이 제한(법 60조) 위반", group: "standard", rate: 0.10, basis: "별표15 10호 (10%)", halfEligibleByDecree: true },
  { code: "sunlight", label: "일조 등 높이제한(법 61조) 위반", group: "standard", rate: 0.10, basis: "별표15 11호 (10%)", halfEligibleByDecree: true },
  { code: "facility", label: "건축설비 기준 위반", group: "standard", rate: 0.10, basis: "별표15 12호 (10%)" },
  { code: "etc", label: "그 밖의 위반 (조례)", group: "standard", rate: 0.03, basis: "별표15 13호 (3% 이하 조례, 미규정 시 3%)", halfEligibleByDecree: true },
];

export type AggravationReason =
  | "profitUseChange" // 영리 용도변경 >50㎡
  | "profitBuild" // 영리 무허가·무신고 신·증축 >50㎡
  | "profitUnits" // 영리 세대·가구수 5 이상 증가
  | "repeat3y"; // 3년 내 2회 이상 위반

export type ReductionReason =
  | "ownerChanged" // 위반행위 후 소유권 변경
  | "tenant" // 임차인 사정
  | "small30" // 위반면적 30㎡ 이하 (별표1 1~4호 건축물, 집합건물 제외)
  | "condo5" // 집합건물 구분소유자 5㎡ 이하
  | "atApproval" // 사용승인 당시 존재
  | "agri" // 농어업용 500㎡(수도권 외 1,000㎡) 이하 — 1/5 감경
  | "pre1992" // 1992.6.1 이전 위반 주거용
  ;

export interface FineInput {
  typeCode: string;
  /** area 군: 1㎡ 시가표준액(원/㎡). standard 군: 건축물(해당 부분) 시가표준액 총액(원) */
  standardValue: number;
  /** area 군 위반면적 ㎡ (standard 군은 미사용) */
  violationAreaSqm?: number;
  /** 조례로 낮춘 비율(area 군, 0.6~기본). 미지정 시 시행령 기본 */
  ordinanceRate?: number;
  /** 주거용 여부 + 연면적(공동주택은 세대 면적) — 60㎡ 이하 주거용 ½ 특례 */
  residential?: boolean;
  totalFloorAreaSqm?: number;
  /** ½ 특례 시 조례 비율(0.5 = 최대 감경). 기본 0.5 */
  halfRuleRatio?: number;
  aggravations?: AggravationReason[];
  /** 조례 가중률 (현행 0~1.0, 2027.2.12~ 0.5~1.0). 기본: 현행 1.0 / 개정 후 0.5 */
  aggravationRate?: number;
  reductions?: ReductionReason[];
  /** 수도권 여부 (농어업용 감경 면적 기준) */
  inCapitalRegion?: boolean;
  /** 농어업용 시설 면적 ㎡ */
  agriAreaSqm?: number;
  /** 연간 부과 횟수 (조례, 최대 2) */
  timesPerYear?: number;
  /** 누적 연수 */
  years?: number;
  /** 2027.2.12 개정 규정 적용 여부 (가중 의무 50~100%) */
  useAmended2027?: boolean;
}

export interface FineStep {
  label: string;
  formula: string;
  amount: number;
  basis: string;
}

export interface FineResult {
  type: ViolationType;
  baseAmount: number;
  perImposition: number;
  perYear: number;
  total: number;
  steps: FineStep[];
  warnings: string[];
  timesPerYear: number;
  years: number;
}

export const AGGRAVATION_LABEL: Record<AggravationReason, string> = {
  profitUseChange: "임대 등 영리 목적 무허가 용도변경 (위반면적 50㎡ 초과)",
  profitBuild: "임대 등 영리 목적 무허가·무신고 신축·증축 (50㎡ 초과)",
  profitUnits: "임대 등 영리 목적 세대·가구수 증가 (5세대·5가구 이상)",
  repeat3y: "동일인 최근 3년 내 2회 이상 위반",
};

export const REDUCTION_LABEL: Record<ReductionReason, string> = {
  ownerChanged: "위반행위 후 소유권이 변경됨 (75%)",
  tenant: "임차인이 있어 임대기간 중 시정이 현실적으로 어려움 (75%)",
  small30: "위반면적 30㎡ 이하 — 단독·공동주택·1·2종 근생 한정, 집합건물 제외 (75%)",
  condo5: "집합건물 구분소유자 위반면적 5㎡ 이하 (75%)",
  atApproval: "사용승인 당시 이미 존재하던 위반으로 승인 후 확인됨 (75%)",
  agri: "축사 등 농어업용 시설 500㎡(수도권 외 1,000㎡) 이하 (1/5 감경)",
  pre1992: "1992.6.1 이전 위반한 주거용 건축물 (85㎡ 이하 80% · 초과 60%)",
};

const won = (v: number) => Math.round(v);

export function getViolationType(code: string): ViolationType {
  const t = VIOLATION_TYPES.find((v) => v.code === code);
  if (!t) throw new Error(`unknown violation type: ${code}`);
  return t;
}

export function calcEnforcementFine(i: FineInput): FineResult {
  const type = getViolationType(i.typeCode);
  const steps: FineStep[] = [];
  const warnings: string[] = [];
  const timesPerYear = Math.min(2, Math.max(1, Math.round(i.timesPerYear ?? 1)));
  const years = Math.max(1, Math.round(i.years ?? 1));

  // ── 1) 기본액 ──
  let amount = 0;
  if (type.group === "area") {
    const area = Math.max(0, i.violationAreaSqm ?? 0);
    let rate = type.rate;
    if (i.ordinanceRate != null) {
      const floor = type.rateFloor ?? 0.6;
      rate = Math.min(type.rate, Math.max(floor, i.ordinanceRate));
      if (i.ordinanceRate < floor) warnings.push(`조례 비율은 ${Math.round(floor * 100)}% 미만으로 낮출 수 없어 ${Math.round(floor * 100)}%로 계산했습니다 (영 115조의3① 단서).`);
    }
    amount = i.standardValue * 0.5 * area * rate;
    steps.push({
      label: "기본액 (법 80조①1호)",
      formula: `1㎡ 시가표준액 ${fmt(i.standardValue)}원 × 50% × 위반면적 ${area}㎡ × ${Math.round(rate * 100)}%`,
      amount: won(amount),
      basis: type.basis,
    });
  } else {
    amount = i.standardValue * type.rate;
    steps.push({
      label: "기본액 (법 80조①2호 · 별표15)",
      formula: `시가표준액 ${fmt(i.standardValue)}원 × ${(type.rate * 100).toFixed(type.rate * 100 < 10 ? 0 : 0)}%`,
      amount: won(amount),
      basis: type.basis,
    });
  }
  const baseAmount = amount;

  // ── 2) 주거용 ½ 특례 (법 80조① 단서) ──
  const small = Boolean(i.residential) && (i.totalFloorAreaSqm ?? Infinity) <= 60;
  const halfByDecree = Boolean(i.residential) && Boolean(type.halfEligibleByDecree);
  const halfApplies = small || halfByDecree;
  if (halfApplies) {
    const r = Math.min(0.5, Math.max(0, i.halfRuleRatio ?? 0.5));
    amount = amount * r;
    steps.push({
      label: "주거용 특례 (법 80조① 단서)",
      formula: `× ${Math.round(r * 100)}% (각 호 금액의 ½ 범위에서 조례로 정하는 금액)`,
      amount: won(amount),
      basis: small ? "연면적(세대 면적) 60㎡ 이하 주거용" : "영 115조의2① 유형(미사용승인·조경·높이·일조·조례) 주거용",
    });
  }

  // ── 3) 가중 (법 80조② · 영 115조의3②) ──
  const aggs = i.aggravations ?? [];
  const aggravated = aggs.length > 0;
  if (aggravated) {
    const amended = Boolean(i.useAmended2027);
    let r = i.aggravationRate ?? (amended ? 0.5 : 1.0);
    if (amended) r = Math.min(1.0, Math.max(0.5, r));
    else r = Math.min(1.0, Math.max(0, r));
    amount = amount * (1 + r);
    steps.push({
      label: amended ? "가중 (법 80조② · 2027.2.12 시행 개정)" : "가중 (법 80조② · 현행)",
      formula: `× (1 + ${Math.round(r * 100)}%)`,
      amount: won(amount),
      basis: amended
        ? "50% 이상 100% 이하 범위에서 조례로 가중 의무 — " + aggs.map((a) => AGGRAVATION_LABEL[a]).join(" / ")
        : "100% 범위에서 조례로 가중 — " + aggs.map((a) => AGGRAVATION_LABEL[a]).join(" / "),
    });
    warnings.push("위반행위 후 소유권이 변경된 경우는 가중 대상에서 제외됩니다 (영 115조의3② 단서).");
  }

  // ── 4) 감경 (법 80조의2 · 영 115조의4) ──
  const reds = i.reductions ?? [];
  // 4-1) 농어업용 1/5
  if (reds.includes("agri")) {
    const limit = i.inCapitalRegion ? 500 : 1000;
    const a = i.agriAreaSqm ?? 0;
    if (a > 0 && a <= limit) {
      amount = amount * 0.8;
      steps.push({ label: "감경 — 농어업용 시설 (법 80조의2①1호)", formula: "× 80% (1/5 감경)", amount: won(amount), basis: `${limit}㎡ 이하 축사 등 농어업용` });
    } else {
      warnings.push(`농어업용 감경은 ${limit}㎡ 이하만 해당합니다 (입력 ${a}㎡).`);
    }
  }
  // 4-2) 영 115조의4① 사유 — 가중 대상은 제외
  const decreeReds = reds.filter((r) => ["ownerChanged", "tenant", "small30", "condo5", "atApproval"].includes(r));
  if (decreeReds.length > 0) {
    if (aggravated) {
      warnings.push("법 80조② 가중 대상(영리 목적·상습)은 영 115조의4 감경을 받을 수 없습니다 (법 80조의2①2호 괄호).");
    } else {
      const r = halfApplies ? 0.5 : 0.75; // 단서 해당 시 단서 금액의 50%
      amount = amount * (1 - r);
      steps.push({
        label: "감경 — 위반 동기·범위 (법 80조의2①2호 · 영 115조의4)",
        formula: `× ${Math.round((1 - r) * 100)}% (${Math.round(r * 100)}% 감경)`,
        amount: won(amount),
        basis: decreeReds.map((d) => REDUCTION_LABEL[d as ReductionReason]).join(" / ") + (halfApplies ? " — 80조① 단서 해당이라 50%" : ""),
      });
    }
  }
  // 4-3) 1992.6.1 이전 주거용
  if (reds.includes("pre1992")) {
    if (!i.residential) warnings.push("1992.6.1 이전 감경은 주거용 건축물만 해당합니다.");
    else {
      const r = (i.totalFloorAreaSqm ?? Infinity) <= 85 ? 0.8 : 0.6;
      amount = amount * (1 - r);
      steps.push({ label: "감경 — 1992.6.1 이전 위반 주거용 (법 80조의2② · 영 115조의4③)", formula: `× ${Math.round((1 - r) * 100)}% (${Math.round(r * 100)}% 감경)`, amount: won(amount), basis: (i.totalFloorAreaSqm ?? 0) <= 85 ? "연면적 85㎡ 이하" : "연면적 85㎡ 초과" });
    }
  }
  if (reds.length > 0) warnings.push("감경은 조례로 정하는 기간까지 시정하지 않으면 적용되지 않습니다 (법 80조의2① 단서).");

  const perImposition = won(amount);
  const perYear = perImposition * timesPerYear;
  const total = perYear * years;
  if (years > 1) {
    warnings.push(
      i.useAmended2027
        ? "2027.2.12부터는 최초 부과 다음 연도부터 대통령령으로 정하는 가중이 붙습니다(시행령 미제정) — 누적액은 그보다 커질 수 있습니다."
        : "누적액은 같은 금액이 매년 반복 부과된다는 가정입니다. 시정하면 즉시 중지되지만 이미 부과된 금액은 징수됩니다 (법 80조⑥).",
    );
  }
  return { type, baseAmount: won(baseAmount), perImposition, perYear, total, steps, warnings, timesPerYear, years };
}

export function fmt(v: number): string {
  return Math.round(v).toLocaleString("ko-KR");
}

export function fmtEokWon(v: number): string {
  if (Math.abs(v) >= 1e8) return `${(v / 1e8).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억원`;
  if (Math.abs(v) >= 1e4) return `${Math.round(v / 1e4).toLocaleString("ko-KR")}만원`;
  return `${fmt(v)}원`;
}
