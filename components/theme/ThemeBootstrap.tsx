/**
 * 하이드레이션 전 LocalStorage에서 테마를 읽어 <html data-theme="...">를 즉시 설정.
 * FOUC 방지용 inline script. layout.tsx의 <head> 안에 렌더.
 */
export function ThemeBootstrap() {
  const script = `(function(){try{var t=localStorage.getItem('gyumo_theme')||'mrhomes';document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
