"use client";

import { Card } from "@/components/ui/card";
import { setActiveThemeId, useActiveThemeId } from "@/lib/theme/storage";
import { THEMES, type Theme } from "@/lib/theme/themes";

export function ThemeCard() {
  const activeId = useActiveThemeId();

  return (
    <Card className="p-5 space-y-4">
      <header>
        <h2 className="text-base font-semibold">🎨 화면 색상 테마</h2>
        <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
          사이트 전체의 색상 톤을 선택할 수 있습니다. PDF 보고서 색상은 별도로{" "}
          <span className="italic">보고서 브랜드 설정</span>에서 관리합니다.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {THEMES.map((t) => (
          <ThemeOption
            key={t.id}
            theme={t}
            active={activeId === t.id}
            onClick={() => setActiveThemeId(t.id)}
          />
        ))}
      </div>

      <p className="text-[10.5px] text-muted-foreground leading-relaxed">
        💡 선택 즉시 반영 · 새로고침 후에도 유지 · 다크 톤(미드나잇)은 어두운 배경
      </p>
    </Card>
  );
}

function ThemeOption({
  theme,
  active,
  onClick,
}: {
  theme: Theme;
  active: boolean;
  onClick: () => void;
}) {
  const c = theme.colors;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-lg border-2 p-3 transition-all hover:shadow-sm ${
        active
          ? "border-[var(--info)] shadow-md scale-[1.02]"
          : "border-border hover:border-foreground/30"
      }`}
      style={{ backgroundColor: c.background, color: c.foreground }}
      aria-pressed={active}
    >
      <div className="flex gap-1 mb-2.5">
        <span
          className="w-4 h-4 rounded-full"
          style={{ background: c.primary }}
        />
        <span
          className="w-4 h-4 rounded-full"
          style={{ background: c.primaryDark }}
        />
        <span
          className="w-4 h-4 rounded-full"
          style={{ background: c.accent }}
        />
      </div>
      <div className="text-[13px] font-bold leading-tight">
        {theme.emoji} {theme.name}
      </div>
      <div
        className="text-[10.5px] mt-1 leading-tight"
        style={{ color: c.mutedForeground }}
      >
        {theme.description}
      </div>
      {active && (
        <div
          className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{ background: c.primaryDark, color: "#fff" }}
        >
          ✓ 사용 중
        </div>
      )}
    </button>
  );
}
