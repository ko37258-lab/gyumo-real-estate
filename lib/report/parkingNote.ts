// 주차 설명 문구 단일 출처 — 실제 주차 배치 형식(없음/지하/지상/혼합)에 맞춰 생성한다. (2026-10-05)
//
// 배경: 한장 보고서가 "주차 13대 · 지하 (지상 0/지하 13)"처럼 전량 지하 배치인데도
// store의 필로티 설정(parkingPilotiMode)이 true라는 이유만으로 "1층 필로티 가정" 문구를
// 그대로 붙였다. 필로티는 지상에 주차가 실제로 있을 때만 의미가 있는 개념이다
// (건축법 시행령 제119조①3호 다목 — 1층에 주차 공간이 없으면 적용할 대상이 없다).

export interface ParkingNoteInput {
  parkingPlacement: "none" | "basement" | "above" | "mixed";
  groundSpaces: number;
  parkingRawSpaces?: number;
  parkingBasisLabel?: string;
  pilotiMode: boolean;
}

/** 산정 근거 + (지상 배치일 때만) 필로티/벽체식 가정을 담은 한 줄 설명 */
export function describeParkingNote(s: ParkingNoteInput): string {
  const hasGroundParking =
    (s.parkingPlacement === "above" || s.parkingPlacement === "mixed") && s.groundSpaces > 0;
  return [
    s.parkingRawSpaces !== undefined
      ? `산정 ${s.parkingRawSpaces.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}대`
      : "",
    s.parkingBasisLabel ?? "",
    hasGroundParking ? (s.pilotiMode ? "1층 필로티 가정" : "1층 벽체식 가정(연면적 산입)") : "",
  ]
    .filter(Boolean)
    .join(" · ");
}
