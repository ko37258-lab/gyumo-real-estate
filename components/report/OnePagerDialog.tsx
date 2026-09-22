"use client";

// 한장 보고서(A4 가로 1장) — 간단 보고용. 작성자 인적사항을 넣고 인쇄/저장한다. (2026-09-21)
//
// 본 보고서(ReportDialog)와의 차이:
//  - AI 분석 없음. 지금 화면 값(buildReportInputs = computePlan 단일 계산원)만 그대로 1장에 담는다.
//  - 작성자 인적사항은 브라우저에 저장(lib/report/reporter) — 사람마다 자기 이름으로 출력.

import { useEffect, useMemo, useRef, useState } from "react";
import { FileTextIcon, Loader2Icon, PrinterIcon, DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { buildReportInputs } from "@/lib/report/buildInput";
import { buildLocationMap } from "@/lib/report/locationMap";
import { tryCapture3D } from "@/lib/report/capture3d";
import { warmUpPdfWorker, generateOnePagerInWorker } from "@/lib/pdf/pdfWorkerClient";
import { getBrandConfig } from "@/lib/branding/storage";
import {
  getReporterProfile,
  saveReporterProfile,
  type ReporterProfile,
} from "@/lib/report/reporter";
import type { ReportInputs } from "@/lib/ai/types";

type Status = "idle" | "building" | "ready" | "error";

const FIELDS: Array<{ key: keyof ReporterProfile; label: string; placeholder: string }> = [
  { key: "officeName", label: "상호 (사무소·회사)", placeholder: "미스터홈즈부동산 부동산중개" },
  { key: "officeBranch", label: "소속·지점", placeholder: "둔촌동역센터" },
  { key: "titles", label: "직함·자격", placeholder: "대표 / 공인중개사 / 토지분석사" },
  { key: "name", label: "이름", placeholder: "홍길동" },
  { key: "phone", label: "연락처", placeholder: "010-0000-0000" },
  { key: "email", label: "이메일", placeholder: "name@example.com" },
  { key: "regNo", label: "등록번호·사업자번호", placeholder: "제11710-2026-00000호" },
  { key: "officeAddress", label: "사무소 주소", placeholder: "서울 강동구 ○○로 00, 0층" },
];

export function OnePagerDialog() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [reporter, setReporter] = useState<ReporterProfile>(() => getReporterProfile());
  const [headline, setHeadline] = useState("");
  const [comment, setComment] = useState("");
  const [withImages, setWithImages] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    warmUpPdfWorker();
  }, []);

  // 창을 닫을 때 미리보기 URL 해제 (열려 있는 동안은 iframe이 참조 중)
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const fileName = useMemo(() => {
    const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `규모검토_한장보고서_${d}.pdf`;
  }, []);

  const set = <K extends keyof ReporterProfile>(k: K, v: ReporterProfile[K]) =>
    setReporter((p) => ({ ...p, [k]: v }));

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setReporter(getReporterProfile());
    if (!next) {
      // 창을 닫으면 미리보기 폐기 — 다음에 열면 최신 화면 값으로 다시 만든다
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      blobRef.current = null;
      setStatus("idle");
    }
  }

  async function handleBuild() {
    if (busyRef.current) return;
    busyRef.current = true;
    setStatus("building");
    setErrorMsg("");
    try {
      // 입력한 인적사항은 이 시점에 브라우저에 저장 — 다음에 열면 그대로 채워져 있다
      saveReporterProfile(reporter);

      const captured = withImages ? await tryCapture3D().catch(() => null) : null;
      const locationMap = withImages ? await buildLocationMap().catch(() => null) : null;
      const base = buildReportInputs();
      const input: ReportInputs = {
        ...base,
        locationMap: locationMap ?? undefined,
        visualization3D: captured?.iso,
      };

      const blob = await buildBlob(input);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      blobRef.current = blob;
      setPreviewUrl(URL.createObjectURL(blob));
      setStatus("ready");
    } catch (err) {
      console.error("[한장 보고서] 생성 실패:", err);
      setErrorMsg(err instanceof Error ? err.message : "알 수 없는 오류");
      setStatus("error");
    } finally {
      busyRef.current = false;
    }
  }

  /** 워커 우선, 실패 시 메인스레드 폴백 (본 보고서와 같은 패턴) */
  async function buildBlob(input: ReportInputs): Promise<Blob> {
    const brand = getBrandConfig();
    try {
      return await generateOnePagerInWorker(input, brand, reporter, { headline, comment });
    } catch (workerErr) {
      console.warn("[한장 보고서] 워커 실패 — 메인스레드 폴백:", workerErr);
      const { pdf } = await import("@react-pdf/renderer");
      const { OnePagerDocument } = await import("./OnePagerDocument");
      return await pdf(
        <OnePagerDocument
          input={input}
          brand={brand}
          reporter={reporter}
          headline={headline}
          comment={comment}
        />,
      ).toBlob();
    }
  }

  function handleDownload() {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function handlePrint() {
    if (!previewUrl) return;
    // 새 탭의 PDF 뷰어에서 인쇄 — iframe 자동 print()는 브라우저별로 막히는 경우가 있어
    // 사용자가 직접 인쇄 버튼을 누를 수 있는 이 방식이 가장 안정적이다.
    window.open(previewUrl, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline" className="gap-1.5">
            <FileTextIcon className="size-4" />
            한장 보고서
          </Button>
        }
      />
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>한장 보고서 (A4 가로)</DialogTitle>
          <DialogDescription>
            지금 화면의 검토 값을 A4 가로 1장으로 정리합니다. 아래 인적사항이 보고서 하단에 들어갑니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1 py-2 space-y-4">
          {/* 제목·코멘트 */}
          <section className="space-y-2">
            <div className="space-y-1.5">
              <Label htmlFor="op-headline" className="text-xs">
                상단 제목 <span className="text-muted-foreground">(비우면 주소가 들어갑니다)</span>
              </Label>
              <Input
                id="op-headline"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="예) 강남구 역삼동 825-3, 119평 · 제3종일반주거 신축 검토"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="op-comment" className="text-xs">
                검토 의견 <span className="text-muted-foreground">(선택, 2~3줄)</span>
              </Label>
              <textarea
                id="op-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="예) 일조 적용 시 최상층이 부분층이라 실사용 면적 확인이 필요합니다."
                className="w-full min-w-0 rounded-md border border-border bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
          </section>

          {/* 인적사항 */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-semibold break-keep">작성자 인적사항</h3>
              <span className="text-[11px] text-muted-foreground break-keep">
                이 브라우저에만 저장 · 만들 때 자동 저장됩니다
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 [&>*]:min-w-0">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <Label htmlFor={`op-${f.key}`} className="text-[11px] text-muted-foreground">
                    {f.label}
                  </Label>
                  <Input
                    id={`op-${f.key}`}
                    value={reporter[f.key]}
                    onChange={(e) => set(f.key, e.target.value)}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* 옵션 */}
          <label className="flex items-center gap-2 text-xs text-muted-foreground break-keep">
            <input
              type="checkbox"
              checked={withImages}
              onChange={(e) => setWithImages(e.target.checked)}
              className="size-4"
            />
            위치도·3D 매스 이미지 넣기 (3D 탭을 잠깐 열어 캡쳐합니다)
          </label>

          {status === "error" && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive break-keep">
              만들지 못했습니다: {errorMsg}
            </div>
          )}

          {/* 미리보기 */}
          {previewUrl && (
            <div className="rounded-md border border-border overflow-hidden">
              <iframe
                src={previewUrl}
                title="한장 보고서 미리보기"
                className="w-full h-[420px] bg-white"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
          <Button
            onClick={handleBuild}
            disabled={status === "building"}
            className="gap-1.5 bg-[#993C1D] hover:bg-[#7A2F16]"
            size="sm"
          >
            {status === "building" ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                만드는 중...
              </>
            ) : (
              <>
                <FileTextIcon className="size-4" />
                {previewUrl ? "다시 만들기" : "만들기"}
              </>
            )}
          </Button>
          <Button onClick={handlePrint} disabled={!previewUrl} variant="outline" size="sm" className="gap-1.5">
            <PrinterIcon className="size-4" />
            인쇄
          </Button>
          <Button onClick={handleDownload} disabled={!previewUrl} variant="outline" size="sm" className="gap-1.5">
            <DownloadIcon className="size-4" />
            PDF 저장
          </Button>
          <span className="text-[11px] text-muted-foreground ml-auto break-keep">
            인쇄 설정에서 <b>가로 방향 · 배율 100%</b>로 하면 1장에 맞습니다.
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
