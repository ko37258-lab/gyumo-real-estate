# -*- coding: utf-8 -*-
"""
build_video.py — MR.K 핀테크 모션 쇼츠 렌더러 (9:16 · 프리텐다드)
스킬 mrk-motion-shorts의 정식 렌더러. 원본 사본: gyumo/outputs/build_video4.py. CHANGELOG는 스킬 폴더 참고.

기능:
- 자막 등장(시간 위치 자동): 초반 20%/후반 20% = 타자기, 중간 60% = 풀텍스트 + 칩 줌인.
- 화면(전체) 줌: 첫 컷 줌인 / 마지막 컷 줌아웃 2회만 (눈 피로 방지). 중간 강조는 자막 칩 줌인으로.
- 좌상단 "AI 부동산활용 MR.K" 워터마크 + 하단 보라 진행바, 컴팩트 다크 자막칩, *강조* 컬러.
- illus 20종: search·app·controls·map·graph·mass·loss·law · dday·room·timer·passprob·freq·streak · vs·skyline · contract·terms·layers·zonemap.
- illusData: cmp(2~3열 비교카드, win=보라+왕관) · stat(큰 수치) · photo(사진 임베드, cover-crop+둥근카드).

spec: scene에 optional typeTitle / illus / illusData. captions 항목은 문자열 또는 {"t","big"}.
숫자는 음성(narration)만 한글로 풀어쓰고 화면 자막·카드는 숫자 유지(ElevenLabs 오독 방지).
"""
import os, re, sys, json, argparse, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1920
FPS = 30
CPS = 30.0
TITLE_CPS = 15.0
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

# ---------- 일러스트 6종 ----------
def illus_search(img, box):
    x0, y0, x1, y1 = box
    white_card(img, (x0, y0, x1, y0 + 470), 30); d = ImageDraw.Draw(img)
    fx0, fy0, fx1, fy1 = x0 + 36, y0 + 40, x1 - 36, y0 + 130
    d.rounded_rectangle((fx0, fy0, fx1, fy1), radius=20, fill=(244, 243, 252), outline=BORDER, width=2)
    cx = fx0 + 44; cy = (fy0 + fy1) // 2
    d.ellipse((cx - 16, cy - 16, cx + 12, cy + 12), outline=VIOLET, width=5)
    d.line((cx + 9, cy + 9, cx + 22, cy + 22), fill=VIOLET, width=5)
    d.text((fx0 + 78, cy - 22), "역삼동 825-3", font=F(38, "SB"), fill=INK)
    d.rounded_rectangle((fx1 - 112, fy0 + 14, fx1 - 14, fy1 - 14), radius=16, fill=VIOLET + (255,))
    d.text((fx1 - 90, cy - 19), "조회", font=F(32, "B"), fill=WHITE)
    cyy = fy1 + 34
    for lab, val in [("대지면적", "661㎡ · 200평"), ("용도지역", "제2종일반주거"), ("전면도로", "6m")]:
        d.text((fx0, cyy), lab, font=F(28, "M"), fill=MUTED)
        d.text((fx1 - tlen(val, F(34, "B")), cyy - 3), val, font=F(34, "B"), fill=VIOLET)
        cyy += 70

def illus_app(img, box):
    x0, y0, x1, y1 = box
    pw = 308; ph = 472; px = (x0 + x1) // 2 - pw // 2; py = y0
    white_card(img, (px, py, px + pw, py + ph), 40); d = ImageDraw.Draw(img)
    d.rounded_rectangle((px + pw // 2 - 36, py + 16, px + pw // 2 + 36, py + 30), radius=7, fill=(30, 30, 46))
    sx = px + 24; sy = py + 50
    d.text((sx, sy), "건축가능 규모검토", font=F(25, "B"), fill=INK)
    grad_card(img, (sx, sy + 40, px + pw - 24, sy + 178), VIOLET2, VIOLET, 18, shadow=False); d = ImageDraw.Draw(img)
    d.text((sx + 20, sy + 60), "법정 연면적", font=F(20, "M"), fill=(255, 255, 255))
    d.text((sx + 20, sy + 92), "1,653㎡", font=F(46, "XB"), fill=(255, 255, 255))
    by = sy + 250; bx = sx + 8; bw = 40; gap = 16
    for k, hh in enumerate([46, 78, 104, 132]):
        d.rounded_rectangle((bx, by + (132 - hh), bx + bw, by + 132), radius=7, fill=(VIOLET if k == 3 else (203, 196, 242)))
        bx += bw + gap
    d.text((sx, by + 144), "규모 시뮬레이션", font=F(21, "M"), fill=MUTED)

def illus_controls(img, box):
    x0, y0, x1, y1 = box
    white_card(img, (x0, y0, x1, y0 + 432), 28); d = ImageDraw.Draw(img)
    ry = y0 + 40
    for lab, val, frac in [("건폐율", "60%", 0.60), ("용적률", "250%", 0.50), ("전면도로", "6m", 0.30)]:
        d.text((x0 + 34, ry), lab, font=F(28, "SB"), fill=INK)
        d.text((x1 - 34 - tlen(val, F(28, "B")), ry), val, font=F(28, "B"), fill=VIOLET)
        ty = ry + 54; tx0 = x0 + 34; tx1 = x1 - 34
        d.rounded_rectangle((tx0, ty, tx1, ty + 10), radius=5, fill=(225, 223, 240))
        kx = tx0 + int((tx1 - tx0) * frac)
        d.rounded_rectangle((tx0, ty, kx, ty + 10), radius=5, fill=VIOLET)
        d.ellipse((kx - 15, ty - 8, kx + 15, ty + 23), fill=WHITE, outline=VIOLET, width=4)
        ry += 104
    d.text((x0 + 34, ry), "일조권 사선", font=F(28, "SB"), fill=INK)
    tgw = 88; tgx = x1 - 34 - tgw
    d.rounded_rectangle((tgx, ry - 2, tgx + tgw, ry + 42), radius=22, fill=VIOLET)
    d.ellipse((tgx + tgw - 42, ry, tgx + tgw - 4, ry + 38), fill=WHITE)
    d.text((tgx - tlen("ON", F(22, "B")) - 12, ry + 6), "ON", font=F(22, "B"), fill=VIOLET)

def illus_law(img, box):
    x0, y0, x1, y1 = box
    white_card(img, (x0, y0, x1, y0 + 392), 28); d = ImageDraw.Draw(img)
    d.rounded_rectangle((x0 + 34, y0 + 30, x0 + 70, y0 + 66), radius=9, fill=VIOLET)
    d.text((x0 + 84, y0 + 32), "법적 근거", font=F(30, "B"), fill=INK)
    ry = y0 + 108
    for lab, code in [("건폐율·용적률", "국토계획법 시행령"), ("일조권 사선", "건축법 제61조"), ("지자체 강화", "도시계획조례")]:
        d.ellipse((x0 + 36, ry + 9, x0 + 56, ry + 29), fill=VIOLET)
        d.text((x0 + 74, ry), lab, font=F(28, "SB"), fill=INK)
        cw = tlen(code, F(26, "M")) + 28; cx1 = x1 - 34; cx0 = cx1 - cw
        d.rounded_rectangle((cx0, ry - 2, cx1, ry + 42), radius=12, fill=(238, 236, 250))
        d.text((cx0 + 14, ry + 5), code, font=F(26, "M"), fill=VIOLET)
        ry += 90

def _mini_panel(d, box, title):
    d.rounded_rectangle(box, radius=22, fill=WHITE + (255,), outline=BORDER, width=2)
    d.text((box[0] + 24, box[1] + 18), title, font=F(26, "SB"), fill=MUTED)

def illus_mass(img, box):
    x0, y0, x1, y1 = box; d = ImageDraw.Draw(img)
    gap = 30; pw = (x1 - x0 - gap) // 2
    pL = (x0, y0, x0 + pw, y1); _mini_panel(d, pL, "평면도")
    lx0, ly0, lx1, ly1 = x0 + 40, y0 + 90, x0 + pw - 40, y1 - 60
    d.rectangle((lx0, ly0, lx1, ly1), outline=(150, 150, 170), width=3)
    d.rectangle((lx0, ly0, lx1, ly0 + 40), fill=(250, 222, 233))
    d.line((lx0, ly0 + 40, lx1, ly0 + 40), fill=REDLINE, width=3)
    grad_card(img, (lx0 + 36, ly0 + 60, lx1 - 36, ly1 - 26), VIOLET2, VIOLET, 14, shadow=False)
    d = ImageDraw.Draw(img)
    pR = (x1 - pw, y0, x1, y1); _mini_panel(d, pR, "정북단면")
    ex0, ey0, ex1, ey1 = x1 - pw + 40, y0 + 90, x1 - 40, y1 - 60
    base = ey1; H2 = (ey1 - (ey0 + 30)); fullw = ex1 - ex0
    steps = [(0.0, 0.46), (0.16, 0.62), (0.34, 0.78), (0.52, 1.0)]
    poly = [(ex0, base), (ex0, base - 0.46 * H2)]
    for sb, hr in steps:
        poly.append((ex0 + sb * fullw, base - hr * H2))
    poly.append((ex1, base - H2)); poly.append((ex1, base))
    d.polygon(poly, fill=VIOLET)
    d.line((ex0, base - 0.46 * H2, ex1, base - H2), fill=REDLINE, width=4)
    d.line((ex0, base, ex1, base), fill=(120, 120, 140), width=3)
    d.text((ex0, ey0 + 4), "일조권 사선", font=F(24, "B"), fill=REDLINE)

def illus_loss(img, box):
    x0, y0, x1, y1 = box; d = ImageDraw.Draw(img)
    gap = 60; pw = (x1 - x0 - gap) // 2; base = y1 - 70
    grad_card(img, (x0 + 20, y0 + 30, x0 + pw - 20, base), VIOLET2, VIOLET, 18); d = ImageDraw.Draw(img)
    d.text((x0 + 20, base + 12), "법정", font=F(34, "B"), fill=INK)
    d.text((x0 + 20, base + 56), "1,653㎡", font=F(28, "M"), fill=MUTED)
    rx0, ry0, rx1, ry1 = x1 - pw + 20, y0 + 30, x1 - 20, base
    cut = int((ry1 - ry0) * 0.30)
    poly = [(rx0, ry1), (rx0, ry0 + cut), (rx0 + (rx1 - rx0) * 0.5, ry0), (rx1, ry0 + int(cut * 0.2)), (rx1, ry1)]
    gc = vgrad(rx1 - rx0, ry1 - ry0, PINK2, PINK).convert("RGBA")
    m = Image.new("L", (rx1 - rx0, ry1 - ry0), 0)
    ImageDraw.Draw(m).polygon([(px - rx0, py - ry0) for px, py in poly], fill=255)
    img.paste(gc, (rx0, ry0), m); d = ImageDraw.Draw(img)
    d.line((rx0, ry0 + cut, rx1, ry0 + int(cut * 0.2)), fill=REDLINE, width=4)
    d.text((rx1 - tlen("실제", F(34, "B")), base + 12), "실제", font=F(34, "B"), fill=INK)
    d.text((rx1 - tlen("−손실", F(28, "B")), base + 56), "−손실", font=F(28, "B"), fill=PINK)
    my = (y0 + 30 + base) // 2
    d.text((x0 + pw + 6, my - 24), "▶", font=F(40, "B"), fill=MUTED)

def illus_map(img, box):
    x0, y0, x1, y1 = box; h = min(y1 - y0, 460)
    white_card(img, (x0, y0, x1, y0 + h), 28); d = ImageDraw.Draw(img)
    mx0, my0, mx1, my1 = x0 + 24, y0 + 24, x1 - 24, y0 + h - 24
    d.rounded_rectangle((mx0, my0, mx1, my1), radius=18, fill=(235, 238, 250))
    gx = mx0 + 70
    while gx < mx1:
        d.line((gx, my0, gx, my1), fill=(216, 219, 238), width=7); gx += 96
    gy = my0 + 64
    while gy < my1:
        d.line((mx0, gy, mx1, gy), fill=(216, 219, 238), width=7); gy += 96
    px0 = mx0 + (mx1 - mx0) * 0.33; py0 = my0 + (my1 - my0) * 0.44
    px1 = mx0 + (mx1 - mx0) * 0.60; py1 = my0 + (my1 - my0) * 0.72
    d.rectangle((px0, py0, px1, py1), fill=(199, 189, 244), outline=VIOLET, width=4)
    cx = (px0 + px1) / 2; cy = (py0 + py1) / 2
    d.ellipse((cx - 25, cy - 56, cx + 25, cy - 6), fill=VIOLET)
    d.polygon([(cx - 16, cy - 24), (cx + 16, cy - 24), (cx, cy + 12)], fill=VIOLET)
    d.ellipse((cx - 9, cy - 42, cx + 9, cy - 24), fill=WHITE)
    lab = "역삼동 825-3"; lf = F(26, "B"); lw = tlen(lab, lf)
    d.rounded_rectangle((cx - lw / 2 - 16, cy - 108, cx + lw / 2 + 16, cy - 66), radius=14, fill=NAVY)
    d.text((cx - lw / 2, cy - 102), lab, font=lf, fill=WHITE)

def illus_graph(img, box):
    x0, y0, x1, y1 = box; h = min(y1 - y0, 430)
    white_card(img, (x0, y0, x1, y0 + h), 28); d = ImageDraw.Draw(img)
    d.text((x0 + 34, y0 + 28), "데이터 기반 의사결정", font=F(28, "B"), fill=INK)
    d.text((x1 - 34 - tlen("▲ 사업성", F(24, "B")), y0 + 32), "▲ 사업성", font=F(24, "B"), fill=VIOLET)
    cx0 = x0 + 54; cy0 = y0 + 96; cx1 = x1 - 40; base = y0 + h - 56
    d.line((cx0, cy0, cx0, base), fill=(212, 212, 230), width=3)
    d.line((cx0, base, cx1, base), fill=(212, 212, 230), width=3)
    bars = [0.30, 0.48, 0.64, 0.80, 1.0]; n = len(bars); bw = 48
    gapw = (cx1 - cx0 - 36 - n * bw) / (n - 1); bx = cx0 + 30; pts = []
    for k, f in enumerate(bars):
        top = base - (base - cy0 - 8) * f
        d.rounded_rectangle((bx, top, bx + bw, base), radius=8, fill=(VIOLET if k == n - 1 else (176, 162, 238)))
        pts.append((bx + bw / 2, top)); bx += bw + gapw
    d.line([(p[0], p[1] - 6) for p in pts], fill=VIOLET, width=4)
    for p in pts:
        d.ellipse((p[0] - 6, p[1] - 12, p[0] + 6, p[1]), fill=VIOLET)

def _flame(d, cx, by, col=(245, 140, 55)):
    d.polygon([(cx, by - 30), (cx - 13, by - 6), (cx - 9, by + 4), (cx + 9, by + 4), (cx + 13, by - 6)], fill=col)
    d.polygon([(cx, by - 16), (cx - 6, by + 2), (cx + 6, by + 2)], fill=(255, 205, 95))

def illus_dday(img, box):
    x0, y0, x1, y1 = box
    white_card(img, (x0, y0, x1, y0 + 300), 28); d = ImageDraw.Draw(img)
    d.text((x0 + 40, y0 + 38), "제36회 공인중개사 시험까지", font=F(28, "M"), fill=MUTED)
    df = F(108, "XB"); d.text((x0 + 38, y0 + 76), "D-147", font=df, fill=VIOLET)
    d.text((x0 + 40 + tlen("D-147", df), y0 + 156), "일", font=F(40, "B"), fill=INK)
    fy = y0 + 232; _flame(d, x0 + 54, fy + 16); d.text((x0 + 78, fy), "연속 0일", font=F(28, "SB"), fill=INK)
    chip = "프리즈 2/2"; cw = tlen(chip, F(26, "B")) + 28; cx1 = x1 - 40
    d.rounded_rectangle((cx1 - cw, fy - 4, cx1, fy + 40), radius=14, fill=(232, 236, 252))
    d.text((cx1 - cw + 14, fy + 3), chip, font=F(26, "B"), fill=VIOLET)

def illus_room(img, box):
    x0, y0, x1, y1 = box
    white_card(img, (x0, y0, x1, y0 + 300), 28); d = ImageDraw.Draw(img)
    d.rounded_rectangle((x0 + 34, y0 + 30, x0 + 60, y0 + 56), radius=7, fill=VIOLET)
    d.text((x0 + 74, y0 + 30), "실시간 열람실", font=F(30, "B"), fill=INK)
    cols = [VIOLET, PINK, (90, 180, 170), (240, 175, 70), (120, 140, 235), (230, 120, 160), (110, 195, 150), VIOLET2]
    hs = [120, 86, 150, 70, 132, 96, 140, 110]; bx = x0 + 40; base = y0 + 250
    for c, hh in zip(cols, hs):
        d.rounded_rectangle((bx, base - hh, bx + 42, base), radius=6, fill=c); bx += 54
    chip = "지금 12명 공부 중"; cw = tlen(chip, F(26, "B")) + 30; cx1 = x1 - 38
    d.rounded_rectangle((cx1 - cw, y0 + 32, cx1, y0 + 76), radius=16, fill=NAVY)
    d.text((cx1 - cw + 15, y0 + 39), chip, font=F(26, "B"), fill=(255, 255, 255))

def illus_timer(img, box):
    x0, y0, x1, y1 = box
    white_card(img, (x0, y0, x1, y0 + 270), 28); d = ImageDraw.Draw(img)
    d.text((x0 + 40, y0 + 36), "오늘의 목표 공부량", font=F(28, "M"), fill=MUTED)
    d.text((x0 + 38, y0 + 72), "240분", font=F(84, "XB"), fill=VIOLET)
    tx0 = x0 + 40; tx1 = x1 - 40; ty = y0 + 188
    d.rounded_rectangle((tx0, ty, tx1, ty + 22), radius=11, fill=(228, 226, 244))
    d.rounded_rectangle((tx0, ty, tx0 + 30, ty + 22), radius=11, fill=VIOLET)
    d.text((tx0, ty + 34), "지금 0분 · 도서관 입장하면 자동 측정", font=F(24, "M"), fill=MUTED)

def illus_passprob(img, box):
    x0, y0, x1, y1 = box
    white_card(img, (x0, y0, x1, y0 + 320), 28); d = ImageDraw.Draw(img)
    gb = (x0 + 44, y0 + 64, x0 + 232, y0 + 252)
    d.arc(gb, 135, 405, fill=(228, 226, 244), width=20)
    d.arc(gb, 135, 216, fill=VIOLET, width=20)
    pf = F(56, "XB"); gcx = (gb[0] + gb[2]) / 2; gcy = (gb[1] + gb[3]) / 2
    d.text((gcx - tlen("30%", pf) / 2, gcy - 40), "30%", font=pf, fill=VIOLET)
    d.text((gcx - tlen("합격 확률", F(24, "M")) / 2, gcy + 22), "합격 확률", font=F(24, "M"), fill=MUTED)
    rx = x0 + 282
    d.text((rx, y0 + 66), "공법·세법만 보강하면", font=F(27, "SB"), fill=INK)
    d.text((rx, y0 + 102), "안정권 진입 가능", font=F(27, "SB"), fill=VIOLET)
    for i, (lab, f) in enumerate([("1차 예상", 0.62), ("2차 예상", 0.50)]):
        yy = y0 + 162 + i * 72
        d.text((rx, yy), lab, font=F(24, "M"), fill=MUTED)
        bx1 = x1 - 44
        d.rounded_rectangle((rx, yy + 30, bx1, yy + 44), radius=7, fill=(228, 226, 244))
        d.rounded_rectangle((rx, yy + 30, rx + int((bx1 - rx) * f), yy + 44), radius=7, fill=VIOLET2)
    d.text((x0 + 44, y0 + 276), "과거 5,200명 합격자 데이터 기반", font=F(22, "M"), fill=MUTED)

def illus_freq(img, box):
    x0, y0, x1, y1 = box
    white_card(img, (x0, y0, x1, y0 + 330), 28); d = ImageDraw.Draw(img)
    d.text((x0 + 36, y0 + 30), "과목별 기출 빈출 지문", font=F(30, "B"), fill=INK)
    cx = x0 + 36; cy = y0 + 88; cf = F(26, "SB")
    for name, cnt in [("부개론", 50), ("민법", 52), ("중개법", 142), ("공법", 63), ("공시법", 72), ("세법", 36)]:
        t = "%s %d" % (name, cnt); w = tlen(t, cf) + 28
        if cx + w > x1 - 36:
            cx = x0 + 36; cy += 56
        d.rounded_rectangle((cx, cy, cx + w, cy + 44), radius=14, fill=(238, 236, 250))
        d.text((cx + 14, cy + 7), t, font=cf, fill=VIOLET); cx += w + 14
    sy = cy + 78
    d.rounded_rectangle((x0 + 36, sy, x1 - 36, sy + 104), radius=16, fill=(245, 244, 252))
    rchip = "자주 5회+"; rw = tlen(rchip, F(22, "B")) + 22
    d.rounded_rectangle((x0 + 54, sy + 20, x0 + 54 + rw, sy + 56), radius=12, fill=(232, 80, 110))
    d.text((x0 + 54 + 11, sy + 26), rchip, font=F(22, "B"), fill=(255, 255, 255))
    d.text((x0 + 54 + rw + 16, sy + 24), "점유취득시효", font=F(27, "B"), fill=VIOLET)
    d.text((x0 + 54, sy + 66), "색칠된 단어가 핵심 키워드예요", font=F(24, "M"), fill=MUTED)

def illus_streak(img, box):
    x0, y0, x1, y1 = box
    white_card(img, (x0, y0, x1, y0 + 320), 28); d = ImageDraw.Draw(img)
    d.text((x0 + 36, y0 + 30), "이번 달 캘린더", font=F(28, "B"), fill=INK)
    _flame(d, x1 - 168, y0 + 50); d.text((x1 - 146, y0 + 32), "연속 18일", font=F(26, "B"), fill=VIOLET)
    cw = 100; ch = 44; gx0 = x0 + 40; gy0 = y0 + 92; idx = 0
    for r in range(4):
        for c in range(7):
            cx = gx0 + c * (cw + 14); cyy = gy0 + r * (ch + 14)
            col = VIOLET if idx < 18 else (VIOLET2 if idx < 21 else (230, 228, 246))
            d.rounded_rectangle((cx, cyy, cx + cw, cyy + ch), radius=9, fill=col)
            idx += 1

def ct(d, cx, y, text, f, fill):
    d.text((cx - tlen(text, f) / 2, y), text, font=f, fill=fill)

def _crown(d, cx, basey):
    w = 46
    d.polygon([(cx - w // 2, basey), (cx - w // 2, basey - 18), (cx - w // 4, basey - 8),
               (cx, basey - 28), (cx + w // 4, basey - 8), (cx + w // 2, basey - 18),
               (cx + w // 2, basey)], fill=(242, 190, 72))

def draw_cmp(img, data, box):
    x0, y0, x1, y1 = box
    items = data.get("items", [])[:3]; n = max(1, len(items))
    gap = 24; cw = (x1 - x0 - gap * (n - 1)) // n
    cy0 = y0 + 40; cy1 = min(y1, cy0 + 372)
    for i, it in enumerate(items):
        ax0 = x0 + i * (cw + gap); ax1 = ax0 + cw; cx = (ax0 + ax1) // 2; win = it.get("win")
        if win:
            grad_card(img, (ax0, cy0, ax1, cy1), VIOLET2, VIOLET, 22); d = ImageDraw.Draw(img)
            _crown(d, cx, cy0 - 6); nmc = (236, 231, 255); valc = (255, 255, 255)
        else:
            white_card(img, (ax0, cy0, ax1, cy1), 22); d = ImageDraw.Draw(img)
            nmc = MUTED; valc = INK
        ct(d, cx, cy0 + 36, it.get("name", ""), F(28, "SB"), nmc)
        ct(d, cx, cy0 + 96, it.get("val", ""), F(48, "XB"), valc)
        sub = it.get("sub", "")
        if sub:
            sf = F(26, "B")
            if win:
                bw = tlen(sub, sf) + 26
                d.rounded_rectangle((cx - bw / 2, cy1 - 60, cx + bw / 2, cy1 - 18), radius=13, fill=(255, 255, 255))
                ct(d, cx, cy1 - 54, sub, sf, VIOLET)
            else:
                ct(d, cx, cy1 - 50, sub, sf, MUTED)

def draw_stat(img, data, box):
    x0, y0, x1, y1 = box; h = min(y1 - y0, 300)
    grad_card(img, (x0, y0, x1, y0 + h), VIOLET2, VIOLET, 28); d = ImageDraw.Draw(img)
    cx = (x0 + x1) // 2
    if data.get("label"): ct(d, cx, y0 + 40, data["label"], F(30, "SB"), (236, 231, 255))
    ct(d, cx, y0 + 84, data.get("big", ""), F(96, "XB"), (255, 255, 255))
    if data.get("sub"): ct(d, cx, y0 + 214, data["sub"], F(28, "M"), (230, 226, 252))

def draw_data_illus(img, data, box):
    t = data.get("type")
    if t == "stat": draw_stat(img, data, box)
    elif t == "photo": illus_photo(img, box, data.get("path"), data.get("caption"))
    else: draw_cmp(img, data, box)

def illus_skyline(img, box):
    x0, y0, x1, y1 = box; h = min(y1 - y0, 360)
    white_card(img, (x0, y0, x1, y0 + h), 28); d = ImageDraw.Draw(img)
    ix0 = x0 + 32; ix1 = x1 - 32; base = y0 + h - 64
    d.rounded_rectangle((ix0, base + 6, ix1, y0 + h - 24), radius=12, fill=(200, 222, 245))
    d.line((ix0, base, ix1, base), fill=(150, 150, 172), width=3)
    cols = [VIOLET2, (150, 138, 234), VIOLET, (172, 160, 240), (136, 120, 232), (186, 176, 243), VIOLET2, (158, 146, 236)]
    hs = [150, 214, 120, 250, 176, 138, 202, 108]
    bw = 44; gap = ((ix1 - ix0) - len(cols) * bw) // (len(cols) - 1); bx = ix0
    for c, hh in zip(cols, hs):
        ty = base - hh
        d.rounded_rectangle((bx, ty, bx + bw, base), radius=6, fill=c)
        for wy in range(ty + 14, base - 12, 30):
            d.rectangle((bx + 9, wy, bx + 17, wy + 13), fill=(236, 233, 250))
            d.rectangle((bx + 26, wy, bx + 34, wy + 13), fill=(236, 233, 250))
        bx += bw + gap

def illus_vs(img, box):
    x0, y0, x1, y1 = box; h = min(y1 - y0, 340)
    white_card(img, (x0, y0, x1, y0 + h), 28); d = ImageDraw.Draw(img)
    base = y0 + h - 72; midx = (x0 + x1) // 2
    def cluster(sx, cols, hs):
        bx = sx; bw = 38; gap = 14
        for c, hh in zip(cols, hs):
            d.rounded_rectangle((bx, base - hh, bx + bw, base), radius=6, fill=c); bx += bw + gap
        return sx + (len(cols) * bw + (len(cols) - 1) * gap) // 2
    lc = cluster(x0 + 70, [VIOLET2, VIOLET, (150, 138, 234)], [120, 184, 110])
    rc = cluster(midx + 78, [PINK2, PINK, (240, 130, 175)], [112, 172, 132])
    d.line((x0 + 52, base, midx - 58, base), fill=(150, 150, 172), width=3)
    d.line((midx + 58, base, x1 - 52, base), fill=(150, 150, 172), width=3)
    ct(d, lc, base + 16, "강남", F(32, "B"), VIOLET)
    ct(d, rc, base + 16, "송파", F(32, "B"), PINK)
    vy = (y0 + base) // 2
    d.ellipse((midx - 46, vy - 46, midx + 46, vy + 46), fill=NAVY)
    ct(d, midx, vy - 28, "VS", F(46, "XB"), (255, 255, 255))

def illus_contract(img, box):
    x0, y0, x1, y1 = box; h = min(y1 - y0, 360)
    white_card(img, (x0, y0, x1, y0 + h), 28); d = ImageDraw.Draw(img)
    dx0, dy0, dx1, dy1 = x0 + 70, y0 + 58, x1 - 180, y0 + h - 44
    d.rounded_rectangle((dx0, dy0, dx1, dy1), radius=14, fill=(252, 252, 255), outline=(214, 214, 232), width=2)
    d.text((dx0 + 24, dy0 + 20), "부동산 매매계약서", font=F(25, "B"), fill=INK)
    for i in range(4):
        yy = dy0 + 70 + i * 36; w2 = (dx1 - 24) - (dx0 + 24) - (120 if i == 3 else 0)
        d.rounded_rectangle((dx0 + 24, yy, dx0 + 24 + w2, yy + 13), radius=6, fill=(226, 226, 243))
    sx, sy = dx1 - 14, dy1 - 14
    d.ellipse((sx - 52, sy - 52, sx + 18, sy + 18), outline=(222, 68, 68), width=6)
    d.text((sx - 36, sy - 34), "계약", font=F(28, "B"), fill=(222, 68, 68))
    d.text((x1 - 150, y0 + 46), "?", font=F(132, "XB"), fill=VIOLET)

def illus_terms(img, box):
    x0, y0, x1, y1 = box; h = min(y1 - y0, 330)
    white_card(img, (x0, y0, x1, y0 + h), 28); d = ImageDraw.Draw(img)
    ct(d, x0 + (x1 - x0) // 4, y0 + h // 2 - 76, "?", F(150, "XB"), (216, 150, 150))
    rx = x0 + (x1 - x0) // 2 + 24; ry = y0 + 50
    for t in ["전용면적", "공급면적", "용적률", "건폐율"]:
        w = tlen(t, F(30, "SB")) + 40
        d.rounded_rectangle((rx, ry, rx + w, ry + 58), radius=16, fill=(238, 236, 250))
        d.text((rx + 20, ry + 12), t, font=F(30, "SB"), fill=VIOLET); ry += 68

def illus_layers(img, box):
    x0, y0, x1, y1 = box; h = min(y1 - y0, 360)
    white_card(img, (x0, y0, x1, y0 + h), 28); d = ImageDraw.Draw(img)
    cx0, cx1 = x0 + 40, x1 - 40; base = y0 + 152; bx = cx0 + 24
    for hh in [78, 120, 66, 104, 88]:
        d.rounded_rectangle((bx, base - hh, bx + 44, base), radius=5, fill=VIOLET2); bx += 58
    d.text((cx1 - tlen("아파트", F(24, "B")), y0 + 44), "아파트", font=F(24, "B"), fill=MUTED)
    ly0 = base + 16
    d.rounded_rectangle((cx0, ly0, cx1, ly0 + 56), radius=10, fill=(156, 208, 174))
    d.text((cx0 + 20, ly0 + 13), "입지 — 위치·교통·학군", font=F(26, "B"), fill=(20, 84, 52))
    py0 = ly0 + 70
    d.rounded_rectangle((cx0, py0, cx1, py0 + 56), radius=10, fill=VIOLET)
    d.text((cx0 + 20, py0 + 13), "공법 — 용도지역·규제", font=F(26, "B"), fill=(255, 255, 255))

def illus_zonemap(img, box):
    x0, y0, x1, y1 = box; h = min(y1 - y0, 360)
    white_card(img, (x0, y0, x1, y0 + h), 28); d = ImageDraw.Draw(img)
    mx0, my0, mx1, my1 = x0 + 36, y0 + 42, x1 - 36, y0 + h - 40
    midx = (mx0 + mx1) // 2; midy = (my0 + my1) // 2
    d.rectangle((mx0, my0, midx, midy), fill=(252, 236, 180))
    d.rectangle((midx, my0, mx1, midy), fill=(246, 196, 206))
    d.rectangle((mx0, midy, midx, my1), fill=(198, 228, 200))
    d.rectangle((midx, midy, mx1, my1), fill=(208, 212, 246))
    d.line((midx, my0, midx, my1), fill=(255, 255, 255), width=5)
    d.line((mx0, midy, mx1, midy), fill=(255, 255, 255), width=5)
    d.rounded_rectangle((mx0, my0, mx1, my1), radius=12, outline=(150, 150, 170), width=3)
    d.text((mx0 + 16, my0 + 14), "주거", font=F(24, "B"), fill=(154, 112, 28))
    d.text((midx + 16, my0 + 14), "상업", font=F(24, "B"), fill=(172, 60, 92))
    d.text((mx0 + 16, midy + 14), "녹지", font=F(24, "B"), fill=(40, 112, 62))
    d.text((midx + 16, midy + 14), "준주거", font=F(24, "B"), fill=VIOLET)
    pcx, pcy = midx, midy
    d.ellipse((pcx - 23, pcy - 46, pcx + 23, pcy - 2), fill=NAVY)
    d.polygon([(pcx - 14, pcy - 16), (pcx + 14, pcy - 16), (pcx, pcy + 12)], fill=NAVY)
    d.ellipse((pcx - 8, pcy - 34, pcx + 8, pcy - 18), fill=(255, 255, 255))

def illus_photo(img, box, path=None, caption=None):
    x0, y0, x1, y1 = box; h = min(y1 - y0, 430)
    try:
        ph = Image.open(path).convert("RGB")
    except Exception:
        white_card(img, (x0, y0, x1, y0 + h), 24); ImageDraw.Draw(img).text((x0 + 30, y0 + 30), "(사진 없음: %s)" % path, font=F(24, "M"), fill=MUTED); return
    bw, bh = x1 - x0, h
    sr = max(bw / ph.width, bh / ph.height); ph = ph.resize((max(1, int(ph.width * sr)), max(1, int(ph.height * sr))), Image.LANCZOS)
    cx, cy = (ph.width - bw) // 2, (ph.height - bh) // 2; ph = ph.crop((cx, cy, cx + bw, cy + bh))
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle((x0 + 2, y0 + 10, x1 + 2, y0 + h + 12), radius=24, fill=(70, 65, 130, 55))
    img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(14)))
    img.paste(ph.convert("RGBA"), (x0, y0), rmask(bw, bh, 24))
    if caption:
        d = ImageDraw.Draw(img); cw = tlen(caption, F(24, "B")) + 28
        d.rounded_rectangle((x0 + 16, y0 + h - 54, x0 + 16 + cw, y0 + h - 12), radius=12, fill=NAVY + (225,))
        d.text((x0 + 30, y0 + h - 48), caption, font=F(24, "B"), fill=(255, 255, 255))

def draw_illus(img, kind, box):
    {"search": illus_search, "app": illus_app, "controls": illus_controls, "map": illus_map,
     "graph": illus_graph, "mass": illus_mass, "loss": illus_loss, "law": illus_law,
     "dday": illus_dday, "room": illus_room, "timer": illus_timer, "passprob": illus_passprob,
     "freq": illus_freq, "streak": illus_streak, "skyline": illus_skyline, "vs": illus_vs,
     "contract": illus_contract, "terms": illus_terms, "layers": illus_layers, "zonemap": illus_zonemap}.get(kind, lambda *a: None)(img, box)

# ---------- 장면 ----------
def render_scene(sc, title_reveal=None):
    img = BG.copy(); d = ImageDraw.Draw(img)
    layout = sc.get("layout", "hero")
    if sc.get("kicker"):
        center_rich(d, sc["kicker"], F(36, "B"), 250, VIOLET, VIOLET)
    if layout == "hero":
        lines = sc.get("title", [])
        bc = [(VIOLET if (i == len(lines) - 1 and len(lines) > 1 and "*" not in l) else INK) for i, l in enumerate(lines)]
        draw_rich_lines(d, lines, F(96, "XB"), 560, 132, bc, EMPH_LIGHT, reveal=title_reveal)
        y = 560 + len(lines) * 132 + 28
        for l in sc.get("subtitle", []):
            center_rich(d, l, F(46, "M"), y, MUTED, VIOLET); y += 66
        if sc.get("illusData"):
            top = max(y + 30, 860); draw_data_illus(img, sc["illusData"], (120, top, W - 120, top + 470))
        elif sc.get("illus"):
            top = max(y + 30, 900); draw_illus(img, sc["illus"], (140, top, 940, top + 500))
    elif layout == "points":
        y = 300
        for l in sc.get("title", []):
            center_rich(d, l, F(62, "XB"), y, INK, EMPH_LIGHT); y += 92
        if sc.get("illusData"):
            top = max(y + 30, 460); draw_data_illus(img, sc["illusData"], (90, top, W - 90, top + 470))
        elif sc.get("illus"):
            top = max(y + 30, 470); draw_illus(img, sc["illus"], (110, top, W - 110, top + 480))
        else:
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
        if sc.get("illusData"):
            draw_data_illus(img, sc["illusData"], (90, y + 10, W - 90, y + 470))
        elif sc.get("illus"):
            draw_illus(img, sc["illus"], (110, y + 10, W - 110, y + 540))
    elif layout == "outro":
        lines = sc.get("title", [])
        bc = [(VIOLET if (i == len(lines) - 1 and len(lines) > 1 and "*" not in l) else INK) for i, l in enumerate(lines)]
        draw_rich_lines(d, lines, F(104, "XB"), 360, 140, bc, EMPH_LIGHT, reveal=title_reveal)
        y = 360 + len(lines) * 140
        for l in sc.get("subtitle", []):
            center_rich(d, l, F(46, "M"), y, MUTED, VIOLET); y += 70
        if sc.get("cta"):
            y = max(y + 36, 720); grad_card(img, (150, y, W - 150, y + 142), VIOLET2, VIOLET, 34); d = ImageDraw.Draw(img)
            cf = F(50, "B"); d.text((W / 2 - tlen(sc["cta"], cf) / 2, y + 71 - cf.getmetrics()[0] + 8), sc["cta"], font=cf, fill=WHITE); y += 200
        for l in (sc.get("note") or []):
            center_rich(d, l, F(38, "M"), y, MUTED, VIOLET); y += 58
    return img.convert("RGB")

# ---------- 자막 ----------
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
    return dict(f=f, lines=lines, lw=lw, line_h=line_h, pady=pady, top=top, bottom=bottom,
                x0=W // 2 - pill_w // 2, x1=W // 2 + pill_w // 2, rad=min(pill_h // 2, 40),
                total=sum(len(l) for l in lines))

def draw_cap_runs(d, lay, reveal, base=(255, 255, 255), emph=EMPH_DARK):
    f = lay["f"]; rem = reveal; yy = lay["top"] + lay["pady"]; end = None
    for idx, ln in enumerate(lay["lines"]):
        x = W / 2 - lay["lw"][idx] / 2
        if rem <= 0:
            yy += lay["line_h"]; continue
        take = min(len(ln), rem); x2 = draw_runs(d, ln[:take], x, yy, f, base, emph)
        rem -= take; end = (x2, yy); yy += lay["line_h"]
    if reveal < lay["total"] and end:
        d.rectangle((end[0] + 3, end[1] + 8, end[0] + 9, end[1] + f.size + 2), fill=base)

def pill_base(scene_rgb, lay):
    out = scene_rgb.convert("RGBA")
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((lay["x0"], lay["top"] + 8, lay["x1"], lay["bottom"] + 10), radius=lay["rad"], fill=(15, 15, 30, 120))
    out.alpha_composite(sh.filter(ImageFilter.GaussianBlur(16)))
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(ov).rounded_rectangle((lay["x0"], lay["top"], lay["x1"], lay["bottom"]), radius=lay["rad"], fill=NAVY + (240,))
    out.alpha_composite(ov)
    return out.convert("RGB")

def build_chip(lay):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((lay["x0"], lay["top"] + 8, lay["x1"], lay["bottom"] + 10), radius=lay["rad"], fill=(15, 15, 30, 120))
    layer.alpha_composite(sh.filter(ImageFilter.GaussianBlur(16)))
    od = ImageDraw.Draw(layer)
    od.rounded_rectangle((lay["x0"], lay["top"], lay["x1"], lay["bottom"]), radius=lay["rad"], fill=NAVY + (240,))
    draw_cap_runs(od, lay, lay["total"])
    return layer

def composite_chip(scene_rgb, chip, s, lay):
    out = scene_rgb.convert("RGBA")
    if abs(s - 1.0) < 1e-3:
        out.alpha_composite(chip); return out.convert("RGB")
    m = 46
    bx0 = max(0, lay["x0"] - m); by0 = max(0, lay["top"] - m); bx1 = min(W, lay["x1"] + m); by1 = min(H, lay["bottom"] + m + 10)
    crop = chip.crop((bx0, by0, bx1, by1))
    nw, nh = max(2, round(crop.width * s)), max(2, round(crop.height * s))
    sc = crop.resize((nw, nh), Image.BILINEAR)
    cx = (bx0 + bx1) // 2; cy = (by0 + by1) // 2
    out.alpha_composite(sc, (cx - nw // 2, cy - nh // 2)); return out.convert("RGB")

# ---------- 오버레이 / 줌 ----------
def draw_brand(frame):
    d = ImageDraw.Draw(frame); f1 = F(28, "SB"); f2 = F(28, "B"); x = 44; y = 60
    d.text((x, y), "AI 부동산활용 ", font=f1, fill=(70, 72, 104)); x += tlen("AI 부동산활용 ", f1)
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
def chip_scale(lf, seg):
    fr = max(1, round(min(0.35, seg / FPS * 0.5) * FPS))
    return (1.18 + (1.0 - 1.18) * eo(lf / fr)) if lf < fr else 1.0
def frame_in(lf, seg):
    fr = max(1, round(0.42 * FPS))
    return (1.10 + (1.0 - 1.10) * eo(lf / fr)) if lf < fr else 1.0
def frame_out(lf, seg):
    fr = max(1, round(0.6 * FPS))
    return (1.0 + (0.85 - 1.0) * ei(max(0.0, min(1.0, (lf - (seg - fr)) / fr)))) if seg - lf <= fr else 1.0

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--spec", required=True); ap.add_argument("--out", required=True)
    a = ap.parse_args(); spec = json.load(open(a.spec, encoding="utf-8"))
    total = float(spec.get("total_duration", 100.0)); scenes = spec["scenes"]
    flat = []; scene_first = {}
    for si, sc in enumerate(scenes):
        for cap in sc.get("captions", []):
            if si not in scene_first: scene_first[si] = len(flat)
            if isinstance(cap, dict): flat.append((si, cap.get("t", ""), bool(cap.get("big"))))
            else: flat.append((si, cap, False))
    if not flat: print("ERROR: no captions"); sys.exit(1)
    weights = [max(1, len(re.sub(r"\s", "", plain(t)))) for _, t, _ in flat]
    Wt = sum(weights); bounds = []; cum = 0.0
    for w in weights:
        cum += total * w / Wt; bounds.append(round(cum * FPS))
    total_frames = bounds[-1]; last_i = len(flat) - 1

    scene_full = {}; log = open(HERE + "/_ff4.log", "wb")
    cmd = ["ffmpeg", "-y", "-f", "rawvideo", "-pixel_format", "rgb24", "-video_size", "%dx%d" % (W, H),
           "-framerate", str(FPS), "-i", "-", "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
           "-pix_fmt", "yuv420p", "-movflags", "+faststart", a.out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=log)

    start = 0
    for i, (si, text, big) in enumerate(flat):
        end = bounds[i]; seg = max(1, end - start); sc = scenes[si]
        pos = (start + seg / 2) / total_frames
        mode = "type" if (pos < 0.20 or pos > 0.80) else "zoom"
        type_title = bool(sc.get("typeTitle")) and (i == scene_first[si]) and sc.get("layout") in ("hero", "outro")
        do_in = (i == 0); do_out = (i == last_i)
        if si not in scene_full: scene_full[si] = render_scene(sc)
        lay = layout_caption(text, big)
        chip = build_chip(lay) if mode == "zoom" else None
        base_img = full_still = None
        if not type_title:
            scn = scene_full[si]
            if mode == "type":
                base_img = pill_base(scn, lay); full_still = base_img.copy(); draw_cap_runs(ImageDraw.Draw(full_still), lay, lay["total"])
            else:
                full_still = composite_chip(scn, chip, 1.0, lay)
        title_total = sum(len(plain(l)) for l in sc.get("title", [])) if type_title else 0
        for lf in range(seg):
            el = lf / FPS
            if type_title:
                tr = min(title_total, int(el * TITLE_CPS) + 1)
                scn = render_scene(sc, title_reveal=tr)
                if mode == "type":
                    rev = min(lay["total"], int(el * CPS) + 1)
                    frame = pill_base(scn, lay); draw_cap_runs(ImageDraw.Draw(frame), lay, rev)
                else:
                    frame = composite_chip(scn, chip, chip_scale(lf, seg), lay)
            else:
                if mode == "type":
                    rev = min(lay["total"], int(el * CPS) + 1)
                    frame = full_still.copy() if rev >= lay["total"] else (lambda fr: (draw_cap_runs(ImageDraw.Draw(fr), lay, rev), fr)[1])(base_img.copy())
                else:
                    s = chip_scale(lf, seg)
                    frame = full_still.copy() if abs(s - 1) < 1e-3 else composite_chip(scene_full[si], chip, s, lay)
            fs = frame_in(lf, seg) if do_in else (frame_out(lf, seg) if do_out else 1.0)
            if abs(fs - 1) >= 1e-3: frame = zoomed(frame, fs)
            draw_brand(frame); draw_progress(frame, (start + lf + 1) / total_frames)
            p.stdin.write(frame.tobytes())
        start = end
        sys.stdout.write("\r렌더 %d/%d" % (i + 1, len(flat))); sys.stdout.flush()
    p.stdin.close(); rc = p.wait(); log.close()
    if rc != 0: print("\nffmpeg fail:", HERE + "/_ff4.log"); sys.exit(1)
    print("\nOK ->", a.out, "| %d컷 | %d프레임 | %.1f초" % (len(flat), total_frames, total))

if __name__ == "__main__":
    main()
