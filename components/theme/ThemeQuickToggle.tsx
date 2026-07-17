"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { setActiveThemeId, useActiveThemeId } from "@/lib/theme/storage";
import { THEMES, getTheme } from "@/lib/theme/themes";

export function ThemeQuickToggle() {
  const activeId = useActiveThemeId();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const current = getTheme(activeId);

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((o) => !o)}
        className="gap-1.5 px-2.5"
        aria-haspopup="menu"
        aria-expanded={open}
        title="화면 색상 테마 선택"
      >
        <span className="text-base">🎨</span>
        <span className="hidden md:inline text-[11px] text-muted-foreground">
          {current.emoji} {current.name.replace(" (추천)", "")}
        </span>
      </Button>

      {open && (
        <div
          role="menu"
          // z-[1200]: leaflet 지도 pane(400)·컨트롤(1000)보다 위 — ① 탭 지도에 가려 잘리는 현상 방지
          className="absolute right-0 top-full mt-2 z-[1200] w-72 rounded-lg border border-border bg-card shadow-xl overflow-hidden"
        >
          <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground bg-secondary/60 border-b border-border">
            🎨 화면 색상 테마 선택
          </div>
          <ul className="py-1">
            {THEMES.map((theme) => {
              const isActive = theme.id === activeId;
              return (
                <li key={theme.id}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={isActive}
                    onClick={() => {
                      setActiveThemeId(theme.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition hover:bg-secondary/80 ${
                      isActive ? "bg-secondary/50" : ""
                    }`}
                  >
                    <span className="flex gap-1 flex-shrink-0">
                      <span
                        className="w-3 h-3 rounded-full border border-black/10"
                        style={{ background: theme.colors.primary }}
                      />
                      <span
                        className="w-3 h-3 rounded-full border border-black/10"
                        style={{ background: theme.colors.primaryDark }}
                      />
                      <span
                        className="w-3 h-3 rounded-full border border-black/10"
                        style={{ background: theme.colors.accent }}
                      />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-1 text-[12.5px] font-semibold">
                        {theme.emoji} {theme.name}
                        {isActive && (
                          <span className="ml-auto text-[var(--success)] text-[11px]">
                            ✓
                          </span>
                        )}
                      </span>
                      <span className="block text-[10.5px] text-muted-foreground leading-tight">
                        {theme.description}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-border">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-[11px] text-muted-foreground hover:bg-secondary/60 transition"
            >
              ⚙️ 자세한 설정으로...
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
