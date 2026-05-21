export type ThemeId =
  | "mrhomes"
  | "forest"
  | "midnight"
  | "lightclean"
  | "premium";

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  background: string;
  foreground: string;
  accent: string;
  /** 카드/패널 배경 (보통 background 보다 한 단 더 밝거나 어둠) */
  card: string;
  /** 카드 위 텍스트 */
  cardForeground: string;
  /** 보조(회색) 배경 */
  secondary: string;
  /** 흐림(약한) 색 */
  muted: string;
  /** 흐림 텍스트 */
  mutedForeground: string;
  /** 보더 */
  border: string;
}

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  emoji: string;
  isDark?: boolean;
  colors: ThemeColors;
}

export const THEMES: Theme[] = [
  {
    id: "mrhomes",
    name: "MR.K (추천)",
    description: "미스터홈즈 기본 코랄·크림 톤",
    emoji: "🟧",
    colors: {
      primary: "#F0997B",
      primaryDark: "#993C1D",
      primaryLight: "#FAECE7",
      background: "#F5F3EE",
      foreground: "#262626",
      accent: "#D97757",
      card: "#FFFFFF",
      cardForeground: "#262626",
      secondary: "#EFECE5",
      muted: "#EFECE5",
      mutedForeground: "#5A5A5A",
      border: "rgba(0,0,0,0.12)",
    },
  },
  {
    id: "forest",
    name: "포레스트",
    description: "짙은 그린 + 베이지 (자연·친환경)",
    emoji: "🟢",
    colors: {
      primary: "#10B981",
      primaryDark: "#064E3B",
      primaryLight: "#D1FAE5",
      background: "#F5F3EB",
      foreground: "#1F2937",
      accent: "#059669",
      card: "#FFFFFF",
      cardForeground: "#1F2937",
      secondary: "#E7E5D8",
      muted: "#E7E5D8",
      mutedForeground: "#4B5563",
      border: "rgba(6,78,59,0.18)",
    },
  },
  {
    id: "midnight",
    name: "미드나잇",
    description: "다크 + 골드 액센트 (고급·집중)",
    emoji: "⚫",
    isDark: true,
    colors: {
      primary: "#FBBF24",
      primaryDark: "#92400E",
      primaryLight: "#3B2F1E",
      background: "#1F2937",
      foreground: "#F9FAFB",
      accent: "#F59E0B",
      card: "#273241",
      cardForeground: "#F9FAFB",
      secondary: "#374151",
      muted: "#374151",
      mutedForeground: "#9CA3AF",
      border: "rgba(255,255,255,0.12)",
    },
  },
  {
    id: "lightclean",
    name: "라이트 클린",
    description: "화이트 + 블루 액센트 (깔끔·밝음)",
    emoji: "⚪",
    colors: {
      primary: "#3B82F6",
      primaryDark: "#1E40AF",
      primaryLight: "#DBEAFE",
      background: "#FFFFFF",
      foreground: "#1F2937",
      accent: "#2563EB",
      card: "#F8FAFC",
      cardForeground: "#1F2937",
      secondary: "#F1F5F9",
      muted: "#F1F5F9",
      mutedForeground: "#64748B",
      border: "rgba(0,0,0,0.10)",
    },
  },
  {
    id: "premium",
    name: "프리미엄",
    description: "네이비 + 실버 (금융·기관 톤)",
    emoji: "🟦",
    colors: {
      primary: "#475569",
      primaryDark: "#1E293B",
      primaryLight: "#E2E8F0",
      background: "#F8FAFC",
      foreground: "#0F172A",
      accent: "#64748B",
      card: "#FFFFFF",
      cardForeground: "#0F172A",
      secondary: "#E2E8F0",
      muted: "#E2E8F0",
      mutedForeground: "#475569",
      border: "rgba(15,23,42,0.12)",
    },
  },
];

export const DEFAULT_THEME_ID: ThemeId = "mrhomes";

export function getTheme(id: ThemeId | string | null | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
