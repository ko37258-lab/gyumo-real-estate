"use client";

import { useState, useEffect } from "react";
import { Icon } from "@/components/ui/icon";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clearKey,
  maskKey,
  saveClaudeKey,
  saveGeminiKey,
  useClaudeKey,
  useGeminiKey,
} from "@/lib/ai/keys";
import { testKey } from "@/lib/ai/analyze";
import { BrandCard } from "@/components/settings/BrandCard";
import { ThemeCard } from "@/components/settings/ThemeCard";
import { canEditBrandSettings } from "@/lib/membership";

type TestState = { status: "idle" | "ok" | "fail"; message?: string };

export default function SettingsPage() {
  const [geminiInput, setGeminiInput] = useState("");
  const [claudeInput, setClaudeInput] = useState("");
  const [canBrand, setCanBrand] = useState(false);

  useEffect(() => {
    fetch("/api/usage", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { role?: string; isLoggedIn?: boolean }) => {
        setCanBrand(canEditBrandSettings(d.role, false));
      })
      .catch(() => null);
  }, []);
  const savedGemini = useGeminiKey();
  const savedClaude = useClaudeKey();
  const [testing, setTesting] = useState<"gemini" | "claude" | null>(null);
  const [geminiTest, setGeminiTest] = useState<TestState>({ status: "idle" });
  const [claudeTest, setClaudeTest] = useState<TestState>({ status: "idle" });

  const onSave = (p: "gemini" | "claude") => {
    if (p === "gemini") {
      const v = geminiInput.trim();
      if (!v) return;
      saveGeminiKey(v);
      setGeminiInput("");
      setGeminiTest({ status: "idle" });
    } else {
      const v = claudeInput.trim();
      if (!v) return;
      saveClaudeKey(v);
      setClaudeInput("");
      setClaudeTest({ status: "idle" });
    }
  };

  const onClear = (p: "gemini" | "claude") => {
    clearKey(p);
    if (p === "gemini") {
      setGeminiTest({ status: "idle" });
    } else {
      setClaudeTest({ status: "idle" });
    }
  };

  const onTest = async (p: "gemini" | "claude") => {
    const key = p === "gemini" ? savedGemini : savedClaude;
    if (!key) return;
    setTesting(p);
    const res = await testKey(p, key);
    setTesting(null);
    const setter = p === "gemini" ? setGeminiTest : setClaudeTest;
    setter(res.ok ? { status: "ok", message: "정상 응답" } : { status: "fail", message: res.error });
  };

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="max-w-2xl mx-auto bg-card rounded-xl p-6 border border-border space-y-4">
        <header className="pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-[20px] font-semibold tracking-tight">
                AI 분석 키 설정 (회원 본인 키)
              </h1>
              <p className="text-[12px] text-muted-foreground mt-1">
                보고서의 <b>전문 종합 분석</b>은 <b>회원님 본인 키</b>로 동작합니다. 아래에서 키를 한 번만 발급받아
                붙여넣으면 됩니다. 키는 이 브라우저에만 저장되고, 사용료는 각자 계정으로 청구됩니다.
              </p>
            </div>
            <Link
              href="/simulator"
              className="text-[12px] text-muted-foreground hover:text-foreground"
            >
              ← 시뮬레이터로
            </Link>
          </div>
        </header>

        {/* 키 발급 안내 — 처음 오는 회원이 바로 따라 할 수 있게 (2026-09-23) */}
        <div className="rounded-lg border border-border bg-secondary/50 p-4 space-y-2">
          <div className="text-[13px] font-semibold flex items-center gap-1.5">
            <Icon name="idea" /> 처음이신가요? 3단계면 끝납니다
          </div>
          <ol className="text-[12px] text-muted-foreground leading-relaxed list-decimal pl-5 space-y-1">
            <li>아래 <b>[키 발급받기]</b> 버튼을 눌러 구글 계정으로 로그인합니다.</li>
            <li>
              <b>Create API key</b>(키 만들기)를 누르면 <code className="px-1 bg-secondary rounded">AIza…</code> 로 시작하는
              긴 글자가 나옵니다. 그걸 복사합니다.
            </li>
            <li>이 화면으로 돌아와 아래 칸에 붙여넣고 <b>저장</b> → <b>연결 테스트</b>를 누릅니다.</li>
          </ol>
          <p className="text-[11px] text-muted-foreground">
            <b>Gemini는 무료 사용량</b>이 있어 보고서 분석 정도는 대부분 무료 범위에서 씁니다.
            지번 조회·지도·실거래 자료는 회사가 제공하므로 키가 필요 없습니다 — 이 키는 <b>보고서 AI 분석에만</b> 씁니다.
          </p>
        </div>

        <KeyCard
          title="Google Gemini"
          badge="1순위 추천"
          badgeColor="bg-[var(--info)] text-white"
          docUrl="https://aistudio.google.com/apikey"
          docLabel="구글 AI 스튜디오 · 무료 사용량 있음"
          howTo="구글 계정으로 로그인 → [Create API key] → AIza… 로 시작하는 키 복사 → 아래에 붙여넣기"
          input={geminiInput}
          setInput={setGeminiInput}
          saved={savedGemini}
          onSave={() => onSave("gemini")}
          onClear={() => onClear("gemini")}
          onTest={() => onTest("gemini")}
          testing={testing === "gemini"}
          test={geminiTest}
        />

        <KeyCard
          title="Anthropic Claude"
          badge="2순위 대체"
          badgeColor="bg-secondary text-foreground border border-border"
          docUrl="https://console.anthropic.com/"
          docLabel="Anthropic 콘솔 · 유료(선충전)"
          howTo="가입·결제수단 등록 → [API Keys] → [Create Key] → sk-ant-… 키 복사 → 아래에 붙여넣기"
          input={claudeInput}
          setInput={setClaudeInput}
          saved={savedClaude}
          onSave={() => onSave("claude")}
          onClear={() => onClear("claude")}
          onTest={() => onTest("claude")}
          testing={testing === "claude"}
          test={claudeTest}
        />

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          ※ 키는 이 브라우저(LocalStorage)에 저장됩니다. 공용 PC에서는 사용 후 <b>삭제</b>를 눌러 지우세요. 다른 기기에서 쓰려면 그 기기에서 한 번 더 넣어야 합니다. AI 호출은 본 서버를 거쳐 외부 API로 전달되며, 본 서버는 키를 저장하거나 기록하지 않습니다.
        </p>

        <ThemeCard />
        <BrandCard canEdit={canBrand} />
      </div>
    </main>
  );
}

function KeyCard({
  title,
  badge,
  badgeColor,
  docUrl,
  docLabel,
  howTo,
  input,
  setInput,
  saved,
  onSave,
  onClear,
  onTest,
  testing,
  test,
}: {
  title: string;
  badge: string;
  badgeColor: string;
  docUrl: string;
  docLabel: string;
  /** 발급 절차 한 줄 설명 — 사이트마다 버튼 이름이 달라 그대로 적어 준다 */
  howTo: string;
  input: string;
  setInput: (v: string) => void;
  saved: string;
  onSave: () => void;
  onClear: () => void;
  onTest: () => void;
  testing: boolean;
  test: TestState;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-baseline gap-2 mb-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${badgeColor}`}>
          {badge}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <a
          href={docUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-md"
          style={{ background: "#993C1D", color: "#fff" }}
        >
          <Icon name="external" /> 키 발급받기
        </a>
        <span className="text-[11px] text-muted-foreground">{docLabel}</span>
      </div>
      <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">{howTo}</p>

      <div className="space-y-2">
        <Label className="text-[11px] text-muted-foreground">
          현재 저장된 키
        </Label>
        <div className="flex items-center gap-2">
          <span className="text-[12px] tabular-nums font-mono px-2 py-1 bg-secondary rounded">
            {saved ? maskKey(saved) : "미입력"}
          </span>
          {saved && (
            <>
              <Button size="sm" variant="outline" onClick={onTest} disabled={testing}>
                {testing ? "테스트 중..." : "테스트"}
              </Button>
              <Button size="sm" variant="ghost" onClick={onClear}>
                삭제
              </Button>
            </>
          )}
        </div>
        {test.status !== "idle" && (
          <div
            className={`text-[11.5px] ${
              test.status === "ok"
                ? "text-[var(--success)]"
                : "text-destructive"
            }`}
          >
            {test.status === "ok" ? "✓ " : "✗ "}
            {test.message}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <Label className="text-[11px] text-muted-foreground">새 키 입력</Label>
        <div className="flex gap-2">
          <Input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={title + " API key"}
            className="flex-1 font-mono text-[12px]"
            autoComplete="off"
          />
          <Button onClick={onSave} disabled={!input.trim()}>
            저장
          </Button>
        </div>
      </div>
    </Card>
  );
}
