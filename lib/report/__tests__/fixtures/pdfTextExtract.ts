// 최소 PDF 텍스트·좌표 추출기 — pdfjs-dist 없이 E2(레이아웃)·E3(일관성) 테스트를 돌리기 위한 것.
//
// 왜 직접 짰나: 이 저장소/세션에는 pdfjs-dist가 설치돼 있지 않고(npm install 승인 불가),
// docs/report-trust-audit-20261006.md 작업 규칙상 외부 다운로드도 금지돼 있다. 대신
// @react-pdf/renderer가 만드는 PDF는 구조가 단순(고전 xref, Flate 스트림, Type0 폰트 +
// ToUnicode CMap)해서, 필요한 만큼만(페이지별 텍스트와 Y좌표) 직접 파싱해도 충분하다.
//
// 지원 범위(이 리포트 PDF 생성기가 실제로 쓰는 연산자만): q/Q, cm, BT/ET, Tf, Tm, Td/TD/T*,
// Tj/TJ, Tc/Tw/TL(연산자는 소비하되 좌표 계산엔 안 씀). 회전·기울임(skew)이 있는 cm은
// 거의 안 쓰므로 e,f(이동량)만으로 글자 묶음의 좌표를 근사한다 — 글리프 단위 정밀 렌더링이
// 아니라 "이 텍스트 묶음이 페이지의 어디쯤 있는가"를 보는 용도라 이 정도 근사로 충분하다.
import { inflateSync } from "node:zlib";

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function combine(m1: Matrix, m2: Matrix): Matrix {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + b1 * c2,
    a1 * b2 + b1 * d2,
    c1 * a2 + d1 * c2,
    c1 * b2 + d1 * d2,
    e1 * a2 + f1 * c2 + e2,
    e1 * b2 + f1 * d2 + f2,
  ];
}

export interface PdfTextRun {
  text: string;
  /** 페이지 상단에서부터의 거리(pt) — 작을수록 위쪽 */
  yFromTop: number;
  x: number;
}

export interface PdfPageText {
  width: number;
  height: number;
  runs: PdfTextRun[];
}

/* ───────────────────────── 객체 테이블 ───────────────────────── */

interface RawObj {
  num: number;
  dictStr: string;
  streamRaw: Buffer | null;
}

function findDictEnd(s: string, start: number): number {
  let depth = 0;
  let i = start;
  while (i < s.length) {
    if (s[i] === "<" && s[i + 1] === "<") {
      depth++;
      i += 2;
      continue;
    }
    if (s[i] === ">" && s[i + 1] === ">") {
      depth--;
      i += 2;
      if (depth === 0) return i;
      continue;
    }
    i++;
  }
  return s.length;
}

function parseObjects(buf: Buffer): Map<number, RawObj> {
  const latin1 = buf.toString("latin1");
  const objects = new Map<number, RawObj>();
  const re = /(\d+)\s+0\s+obj/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(latin1))) {
    const num = parseInt(m[1], 10);
    const bodyStart = m.index + m[0].length;
    let dictStr = "";
    let dictEnd = bodyStart;
    const afterWs = latin1.slice(bodyStart).match(/^\s*/);
    const trimStart = bodyStart + (afterWs ? afterWs[0].length : 0);
    if (latin1.slice(trimStart, trimStart + 2) === "<<") {
      dictEnd = findDictEnd(latin1, trimStart);
      dictStr = latin1.slice(trimStart, dictEnd);
    }
    let streamRaw: Buffer | null = null;
    const tail = latin1.slice(dictEnd, dictEnd + 4000);
    const streamMatch = tail.match(/^\s*stream\r?\n/);
    if (streamMatch) {
      const streamStart = dictEnd + streamMatch[0].length;
      const endIdx = latin1.indexOf("endstream", streamStart);
      if (endIdx !== -1) {
        // trailing EOL before 'endstream' is not part of the data
        let realEnd = endIdx;
        if (latin1[realEnd - 1] === "\n") realEnd--;
        if (latin1[realEnd - 1] === "\r") realEnd--;
        streamRaw = buf.subarray(streamStart, realEnd);
      }
    }
    objects.set(num, { num, dictStr, streamRaw });
  }
  return objects;
}

type DictValue =
  | { type: "ref"; num: number }
  | { type: "dict"; raw: string }
  | { type: "array"; raw: string }
  | { type: "token"; raw: string };

function readValueAt(s: string, idx: number): { value: DictValue; end: number } {
  let i = idx;
  while (i < s.length && /\s/.test(s[i])) i++;
  if (s[i] === "<" && s[i + 1] === "<") {
    const end = findDictEnd(s, i);
    return { value: { type: "dict", raw: s.slice(i, end) }, end };
  }
  if (s[i] === "[") {
    let depth = 0;
    let j = i;
    for (; j < s.length; j++) {
      if (s[j] === "[") depth++;
      else if (s[j] === "]") {
        depth--;
        if (depth === 0) {
          j++;
          break;
        }
      }
    }
    return { value: { type: "array", raw: s.slice(i, j) }, end: j };
  }
  const refMatch = s.slice(i).match(/^(\d+)\s+(\d+)\s+R/);
  if (refMatch) {
    return { value: { type: "ref", num: parseInt(refMatch[1], 10) }, end: i + refMatch[0].length };
  }
  let j = i;
  while (j < s.length && !/[\s/\]>]/.test(s[j])) j++;
  return { value: { type: "token", raw: s.slice(i, j) }, end: j };
}

/** dict 문자열에서 "/Key"의 값을 찾는다(최상위 레벨만 — 중첩 dict 안쪽은 getKey(nested, ...)로 다시 호출). */
function getKey(dictStr: string, key: string): DictValue | null {
  const re = new RegExp("/" + key + "(?![A-Za-z0-9_])");
  const m = re.exec(dictStr);
  if (!m) return null;
  return readValueAt(dictStr, m.index + m[0].length).value;
}

function refNums(arrayRaw: string): number[] {
  const out: number[] = [];
  const re = /(\d+)\s+\d+\s+R/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(arrayRaw))) out.push(parseInt(m[1], 10));
  return out;
}

class PdfDoc {
  objects: Map<number, RawObj>;
  constructor(buf: Buffer) {
    this.objects = parseObjects(buf);
  }

  dict(num: number): string {
    return this.objects.get(num)?.dictStr ?? "";
  }

  /** dict 안의 키 값을 N 0 obj 까지 따라가며 "최종 문자열"(ref면 그 객체 dict, 아니면 raw)로 돌려준다. */
  resolveToDictStr(val: DictValue | null): string {
    if (!val) return "";
    if (val.type === "ref") return this.dict(val.num);
    if (val.type === "dict") return val.raw;
    return val.raw;
  }

  streamBytes(num: number): Buffer | null {
    const obj = this.objects.get(num);
    if (!obj || !obj.streamRaw) return null;
    if (/FlateDecode/.test(obj.dictStr)) {
      try {
        return inflateSync(obj.streamRaw);
      } catch {
        return null;
      }
    }
    return obj.streamRaw;
  }

  /** Pages 트리를 /Root 부터 따라가 실제 페이지 순서(Page 객체 번호 배열)를 얻는다. */
  pageOrder(): number[] {
    const trailerMatch = Buffer.from(
      [...this.objects.values()].map((o) => "").join(""),
    ); // unused placeholder to keep TS happy about intent
    void trailerMatch;
    // trailer는 파일 끝부분에 있다 — 원본 버퍼가 아니라 재구성한 latin1 텍스트가 필요하므로
    // parseObjects에서 이미 각 객체를 모았으니, /Type /Catalog 를 가진 객체를 직접 찾는다.
    for (const obj of this.objects.values()) {
      if (/\/Type\s*\/Catalog/.test(obj.dictStr)) {
        const pagesRef = getKey(obj.dictStr, "Pages");
        if (pagesRef && pagesRef.type === "ref") {
          const order: number[] = [];
          this.collectPages(pagesRef.num, order);
          if (order.length > 0) return order;
        }
      }
    }
    // Catalog을 못 찾으면(이례적) /Type /Page 객체를 파일 순서대로 반환
    const fallback: number[] = [];
    for (const obj of this.objects.values()) {
      if (/\/Type\s*\/Page(?!s)/.test(obj.dictStr)) fallback.push(obj.num);
    }
    return fallback;
  }

  private collectPages(num: number, out: number[]): void {
    const d = this.dict(num);
    if (/\/Type\s*\/Page(?!s)/.test(d)) {
      out.push(num);
      return;
    }
    const kids = getKey(d, "Kids");
    if (kids && kids.type === "array") {
      for (const kidNum of refNums(kids.raw)) this.collectPages(kidNum, out);
    }
  }

  /** 상속 가능한 키(MediaBox, Resources) — 페이지 자체에 없으면 /Parent를 따라간다. */
  inheritedKey(pageNum: number, key: string): DictValue | null {
    let cur: number | null = pageNum;
    let guard = 0;
    while (cur !== null && guard < 20) {
      guard++;
      const d = this.dict(cur);
      const v = getKey(d, key);
      if (v) return v;
      const parent = getKey(d, "Parent");
      cur = parent && parent.type === "ref" ? parent.num : null;
    }
    return null;
  }

  mediaBox(pageNum: number): { width: number; height: number } {
    const v = this.inheritedKey(pageNum, "MediaBox");
    if (v && v.type === "array") {
      const nums = v.raw
        .replace(/[[\]]/g, "")
        .trim()
        .split(/\s+/)
        .map(Number);
      if (nums.length === 4) return { width: nums[2] - nums[0], height: nums[3] - nums[1] };
    }
    return { width: 595.28, height: 841.89 };
  }

  contentStreamNums(pageNum: number): number[] {
    const d = this.dict(pageNum);
    const v = getKey(d, "Contents");
    if (!v) return [];
    if (v.type === "ref") return [v.num];
    if (v.type === "array") return refNums(v.raw);
    return [];
  }

  /** 페이지의 /Resources /Font 안 리소스 이름(F2 등) → ToUnicode Map<hexcode, char> */
  fontMapsForPage(pageNum: number): Map<string, Map<string, string>> {
    const out = new Map<string, Map<string, string>>();
    const resVal = this.inheritedKey(pageNum, "Resources");
    const resDictStr = this.resolveToDictStr(resVal);
    const fontVal = getKey(resDictStr, "Font");
    const fontDictStr = this.resolveToDictStr(fontVal);
    if (!fontDictStr) return out;
    const entryRe = /\/(\w+)\s+(\d+)\s+0\s+R/g;
    let m: RegExpExecArray | null;
    while ((m = entryRe.exec(fontDictStr))) {
      const resName = m[1];
      const fontObjNum = parseInt(m[2], 10);
      const fontDict = this.dict(fontObjNum);
      const toUni = getKey(fontDict, "ToUnicode");
      if (toUni && toUni.type === "ref") {
        out.set(resName, this.parseToUnicode(toUni.num));
      }
    }
    return out;
  }

  private toUnicodeCache = new Map<number, Map<string, string>>();
  private parseToUnicode(num: number): Map<string, string> {
    const cached = this.toUnicodeCache.get(num);
    if (cached) return cached;
    const map = new Map<string, string>();
    const bytes = this.streamBytes(num);
    if (bytes) {
      const text = bytes.toString("latin1");
      const charRe = /<([0-9a-fA-F]{2,8})>\s*<([0-9a-fA-F]{4,8})>/g;
      let m: RegExpExecArray | null;
      while ((m = charRe.exec(text))) {
        map.set(m[1].toLowerCase(), hexToChar(m[2]));
      }
      // beginbfrange (일부 폰트가 range 형태로 쓸 수 있어 대비)
      const rangeRe =
        /<([0-9a-fA-F]{4})>\s*<([0-9a-fA-F]{4})>\s*<([0-9a-fA-F]{4})>/g;
      // 이미 bfchar로 커버되지 않은 코드만 채운다(과다매칭 방지는 안 하지만 우리 폰트는 bfchar만 씀)
      let rm: RegExpExecArray | null;
      while ((rm = rangeRe.exec(text))) {
        const start = parseInt(rm[1], 16);
        const end = parseInt(rm[2], 16);
        const base = parseInt(rm[3], 16);
        if (end - start > 0 && end - start < 10000) {
          for (let c = start; c <= end; c++) {
            const code = c.toString(16).padStart(4, "0");
            if (!map.has(code)) map.set(code, String.fromCodePoint(base + (c - start)));
          }
        }
      }
    }
    this.toUnicodeCache.set(num, map);
    return map;
  }
}

function hexToChar(hex: string): string {
  const code = parseInt(hex, 16);
  if (!Number.isFinite(code)) return "";
  try {
    return String.fromCodePoint(code);
  } catch {
    return "";
  }
}

function decodeHexGlyphs(hex: string, map: Map<string, string> | undefined): string {
  if (!map) return "";
  let out = "";
  for (let i = 0; i + 4 <= hex.length; i += 4) {
    const code = hex.slice(i, i + 4).toLowerCase();
    out += map.get(code) ?? "";
  }
  return out;
}

/* ───────────────────────── 콘텐츠 스트림 토큰화·실행 ───────────────────────── */

type Token =
  | { t: "num"; v: number }
  | { t: "name"; v: string }
  | { t: "hex"; v: string }
  | { t: "lit"; v: string }
  | { t: "arr"; v: Token[] }
  | { t: "op"; v: string };

function tokenize(content: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const n = content.length;
  function skipWs() {
    while (i < n) {
      if (/\s/.test(content[i])) {
        i++;
        continue;
      }
      if (content[i] === "%") {
        while (i < n && content[i] !== "\n") i++;
        continue;
      }
      break;
    }
  }
  function readArray(): Token[] {
    i++; // skip [
    const items: Token[] = [];
    while (i < n) {
      skipWs();
      if (content[i] === "]") {
        i++;
        break;
      }
      const tok = readOne();
      if (tok) items.push(tok);
      else break;
    }
    return items;
  }
  function readOne(): Token | null {
    skipWs();
    if (i >= n) return null;
    const c = content[i];
    if (c === "[") return { t: "arr", v: readArray() };
    if (c === "/") {
      let j = i + 1;
      while (j < n && !/[\s/()<>\[\]%]/.test(content[j])) j++;
      const v = content.slice(i + 1, j);
      i = j;
      return { t: "name", v };
    }
    if (c === "(") {
      let depth = 1;
      let j = i + 1;
      let buf = "";
      while (j < n && depth > 0) {
        if (content[j] === "\\") {
          buf += content[j + 1];
          j += 2;
          continue;
        }
        if (content[j] === "(") depth++;
        if (content[j] === ")") {
          depth--;
          if (depth === 0) {
            j++;
            break;
          }
        }
        buf += content[j];
        j++;
      }
      i = j;
      return { t: "lit", v: buf };
    }
    if (c === "<" && content[i + 1] === "<") {
      // inline dict (BDC properties 등) — 내용은 쓰지 않으니 통째로 건너뛴다
      const end = findDictEnd(content, i);
      i = end;
      return { t: "name", v: "" };
    }
    if (c === "<") {
      let j = i + 1;
      while (j < n && content[j] !== ">") j++;
      const v = content.slice(i + 1, j).replace(/\s+/g, "");
      i = j + 1;
      return { t: "hex", v };
    }
    if (/[0-9+\-.]/.test(c)) {
      let j = i;
      while (j < n && /[0-9+\-.]/.test(content[j])) j++;
      const v = parseFloat(content.slice(i, j));
      i = j;
      return { t: "num", v: Number.isFinite(v) ? v : 0 };
    }
    // operator token
    let j = i;
    while (j < n && /[A-Za-z*'"0-9]/.test(content[j])) j++;
    if (j === i) {
      i++; // 모르는 기호 — 한 글자 건너뛰고 계속
      return readOne();
    }
    const v = content.slice(i, j);
    i = j;
    return { t: "op", v };
  }
  while (i < n) {
    const tok = readOne();
    if (!tok) break;
    tokens.push(tok);
  }
  return tokens;
}

function runPage(doc: PdfDoc, pageNum: number): PdfPageText {
  const { width, height } = doc.mediaBox(pageNum);
  const fontMaps = doc.fontMapsForPage(pageNum);
  const contentNums = doc.contentStreamNums(pageNum);
  const chunks: string[] = [];
  for (const num of contentNums) {
    const bytes = doc.streamBytes(num);
    if (bytes) chunks.push(bytes.toString("latin1"));
  }
  const content = chunks.join("\n");
  const tokens = tokenize(content);

  const runs: PdfTextRun[] = [];
  let ctm: Matrix = IDENTITY;
  const ctmStack: Matrix[] = [];
  let tm: Matrix = IDENTITY;
  let tlm: Matrix = IDENTITY;
  let inText = false;
  let currentFont: string | null = null;
  let blockText = "";
  let blockPos: { x: number; y: number } | null = null;

  const stack: Token[] = [];

  function flushBlockIfAny() {
    if (blockText.trim().length > 0 && blockPos) {
      runs.push({ text: blockText, x: blockPos.x, yFromTop: height - blockPos.y });
    }
    blockText = "";
    blockPos = null;
  }

  function showText(decoded: string) {
    if (!decoded) return;
    if (!blockPos) {
      const trm = combine(tm, ctm);
      blockPos = { x: trm[4], y: trm[5] };
    }
    blockText += decoded;
  }

  for (const tok of tokens) {
    if (tok.t !== "op") {
      stack.push(tok);
      continue;
    }
    const nums = () => stack.filter((s) => s.t === "num").map((s) => (s as { t: "num"; v: number }).v);
    switch (tok.v) {
      case "q":
        ctmStack.push(ctm);
        break;
      case "Q":
        ctm = ctmStack.pop() ?? IDENTITY;
        break;
      case "cm": {
        const ns = nums();
        if (ns.length >= 6) {
          const m: Matrix = [ns[ns.length - 6], ns[ns.length - 5], ns[ns.length - 4], ns[ns.length - 3], ns[ns.length - 2], ns[ns.length - 1]];
          ctm = combine(m, ctm);
        }
        break;
      }
      case "BT":
        inText = true;
        tm = IDENTITY;
        tlm = IDENTITY;
        flushBlockIfAny();
        break;
      case "ET":
        inText = false;
        flushBlockIfAny();
        break;
      case "Tf": {
        const nameTok = [...stack].reverse().find((s) => s.t === "name") as { t: "name"; v: string } | undefined;
        currentFont = nameTok ? nameTok.v : currentFont;
        break;
      }
      case "Tm": {
        const ns = nums();
        if (ns.length >= 6) {
          tm = [ns[ns.length - 6], ns[ns.length - 5], ns[ns.length - 4], ns[ns.length - 3], ns[ns.length - 2], ns[ns.length - 1]];
          tlm = tm;
          flushBlockIfAny();
        }
        break;
      }
      case "Td":
      case "TD": {
        const ns = nums();
        if (ns.length >= 2) {
          const tx = ns[ns.length - 2];
          const ty = ns[ns.length - 1];
          tlm = combine([1, 0, 0, 1, tx, ty], tlm);
          tm = tlm;
          flushBlockIfAny();
        }
        break;
      }
      case "T*":
        tlm = combine([1, 0, 0, 1, 0, 0], tlm);
        tm = tlm;
        flushBlockIfAny();
        break;
      case "Tj": {
        const strTok = [...stack].reverse().find((s) => s.t === "hex" || s.t === "lit");
        if (strTok && strTok.t === "hex") showText(decodeHexGlyphs(strTok.v, fontMaps.get(currentFont ?? "")));
        break;
      }
      case "TJ": {
        const arrTok = [...stack].reverse().find((s) => s.t === "arr") as { t: "arr"; v: Token[] } | undefined;
        if (arrTok) {
          for (const item of arrTok.v) {
            if (item.t === "hex") showText(decodeHexGlyphs(item.v, fontMaps.get(currentFont ?? "")));
          }
        }
        break;
      }
      default:
        break;
    }
    stack.length = 0;
  }
  flushBlockIfAny();
  void inText;
  return { width, height, runs };
}

export function extractPdfPages(buf: Buffer): PdfPageText[] {
  const doc = new PdfDoc(buf);
  const order = doc.pageOrder();
  return order.map((num) => runPage(doc, num));
}

/** 전체 페이지에서 특정 문자열을 포함한 run이 있는지 — E3 금지어 검사용. */
export function pdfContainsText(pages: PdfPageText[], needle: string): boolean {
  return pages.some((p) => p.runs.some((r) => r.text.includes(needle)));
}

/** 전체 PDF 텍스트를 이어붙인 문자열 (페이지 구분 \f, run 구분 없음) — 느슨한 검색용. */
export function joinAllText(pages: PdfPageText[]): string {
  return pages.map((p) => p.runs.map((r) => r.text).join("")).join("\f");
}

export interface PdfLine {
  yFromTop: number;
  text: string;
}

/**
 * 같은 시각적 줄(Y좌표가 비슷한 run들)을 하나로 묶는다 — react-pdf는 한 줄을
 * 커닝 단위로 쪼개 여러 run을 내보내므로(TJ 배열 여러 개), run 개수 ≠ 실제 줄 수다.
 * E2 "본문 2줄 이하" 같은 규칙은 이 함수로 묶은 결과를 써야 뜻이 맞는다.
 */
export function groupRunsIntoLines(runs: PdfTextRun[], tolerance = 2): PdfLine[] {
  const sorted = [...runs].sort((a, b) => a.yFromTop - b.yFromTop || a.x - b.x);
  const lines: PdfLine[] = [];
  for (const r of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.yFromTop - r.yFromTop) <= tolerance) {
      last.text += r.text;
    } else {
      lines.push({ yFromTop: r.yFromTop, text: r.text });
    }
  }
  return lines;
}
