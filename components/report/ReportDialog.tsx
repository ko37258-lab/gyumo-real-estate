"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircleIcon,
  CheckIcon,
  FileTextIcon,
  Loader2Icon,
  PrinterIcon,
  RefreshCcwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { analyzeReport } from "@/lib/ai/analyze";
import { formatEok } from "@/lib/calc/cost";
import {
  getActiveProvider,
  getClaudeKey,
  getGeminiKey,
  maskKey,
  useActiveProvider,
  type AIProvider,
} from "@/lib/ai/keys";
import { buildReportInputs } from "@/lib/report/buildInput";
import { useSimulatorStore } from "@/store/simulator";
import type { AIAnalysis, ReportInputs } from "@/lib/ai/types";
import { ReportDocument } from "./ReportDocument";

type ReportStatus = "idle" | "analyzing" | "ready" | "error";
type PdfStatus = "idle" | "generating" | "error";

/** 텍스트로 Tabs trigger 찾아서 활성화. base-ui의 value 속성 추출이 불안정해서 텍스트 fallback 사용. */
function activateTabByText(searchTexts: string[]) {
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

/** 3D 매스 캡쳐 — 규모 검토 + 3D 탭 자동 활성 → 렌더 대기 → toDataURL. 실패 시 null. */
async function tryCapture3D(): Promise<string | null> {
  try {
    // 1) 외부 Tabs: "규모 검토" 활성
    activateTabByText(["규모 검토"]);
    // 2) 짧은 대기 후 ScaleVisualizer의 내부 Tabs: "3D 360°" 활성
    await new Promise((r) => setTimeout(r, 150));
    activateTabByText(["3D 360°"]);
    // 3) Canvas 마운트 + 첫 프레임 대기
    await new Promise((r) => setTimeout(r, 700));

    const fn = useSimulatorStore.getState().capture3D;
    if (!fn) {
      console.warn("[3D Capture] capture3D 함수 미등록 — Canvas 미마운트?");
      return null;
    }
    return fn();
  } catch (e) {
    console.warn("[3D Capture] 실패:", e);
    return null;
  }
}

/** 시뮬레이터 헤더에 박는 단일 컴포넌트. trigger + content를 같은 Dialog root에 통합. */
export function ReportDialog() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ReportStatus>("idle");
  const [step, setStep] = useState<string>("");
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [input, setInput] = useState<ReportInputs | null>(null);
  const [pdfStatus, setPdfStatus] = useState<PdfStatus>("idle");
  // useSyncExternalStore로 LocalStorage 키 상태를 SSR-safe하게 구독.
  const provider: AIProvider = useActiveProvider();

  // Dialog open 토글 — 에러 상태에서 다시 열면 idle로 초기화 (ready는 보존).
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && status === "error") {
      setStatus("idle");
      setErrorMsg("");
    }
  };

  const fileName = useMemo(() => {
    const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `미스터홈즈_검토보고서_${d}.pdf`;
  }, []);

  async function handleStart() {
    console.log("[ReportDialog] AI 분석 시작 클릭됨");

    const activeProvider = getActiveProvider();
    if (!activeProvider) {
      setErrorMsg("API 키가 등록되지 않았습니다. 설정 페이지에서 키를 입력해주세요.");
      setStatus("error");
      return;
    }

    setStatus("analyzing");
    setStep("1/4 3D 매스 캡쳐 중...");
    setErrorMsg("");

    try {
      // ★ 1/4: 3D 캡쳐 (탭 자동 활성 + 렌더 대기 + toDataURL)
      const visualization3D = await tryCapture3D();
      console.log(
        "[3D Capture]",
        visualization3D ? `성공 (${Math.round(visualization3D.length / 1024)}KB)` : "건너뜀",
      );

      setStep("2/4 데이터 수집 중...");
      await new Promise((r) => setTimeout(r, 200));
      const built = buildReportInputs();
      console.log("[ReportDialog] input:", built);

      setStep("3/4 전문 종합 분석 중... (약 10~30초)");
      // ★ AI 호출은 이미지 없이 — 본문 가벼움 유지
      const result = await analyzeReport(built);
      console.log("[ReportDialog] result:", result);

      setStep("4/4 보고서 생성 중...");
      await new Promise((r) => setTimeout(r, 300));
      // ★ 결과 입력에 3D 이미지 주입 (PDF 임베드용, AI에는 안 보냄)
      const finalInput: ReportInputs = visualization3D
        ? { ...built, visualization3D }
        : built;
      setInput(finalInput);
      setAnalysis(result);
      setStatus("ready");
    } catch (err) {
      console.error("[ReportDialog] 분석 실패:", err);
      const message =
        err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      setErrorMsg(message);
      setStatus("error");
    }
  }

  async function handleSkip() {
    const visualization3D = await tryCapture3D();
    const built = buildReportInputs();
    const finalInput: ReportInputs = visualization3D
      ? { ...built, visualization3D }
      : built;
    setInput(finalInput);
    setAnalysis(null);
    setStatus("ready");
  }

  function handleReset() {
    setStatus("idle");
    setAnalysis(null);
    setInput(null);
    setErrorMsg("");
  }

  /**
   * 수동 blob 다운로드 — PDFDownloadLink는 React 트리에 PDF 생성 컨텍스트를 영구 유지해서
   * 시뮬레이터 페이지가 멈추는 원인. 이벤트 콜백 안에서 즉시 생성·즉시 해제하는 패턴.
   */
  async function handleDownload() {
    if (!input) return;
    setPdfStatus("generating");
    let blob: Blob | null = null;
    let url: string | null = null;
    try {
      const { pdf } = await import("@react-pdf/renderer");
      blob = await pdf(
        <ReportDocument input={input} analysis={analysis} />,
      ).toBlob();
      url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setPdfStatus("idle");
    } catch (err) {
      console.error("[PDF] 생성 실패:", err);
      setPdfStatus("error");
      alert("PDF 생성에 실패했습니다. 디버그 패널을 확인하세요.");
    } finally {
      // ★ 메모리 즉시 해제 — Blob/URL 참조 끊기 + revokeObjectURL.
      setTimeout(() => {
        if (url) URL.revokeObjectURL(url);
        blob = null;
        url = null;
      }, 500);
    }
  }

  /**
   * 인쇄 — 새 탭에 PDF 열기. URL은 인쇄 후 일정 시간 뒤 해제 (사용자가 인쇄 미리보기를
   * 완료하기 전 revoke되면 안 됨).
   */
  async function handlePrint() {
    if (!input) return;
    setPdfStatus("generating");
    let blob: Blob | null = null;
    let url: string | null = null;
    try {
      const { pdf } = await import("@react-pdf/renderer");
      blob = await pdf(
        <ReportDocument input={input} analysis={analysis} />,
      ).toBlob();
      url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setPdfStatus("idle");
    } catch (err) {
      console.error("[PDF] 인쇄 준비 실패:", err);
      setPdfStatus("error");
      alert("PDF 인쇄 준비에 실패했습니다.");
    } finally {
      // 인쇄 미리보기를 사용자가 충분히 다룰 시간 (30초) 후 해제.
      setTimeout(() => {
        if (url) URL.revokeObjectURL(url);
        blob = null;
        url = null;
      }, 30000);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm" className="gap-1.5 bg-[#993C1D] hover:bg-[#7A2F16]">
            <FileTextIcon className="size-4" />
            보고서 생성
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>컨설팅 보고서 생성</DialogTitle>
          <DialogDescription>
            현재 입력 데이터를 종합 분석하여 컨설팅 수준의 PDF 보고서를 생성합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-2">
          {status === "idle" && (
            <IdleView
              provider={provider}
              onStart={handleStart}
              onSkip={handleSkip}
            />
          )}
          {status === "analyzing" && (
            <AnalyzingView step={step} provider={provider} />
          )}
          {status === "ready" && (
            <ReadyView analysis={analysis} input={input} />
          )}
          {status === "error" && (
            <ErrorView
              errorMsg={errorMsg}
              onRetry={handleStart}
              onBack={handleReset}
            />
          )}

          <DebugDetails
            status={status}
            provider={provider}
            errorMsg={errorMsg}
          />
        </div>

        <DialogFooter className="border-t border-border pt-3">
          {status === "ready" && input ? (
            <div className="grid grid-cols-3 gap-2 w-full">
              <Button
                onClick={handleDownload}
                disabled={pdfStatus === "generating"}
                className="w-full bg-[#993C1D] hover:bg-[#7A2F16]"
              >
                <FileTextIcon className="size-3.5 mr-1" />
                {pdfStatus === "generating" ? "생성 중..." : "PDF 다운로드"}
              </Button>
              <Button
                variant="outline"
                onClick={handlePrint}
                disabled={pdfStatus === "generating"}
              >
                <PrinterIcon className="size-3.5 mr-1" />
                인쇄
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={pdfStatus === "generating"}
              >
                <RefreshCcwIcon className="size-3.5 mr-1" />
                다시 분석
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              닫기
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ── idle ─────────────────────────────────────────────── */
function IdleView({
  provider,
  onStart,
  onSkip,
}: {
  provider: AIProvider;
  onStart: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        규모·비용·부담금 입력값 전체를 받아 사업성 종합 평가, 핵심 리스크 3, 추천 검토 3, 평당 사업비 적정성, 다음 단계 권고 3을 생성합니다. 그 결과를 PDF에 함께 수록합니다.
      </p>
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] text-amber-900 leading-relaxed">
        💡 보고서에는 현재 화면의 <b>3D 매스 모습</b>이 함께 캡쳐됩니다. 분석 전에 원하는 각도로 회전해 두세요. (시뮬레이터 → 규모 검토 → 3D 360° 탭)
      </div>

      <Card
        className={`p-4 ${
          provider ? "border-[var(--success)]/60" : "border-amber-500/60"
        }`}
      >
        {provider ? (
          <div className="flex items-center gap-2 text-[var(--success)] text-[13px] font-medium">
            <CheckIcon className="size-4" /> ✓ 분석 준비 완료
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-amber-700 text-[13px] font-medium">
              <AlertCircleIcon className="size-4" />
              분석 도구가 설정되지 않았습니다
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings">⚙️ 설정 페이지로</Link>
            </Button>
            <div className="text-[11px] text-muted-foreground">
              설정 없이 PDF만 받으려면 아래 &ldquo;분석 없이 PDF만&rdquo;을 사용하세요.
            </div>
          </div>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={onStart}
          disabled={!provider}
          size="lg"
          className="flex-1 bg-[#993C1D] hover:bg-[#7A2F16] disabled:bg-secondary disabled:text-muted-foreground"
        >
          📊 전문 분석 시작
        </Button>
        <Button onClick={onSkip} size="lg" variant="outline">
          분석 없이 PDF만
        </Button>
      </div>
    </div>
  );
}

/* ── analyzing ────────────────────────────────────────── */
function AnalyzingView({ step }: { step: string; provider: AIProvider }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // 단계별 누적 진행률 (시각적 안정감) — 각 단계 25%씩, 3단계는 elapsed에 비례.
  const stepNumber = parseInt(step.match(/(\d+)\/4/)?.[1] ?? "1", 10);
  const stepProgress = stepNumber === 3 ? Math.min(25, (elapsed / 30) * 25) : 25;
  const progressPercent = Math.min(95, (stepNumber - 1) * 25 + stepProgress);

  const reassurance =
    elapsed < 10
      ? "입력 데이터를 정밀 검토하는 중입니다..."
      : elapsed < 25
        ? "부동산공법 데이터를 종합 분석 중입니다..."
        : elapsed < 40
          ? "조금만 더 기다려주세요. 결과를 생성 중입니다..."
          : "잠시만요. 곧 완료됩니다...";

  return (
    <div className="py-8 space-y-4">
      <div className="flex justify-center">
        <Loader2Icon className="size-12 animate-spin text-[#993C1D]" />
      </div>

      <p className="text-center font-medium text-[14px]">{step}</p>

      {/* 진행률 바 */}
      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full transition-all duration-700"
          style={{
            width: `${progressPercent}%`,
            background:
              "linear-gradient(90deg, #F0997B 0%, #993C1D 100%)",
          }}
        />
      </div>

      <div className="text-center space-y-1">
        <p className="text-[11px] text-muted-foreground tabular-nums">
          경과 {elapsed}초 · 평균 15~30초 소요
        </p>
        <p className="text-[11px] text-muted-foreground">{reassurance}</p>
      </div>
    </div>
  );
}

/* ── ready ────────────────────────────────────────────── */
function ReadyView({
  analysis,
  input,
}: {
  analysis: AIAnalysis | null;
  input: ReportInputs | null;
}) {
  if (!analysis) {
    return (
      <div className="rounded-md border border-border bg-secondary/40 p-3 text-[12.5px] leading-relaxed">
        AI 분석 없이 보고서가 준비됐습니다. 하단 버튼으로 PDF를 다운로드하거나 인쇄하세요.
        {input?.address ? <div className="mt-2 text-muted-foreground">대상: {input.address}</div> : null}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-[#993C1D]/30 bg-[#FAECE7] p-3">
        <div className="text-[10px] text-[#993C1D] font-bold tracking-widest mb-1">
          전문 한 줄 의견
        </div>
        <div className="text-[14px] italic">&ldquo;{analysis.oneLiner}&rdquo;</div>
      </div>
      {input?.profit && (
        <div className="rounded-md border-l-4 border-[#993C1D] bg-[#FAECE7]/60 p-3">
          <div className="text-[11px] font-bold text-[#993C1D] mb-2">
            📊 사업성 핵심
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-[10px] text-muted-foreground">IRR</div>
              <div
                className={`font-bold text-lg tabular-nums ${
                  input.profit.irr < 0
                    ? "text-red-600"
                    : input.profit.irr < 10
                      ? "text-foreground/70"
                      : "text-[#993C1D]"
                }`}
              >
                {input.profit.irr.toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">순이익</div>
              <div
                className={`font-bold text-lg tabular-nums ${
                  input.profit.netProfit < 0 ? "text-red-600" : ""
                }`}
              >
                {formatEok(input.profit.netProfit)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">손익분기</div>
              <div className="font-bold text-lg tabular-nums">
                {input.profit.breakEvenSalesRate.toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      )}
      <Section title="사업성 종합 평가">{analysis.summary}</Section>
      <Section title="핵심 리스크 3가지">
        <ol className="space-y-1 list-decimal pl-5">
          {analysis.risks.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ol>
      </Section>
      <Section title="추천 검토 3가지">
        <ol className="space-y-1 list-decimal pl-5">
          {analysis.recommendations.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ol>
      </Section>
      <Section title="평당 사업비 적정성">{analysis.costAdequacy}</Section>
      <Section title="다음 단계 권고">
        <ol className="space-y-1 list-decimal pl-5">
          {analysis.nextSteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </Section>
      <div className="text-[10.5px] text-muted-foreground pt-1">
        분석일: {new Date(analysis.generatedAt).toLocaleDateString("ko-KR")}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-[10.5px] text-muted-foreground font-medium mb-1">
        {title}
      </div>
      <div className="text-[12.5px] leading-relaxed">{children}</div>
    </div>
  );
}

/* ── error ────────────────────────────────────────────── */
function ErrorView({
  errorMsg,
  onRetry,
  onBack,
}: {
  errorMsg: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="border-destructive/40 bg-destructive/5 p-4 space-y-2">
        <div className="flex items-center gap-2 text-destructive font-medium text-[13px]">
          <AlertCircleIcon className="size-4" /> 분석 실패
        </div>
        <p className="text-[12.5px] break-words">{errorMsg}</p>
        <div className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          💡 자주 발생하는 원인:
          <br />· API 키가 잘못되었거나 만료됨 → /settings에서 재등록
          <br />· 일일 호출 한도 초과 → 잠시 후 재시도
          <br />· 네트워크 오류 → 인터넷 연결 확인
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={onBack} variant="outline">
          ← 처음으로
        </Button>
        <Button
          onClick={onRetry}
          className="bg-[#993C1D] hover:bg-[#7A2F16]"
        >
          🔄 재시도
        </Button>
      </div>
    </div>
  );
}

/* ── 디버그 details (베타 동안 임시) ───────────────────── */
function DebugDetails({
  status,
  provider,
  errorMsg,
}: {
  status: ReportStatus;
  provider: AIProvider;
  errorMsg: string;
}) {
  return (
    <details className="text-[11px] text-muted-foreground mt-4 pt-2 border-t border-border">
      <summary className="cursor-pointer">🔧 디버그 정보 (문제 발생 시 클릭)</summary>
      <div className="mt-2 space-y-1 font-mono">
        <div>현재 상태: {status}</div>
        <div>활성 제공자: {provider || "없음"}</div>
        <div>
          Gemini 키:{" "}
          {getGeminiKey() ? maskKey(getGeminiKey()) : "미등록"}
        </div>
        <div>
          Claude 키:{" "}
          {getClaudeKey() ? maskKey(getClaudeKey()) : "미등록"}
        </div>
        <div>최근 에러: {errorMsg || "없음"}</div>
        <div className="text-[10px] text-muted-foreground/70 mt-1">
          ※ 클릭 동작에 문제가 있으면 브라우저 콘솔(F12) 탭에서{" "}
          <code>[ReportDialog]</code> 로그를 확인해 주세요.
        </div>
      </div>
    </details>
  );
}
