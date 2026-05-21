"use client";

import { useState } from "react";
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

type TestState = { status: "idle" | "ok" | "fail"; message?: string };

export default function SettingsPage() {
  const [geminiInput, setGeminiInput] = useState("");
  const [claudeInput, setClaudeInput] = useState("");
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
                AI API 키 설정
              </h1>
              <p className="text-[12px] text-muted-foreground mt-1">
                Gemini를 1순위로 사용합니다. 키는 브라우저(LocalStorage)에만 저장되며 서버에 전송하지 않습니다.
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

        <KeyCard
          title="Google Gemini"
          badge="1순위 추천"
          badgeColor="bg-[var(--info)] text-white"
          docUrl="https://aistudio.google.com/apikey"
          docLabel="aistudio.google.com/apikey (무료)"
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
          docLabel="console.anthropic.com (유료)"
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
          ※ 키는 LocalStorage에 평문으로 저장됩니다. 공용 PC에서는 사용 후 반드시 삭제하세요. AI 호출은 본 서버를 경유해 외부 API로 전달되며, 본 서버는 키를 로그에 남기지 않습니다.
        </p>

        <ThemeCard />
        <BrandCard />
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
      <div className="text-[11px] text-muted-foreground mb-3">
        발급:{" "}
        <a
          href={docUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="underline text-[var(--info)]"
        >
          {docLabel}
        </a>
      </div>

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
