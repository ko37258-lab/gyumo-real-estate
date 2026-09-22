// 우리 아이콘 — 이모지 대신 쓰는 인라인 SVG (2026-09-22, 372law 와 같은 72종)
// 힉스필드(Recraft vector)로 그린 2톤. 남색은 currentColor(테마 따라감), 금색 #C9A84C 고정, 흰 판은 --icon-bg.
// 사용: <Icon name="house" /> · <Icon name="warning" size={18} />
import { ICON_SVGS } from "@/lib/icons/icons.generated";

export const ICON_NAMES = Object.keys(ICON_SVGS).sort();

export function Icon({ name, size, className = "", title, style }: {
  name: string; size?: number; className?: string; title?: string; style?: React.CSSProperties;
}) {
  const raw = ICON_SVGS[name];
  if (!raw) return null;
  const sz = size ? { width: size, height: size } : undefined;
  return (
    <span
      className={`ico ico-${name} ${className}`.trim()}
      style={sz ? { ...sz, ...style } : style}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      dangerouslySetInnerHTML={{ __html: raw }}
    />
  );
}
export default Icon;
