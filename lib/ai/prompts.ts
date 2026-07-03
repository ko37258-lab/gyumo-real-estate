import type { ReportInputs } from "./types";
import { formatArea, formatPyeongAsArea, pyeongToSqm } from "@/lib/utils/area";

export const SYSTEM_PROMPT = `당신은 부동산공법 28년 경력의 전문 컨설턴트입니다. "공법의 신" 브랜드로 활동하며, 부동산공법·도시계획·건축규제·부담금·사업타당성 전반을 다룹니다.

응답 원칙:
- 디벨로퍼·토지투자자·중개사가 의사결정에 바로 쓸 수 있게 구체적·실무적으로.
- 단정 표현은 피하고 "검토 필요", "관할청 확인 권장" 같은 안전한 표현을 사용.
- 법령은 정확히 인용. 불확실하면 인용하지 말 것.
- 한국어로만 답변. 모든 금액은 한국 단위(억원, 만원, 원).
- 1층 영업 가능 면적이 매우 작거나 0인 경우 영업·임대 수익 손실 리스크로 반드시 지적할 것.
- 필로티 적용 시 연면적 차감 효과(시행령 119조 1항 4호)와 그에 따른 분양 가능 면적 감소도 고려할 것.

## 사업성 평가 가이드 (사업성 데이터 제공 시 적용)
- IRR (내부수익률): 일반 부동산 개발사업의 적정 수준은 연 15~25%. 10% 미만은 사업 의미 미흡, 25% 초과는 비현실적 가정 가능성.
- ROE (자기자본수익률): 30~80% 일반적. 100% 초과는 LTV 과다 또는 가정 낙관 가능성.
- 손익분기 분양률: 70% 이하 안전, 70~90% 일반, 90% 초과 고위험.
- 평당 마진율: 30% 이상 양호, 15~30% 보통, 15% 미만 박리.
- 손실 예상 시: 분양가 상향 가능성, 공사비 절감 방안, LTV 조정 필요 명시.
- 대출 의존도(LTV) 높을 시: 금리 변동 리스크 명시.
- 분양 시점(선분양 vs 후분양): 자금 흐름·리스크 평가에 반영.

## 사업성 데이터 있을 때 분석 항목 가중치
- summary: 규모·비용·부담금에 더해 사업성(IRR·순이익) 평가를 포함한 종합 3~4 문장.
- risks: 사업성 리스크(분양가 변동·금리 인상·LTV 과다·미분양 등) 1개 이상 포함.
- recommendations: 사업성 개선 방안(분양가 재검토·공사비 절감·금융 구조 변경) 1개 이상 포함.
- costAdequacy: 평당 사업비뿐 아니라 평당 마진율 분석도 포함.
- nextSteps: "감정평가사 협업 분양가 검증", "PF 대주단 사전 협의", "민감도 분석" 등 사업성 관련 액션 1개 이상.
- oneLiner: 사업성 양호 시 긍정 톤, 손실 예상 시 경고 톤.

반드시 JSON 한 덩어리로만 응답. 코드블록·설명 텍스트 금지. 다음 스키마 정확히 준수:

{
  "summary": "사업성 종합 평가 — 2~3 문장 (200자 이내).",
  "risks": ["리스크 1 (100자 이내)", "리스크 2", "리스크 3"],
  "recommendations": ["추천 검토 1 (100자 이내)", "추천 검토 2", "추천 검토 3"],
  "costAdequacy": "평당 사업비 적정성 평가 — 시장 일반론과 비교, 2~3 문장.",
  "nextSteps": ["다음 단계 1 (60자 이내)", "다음 단계 2", "다음 단계 3"],
  "oneLiner": "한 줄 임팩트 요약 (30자 이내)"
}

risks·recommendations·nextSteps는 반드시 정확히 3개씩.`;

export function buildUserPrompt(input: ReportInputs): string {
  const s = input.scale;
  const c = input.cost;
  const eok = (v: number) => (v / 1e8).toFixed(2);
  const won = (v: number) => Math.round(v).toLocaleString("ko-KR");
  const totalPy = c.totalArea > 0 ? c.totalArea : 1;
  const perPy = c.total / totalPy;
  const placement: Record<string, string> = {
    none: "없음",
    basement: "지하",
    above: "지상",
    mixed: "지상+지하 혼합",
  };

  return `[검토 대상]
- 주소: ${input.address || "(미입력)"}
- 검토일: ${input.reviewDate}

[규모 검토]
- 대지면적: ${formatArea(s.landAreaSqm)}
- 용도지역: ${s.zoneName} (${s.zoneCode})
- 건폐율: ${s.coverRatio}% · 용적률: ${s.floorRatio}%
- 전면도로: ${s.roadWidth}m
- 1층 법정 건축면적: ${formatArea(s.buildingArea)}${s.groundParkingArea > 0 ? `
- 1층 지상주차 점유: ${formatArea(s.groundParkingArea)} (${s.groundSpaces}대 × ${s.parkingUnitArea}㎡, ${s.pilotiMode ? "필로티 구조" : "벽체식"})` : ""}
- 1층 영업 가능 면적: ${formatArea(s.floor1Indoor)}${s.floor1Indoor <= 0 && s.groundParkingArea > 0 ? " ⚠ 1층 전체 주차 — 영업 공간 없음" : ""}
- 필로티 적용: ${s.isReducingFloor1 ? "예 (연면적에서 " + formatArea(s.groundParkingArea) + " 추가 제외, 시행령 119조 1항 4호)" : "아니오"}
- 법정 연면적: ${formatArea(s.legalFloorArea)}
- 실제 가능 연면적(일조권 반영): ${formatArea(s.actualFloorArea)}
- 일조권 손실: ${s.sunlightLoss.toFixed(1)}%
- 주차 배치: ${placement[s.parkingPlacement] ?? s.parkingPlacement} (지상 ${s.groundSpaces}대 + 지하 ${s.basementSpaces}대, 총 ${s.parkingSpaces}대)

[비용·부담금]
- 지상 ${formatPyeongAsArea(c.abovePyeong)} × ${c.aboveUnit}만원/평 = ${eok(c.aboveCost)}억원
- 지하 ${formatPyeongAsArea(c.basementPyeong)} (지상 단가 대비 가산율 ${c.basementPremium}%) = ${eok(c.basementCost)}억원
- 주차장 설치비: ${eok(c.parkingCost)}억원
- 설계·감리·인입·예비비: ${eok(c.softCost)}억원
- 농지보전부담금: ${c.farmEnabled ? eok(c.farmCost) + "억원" : "미적용"}
- 대체산림자원조성비: ${c.forestEnabled ? eok(c.forestCost) + "억원" : "미적용"}
- 개발부담금: ${c.devEnabled ? eok(c.devCharge) + "억원" : "미적용"}
- 총 연면적: ${formatPyeongAsArea(c.totalArea)} · 총 사업비 ${eok(c.total)}억원
- 연면적 ㎡당 사업비: ${won(c.total / Math.max(1, pyeongToSqm(c.totalArea)))}원
- 연면적 평당 사업비: ${won(perPy)}원
${input.profit ? buildProfitSection(input.profit) : ""}${input.market ? buildMarketSection(input.market) : ""}
위 데이터에 대해 사업성 종합 평가·핵심 리스크 3가지·추천 검토 사항 3가지·평당 사업비 적정성·다음 단계 권고 3가지·한 줄 요약(30자)을 JSON으로 응답. 주변 시세 데이터가 있으면 설정 분양가·임대료가 시장 시세 대비 적정한지 반드시 평가할 것.`;
}

function buildMarketSection(m: NonNullable<ReportInputs["market"]>): string {
  const lines: string[] = [];
  if (m.aptTrade) {
    lines.push(
      `- 아파트 매매 (${m.aptTrade.count}건): 평균 ${m.aptTrade.avgPy.toLocaleString("ko-KR")}만원/평 · 중간 ${m.aptTrade.medianPy.toLocaleString("ko-KR")} · 범위 ${m.aptTrade.minPy.toLocaleString("ko-KR")}~${m.aptTrade.maxPy.toLocaleString("ko-KR")}`,
    );
  }
  if (m.nrgTrade) {
    lines.push(
      `- 상업·업무 매매 (${m.nrgTrade.count}건): 평균 ${m.nrgTrade.avgPy.toLocaleString("ko-KR")}만원/평 · 중간 ${m.nrgTrade.medianPy.toLocaleString("ko-KR")}`,
    );
  }
  if (m.aptRent && m.aptRent.wolseCount > 0) {
    lines.push(
      `- 아파트 월세 (${m.aptRent.wolseCount}건): 평당 월 ${m.aptRent.avgMonthlyRentPerPy}만원 · 평균 보증금 ${m.aptRent.avgWolseDeposit.toLocaleString("ko-KR")}만원 · 평균 월세 ${m.aptRent.avgMonthlyRent.toLocaleString("ko-KR")}만원${m.aptRent.jeonseCount > 0 ? ` (전세 ${m.aptRent.jeonseCount}건 평균 ${m.aptRent.avgJeonseDeposit.toLocaleString("ko-KR")}만원)` : ""}`,
    );
  }
  if (m.offiRent && m.offiRent.wolseCount > 0) {
    lines.push(
      `- 오피스텔 월세 (${m.offiRent.wolseCount}건): 평당 월 ${m.offiRent.avgMonthlyRentPerPy}만원 · 평균 보증금 ${m.offiRent.avgWolseDeposit.toLocaleString("ko-KR")}만원 · 평균 월세 ${m.offiRent.avgMonthlyRent.toLocaleString("ko-KR")}만원`,
    );
  }
  if (lines.length === 0) return "";
  return `

[주변 시세·임대료 — 국토교통부 실거래가, 최근 ${m.months}개월, 시군구(법정동코드 ${m.lawdCd}) 단위]
${lines.join("\n")}`;
}

function buildProfitSection(p: NonNullable<ReportInputs["profit"]>): string {
  const eok = (v: number) => (v / 1e8).toFixed(2);
  const methodLabel =
    p.repaymentMethod === "bullet"
      ? "만기일시"
      : p.repaymentMethod === "amortized"
        ? "원리금균등"
        : "1년 거치";
  const modelLabel =
    p.revenueModel === "sales"
      ? "분양"
      : p.revenueModel === "rent"
        ? "임대"
        : "혼합";
  const rentLine =
    p.revenueModel === "rent" || p.revenueModel === "mixed"
      ? `\n- 평당 월세: ${p.monthlyRentPerPyeong}만원 · 보증금 ${p.deposit}개월 · 가동률 ${p.annualOccupancy}%`
      : "";
  const flags: string[] = [];
  if (p.isLoss) flags.push("⚠️ 손실 예상");
  if (p.isHighRisk) flags.push("⚠️ 손익분기 여유 부족");
  return `

[사업성 분석]
- 평당 토지가: ${p.landPricePerPyeong.toLocaleString("ko-KR")}만원/평 (취득 부대비 ${p.landAcquisitionCost}%)
- 토지비: ${eok(p.landCost)}억원
- 수익 모델: ${modelLabel}
- 평당 분양가: ${p.salesPricePerPyeong.toLocaleString("ko-KR")}만원/평 · 예상 분양률: ${p.salesRate}%${rentLine}
- 예상 총 수익: ${eok(p.totalRevenue)}억원
- 대출: ${eok(p.loanAmount)}억원 (LTV ${p.ltvRatio.toFixed(0)}%, 연 ${p.annualInterestRate}%, ${p.loanPeriodYears}년, ${methodLabel})
- 대출 이자(사업기간 ${p.projectDurationMonths}개월): ${eok(p.loanInterest)}억원
- 총 사업비(이자 포함): ${eok(p.totalProjectCost)}억원
- 자기자본: ${eok(p.equity)}억원
- 순이익(세후): ${eok(p.netProfit)}억원
- IRR: ${p.irr.toFixed(1)}% · ROE: ${p.roe.toFixed(1)}% · ROIC: ${p.roic.toFixed(1)}%
- 손익분기 분양률: ${p.breakEvenSalesRate.toFixed(1)}%
- 평당 사업비: ${Math.round(p.costPerPyeong).toLocaleString("ko-KR")}만원/평 · 평당 마진: ${Math.round(p.marginPerPyeong).toLocaleString("ko-KR")}만원/평 (${p.marginPercent.toFixed(1)}%)
- 분양 시점: ${p.salesStartMonth < 0 ? "선분양 " + Math.abs(p.salesStartMonth) + "개월 전" : p.salesStartMonth > 0 ? "후분양 " + p.salesStartMonth + "개월 후" : "준공 시점"}
${flags.length > 0 ? flags.map((f) => "- " + f).join("\n") : ""}`;
}
