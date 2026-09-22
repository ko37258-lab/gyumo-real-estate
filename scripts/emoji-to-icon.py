# 이모지 → <Icon> 코드모드 (2026-09-22). 사용: python scripts/emoji-to-icon.py [--apply]
#
# 규칙
#  · JSX 텍스트 자리(태그 사이·줄 시작)의 이모지 → <Icon name="…" /> (매핑 없으면 삭제)
#  · 문자열 리터럴 안의 이모지 → 지운다. 단, 문자열이 이모지 하나뿐이면 아이콘 이름으로 바꾼다
#    (예: emoji: '🏢' → emoji: 'building'). 그 값을 그리는 곳은 <Icon name={x.emoji}/> 로 손봐야 한다.
#  · 글꼴 기호(✓ ✕ ★ ↗ ▶ ☆ ◀ …)와 국기(🇰🇷)는 건드리지 않는다.
#  · Icon 을 쓰게 된 파일에는 import 를 넣는다.
import io, re, glob, os, sys, json

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APPLY = '--apply' in sys.argv

# emojiIcons.js 에서 매핑을 읽는다 (한 곳에서만 관리)
src = io.open(os.path.join(ROOT, 'lib/icons/emojiIcons.ts'), encoding='utf-8').read()
MAP = dict(re.findall(r"'([^']+)':\s*'([a-z0-9-]+)'", src))

EMO = re.compile('(?:[\U0001F1E6-\U0001F1FF]{2})|[\U0001F300-\U0001FAFF☀-➿\U0001F000-\U0001F2FF⭐⬆⬇‼⁉ℹ↩↪⌚⌛⏏⏩-⏳⏸-⏺▪▫◻-◾⬛⬜]️?')
KEEP = set('✓✕★☆↗▶◀✗▲▼•·')

def is_flag(e):
    return len(e) >= 2 and '\U0001F1E6' <= e[0] <= '\U0001F1FF'

def icon_tag(name, extra=''):
    return f'<Icon name="{name}"{extra} />'

stats = {'jsx': 0, 'jsx_removed': 0, 'str_removed': 0, 'str_lone': 0, 'files': 0}
report = []

def convert_line(line, state, is_ts=False):
    """state: dict(in_str=None|quote, in_jsx_comment...) — 한 줄 단위 근사 파서."""
    out = []
    i = 0
    quote = state['quote']
    n = len(line)
    while i < n:
        ch = line[i]
        m = EMO.match(line, i)
        if m and ch not in KEEP:
            e = m.group()
            if is_flag(e):
                out.append(e); i = m.end(); continue
            name = MAP.get(e) or MAP.get(e.replace('️', '')) or MAP.get(e + '️')
            # 뒤따르는 공백 하나까지 흡수
            j = m.end()
            if j < n and line[j] == ' ':
                j += 1
            if quote:
                # 문자열 안
                stats['str_removed'] += 1
                # 문자열이 이모지 하나뿐인지: 앞은 여는 따옴표, 뒤는 닫는 따옴표
                before = ''.join(out)
                if before.endswith(quote) and j < n and line[j] == quote and name:
                    out.append(name); stats['str_lone'] += 1; stats['str_removed'] -= 1
                    i = m.end(); continue
                i = j; continue
            else:
                if name and not is_ts:
                    out.append(icon_tag(name)); stats['jsx'] += 1
                    # 아이콘 뒤 글자와 붙지 않게 공백 유지
                    if j > m.end(): out.append(' ')
                else:
                    stats['jsx_removed'] += 1
                i = j; continue
        # 따옴표 상태 추적 (이스케이프 무시 근사)
        if quote:
            if ch == '\\' and i + 1 < n:
                out.append(line[i:i+2]); i += 2; continue
            if ch == quote:
                quote = None
        else:
            if ch in ('"', "'", '`'):
                # JSX 속성값 따옴표도 문자열로 본다 (title="⚠️ …" 안의 이모지는 지움)
                quote = ch
            elif ch == '/' and line[i:i+2] == '//' and not line[:i].strip().endswith(':'):
                # 주석 — 나머지는 그대로
                out.append(line[i:]); i = n; break
        out.append(ch); i += 1
    state['quote'] = quote if quote == '`' else None  # 백틱만 줄을 넘길 수 있다
    return ''.join(out)

files = sorted(glob.glob(os.path.join(ROOT, 'app/**/*.tsx'), recursive=True) + glob.glob(os.path.join(ROOT, 'components/**/*.tsx'), recursive=True) + glob.glob(os.path.join(ROOT, 'lib/**/*.ts'), recursive=True))
for f in files:
    if 'emojiIcons' in f or '__tests__' in f or 'icons.generated' in f or f.endswith('icon.tsx'):
        continue
    text = io.open(f, encoding='utf-8').read()
    if not EMO.search(text):
        continue
    before = dict(stats)
    state = {'quote': None}
    lines = text.split('\n')
    new = [convert_line(l, state, f.endswith('.ts')) for l in lines]
    new_text = '\n'.join(new)
    used_icon = '<Icon ' in new_text and '<Icon ' not in text
    if used_icon and f.endswith('.tsx') and "ui/icon'" not in new_text:
        imp = "import { Icon } from '@/components/ui/icon'\n"
        # 첫 import 뒤에 삽입, import 가 없으면 맨 앞
        mm = re.search(r'^import .*$', new_text, re.M)
        if mm:
            new_text = new_text[:mm.end()+1] + imp + new_text[mm.end()+1:]
        else:
            new_text = imp + new_text
    if new_text != text:
        stats['files'] += 1
        d = {k: stats[k]-before[k] for k in ('jsx','jsx_removed','str_removed','str_lone')}
        report.append((os.path.relpath(f, ROOT), d))
        if APPLY:
            io.open(f, 'w', encoding='utf-8').write(new_text)

for f, d in report:
    print(f'{f}: {d}')
print('TOTAL', stats, 'applied' if APPLY else 'dry-run')
