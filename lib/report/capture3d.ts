"use client";

// 3D 매스 캡쳐 — 보고서(본 보고서·한장 요약)가 같이 쓰는 공용 유틸. (2026-09-21 분리)
// 화면의 탭을 실제로 눌러 Canvas를 마운트시킨 뒤 toDataURL 하는 방식이라, 캡쳐 대상은
// "지금 화면에 보이는 그 매스" 와 항상 같다.

import { useSimulatorStore } from "@/store/simulator";

/** 텍스트로 Tabs trigger 찾아서 활성화. base-ui의 value 속성 추출이 불안정해서 텍스트 fallback 사용. */
export function activateTabByText(searchTexts: string[]) {
  if (typeof document === "undefined") return false;
  const triggers = document.querySelectorAll('[data-slot="tabs-trigger"]');
  for (const t of Array.from(triggers)) {
    const text = t.textContent ?? "";
    if (searchTexts.some((s) => text.includes(s))) {
      (t as HTMLElement).click();
      return true;
    }
  }
  return false;
}

/** Canvas 마운트(capture3D 함수 등록) 대기 — 고정 지연 대신 폴링. 느린 첫 로드(청크 다운로드)에도
 *  버티도록 타임아웃까지 150ms 간격으로 확인한다. (기존엔 1300ms 고정 대기라 첫 마운트가 느리면
 *  조용히 실패했다 — "위치도·3D 매스 이미지 넣기 체크했는데 이미지가 없음" 버그의 원인 중 하나.) */
async function waitForCapture3D(
  timeoutMs = 4000,
): Promise<((view?: "iso" | "south" | "north") => string) | null> {
  const start = Date.now();
  while (true) {
    const fn = useSimulatorStore.getState().capture3D;
    if (fn) return fn;
    if (Date.now() - start >= timeoutMs) return null;
    await new Promise((r) => setTimeout(r, 150));
  }
}

/** 3D 매스 캡쳐 — 규모 검토 + 3D 탭 자동 활성 → 렌더 대기 → toDataURL. 실패 시 null. */
export type Capture3DResult = { iso: string; south?: string; north?: string };

export async function tryCapture3D(): Promise<Capture3DResult | null> {
  try {
    // 1) 외부 Tabs: "규모 검토" 활성
    activateTabByText(["규모 검토"]);
    // 2) 짧은 대기 후 ScaleVisualizer의 내부 Tabs: "3D 360°" 활성
    await new Promise((r) => setTimeout(r, 150));
    activateTabByText(["3D 360°"]);
    // 3) Canvas 마운트(동적 import 완료 + 첫 프레임) 대기 — 고정 지연 대신 등록 여부를 폴링
    const fn = await waitForCapture3D();
    if (!fn) {
      console.warn("[3D Capture] capture3D 함수 미등록 — Canvas 마운트 시간 초과");
      return null;
    }
    // 플렉시티식 3컷 — 기본(iso)은 필수, 남·북 정면은 실패해도 보고서는 계속
    const iso = fn("iso");
    let south: string | undefined;
    let north: string | undefined;
    try {
      south = fn("south");
      north = fn("north");
    } catch (e) {
      console.warn("[3D Capture] 남·북 컷 실패 (기본 컷만 수록):", e);
    }
    return { iso, south, north };
  } catch (e) {
    console.warn("[3D Capture] 실패:", e);
    return null;
  }
}

