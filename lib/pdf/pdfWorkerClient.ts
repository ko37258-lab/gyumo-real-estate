"use client";

// 메인스레드에서 pdf.worker.ts와 통신하는 얇은 클라이언트.
// 워커 생성·통신 자체가 실패하면(구형 브라우저, CSP 등) 호출부가 기존
// 메인스레드 직접 생성 방식으로 폴백할 수 있도록 항상 reject 로 알린다 —
// PDF 생성 기능 자체가 깨지는 일은 없어야 한다.
import type { AIAnalysis, ReportInputs } from "@/lib/ai/types";
import type { BrandConfig } from "@/lib/branding/types";

type Res =
  | { type: "warmup-done" }
  | { type: "warmup-error"; error: string }
  | { type: "generate-done"; id: number; blob: Blob }
  | { type: "generate-error"; id: number; error: string };

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<
  number,
  { resolve: (b: Blob) => void; reject: (e: Error) => void }
>();

function failAllPending(reason: string) {
  for (const [, p] of pending) p.reject(new Error(reason));
  pending.clear();
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./pdf.worker.tsx", import.meta.url), {
    type: "module",
  });
  worker.onmessage = (e: MessageEvent<Res>) => {
    const msg = e.data;
    if (msg.type === "generate-done") {
      pending.get(msg.id)?.resolve(msg.blob);
      pending.delete(msg.id);
    } else if (msg.type === "generate-error") {
      pending.get(msg.id)?.reject(new Error(msg.error));
      pending.delete(msg.id);
    }
    // warmup-done/warmup-error는 추적 대상 없음(fire-and-forget) — 무시
  };
  worker.onerror = (e) => {
    // 워커 자체가 죽으면(스크립트 로드 실패 등) 대기 중인 모든 요청을 실패 처리 후 폐기 —
    // 다음 호출 시 getWorker()가 새 워커를 다시 만든다.
    failAllPending(e.message || "PDF 워커 오류");
    worker?.terminate();
    worker = null;
  };
  return worker;
}

/** 다이얼로그가 열리는 시점에 호출 — 워커 안에서 폰트를 미리 데워둔다. 실패해도 무시. */
export function warmUpPdfWorker() {
  if (typeof window === "undefined" || typeof Worker === "undefined") return;
  try {
    getWorker().postMessage({ type: "warmup" });
  } catch {
    // 워커를 아예 못 만드는 환경 — 실제 생성 시 메인스레드 폴백으로 자연 처리됨
  }
}

/**
 * 워커에서 PDF를 생성해 Blob으로 받는다. 실제 계산은 수십 초~2분 넘게 걸릴 수 있지만
 * 워커 스레드에서 돌기 때문에 메인스레드(탭)는 그동안 완전히 정상 응답한다.
 * 타임아웃은 "정상적으로 오래 걸리는 것"과 "워커가 죽어서 응답이 안 오는 것"을 구분하기
 * 위한 최후 안전장치일 뿐이라 넉넉하게 잡는다(실측 최대 약 150초 + 여유).
 */
export function generatePdfInWorker(
  input: ReportInputs,
  analysis: AIAnalysis | null,
  brand: BrandConfig,
  timeoutMs = 5 * 60 * 1000,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const id = nextId++;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      pending.delete(id);
      reject(new Error("PDF 워커 응답 시간 초과"));
    }, timeoutMs);

    pending.set(id, {
      resolve: (b) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(b);
      },
      reject: (e) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(e);
      },
    });

    try {
      if (typeof Worker === "undefined") throw new Error("Worker 미지원 환경");
      getWorker().postMessage({ type: "generate", id, input, analysis, brand });
    } catch (e) {
      settled = true;
      clearTimeout(timer);
      pending.delete(id);
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
}
