import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/ai/prompts";
import type { AIAnalysis, ReportInputs } from "@/lib/ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  provider: "gemini" | "claude";
  apiKey: string;
  input: ReportInputs;
}

function stripCodeFence(text: string): string {
  const t = text.trim();
  if (t.startsWith("```")) {
    return t
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }
  return t;
}

function parseAnalysis(raw: string): Omit<AIAnalysis, "provider" | "generatedAt"> {
  const clean = stripCodeFence(raw);
  const parsed = JSON.parse(clean);
  const ensureArr3 = (arr: unknown, name: string): string[] => {
    if (!Array.isArray(arr)) throw new Error(`${name}는 배열이어야 합니다.`);
    const s = arr.map((x) => String(x ?? "")).filter(Boolean);
    while (s.length < 3) s.push("");
    return s.slice(0, 3);
  };
  return {
    summary: String(parsed.summary ?? "").trim(),
    risks: ensureArr3(parsed.risks, "risks"),
    recommendations: ensureArr3(parsed.recommendations, "recommendations"),
    costAdequacy: String(parsed.costAdequacy ?? "").trim(),
    nextSteps: ensureArr3(parsed.nextSteps, "nextSteps"),
    oneLiner: String(parsed.oneLiner ?? "").trim().slice(0, 60),
  };
}

async function callGemini(apiKey: string, userPrompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: { responseMimeType: "application/json" },
  });
  const result = await model.generateContent(userPrompt);
  return result.response.text();
}

async function callClaude(apiKey: string, userPrompt: string): Promise<string> {
  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });
  const block = res.content[0];
  if (block.type !== "text") throw new Error("Claude 응답이 텍스트가 아닙니다.");
  return block.text;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "잘못된 요청 본문" }, { status: 400 });
  }

  const { provider, apiKey, input } = body;
  if (!provider || !apiKey) {
    return NextResponse.json(
      { error: "provider 또는 apiKey가 누락되었습니다." },
      { status: 400 },
    );
  }
  if (!input || !input.scale || !input.cost) {
    return NextResponse.json(
      { error: "input 데이터가 유효하지 않습니다." },
      { status: 400 },
    );
  }

  const userPrompt = buildUserPrompt(input);

  try {
    const raw =
      provider === "gemini"
        ? await callGemini(apiKey, userPrompt)
        : await callClaude(apiKey, userPrompt);
    const parsed = parseAnalysis(raw);
    const analysis: AIAnalysis = {
      ...parsed,
      provider,
      generatedAt: new Date().toISOString(),
    };
    return NextResponse.json({ analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      /401|403|invalid|api key/i.test(message)
        ? 401
        : /429|quota|rate/i.test(message)
          ? 429
          : 500;
    return NextResponse.json({ error: `AI 분석 실패: ${message}` }, { status });
  }
}
