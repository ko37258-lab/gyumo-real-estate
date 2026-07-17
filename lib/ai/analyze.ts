"use client";

import {
  getActiveProvider,
  getClaudeKey,
  getGeminiKey,
  type AIProvider,
} from "./keys";
import type { AIAnalysis, ReportInputs } from "./types";

/** 서버 내장 분석 키 가용 여부 — ReportDialog가 열릴 때 확인. */
export type ServerKeyStatus = { serverGemini: boolean; serverClaude: boolean };

export async function fetchServerKeys(): Promise<ServerKeyStatus> {
  try {
    const res = await fetch("/api/ai/analyze");
    if (!res.ok) return { serverGemini: false, serverClaude: false };
    const j = (await res.json()) as Partial<ServerKeyStatus>;
    return {
      serverGemini: Boolean(j.serverGemini),
      serverClaude: Boolean(j.serverClaude),
    };
  } catch {
    return { serverGemini: false, serverClaude: false };
  }
}

export async function analyzeReport(input: ReportInputs): Promise<AIAnalysis> {
  const provider: AIProvider = getActiveProvider();
  // BYOK 우선, 없으면 provider/apiKey 생략 → 서버가 환경변수 키로 자동 분석 (서버 폴백)
  const body = provider
    ? {
        provider,
        apiKey: provider === "gemini" ? getGeminiKey() : getClaudeKey(),
        input,
      }
    : { input };

  const res = await fetch("/api/ai/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let payload: { analysis?: AIAnalysis; error?: string } = {};
  try {
    payload = await res.json();
  } catch {
    /* empty */
  }
  if (!res.ok || !payload.analysis) {
    throw new Error(payload.error || `AI 호출 실패 (HTTP ${res.status})`);
  }
  return payload.analysis;
}

export async function testKey(
  provider: "gemini" | "claude",
  apiKey: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (provider === "gemini") {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "안녕" }] }],
            generationConfig: { maxOutputTokens: 8 },
          }),
        },
      );
      if (!res.ok) {
        const t = await res.text();
        return { ok: false, error: `Gemini ${res.status}: ${t.slice(0, 120)}` };
      }
      return { ok: true };
    }
    // Claude key test is harder to do directly from browser due to CORS; route via API.
    const res = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "claude",
        apiKey,
        input: {
          reviewDate: new Date().toISOString().slice(0, 10),
          scale: {
            landAreaSqm: 100,
            landAreaPyeong: 30,
            zoneCode: "test",
            zoneName: "테스트",
            coverRatio: 60,
            floorRatio: 200,
            roadWidth: 6,
            buildingArea: 60,
            legalFloorArea: 200,
            actualFloorArea: 200,
            sunlightLoss: 0,
            parkingPlacement: "none",
            parkingSpaces: 0,
          },
          cost: {
            abovePyeong: 30,
            basementPyeong: 0,
            aboveUnit: 800,
            basementPremium: 150,
            aboveCost: 0,
            basementCost: 0,
            parkingCost: 0,
            softCost: 0,
            farmEnabled: false,
            farmCost: 0,
            forestEnabled: false,
            forestCost: 0,
            devEnabled: false,
            devCharge: 0,
            total: 0,
            totalArea: 30,
          },
        },
      }),
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const j = await res.json();
        if (j?.error) msg = String(j.error);
      } catch {
        /* empty */
      }
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
