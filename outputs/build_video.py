# -*- coding: utf-8 -*-
"""
build_video.py - URL 사용법/소개용 9:16 세로 영상 생성기 (자막 번인) [Windows 패치판]

입력: --spec spec.json (장면 + 자막 정의)
출력: --out output.mp4 (1080x1920, 무음. 캡컷에서 음성 MP3와 합치면 됨)

[Windows 패치]
- 폰트: 맑은 고딕(Malgun Gothic) 사용 — 다운로드 불필요.
- 작업 폴더: 스크립트 옆 _work/ (리눅스 /tmp 대신). ffmpeg에 정상 Windows 경로 전달.
spec.json 형식은 references/spec_format.md 참고.
"""
import os, re, sys, json, glob, subprocess, argparse

W, H = 1080, 1920

WORK = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_work").replace("\\", "/")
os.makedirs(WORK, exist_ok=True)

def _find_font():
    cands = [
        ("C:/Windows/Fonts/malgun.ttf", "C:/Windows/Fonts/malgunbd.ttf", "C:/Windows/Fonts/malgunbd.ttf"),
        ("/tmp/NanumGothic.ttf", "/tmp/NanumGothicBold.ttf", "/tmp/NanumGothicExtraBold.ttf"),
    ]
    for r, b, x in cands:
        if os.path.exists(r):
            return r, b, x
    return cands[0]

FONT_R, FONT_B, FONT_X = _find_font()

from PIL import Image, ImageDraw, ImageFont

IVORY=(247,245,240); WHITE=(255,255,255); LINE=(229,223,212)
INK=(31,27,22); MUTED=(107,99,88); DARK=(42,37,30)
ACCENTS={"coral":(217,102,63),"green":(63,125,88),"blue":(37,99,235)}
SOFT={"coral":(243,227,218),"green":(232,240,233),"blue":(225,234,252)}
BADGE={"danger":((194,65,12),(251,234,217)),"warn":((180,83,9),(252,241,220)),
       "green":((63,125,88),(232,240,233))}

def F(size, w="R"):
    p={"R":FONT_R,"B":FONT_B,"X":FONT_X}[w]
    return ImageFont.truetype(p, size)
def tw(d,t,f):
    b=d.textbbox((0,0),t,font=f); return b[2]-b[0], b[3]-b[1]
def center(d,t,f,y,color,cx=W//2):
    w,h=tw(d,t,f); d.text((cx-w/2,y),t,font=f,fill=color); return h
def wrap(d,t,f,maxw):
    out=[]; cur=""
    for wd in t.split(' '):
        test=(cur+" "+wd).strip()
        if tw(d,test,f)[0]<=maxw: cur=test
        else:
            if cur: out.append(cur)
            cur=wd
    if cur: out.append(cur)
    return out
def rrect(d,xy,r,fill=None,outline=None,width=1):
    d.rounded_rectangle(xy,radius=r,fill=fill,outline=outline,width=width)

def render_scene(scene, accent):
    AC=ACCENTS.get(accent,ACCENTS["coral"]); SF=SOFT.get(accent,SOFT["coral"])
    img=Image.new("RGB",(W,H),IVORY); d=ImageDraw.Draw(img)
    layout=scene.get("layout","hero")
    if scene.get("kicker"):
        center(d,scene["kicker"],F(34,"B"),170,AC)
    if layout=="hero":
        f=F(92,"X"); y=520; title=scene.get("title",[])
        for i,l in enumerate(title):
            col=AC if (i==len(title)-1 and len(title)>1) else INK
            center(d,l,f,y,col); y+=130
        y+=30
        for l in scene.get("subtitle",[]): center(d,l,F(46,"R"),y,MUTED); y+=70
    elif layout=="points":
        f=F(64,"X"); y=300
        for l in scene.get("title",[]): center(d,l,f,y,INK); y+=86
        fn=F(46,"X"); ft=F(42,"R"); y=max(y+40,560)
        for i,t in enumerate(scene.get("items",[])[:4]):
            rrect(d,(120,y,W-120,y+150),28,fill=WHITE,outline=LINE,width=2)
            d.ellipse((150,y+45,210,y+105),fill=SF)
            n=str(i+1); nw,_=tw(d,n,fn); d.text((180-nw/2,y+50),n,font=fn,fill=AC)
            lns=wrap(d,t,ft,W-330)[:2]
            for j,ln in enumerate(lns):
                d.text((250,y+(40 if len(lns)>1 else 52)+j*52),ln,font=ft,fill=DARK)
            y+=185
    elif layout=="highlight":
        f=F(54,"X"); y=290
        for l in scene.get("title",[]): center(d,l,f,y,INK); y+=78
        if scene.get("badge"):
            bc,bg=BADGE.get(scene.get("badge_color","danger"),BADGE["danger"])
            fb=F(40,"B"); w,_=tw(d,scene["badge"],fb); pw=w+70; by=y+20
            rrect(d,(W//2-pw//2,by,W//2+pw//2,by+90),45,fill=bg)
            d.text((W//2-w/2,by+22),scene["badge"],font=fb,fill=bc); y=by+150
        cards=scene.get("cards",[])[:2]
        if cards:
            cw=(W-120*2-30)//len(cards); fx=F(30,"B"); fl=F(36,"R")
            for i,c in enumerate(cards):
                x0=120+i*(cw+30); x1=x0+cw; cy=max(y,560)
                rrect(d,(x0,cy,x1,cy+360),24,fill=WHITE,outline=LINE,width=2)
                d.text((x0+34,cy+28),c.get("title",""),font=fx,fill=MUTED)
                for j,ln in enumerate(c.get("lines",[])[:5]):
                    d.text((x0+34,cy+90+j*60),ln,font=fl,fill=DARK)
    elif layout=="outro":
        f=F(104,"X"); y=350
        for l in scene.get("title",[]): center(d,l,f,y,INK); y+=130
        for l in scene.get("subtitle",[]): center(d,l,F(46,"R"),y,MUTED); y+=70
        if scene.get("cta"):
            y=max(y+40,700); rrect(d,(150,y,W-150,y+140),30,fill=AC)
            center(d,scene["cta"],F(50,"B"),y+42,WHITE); y+=200
        note=scene.get("note")
        if note:
            for l in (note if isinstance(note,list) else [note]):
                center(d,l,F(38,"R"),y,MUTED); y+=58
    return img

def add_caption(img, text):
    d=ImageDraw.Draw(img); by0=1500
    rrect(d,(60,by0,W-60,1840),36,fill=(26,22,18))
    f=F(58,"B"); lines=wrap(d,text,f,W-220); th=len(lines)*78; y=by0+(340-th)//2
    for l in lines:
        w,_=tw(d,l,f); d.text((W//2-w/2,y),l,font=f,fill=WHITE); y+=78

def add_progress(img, frac, accent):
    d=ImageDraw.Draw(img); d.rectangle((0,1900,int(W*frac),1920),fill=ACCENTS.get(accent,ACCENTS["coral"]))

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--spec",required=True); ap.add_argument("--out",required=True)
    ap.add_argument("--fps",default="30")
    a=ap.parse_args()
    spec=json.load(open(a.spec,encoding="utf-8"))
    accent=spec.get("accent","coral"); total=float(spec.get("total_duration",100.0))
    scenes=spec["scenes"]
    flat=[]
    for si,sc in enumerate(scenes):
        for cap in sc.get("captions",[]): flat.append((si,cap))
    if not flat: print("ERROR: captions 없음"); sys.exit(1)
    weights=[max(1,len(re.sub(r"\s","",c))) for _,c in flat]
    Wt=sum(weights); durs=[total*w/Wt for w in weights]
    bg_cache={}; FR=WORK+"/_frames"; os.makedirs(FR,exist_ok=True)
    for f in glob.glob(FR+"/*.png"): os.remove(f)
    listfile=FR+"/list.txt"; cum=0.0
    with open(listfile,"w",encoding="utf-8") as lf:
        for i,((si,cap),dur) in enumerate(zip(flat,durs),start=1):
            if si not in bg_cache: bg_cache[si]=render_scene(scenes[si],accent)
            img=bg_cache[si].copy(); add_caption(img,cap); cum+=dur; add_progress(img,cum/total,accent)
            fn=FR+("/f%03d.png"%i); img.save(fn)
            lf.write("file '%s'\n"%fn); lf.write("duration %.3f\n"%dur)
        lf.write("file '%s'\n"%(FR+("/f%03d.png"%len(flat))))
    cmd=["ffmpeg","-y","-f","concat","-safe","0","-i",listfile,
         "-vf","scale=1080:1920,format=yuv420p","-r",a.fps,"-t","%.3f"%total,
         "-movflags","+faststart",a.out]
    r=subprocess.run(cmd,capture_output=True,text=True)
    if r.returncode!=0: print(r.stderr[-1500:]); sys.exit(1)
    print("OK ->", a.out, "| 자막", len(flat), "컷 | 길이 %.1f초"%total)

if __name__=="__main__":
    main()
