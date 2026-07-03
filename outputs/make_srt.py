# -*- coding: utf-8 -*-
"""
make_srt.py - 자막 줄 목록을 음성 길이(초)에 맞춰 SRT/TXT로 변환.

사용:
  python make_srt.py --captions captions.txt --duration 110.3 --out 자막.srt
  (captions.txt = 한 줄당 자막 1컷)

글자수에 비례해 각 컷의 노출 시간을 배분하므로, --duration에 '생성된 음성의 실제 길이'를
넣으면 음성과 거의 정확히 맞는다. 음성 길이를 모르면 글자수/3.5(초당)로 추정해도 된다.
"""
import re, argparse

def fmt(s):
    if s<0: s=0.0
    h=int(s//3600); m=int((s%3600)//60); sec=int(s%60); ms=int(round((s-int(s))*1000))
    if ms==1000: ms=0; sec+=1
    return "%02d:%02d:%02d,%03d"%(h,m,sec,ms)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--captions",required=True)
    ap.add_argument("--duration",type=float,default=None)
    ap.add_argument("--cps",type=float,default=3.5)
    ap.add_argument("--out",required=True)
    a=ap.parse_args()
    lines=[l.rstrip("\n") for l in open(a.captions,encoding="utf-8") if l.strip()]
    weights=[max(1,len(re.sub(r"\s","",c))) for c in lines]
    total=a.duration if a.duration else sum(weights)/a.cps
    W=sum(weights); t=0.0; out=[]
    for i,(c,w) in enumerate(zip(lines,weights),start=1):
        dur=total*w/W; st=t; et=t+dur; t=et
        out.append("%d\n%s --> %s\n%s\n"%(i,fmt(st),fmt(et),c))
    open(a.out,"w",encoding="utf-8").write("\n".join(out))
    open(a.out.rsplit(".",1)[0]+".txt","w",encoding="utf-8").write("\n".join(lines))
    print("OK ->",a.out,"| %d컷 | 총 %.1f초"%(len(lines),total))

if __name__=="__main__":
    main()
