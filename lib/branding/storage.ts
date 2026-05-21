"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_BRAND } from "./defaults";
import type { BrandConfig } from "./types";

const STORAGE_KEY = "gyumo_brand_config";
const CHANGE_EVENT = "gyumo:brand-changed";

export function getBrandConfig(): BrandConfig {
  if (typeof window === "undefined") return DEFAULT_BRAND;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BRAND;
    const parsed = JSON.parse(raw) as Partial<BrandConfig>;
    // 누락 필드는 기본값으로 보완 (마이그레이션 안전성)
    return { ...DEFAULT_BRAND, ...parsed };
  } catch {
    return DEFAULT_BRAND;
  }
}

function emitChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function saveBrandConfig(patch: Partial<BrandConfig>): void {
  if (typeof window === "undefined") return;
  const current = getBrandConfig();
  const merged = { ...current, ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  emitChange();
}

export function resetBrandConfig(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  emitChange();
}

/* ── React hook: 변경 시 자동 재구독 (SSR-safe) ───────────────────────── */
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(CHANGE_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(CHANGE_EVENT, cb);
  };
}

export function useBrandConfig(): BrandConfig {
  return useSyncExternalStore(
    subscribe,
    getBrandConfig,
    () => DEFAULT_BRAND,
  );
}
