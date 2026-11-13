"use client";
// 📱 「홈 화면에 추가」 줄 — 첫 화면 맨 위에 얇게 놓는다(2026-11-13).
//   · 크롬·엣지·삼성 인터넷: 브라우저가 보내는 beforeinstallprompt 를 잡아 두었다가 [설치] 를 누르면 설치 창을 띄운다.
//   · 아이폰·아이패드: 설치 창이 없어 「공유 → 홈 화면에 추가」 순서를 안내한다.
//   · 카카오톡·네이버 앱 안 브라우저: 설치가 안 되므로 크롬·사파리로 여는 법을 안내한다.
//   이미 앱으로 열었거나(standalone) 설치할 수 없는 브라우저에서는 아무것도 그리지 않는다. × 를 누르면 30일 쉰다.
import { useEffect, useState } from "react";

type BeforeInstall = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type Mode = "prompt" | "ios" | "inapp";

const KEY = "a2hs_bar_until_v1";
const REST_DAYS = 30;

export default function InstallBar({ appName, accent = "#2563EB" }: { appName: string; accent?: string }) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [evt, setEvt] = useState<BeforeInstall | null>(null);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    try { if (Number(localStorage.getItem(KEY) || 0) > Date.now()) return; } catch { /* 저장소 막힘 — 그냥 보여 준다 */ }
    const nav = window.navigator as Navigator & { standalone?: boolean };
    if (window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true) return;
    const ua = nav.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && nav.maxTouchPoints > 1);
    const inapp = /KAKAOTALK|NAVER\(inapp|Instagram|FBAN|FBAV|Line\//i.test(ua);
    if (inapp) setMode("inapp");
    else if (ios) setMode("ios");
    const onPrompt = (e: Event) => { e.preventDefault(); setEvt(e as BeforeInstall); setMode("prompt"); };
    const onInstalled = () => { setMode(null); rest(3650); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  function rest(days: number) { try { localStorage.setItem(KEY, String(Date.now() + days * 86400000)); } catch { /* 무시 */ } }
  function close() { setMode(null); setGuide(false); rest(REST_DAYS); }
  async function install() {
    if (mode === "prompt" && evt) {
      try {
        await evt.prompt();
        const { outcome } = await evt.userChoice;
        setEvt(null);
        if (outcome === "accepted") { setMode(null); rest(3650); }
        return;
      } catch { /* 설치 창을 못 띄우면 아래 안내로 */ }
    }
    setGuide(true);
  }

  if (!mode) return null;
  const steps = mode === "inapp"
    ? ["화면 오른쪽 위(또는 아래)의 ⋮ · ⋯ 메뉴를 누릅니다", "「다른 브라우저로 열기」를 눌러 크롬이나 사파리로 엽니다", "거기서 다시 [설치] 를 누르면 홈 화면에 추가됩니다"]
    : mode === "ios"
      ? ["화면 아래(또는 위)의 공유 단추 — 네모에서 화살표가 올라가는 모양 — 를 누릅니다", "목록을 내려 「홈 화면에 추가」를 누릅니다", "오른쪽 위 「추가」를 누르면 끝납니다"]
      : ["브라우저 오른쪽 위 ⋮ 메뉴를 엽니다", "「홈 화면에 추가」 또는 「앱 설치」를 누릅니다"];

  return (
    <>
      <div role="region" aria-label="홈 화면에 추가"
        style={{ flex: "none", display: "flex", alignItems: "center", gap: 10, padding: "7px 10px 7px 14px", background: "#0f172a", color: "#fff", fontSize: 13, lineHeight: 1.35, position: "relative", zIndex: 890 }}>
        <span aria-hidden="true" style={{ flex: "none", width: 26, height: 26, borderRadius: 7, display: "grid", placeItems: "center", background: accent, fontSize: 14 }}>📱</span>
        <span style={{ minWidth: 0, flex: 1, wordBreak: "keep-all" }}>
          <b style={{ fontWeight: 800 }}>{appName}</b>
          <span style={{ opacity: 0.82 }}> — 홈 화면에 추가하면 앱처럼 바로 열립니다</span>
        </span>
        <button type="button" onClick={install}
          style={{ flex: "none", height: 32, padding: "0 14px", borderRadius: 8, border: 0, background: "#fff", color: "#0f172a", fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}>
          {mode === "prompt" ? "설치" : "추가 방법"}
        </button>
        <button type="button" onClick={close} aria-label="홈 화면에 추가 안내 닫기"
          style={{ flex: "none", width: 32, height: 32, borderRadius: 8, border: 0, background: "transparent", color: "#fff", opacity: 0.75, fontSize: 18, lineHeight: 1, cursor: "pointer" }}>×</button>
      </div>
      {guide && (
        <div role="dialog" aria-modal="true" aria-label="홈 화면에 추가하는 방법" onClick={() => setGuide(false)}
          style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,.55)", display: "grid", placeItems: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: "min(100%,380px)", background: "#fff", color: "#0f172a", borderRadius: 16, padding: "20px 20px 16px", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>홈 화면에 추가하는 방법</p>
            <ol style={{ margin: "12px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 9 }}>
              {steps.map((s, i) => (
                <li key={s} style={{ display: "flex", gap: 10, fontSize: 14, lineHeight: 1.55, wordBreak: "keep-all" }}>
                  <b style={{ flex: "none", width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", background: accent, color: "#fff", fontSize: 12 }}>{i + 1}</b>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            <button type="button" onClick={() => setGuide(false)}
              style={{ marginTop: 16, width: "100%", height: 44, borderRadius: 10, border: 0, background: "#0f172a", color: "#fff", fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>알겠습니다</button>
          </div>
        </div>
      )}
    </>
  );
}
