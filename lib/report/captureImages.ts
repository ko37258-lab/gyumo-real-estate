"use client";

// 보고서 이미지(3D 매스·위치도) 캡쳐 — 한장 보고서·상세 보고서 다이얼로그가 공유. (2026-10-05)
//
// 배경: "위치도·3D 매스 이미지 넣기"를 체크했는데 PDF에 이미지가 없고 안내도 없었다.
// 원인 둘: ① 위치도는 지번 조회(실형상) 전이면 애초에 만들 수 없는데 그 사실을 미리
// 알려주지 않았다 ② 3D 캡쳐는 Canvas 마운트 타이밍에 따라 조용히 실패할 수 있었다
// (capture3d.ts에서 고정 대기를 폴링으로 바꿔 완화했지만 그래도 실패할 수 있다).
// 이 모듈은 "시도했는데 실패"와 "처음부터 불가능"을 구분해, 후자는 조용히 건너뛰고
// 전자만 사용자에게 안내(재시도/계속 진행 선택)한다.

import { tryCapture3D, type Capture3DResult } from "@/lib/report/capture3d";
import { buildLocationMap, canBuildLocationMap } from "@/lib/report/locationMap";

export interface ImageCaptureResult {
  visualization3D: Capture3DResult | null;
  locationMap: string | null;
  /** 위치도를 시도라도 했는지 — false면 애초에 조건 미충족(지번 미조회)이라 실패로 안내하지 않는다 */
  attemptedLocation: boolean;
  failed3D: boolean;
  failedLocation: boolean;
}

export async function captureReportImages(opts: {
  want3D: boolean;
  wantLocation: boolean;
}): Promise<ImageCaptureResult> {
  const visualization3D = opts.want3D ? await tryCapture3D() : null;
  const attemptedLocation = opts.wantLocation && canBuildLocationMap();
  const locationMap = attemptedLocation ? await buildLocationMap().catch(() => null) : null;
  return {
    visualization3D,
    locationMap,
    attemptedLocation,
    failed3D: opts.want3D && !visualization3D,
    failedLocation: attemptedLocation && !locationMap,
  };
}

/** 실패 사유 문구 — 실패가 없으면 null(대화상자를 띄울 필요 없음) */
export function describeCaptureFailure(r: ImageCaptureResult): string | null {
  const parts: string[] = [];
  if (r.failed3D) parts.push("3D 매스 캡쳐");
  if (r.failedLocation) parts.push("위치도");
  if (parts.length === 0) return null;
  return `${parts.join(" · ")} 이미지를 넣지 못했습니다.`;
}

/** 위치도를 왜 못 넣는지 — 체크박스 옆에 미리 보여줄 안내(조건 미충족은 실패가 아니다) */
export function locationMapUnavailableReason(wantLocation: boolean): string | null {
  if (!wantLocation) return null;
  return canBuildLocationMap() ? null : "위치도는 지번 조회(실형상 확인) 후에만 포함됩니다.";
}
