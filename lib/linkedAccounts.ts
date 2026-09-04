/**
 * 동일 전화번호 계정 묶음 — 화면(관리자·마이페이지)용 순수 함수.
 *
 * DB 쪽 규칙(supabase/schema_linked_accounts.sql · gyumo_linked_user_ids)과 반드시 같아야 한다:
 *   전화번호 숫자만 9자리 이상 동일 + 이름(공백 제거) 동일 → 한 계정처럼 관리.
 * 이름까지 같아야 묶는 이유: 남의 전화번호를 넣어 크레딧을 끌어쓰는 악용 방지.
 */

export function normPhone(phone: string | null | undefined): string {
  return (phone ?? "").replace(/[^0-9]/g, "");
}

export function normName(name: string | null | undefined): string {
  return (name ?? "").replace(/\s/g, "");
}

/** 묶음 키 — 묶일 수 없는 계정(전화 9자리 미만·이름 없음)은 null */
export function linkKey(p: { phone?: string | null; full_name?: string | null }): string | null {
  const ph = normPhone(p.phone);
  const nm = normName(p.full_name);
  if (ph.length < 9 || !nm) return null;
  return `${ph}|${nm}`;
}

/**
 * 프로필 목록 → { 계정 id: 같은 묶음의 다른 계정들 } (혼자면 빈 배열).
 * 관리자 회원 목록에서 "👥 N계정" 배지와 "다계정" 필터에 쓴다.
 */
export function groupLinked<T extends { id: string; phone?: string | null; full_name?: string | null }>(
  profiles: T[],
): Map<string, T[]> {
  const byKey = new Map<string, T[]>();
  for (const p of profiles) {
    const k = linkKey(p);
    if (!k) continue;
    const arr = byKey.get(k) ?? [];
    arr.push(p);
    byKey.set(k, arr);
  }
  const out = new Map<string, T[]>();
  for (const members of byKey.values()) {
    if (members.length < 2) continue;
    for (const m of members) out.set(m.id, members.filter((x) => x.id !== m.id));
  }
  return out;
}
