# -*- coding: utf-8 -*-
"""
build_video2.py — 9:16 모션 쇼츠 렌더러 (프리텐다드 · 바이올렛 핀테크 스타일)

기능:
- 폰트: Pretendard (fonts/Pretendard-*.otf)
- 스타일: 라벤더 그라데이션 배경 + 바이올렛/핑크 그라데이션 카드 + 글래스 패널
- 자막: 글씨에 딱 맞는 컴팩트 다크 칩. `*강조*` 마크업 → 컬러 강조.
- 모션: 중요(big) 캡션은 확대되어 등장→축소, 마지막 캡션은 줌아웃으로 마무리. (30fps)
- 출력: 무음 MP4 (rawvideo → ffmpeg libx264). 음성은 따로 합본.

spec.json 의 각 scene.captions 항목은 문자열 또는 {"t": "...", "big": true} 형식.
"""
import os, re, sys, json, math, argparse, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1920
FPS = 30
HERE = os.path.dirname(os.path.abspath(__file__)).replace("\\", "/")
FDIR = HERE + "/fonts"

# ---- 팔레트 (첨부 핀테크 스타일) ----
BG1   = (240, 238, 252)   # 배경 상단 라벤더
BG2   = (224, 226, 250)   # 배경 하단
INK   = (24, 25, 46)       # 제목(다크 네이비)
MUTED = (110, 112, 142)    # 보조 텍스트
VIOLET  = (108, 92, 231)   # 메인 강조
VIOLET2 = (143, 125, 244)  # 그라데이션 밝은쪽
PINK   = (232, 67, 147)
PINK2  = (246, 112, 172)
NAVY   = (19, 20, 38)      # 다크 카드 / 자막 칩
WHITE  = (250, 250, 253)
BORDER = (225, 225, 242)
SOFTV  = (231, 227, 251)   # 연한 바이올렛 (번호 배경 등)
EMPH_DARK = (190, 175, 255)  # 다크 칩 위 강조색(연보라)
EMPH_LIGHT = VIOLET          # 밝은 배경 위 강조색

def _font(weight, fallback="C:/Windows/Fonts/malgunbd.ttf"):
    p = "%s/Pretendard-%s.otf" % (FDIR, weight)
    return p if os.path.exists(p) else fallback

WMAP = {"R": "Regular", "M": "Medium", "SB": "SemiBold", "B": "Bold", "XB": "ExtraBold", "BL": "Black"}
_cache = {}
def F(size, w="R"):
    key = (size, w)
    if key not in _cache:
        _cache[key] = ImageFont.truetype(_font(WMAP.get(w, "Regular")), size)
    return _cache[key]

MEAS = ImageDraw.Draw(Image.new("RGB", (8, 8)))
def tlen(s, f): return MEAS.textlength(s, font=f)

# ---- 마크업 파싱: "*강조* 일반" → [(char, emph_bool), ...] ----
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
        x += tlen(s, f)
        i = j
    return x

def center_rich(d, text, f, y, base_col, emph_col, cx=W // 2):
    seq = to_seq(text)
    total = tlen("".join(c for c, _ in seq), f)
    draw_runs(d, seq, cx - total / 2, y, f, base_col, emph_col)
    asc, desc = f.getmetrics()
    return asc + desc

# ---- 그라데이션 / 카드 ----
def vgrad(w, h, c1, c2):
    img = Image.new("RGB", (w, h), c1)
    d = ImageDraw.Draw(img)
    for yy in range(h):
        t = yy / max(1, h - 1)
        d.line([(0, yy), (w, yy)], fill=tuple(round(c1[k] + (c2[k] - c1[k]) * t) for k in range(3)))
    return img

def rounded_mask(w, h, r):
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w - 1, h - 1), radius=r, fill=255)
    return m

def paste_grad_card(img, box, c1, c2, radius, shadow=True):
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    if shadow:
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle((x0 + 3, y0 + 12, x1 + 3, y1 + 14), radius=radius, fill=(80, 70, 150, 70))
        sh = sh.filter(ImageFilter.GaussianBlur(16))
        img.alpha_composite(sh)
    card = vgrad(w, h, c1, c2).convert("RGBA")
    img.paste(card, (x0, y0), rounded_mask(w, h, radius))

def white_card(img, box, radius):
    x0, y0, x1, y1 = box
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((x0 + 2, y0 + 10, x1 + 2, y1 + 12), radius=radius, fill=(70, 65, 130, 45))
    sh = sh.filter(ImageFilter.GaussianBlur(14))
    img.alpha_composite(sh)
    ImageDraw.Draw(img).rounded_rectangle(box, radius=radius, fill=WHITE + (255,), outline=BORDER + (255,), width=2)

# ---- 배경 (블롭 포함) ----
def make_bg():
    img = vgrad(W, H, BG1, BG2).convert("RGBA")
    blob = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(blob)
    bd.ellipse((-200, -150, 520, 560), fill=(255, 255, 255, 120))
    bd.ellipse((640, 60, 1280, 720), fill=(176, 158, 246, 70))
    bd.ellipse((-260, 1380, 460, 2080), fill=(150, 170, 248, 60))
    bd.ellipse((680, 1500, 1320, 2120), fill=(246, 170, 210, 45))
    blob = blob.filter(ImageFilter.GaussianBlur(120))
    img.alpha_composite(blob)
    return img

BG = make_bg()

# ---- 장면 렌더 ----
def render_scene(sc):
    img = BG.copy()
    d = ImageDraw.Draw(img)
    layout = sc.get("layout", "hero")
    if sc.get("kicker"):
        center_rich(d, sc["kicker"], F(36, "B"), 250, VIOLET, VIOLET)

    if layout == "hero":
        y = 560
        title = sc.get("title", [])
        for i, l in enumerate(title):
            base = VIOLET if (i == len(title) - 1 and len(title) > 1 and "*" not in l) else INK
            center_rich(d, l, F(96, "XB"), y, base, EMPH_LIGHT); y += 132
        y += 28
        for l in sc.get("subtitle", []):
            center_rich(d, l, F(46, "M"), y, MUTED, VIOLET); y += 66

    elif layout == "points":
        y = 300
        for l in sc.get("title", []):
            center_rich(d, l, F(62, "XB"), y, INK, EMPH_LIGHT); y += 92
        items = sc.get("items", [])[:4]
        y = max(y + 36, 560); ch = 150; gap = 34
        for i, t in enumerate(items):
            box = (120, y, W - 120, y + ch)
            white_card(img, box, 30)
            cyc = y + ch // 2
            d.ellipse((158, cyc - 30, 218, cyc + 30), fill=VIOLET + (255,))
            n = str(i + 1); nf = F(34, "B"); nw = tlen(n, nf)
            d.text((188 - nw / 2, cyc - F(34, "B").getmetrics()[0] + 6), n, font=nf, fill=WHITE)
            seq = to_seq(t); tf = F(42, "M")
            asc, desc = tf.getmetrics()
            draw_runs(d, seq, 256, cyc - (asc + desc) / 2, tf, (40, 40, 64), VIOLET)
            y += ch + gap

    elif layout == "highlight":
        y = 286
        for l in sc.get("title", []):
            center_rich(d, l, F(58, "XB"), y, INK, EMPH_LIGHT); y += 84
        if sc.get("badge"):
            bf = F(38, "B"); bw = tlen(sc["badge"], bf); pw = bw + 76; by = y + 14
            d.rounded_rectangle((W // 2 - pw // 2, by, W // 2 + pw // 2, by + 84), radius=42, fill=SOFTV + (255,))
            d.text((W // 2 - bw / 2, by + 42 - bf.getmetrics()[0] + 6), sc["badge"], font=bf, fill=VIOLET); y = by + 150
        cards = sc.get("cards", [])[:2]
        if cards:
            grads = [(VIOLET2, VIOLET), (PINK2, PINK)]
            cw = (W - 120 * 2 - 30) // len(cards); chh = 380; cy = max(y, 560)
            for i, c in enumerate(cards):
                x0 = 120 + i * (cw + 30)
                g1, g2 = grads[i % 2]
                paste_grad_card(img, (x0, cy, x0 + cw, cy + chh), g1, g2, 28)
                d.text((x0 + 34, cy + 30), c.get("title", ""), font=F(30, "SB"), fill=(255, 255, 255, 235))
                yy = cy + 104
                for k, ln in enumerate(c.get("lines", [])[:5]):
                    big = (k == 1)
                    d.text((x0 + 34, yy), ln, font=F(40 if big else 32, "B" if big else "M"),
                           fill=(255, 255, 255, 255 if big else 220))
                    yy += 70 if big else 56

    elif layout == "outro":
        y = 360
        for l in sc.get("title", []):
            center_rich(d, l, F(104, "XB"), y, INK, EMPH_LIGHT); y += 140
        for l in sc.get("subtitle", []):
            center_rich(d, l, F(46, "M"), y, MUTED, VIOLET); y += 70
        if sc.get("cta"):
            y = max(y + 36, 720)
            paste_grad_card(img, (150, y, W - 150, y + 142), VIOLET2, VIOLET, 34)
            cf = F(50, "B"); cw = tlen(sc["cta"], cf)
            d.text((W / 2 - cw / 2, y + 71 - cf.getmetrics()[0] + 8), sc["cta"], font=cf, fill=WHITE); y += 200
        for l in (sc.get("note") or []):
            center_rich(d, l, F(38, "M"), y, MUTED, VIOLET); y += 58

    return img.convert("RGB")

# ---- 자막 칩 (컴팩트 + 강조색) ----
def caption_chip(base_rgb, text, big):
    f = F(64 if big else 50, "B" if big else "SB")
    maxw = 900
    seq = to_seq(text)
    # 줄바꿈(공백 우선, 없으면 글자단위)
    lines, cur, last_sp = [], [], -1
    for it in seq:
        cur.append(it)
        if it[0] == " ": last_sp = len(cur) - 1
        if tlen("".join(c for c, _ in cur), f) > maxw:
            if last_sp > 0:
                lines.append(cur[:last_sp]); cur = cur[last_sp + 1:]; last_sp = -1
            else:
                lines.append(cur[:-1]); cur = [it]; last_sp = -1
    if cur: lines.append(cur)
    line_h = int(f.size * 1.34)
    block_h = line_h * len(lines)
    maxlw = max(tlen("".join(c for c, _ in ln), f) for ln in lines)
    padx, pady = 38, 24
    pill_w = min(W - 60, int(maxlw + 2 * padx))
    pill_h = block_h + 2 * pady
    cx = W // 2
    bottom = 1792
    top = bottom - pill_h
    x0, x1 = cx - pill_w // 2, cx + pill_w // 2
    rad = min(pill_h // 2, 40)

    out = base_rgb.convert("RGBA")
    sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((x0, top + 8, x1, bottom + 10), radius=rad, fill=(15, 15, 30, 120))
    sh = sh.filter(ImageFilter.GaussianBlur(16))
    out.alpha_composite(sh)
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    od.rounded_rectangle((x0, top, x1, bottom), radius=rad, fill=NAVY + (240,))
    yy = top + pady
    for ln in lines:
        lw = tlen("".join(c for c, _ in ln), f)
        draw_runs(od, ln, cx - lw / 2, yy, f, (255, 255, 255), EMPH_DARK)
        yy += line_h
    out.alpha_composite(ov)
    return out.convert("RGB")

# ---- 줌(확대/축소) ----
def zoomed(still, s):
    if abs(s - 1.0) < 1e-3:
        return still
    nw, nh = max(2, round(W * s)), max(2, round(H * s))
    r = still.resize((nw, nh), Image.BILINEAR)
    if s > 1.0:
        x, y = (nw - W) // 2, (nh - H) // 2
        return r.crop((x, y, x + W, y + H))
    canvas = BG.convert("RGB").copy()
    canvas.paste(r, ((W - nw) // 2, (H - nh) // 2))
    return canvas

def ease_out(u): return 1 - (1 - u) ** 2
def ease_in(u): return u * u

def scale_at(lf, seg, big, is_last):
    dur = seg / FPS
    ent = min(0.30, dur * 0.5)
    ent_fr = max(1, round(ent * FPS))
    S0 = 1.16 if big else 1.035
    if lf < ent_fr:
        return S0 + (1.0 - S0) * ease_out(lf / ent_fr)
    do_exit = big or is_last
    if do_exit:
        S1 = 0.85 if is_last else 0.93
        ex = 0.5 if is_last else 0.26
        ex_fr = max(1, round(ex * FPS))
        if seg - lf <= ex_fr and seg > ent_fr + 2:
            u = (lf - (seg - ex_fr)) / ex_fr
            return 1.0 + (S1 - 1.0) * ease_in(max(0.0, min(1.0, u)))
    return 1.0

def draw_progress(frame, frac):
    d = ImageDraw.Draw(frame)
    d.rectangle((0, 1909, W, 1920), fill=(214, 212, 235))
    d.rectangle((0, 1909, int(W * frac), 1920), fill=VIOLET)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spec", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    spec = json.load(open(a.spec, encoding="utf-8"))
    total = float(spec.get("total_duration", 100.0))
    scenes = spec["scenes"]

    flat = []  # (scene_index, text, big)
    for si, sc in enumerate(scenes):
        for cap in sc.get("captions", []):
            if isinstance(cap, dict):
                flat.append((si, cap.get("t", ""), bool(cap.get("big"))))
            else:
                flat.append((si, cap, False))
    if not flat:
        print("ERROR: captions 없음"); sys.exit(1)

    weights = [max(1, len(re.sub(r"\s", "", plain(t)))) for _, t, _ in flat]
    Wt = sum(weights)
    # 캡션별 프레임 경계
    bounds, cum = [], 0.0
    for w in weights:
        cum += total * w / Wt
        bounds.append(round(cum * FPS))
    total_frames = bounds[-1]

    scene_cache = {}
    log = open(HERE + "/_ff2.log", "wb")
    cmd = ["ffmpeg", "-y", "-f", "rawvideo", "-pixel_format", "rgb24",
           "-video_size", "%dx%d" % (W, H), "-framerate", str(FPS), "-i", "-",
           "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
           "-pix_fmt", "yuv420p", "-movflags", "+faststart", a.out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=log)

    last_i = len(flat) - 1
    start = 0
    for i, (si, text, big) in enumerate(flat):
        end = bounds[i]; seg = max(1, end - start)
        if si not in scene_cache:
            scene_cache[si] = render_scene(scenes[si])
        still = caption_chip(scene_cache[si], text, big)
        hold_bytes = None
        for lf in range(seg):
            s = scale_at(lf, seg, big, i == last_i)
            if abs(s - 1.0) < 1e-3:
                frame = still.copy()
            else:
                frame = zoomed(still, s)
            draw_progress(frame, (start + lf + 1) / total_frames)
            p.stdin.write(frame.tobytes())
        start = end
        sys.stdout.write("\r장면합성 %d/%d" % (i + 1, len(flat))); sys.stdout.flush()

    p.stdin.close()
    rc = p.wait(); log.close()
    if rc != 0:
        print("\nffmpeg 실패. 로그:", HERE + "/_ff2.log"); sys.exit(1)
    print("\nOK ->", a.out, "| 자막", len(flat), "컷 | %d프레임 | %.1f초" % (total_frames, total))

if __name__ == "__main__":
    main()
