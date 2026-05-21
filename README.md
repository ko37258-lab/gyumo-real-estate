# gyumo · 건축가능 규모검토 PJ

> 디벨로퍼·토지투자자를 위한 건축 규모검토 도구
> by 미스터홈즈 (미스터홈즈) × 공법의 신

## 시작하기

### 1. v0.1 프로토타입 확인
브라우저에서 `prototype.html`을 열면 v0.1 위젯이 작동합니다. 이것이 Next.js로 분해할 원본입니다.

### 2. Next.js 프로젝트 부트스트랩
```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint
npx shadcn@latest init
npx shadcn@latest add slider select switch button input card label
npm install zustand
```

### 3. 환경변수 설정
```bash
cp .env.example .env.local
# VWORLD_API_KEY, SUPABASE_URL 등 채우기
```

### 4. 개발 서버 실행
```bash
npm run dev
```

## 프로젝트 컨텍스트

모든 상세 정보(타깃, 가격, 로드맵, 폴더 구조, 법령 근거)는 [`CLAUDE.md`](./CLAUDE.md) 참고.

## Claude Code에 첫 명령

```
prototype.html을 읽고 CLAUDE.md의 폴더 구조에 따라 
Next.js 15 App Router 프로젝트로 분해해줘.
shadcn/ui와 zustand를 사용하고, 
components/simulator/ 아래에 6개 컴포넌트로 나눠줘.
```

## 라이선스 / 운영

© 2026 미스터홈즈 (미스터홈즈) FC. All rights reserved.
법적 자문: 법무법인 윤강
