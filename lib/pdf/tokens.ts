export const COLORS = {
  CORAL: "#F0997B",
  CORAL_DARK: "#993C1D",
  CORAL_LIGHT: "#FAECE7",
  CREAM: "#F5F3EE",
  DARK: "#262626",
  GRAY: "#595959",
  LIGHT_GRAY: "#E8E8E8",
  WHITE: "#FFFFFF",
  // 비용 분해 차트용
  ABOVE: "#5f7a89",
  BASEMENT: "#2f3e46",
  PARKING: "#d9a441",
  SOFT: "#8d877c",
  FARM: "#d97757",
  FOREST: "#9b6b46",
  DEV: "#b6573e",
} as const;

// A4 정확 치수 (mm 단위. @react-pdf size="A4" 기준)
export const PAGE = {
  WIDTH_MM: 210,
  HEIGHT_MM: 297,
  MARGIN_TOP: 30,
  MARGIN_BOTTOM: 25,
  MARGIN_LEFT: 25,
  MARGIN_RIGHT: 25,
  CONTENT_WIDTH: 160, // 210 - 25*2
} as const;
