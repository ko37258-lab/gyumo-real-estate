// 이모지 → 우리 아이콘 이름 (2026-09-22). 코드모드(scripts/emoji-to-icon.py)와 런타임이 같이 쓴다.
// 여기 없는 이모지는 화면에서 지운다(빈 자리). ✓ ✕ ★ ↗ ▶ 같은 글꼴 기호는 이모지가 아니라 그대로 둔다.
export const EMOJI_ICON: Record<string, string> = {
  '⚠️': 'warning', '⚠': 'warning', '🚧': 'warning', '⛔': 'x-circle', '❌': 'x-circle', '✗': 'x-circle', '🔴': 'x-circle',
  '✅': 'check', '🟢': 'check', '👍': 'check',
  '📋': 'document', '📄': 'document', '📃': 'document', '📑': 'document', '📝': 'pencil', '🧾': 'document', '📜': 'scroll', '📖': 'book', '📚': 'book',
  '⏳': 'hourglass', '🕘': 'hourglass', '🕒': 'hourglass', '⏱': 'hourglass', '⏸': 'hourglass', '🗓️': 'calendar', '📅': 'calendar',
  '🏠': 'house', '🏡': 'house', '🏚️': 'old-house', '🏘️': 'neighborhood', '🏢': 'building', '🏬': 'apartment', '🏙️': 'apartment', '🏗️': 'crane', '🔨': 'hammer', '🏭': 'factory', '🏪': 'shop', '🏦': 'bank', '🏥': 'bank', '🏫': 'school', '⛪': 'courthouse', '🏛️': 'courthouse', '📦': 'warehouse',
  '💡': 'idea', '🔑': 'key', '🔓': 'unlock', '🔒': 'lock', '🔐': 'lock', '🛡️': 'shield',
  '🗺️': 'map', '📍': 'pin', '📌': 'pushpin', '🧭': 'map', '🌐': 'globe', '🛰️': 'globe', '🛣️': 'road', '🚇': 'subway', '🚉': 'subway', '🚂': 'subway', '🚌': 'car', '🚗': 'car', '🅿️': 'car',
  '📊': 'chart-bar', '📈': 'chart-up', '🧮': 'chart-bar', '📐': 'ruler', '🔢': 'ruler',
  '🔍': 'search', '🔎': 'search', '🔗': 'link', '↩️': 'refresh', '↩': 'refresh', '🔄': 'refresh',
  '💰': 'coins', '💎': 'diamond', '💳': 'card', '💸': 'coins', '🪙': 'coins', '🎁': 'gift', '🆓': 'gift', '🎫': 'card',
  '⚖️': 'scale', '👤': 'user', '🧑': 'user', '👥': 'users', '🎓': 'graduation', '🏆': 'trophy', '⭐': 'star', '🌟': 'star', '✨': 'sparkle', '🆕': 'sparkle', '⚡': 'bolt', '🚀': 'bolt', '🎉': 'sparkle',
  '📢': 'bell', '🔔': 'bell', '💬': 'chat', '🤖': 'robot', '🎨': 'palette', '🖼️': 'camera', '📷': 'camera', '📸': 'camera',
  '⚙️': 'gear', '🔧': 'gear', '📤': 'upload', '⬇️': 'download', '💾': 'download', '📥': 'download', '🗑': 'trash', '🗑️': 'trash', '✍️': 'pencil', '✏️': 'pencil', '🖊️': 'pencil', '🖨️': 'printer',
  '❔': 'question', '❓': 'question', 'ℹ️': 'question', 'ℹ': 'question', '🤔': 'question',
  '📧': 'mail', '📮': 'mail', '📞': 'phone', '📱': 'phone', '💻': 'building', '🗂️': 'folder', '📁': 'folder',
  '🌳': 'tree', '🌲': 'tree', '🌿': 'tree', '🌾': 'wheat', '⛰️': 'mountain', '🏞️': 'mountain', '💧': 'mountain', '🌊': 'mountain',
  '🚩': 'flag', '🧩': 'sparkle', '🎯': 'pin', '🚪': 'house', '🛒': 'shop', '☀️': 'star', '🪶': 'pencil',
}

/** 문자열 앞머리 이모지를 떼어 {icon, text} 로 — 배열 데이터(label: '🏢 사무실') 렌더용 */
const LEAD: RegExp = /^\s*([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2139}]\u{FE0F}?)\s*/u
export function splitLeadEmoji(str: unknown) {
  const s = String(str ?? '')
  const m = s.match(LEAD)
  if (!m) return { icon: null, text: s }
  return { icon: EMOJI_ICON[m[1]] || null, text: s.slice(m[0].length) }
}
