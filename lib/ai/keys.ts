"use client";

import { useSyncExternalStore } from "react";

export type AIProvider = "gemini" | "claude" | null;

const GEMINI_KEY = "gyumo_gemini_key";
const CLAUDE_KEY = "gyumo_claude_key";
const CHANGE_EVENT = "gyumo:keys-changed";

export function getGeminiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(GEMINI_KEY) || "";
}

export function getClaudeKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CLAUDE_KEY) || "";
}

function emitChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function saveGeminiKey(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GEMINI_KEY, key);
  emitChange();
}

export function saveClaudeKey(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CLAUDE_KEY, key);
  emitChange();
}

export function clearKey(provider: "gemini" | "claude"): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(provider === "gemini" ? GEMINI_KEY : CLAUDE_KEY);
  emitChange();
}

export function getActiveProvider(): AIProvider {
  if (getGeminiKey()) return "gemini";
  if (getClaudeKey()) return "claude";
  return null;
}

export function maskKey(key: string): string {
  if (!key) return "미입력";
  if (key.length < 12) return "***";
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

/* ── React hook: LocalStorage를 SSR-safe하게 구독. ─────────────────────── */
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(CHANGE_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(CHANGE_EVENT, cb);
  };
}

export function useGeminiKey(): string {
  return useSyncExternalStore(subscribe, getGeminiKey, () => "");
}

export function useClaudeKey(): string {
  return useSyncExternalStore(subscribe, getClaudeKey, () => "");
}

export function useActiveProvider(): AIProvider {
  return useSyncExternalStore(subscribe, getActiveProvider, () => null);
}
