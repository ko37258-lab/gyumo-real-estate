"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_THEME_ID, type ThemeId } from "./themes";

const STORAGE_KEY = "gyumo_theme";
const CHANGE_EVENT = "gyumo:theme-changed";

export function getActiveThemeId(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME_ID;
  return (
    (localStorage.getItem(STORAGE_KEY) as ThemeId | null) ?? DEFAULT_THEME_ID
  );
}

export function setActiveThemeId(id: ThemeId): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, id);
  applyThemeToDocument(id);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function applyThemeToDocument(id: ThemeId): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", id);
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(CHANGE_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(CHANGE_EVENT, cb);
  };
}

export function useActiveThemeId(): ThemeId {
  return useSyncExternalStore(
    subscribe,
    getActiveThemeId,
    () => DEFAULT_THEME_ID,
  );
}
