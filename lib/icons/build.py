# lib/icons/svg/*.svg -> icons.generated.ts (Next.js 에는 import.meta.glob 이 없다)
import io,glob,os,json
D=os.path.dirname(os.path.abspath(__file__))
out=['// 자동 생성 — lib/icons/build.py 가 lib/icons/svg/*.svg 를 묶는다. 손으로 고치지 말 것.','export const ICON_SVGS: Record<string, string> = {']
for f in sorted(glob.glob(os.path.join(D,'svg','*.svg'))):
    n=os.path.basename(f)[:-4]; s=io.open(f,encoding='utf-8').read().strip()
    out.append(f'  {json.dumps(n)}: {json.dumps(s, ensure_ascii=False)},')
out.append('}
')
io.open(os.path.join(D,'icons.generated.ts'),'w',encoding='utf-8').write('
'.join(out))
print('ok')
