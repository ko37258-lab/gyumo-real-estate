# -*- coding: utf-8 -*-
"""
build_video3.py — 9:16 모션 쇼츠 렌더러 v3 (프리텐다드 · 핀테크 스타일)

v2 대비 변경:
- 줌(화면 확대)은 처음/중간/끝 3회만 (캡션 zoom 플래그 + 첫/마지막 자동). 나머지 정적 → 깜빡임 제거.
- 자막: 항상 타자기 효과(글자 순차 등장 + 커서). 칩 크기는 전체 문장에 고정.
- 제목: typeTitle 장면(약 3장마다)은 제목도 타자기로 등장.
- 좌상단 워터마크 "AI 부동산활용 MR.K" 고정.
- 일러스트(illus): 지번조회 목업 / 건축매스 도면 / 법정vs실제 손실 비교 — 빈 공간 설명.
- 출력: 무음 MP4(rawvideo→ffmpeg). 음성은 따로 합본.

spec3.json: scene에 optional "typeTitle", "illus"("search"|"mass"|"loss").
            scene.captions 항목은 문자열 또는 {"t","big","zoom"}.
"""
import os, re, sys, json, argparse, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1920
FPS = 30
CPS = 30.0           # 자막 타자 속도(글자/초)
TITLE_CPS = 15.0     # 제목 타자 속도
HERE = os.path.dirname(os.path.abspath(__file__)).replace("\\", "/")
def _find_fdir():
    for c in (HERE + "/fonts", HERE + "/../fonts", os.path.dirname(HERE) + "/fonts"):
        if os.path.exists(c + "/Pretendard-Bold.otf"):
            return c
    return HERE + "/fonts"
FDIR = _find_fdir()

BG1, BG2 = (240, 238, 252), (224, 226, 250)
INK = (24, 25, 46); MUTED = (110, 112, 142)
VIOLET = (108, 92, 231); VIOLET2 = (143, 125, 244)
PINK = (232, 67, 147); PINK2 = (246, 112, 172)
NAVY = (19, 20, 38); WHITE = (250, 250, 253)
BORDER = (225, 225, 242); SOFTV = (231, 227, 251)
EMPH_DARK = (190, 175, 255); EMPH_LIGHT = VIOLET
REDLINE = (232, 80, 110)

WMAP = {"R": "Regular", "M": "Medium", "SB": "SemiBold", "B": "Bold", "XB": "ExtraBold", "BL": "Black"}
def _fp(weight):
    p = "%s/Pretendard-%s.otf" % (FDIR, weight)
    return p if os.path.exists(p) else "C:/Windows/Fonts/malgunbd.ttf"
_fc = {}
def F(size, w="R"):
    k = (size, w)
    if k not in _fc:
        _fc[k] = ImageFont.truetype(_fp(WMAP.get(w, "Regular")), size)
    return _fc[k]

MEAS = ImageDraw.Draw(Image.new("RGB", (8, 8)))
def tlen(s, f): return MEAS.textlength(s, font=f)

def to_seq(text):
    seq = []
    for part in re.split(r"(\*[^*]+\*)", text):
        if not part:
            continue
        emph = len(part) >= 2 and part[0] == "*" and part[-1] == "*"
        s = part[1:-1] if emph else part
        for ch in s:
            seq.append((ch, emph))
    return seq
def plain(text): return re.sub(r"\*", "", text)

def draw_runs(d, seq, x, y, f, base_col, emph_col):
    i = 0
    while i < len(seq):
        j = i; e = seq[i][1]
        while j < len(seq) and seq[j][1] == e:
            j += 1
        s = "".join(c for c, _ in seq[i:j])
        d.text((x, y), s, font=f, fill=(emph_col if e else base_col))
        x += tlen(s, f); i = j
    return x

def center_rich(d, text, f, y, base_col, emph_col):
    seq = to_seq(text); total = tlen("".join(c for c, _ in seq), f)
    draw_runs(d, seq, W / 2 - total / 2, y, f, base_col, emph_col)

def draw_rich_lines(d, lines_text, f, y0, dy, base_cols, emph_col, reveal=None):
    seqs = [to_seq(t) for t in lines_text]
    total = sum(len(s) for s in seqs)
    rem = total if reveal is None else max(0, min(total, reveal))
    show_cursor = reveal is not None and rem < total
    y = y0; end = None
    for idx, seq in enumerate(seqs):
        lw = tlen("".join(c for c, _ in seq), f); x = W / 2 - lw / 2
        if reveal is not None and rem <= 0:
            y += dy; continue
        take = len(seq) if reveal is None else min(len(seq), rem)
        x2 = draw_runs(d, seq[:take], x, y, f, base_cols[idx], emph_col)
        if reveal is not None:
            rem -= take
        end = (x2, y); y += dy
    if show_cursor and end:
        d.rectangle((end[0] + 4, end[1] + 8, end[0] + 12, end[1] + f.size), fill=base_cols[-1])
    return y0 + len(lines_text) * dy

# ---------- 그라데이션/카드 ----------
def vgrad(w, h, c1, c2):
    img = Image.new("RGB", (w, h), c1); d = ImageDraw.Draw(img)
    for yy in range(h):
        t = yy / max(1, h - 1)
        d.line([(0, yy), (w, yy)], fill=tuple(round(c1[k] + (c2[k] - c1[k]) * t) for k in range(3)))
    return img
def rmask(w, h, r):
    m = Image.new("L", (w, h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), radius=r, fill=255); return m
def grad_card(img, box, c1, c2, radius, shadow=True):
    x0, y0, x1, y1 = box; w, h = x1 - x0, y1 - y0
    if shadow:
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle((x0 + 3, y0 + 12, x1 + 3, y1 + 14), radius=radius, fill=(80, 70, 150, 70))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(16)))
    img.paste(vgrad(w, h, c1, c2).convert("RGBA"), (x0, y0), rmask(w, h, radius))
def white_card(img, box, radius):
    x0, y0, x1, y1 = box
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((x0 + 2, y0 + 10, x1 + 2, y1 + 12), radius=radius, fill=(70, 65, 130, 45))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)))
    ImageDraw.Draw(img).rounded_rectangle(box, radius=radius, fill=WHITE + (255,), outline=BORDER + (255,), width=2)

def make_bg():
    img = vgrad(W, H, BG1, BG2).convert("RGBA")
    blob = Image.new("RGBA", (W, H), (0, 0, 0, 0)); bd = ImageDraw.Draw(blob)
    bd.ellipse((-200, -150, 520, 560), fill=(255, 255, 255, 120))
    bd.ellipse((640, 60, 1280, 720), fill=(176, 158, 246, 70))
    bd.ellipse((-260, 1380, 460, 2080), fill=(150, 170, 248, 60))
    bd.ellipse((680, 1500, 1320, 2120), fill=(246, 170, 210, 45))
    img.alpha_composite(blob.filter(ImageFilter.GaussianBlur(120)))
    return img
BG = make_bg()

# ---------- 일러스트 ----------
def _label(d, x, y, text, f, col): d.text((x, y), text, font=f, fill=col)

def illus_search(img, box):
    x0, y0, x1, y1 = box; d = ImageDraw.Draw(img)
    white_card(img, (x0, y0, x1, y0 + 470), 30)
    d = ImageDraw.Draw(img)
    # 검색 필드
    fx0, fy0, fx1, fy1 = x0 + 36, y0 + 40, x1 - 36, y0 + 130
    d.rounded_rectangle((fx0, fy0, fx1, fy1), radius=20, fill=(244, 243, 252), outline=BORDER, width=2)
    cx = fx0 + 44; cy = (fy0 + fy1) // 2
    d.ellipse((cx - 16, cy - 16, cx + 12, cy + 12), outline=VIOLET, width=5)
    d.line((cx + 9, cy + 9, cx + 22, cy + 22), fill=VIOLET, width=5)
    d.text((fx0 + 78, cy - 22), "역삼동 825-3", font=F(38, "SB"), fill=INK)
    d.rounded_rectangle((fx1 - 112, fy0 + 14, fx1 - 14, fy1 - 14), radius=16, fill=VIOLET + (255,))
    d.text((fx1 - 90, cy - 19), "조회", font=F(32, "B"), fill=WHITE)
    # 결과 칩들
    chips = [("대지면적", "661㎡ · 200평"), ("용도지역", "제2종일반주거"), ("전면도로", "6m")]
    cyy = fy1 + 34
    for lab, val in chips:
        d.text((fx0, cyy), lab, font=F(28, "M"), fill=MUTED)
        vw = tlen(val, F(34, "B"))
        d.text((fx1 - vw, cyy - 3), val, font=F(34, "B"), fill=VIOLET)
        cyy += 70

def _mini_panel(d, box, title):
    x0, y0, x1, y1 = box
    d.rounded_rectangle(box, radius=22, fill=WHITE + (255,), outline=BORDER, width=2)
    d.text((x0 + 24, y0 + 18), title, font=F(26, "SB"), fill=MUTED)

def illus_mass(img, box):
    x0, y0, x1, y1 = box; d = ImageDraw.Draw(img)
    gap = 30; pw = (x1 - x0 - gap) // 2
    # 좌: 평면도
    pL = (x0, y0, x0 + pw, y1); _mini_panel(d, pL, "평면도")
    lx0, ly0, lx1, ly1 = x0 + 40, y0 + 90, x0 + pw - 40, y1 - 60
    d.rectangle((lx0, ly0, lx1, ly1), outline=(150, 150, 170), width=3)  # 대지경계(점선 느낌)
    for xx in range(lx0, lx1, 16):
        d.line((xx, ly0, min(xx + 8, lx1), ly0), fill=(150, 150, 170), width=3)
    # 일조권 제한 영역(상단 핑크 해치)
    d.rectangle((lx0, ly0, lx1, ly0 + 40), fill=(250, 222, 233))
    d.line((lx0, ly0 + 40, lx1, ly0 + 40), fill=REDLINE, width=3)
    # 건물 매스
    bx0, by0, bx1, by1 = lx0 + 36, ly0 + 60, lx1 - 36, ly1 - 26
    grad_card(img, (bx0, by0, bx1, by1), VIOLET2, VIOLET, 14, shadow=False)
    d = ImageDraw.Draw(img)
    # 우: 정북단면
    pR = (x1 - pw, y0, x1, y1); _mini_panel(d, pR, "정북단면")
    ex0, ey0, ex1, ey1 = x1 - pw + 40, y0 + 90, x1 - 40, y1 - 60
    base = ey1
    # 계단형(일조권 사선) 건물
    steps = [(0.0, 0.0), (0.0, 0.46), (0.16, 0.62), (0.34, 0.78), (0.52, 1.0)]
    fullw = ex1 - ex0; H2 = (ey1 - (ey0 + 30))
    poly = [(ex0, base)]
    for sb, hr in steps:
        poly.append((ex0 + sb * fullw, base - hr * H2))
    poly.append((ex1, base - steps[-1][1] * H2)); poly.append((ex1, base))
    d.polygon(poly, fill=VIOLET)
    # 사선
    d.line((ex0, base - 0.46 * H2, ex1, base - 1.0 * H2), fill=REDLINE, width=4)
    d.line((ex0, base, ex1, base), fill=(120, 120, 140), width=3)
    d.text((ex0, ey0 + 4), "일조권 사선", font=F(24, "B"), fill=REDLINE)

def illus_loss(img, box):
    x0, y0, x1, y1 = box; d = ImageDraw.Draw(img)
    gap = 60; pw = (x1 - x0 - gap) // 2
    base = y1 - 70
    # 법정(풀)
    aL = (x0 + 20, y0 + 30, x0 + pw - 20, base)
    grad_card(img, aL, VIOLET2, VIOLET, 18); d = ImageDraw.Draw(img)
    d.text((x0 + 20, base + 12), "법정", font=F(34, "B"), fill=INK)
    d.text((x0 + 20, base + 56), "1,653㎡", font=F(28, "M"), fill=MUTED)
    # 실제(사선 컷)
    rx0, ry0, rx1, ry1 = x1 - pw + 20, y0 + 30, x1 - 20, base
    cut = int((ry1 - ry0) * 0.30)
    poly = [(rx0, ry1), (rx0, ry0 + cut), (rx0 + (rx1 - rx0) * 0.5, ry0), (rx1, ry0 + int(cut * 0.2)), (rx1, ry1)]
    # 핑크 그라데이션 매스(폴리곤 마스크)
    gc = vgrad(rx1 - rx0, ry1 - ry0, PINK2, PINK).convert("RGBA")
    m = Image.new("L", (rx1 - rx0, ry1 - ry0), 0)
    ImageDraw.Draw(m).polygon([(px - rx0, py - ry0) for px, py in poly], fill=255)
    img.paste(gc, (rx0, ry0), m); d = ImageDraw.Draw(img)
    d.line((rx0, ry0 + cut, rx1, ry0 + int(cut * 0.2)), fill=REDLINE, width=4)
    d.text((rx1 - tlen("실제", F(34, "B")), base + 12), "실제", font=F(34, "B"), fill=INK)
    los = "−손실"
    d.text((rx1 - tlen(los, F(28, "B")), base + 56), los, font=F(28, "B"), fill=PINK)
    # 가운데 화살표
    my = (y0 + 30 + base) // 2
    d.text((x0 + pw + 6, my - 24), "▶", font=F(40, "B"), fill=MUTED)

def draw_illus(img, kind, box):
    if kind == "search": illus_search(img, box)
    elif kind == "mass": illus_mass(img, box)
    elif kind == "loss": illus_loss(img, box)

# ---------- 장면 ----------
def render_scene(sc, title_reveal=None):
    img = BG.copy(); d = ImageDraw.Draw(img)
    layout = sc.get("layout", "hero")
    if sc.get("kicker"):
        center_rich(d, sc["kicker"], F(36, "B"), 250, VIOLET, VIOLET)
    if layout == "hero":
        lines = sc.get("title", [])
        base_cols = [(VIOLET if (i == len(lines) - 1 and len(lines) > 1 and "*" not in l) else INK) for i, l in enumerate(lines)]
        draw_rich_lines(d, lines, F(96, "XB"), 560, 132, base_cols, EMPH_LIGHT, reveal=title_reveal)
        y = 560 + len(lines) * 132 + 28
        for l in sc.get("subtitle", []):
            center_rich(d, l, F(46, "M"), y, MUTED, VIOLET); y += 66
        if sc.get("illus"):
            draw_illus(img, sc["illus"], (140, max(y + 30, 900), 940, max(y + 30, 900) + 500))
    elif layout == "points":
        y = 300
        for l in sc.get("title", []):
            center_rich(d, l, F(62, "XB"), y, INK, EMPH_LIGHT); y += 92
        items = sc.get("items", [])[:4]; y = max(y + 36, 560); ch = 150; gap = 34
        for i, t in enumerate(items):
            white_card(img, (120, y, W - 120, y + ch), 30); d = ImageDraw.Draw(img)
            cyc = y + ch // 2
            d.ellipse((158, cyc - 30, 218, cyc + 30), fill=VIOLET + (255,))
            nf = F(34, "B"); n = str(i + 1)
            d.text((188 - tlen(n, nf) / 2, cyc - nf.getmetrics()[0] + 6), n, font=nf, fill=WHITE)
            tf = F(42, "M"); asc, desc = tf.getmetrics()
            draw_runs(d, to_seq(t), 256, cyc - (asc + desc) / 2, tf, (40, 40, 64), VIOLET)
            y += ch + gap
    elif layout == "highlight":
        y = 286
        for l in sc.get("title", []):
            center_rich(d, l, F(58, "XB"), y, INK, EMPH_LIGHT); y += 84
        if sc.get("badge"):
            bf = F(38, "B"); bw = tlen(sc["badge"], bf); pw = bw + 76; by = y + 6
            d.rounded_rectangle((W // 2 - pw // 2, by, W // 2 + pw // 2, by + 84), radius=42, fill=SOFTV + (255,))
            d.text((W // 2 - bw / 2, by + 42 - bf.getmetrics()[0] + 6), sc["badge"], font=bf, fill=VIOLET); y = by + 132
        if sc.get("illus"):
            draw_illus(img, sc["illus"], (110, y + 10, W - 110, y + 540))
        else:
            cards = sc.get("cards", [])[:2]
            if cards:
                grads = [(VIOLET2, VIOLET), (PINK2, PINK)]; cw = (W - 240 - 30) // len(cards); chh = 380; cy = max(y, 560)
                for i, c in enumerate(cards):
                    x0 = 120 + i * (cw + 30); grad_card(img, (x0, cy, x0 + cw, cy + chh), grads[i % 2][0], grads[i % 2][1], 28)
                    d = ImageDraw.Draw(img)
                    d.text((x0 + 34, cy + 30), c.get("title", ""), font=F(30, "SB"), fill=(255, 255, 255))
                    yy = cy + 104
                    for k, ln in enumerate(c.get("lines", [])[:5]):
                        bb = (k == 1)
                        d.text((x0 + 34, yy), ln, font=F(40 if bb else 32, "B" if bb else "M"), fill=(255, 255, 255))
                        yy += 70 if bb else 56
    elif layout == "outro":
        lines = sc.get("title", [])
        base_cols = [(VIOLET if (i == len(lines) - 1 and len(lines) > 1 and "*" not in l) else INK) for i, l in enumerate(lines)]
        draw_rich_lines(d, lines, F(104, "XB"), 360, 140, base_cols, EMPH_LIGHT, reveal=title_reveal)
        y = 360 + len(lines) * 140
        for l in sc.get("subtitle", []):
            center_rich(d, l, F(46, "M"), y, MUTED, VIOLET); y += 70
        if sc.get("cta"):
            y = max(y + 36, 720); grad_card(img, (150, y, W - 150, y + 142), VIOLET2, VIOLET, 34); d = ImageDraw.Draw(img)
            cf = F(50, "B"); d.text((W / 2 - tlen(sc["cta"], cf) / 2, y + 71 - cf.getmetrics()[0] + 8), sc["cta"], font=cf, fill=WHITE); y += 200
        for l in (sc.get("note") or []):
            center_rich(d, l, F(38, "M"), y, MUTED, VIOLET); y += 58
    return img.convert("RGB")

# ---------- 자막(타자기) ----------
def layout_caption(text, big):
    f = F(62 if big else 50, "B" if big else "SB"); maxw = 900
    seq = to_seq(text); lines = []; cur = []; last_sp = -1
    for it in seq:
        cur.append(it)
        if it[0] == " ": last_sp = len(cur) - 1
        if tlen("".join(c for c, _ in cur), f) > maxw:
            if last_sp > 0: lines.append(cur[:last_sp]); cur = cur[last_sp + 1:]; last_sp = -1
            else: lines.append(cur[:-1]); cur = [it]; last_sp = -1
    if cur: lines.append(cur)
    line_h = int(f.size * 1.34); block_h = line_h * len(lines)
    lw = [tlen("".join(c for c, _ in ln), f) for ln in lines]
    padx, pady = 38, 24
    pill_w = min(W - 60, int(max(lw) + 2 * padx)); pill_h = block_h + 2 * pady
    bottom = 1792; top = bottom - pill_h
    x0, x1 = W // 2 - pill_w // 2, W // 2 + pill_w // 2; rad = min(pill_h // 2, 40)
    return dict(f=f, lines=lines, lw=lw, line_h=line_h, pady=pady, top=top, bottom=bottom,
                x0=x0, x1=x1, rad=rad, total=sum(len(l) for l in lines))

def pill_base(scene_rgb, lay):
    out = scene_rgb.convert("RGBA")
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((lay["x0"], lay["top"] + 8, lay["x1"], lay["bottom"] + 10), radius=lay["rad"], fill=(15, 15, 30, 120))
    out.alpha_composite(sh.filter(ImageFilter.GaussianBlur(16)))
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ov).rounded_rectangle((lay["x0"], lay["top"], lay["x1"], lay["bottom"]), radius=lay["rad"], fill=NAVY + (240,))
    out.alpha_composite(ov)
    return out.convert("RGB")

def draw_caption_text(img, lay, reveal):
    d = ImageDraw.Draw(img); f = lay["f"]; rem = reveal; yy = lay["top"] + lay["pady"]; end = None
    for idx, ln in enumerate(lay["lines"]):
        x = W / 2 - lay["lw"][idx] / 2
        if rem <= 0:
            yy += lay["line_h"]; continue
        take = min(len(ln), rem); x2 = draw_runs(d, ln[:take], x, yy, f, (255, 255, 255), EMPH_DARK)
        rem -= take; end = (x2, yy); yy += lay["line_h"]
    if reveal < lay["total"] and end:
        d.rectangle((end[0] + 3, end[1] + 8, end[0] + 9, end[1] + f.size + 2), fill=(255, 255, 255))

# ---------- 워터마크 / 진행바 / 줌 ----------
def draw_brand(frame):
    d = ImageDraw.Draw(frame)
    f1 = F(28, "SB"); f2 = F(28, "B")
    t1 = "AI 부동산활용 "; x = 44; y = 60
    d.text((x, y), t1, font=f1, fill=(70, 72, 104)); x += tlen(t1, f1)
    bw = tlen("MR.K", f2) + 28
    d.rounded_rectangle((x, y - 6, x + bw, y + 42), radius=16, fill=VIOLET + (255,))
    d.text((x + 14, y), "MR.K", font=f2, fill=WHITE)

def draw_progress(frame, frac):
    d = ImageDraw.Draw(frame)
    d.rectangle((0, 1909, W, 1920), fill=(214, 212, 235))
    d.rectangle((0, 1909, int(W * frac), 1920), fill=VIOLET)

def zoomed(still, s):
    if abs(s - 1.0) < 1e-3: return still
    nw, nh = max(2, round(W * s)), max(2, round(H * s)); r = still.resize((nw, nh), Image.BILINEAR)
    if s > 1.0:
        return r.crop(((nw - W) // 2, (nh - H) // 2, (nw - W) // 2 + W, (nh - H) // 2 + H))
    canvas = BG.convert("RGB").copy(); canvas.paste(r, ((W - nw) // 2, (H - nh) // 2)); return canvas

def eo(u): return 1 - (1 - u) ** 2
def ei(u): return u * u
def scale_at(lf, seg, do_in, do_out):
    if do_in:
        fr = max(1, round(0.42 * FPS))
        if lf < fr: return 1.12 + (1.0 - 1.12) * eo(lf / fr)
    if do_out:
        fr = max(1, round(0.6 * FPS))
        if seg - lf <= fr: return 1.0 + (0.85 - 1.0) * ei(max(0.0, min(1.0, (lf - (seg - fr)) / fr)))
    return 1.0

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--spec", required=True); ap.add_argument("--out", required=True)
    a = ap.parse_args(); spec = json.load(open(a.spec, encoding="utf-8"))
    total = float(spec.get("total_duration", 100.0)); scenes = spec["scenes"]
    flat = []; scene_first = {}
    for si, sc in enumerate(scenes):
        for cap in sc.get("captions", []):
            if si not in scene_first: scene_first[si] = len(flat)
            if isinstance(cap, dict): flat.append((si, cap.get("t", ""), bool(cap.get("big")), bool(cap.get("zoom"))))
            else: flat.append((si, cap, False, False))
    if not flat: print("ERROR: no captions"); sys.exit(1)
    weights = [max(1, len(re.sub(r"\s", "", plain(t)))) for _, t, _, _ in flat]
    Wt = sum(weights); bounds = []; cum = 0.0
    for w in weights:
        cum += total * w / Wt; bounds.append(round(cum * FPS))
    total_frames = bounds[-1]; last_i = len(flat) - 1

    scene_full = {}; log = open(HERE + "/_ff3.log", "wb")
    cmd = ["ffmpeg", "-y", "-f", "rawvideo", "-pixel_format", "rgb24", "-video_size", "%dx%d" % (W, H),
           "-framerate", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
           "-pix_fmt", "yuv420p", "-movflags", "+faststart", a.out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=log)

    start = 0
    for i, (si, text, big, zoom) in enumerate(flat):
        end = bounds[i]; seg = max(1, end - start)
        sc = scenes[si]
        type_title = bool(sc.get("typeTitle")) and (i == scene_first[si]) and sc.get("layout") in ("hero", "outro")
        if si not in scene_full:
            scene_full[si] = render_scene(sc)
        lay = layout_caption(text, big)
        title_total = sum(len(plain(l)) for l in sc.get("title", [])) if type_title else 0
        do_in = (i == 0) or zoom
        do_out = (i == last_i)
        # 타자 없는 정적 캡션 still 캐시 (타이틀 타자 아닐 때)
        static_full = None
        if not type_title:
            base_img = pill_base(scene_full[si], lay)
            full_img = base_img.copy(); draw_caption_text(full_img, lay, lay["total"]); static_full = full_img
        for lf in range(seg):
            el = lf / FPS
            reveal = min(lay["total"], int(el * CPS) + 1)
            if type_title:
                tr = min(title_total, int(el * TITLE_CPS) + 1)
                scn = render_scene(sc, title_reveal=tr)
                frame = pill_base(scn, lay); draw_caption_text(frame, lay, reveal)
            else:
                if reveal >= lay["total"]:
                    frame = static_full.copy()
                else:
                    frame = base_img.copy(); draw_caption_text(frame, lay, reveal)
            s = scale_at(lf, seg, do_in, do_out)
            if abs(s - 1.0) >= 1e-3:
                frame = zoomed(frame, s)
            draw_brand(frame); draw_progress(frame, (start + lf + 1) / total_frames)
            p.stdin.write(frame.tobytes())
        start = end
        sys.stdout.write("\r렌더 %d/%d" % (i + 1, len(flat))); sys.stdout.flush()
    p.stdin.close(); rc = p.wait(); log.close()
    if rc != 0: print("\nffmpeg fail:", HERE + "/_ff3.log"); sys.exit(1)
    print("\nOK ->", a.out, "| %d컷 | %d프레임 | %.1f초" % (len(flat), total_frames, total))

if __name__ == "__main__":
    main()
