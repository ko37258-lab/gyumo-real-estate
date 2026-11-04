-- 조회 이력 저장 복구: (user_id, pnu) 유니크 인덱스에서 부분 조건 제거 (2026-11-04)
--
-- 증상: 2026-08-08 서버 저장 전환 뒤로 gyumo_history 에 한 건도 쌓이지 않았다.
-- 원인: /api/history 의 upsert(onConflict: "user_id,pnu") 는 ON CONFLICT (user_id, pnu) 로 나간다.
--       인덱스에 WHERE (pnu IS NOT NULL) 이 붙어 있으면 ON CONFLICT 에도 같은 조건을 써야 인덱스를
--       찾는데, PostgREST 는 그 조건을 넘길 방법이 없어 매번 42P10 으로 실패했다.
-- 조치: 조건 없는 유니크 인덱스로 바꾼다. NULL 끼리는 중복으로 보지 않으므로 pnu 없는 행은
--       지금처럼 여러 개 들어갈 수 있고, pnu 있는 행의 중복 금지도 그대로다.
--
-- 멱등: 여러 번 실행해도 안전(이미 조건 없는 인덱스면 아무것도 하지 않는다).

do $$
begin
  if exists (
    select 1
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'gyumo_history_user_pnu'
      and i.indpred is not null
  ) then
    drop index public.gyumo_history_user_pnu;
  end if;

  create unique index if not exists gyumo_history_user_pnu
    on public.gyumo_history (user_id, pnu);
end $$;

-- 확인: 오류 없이 "Conflict Arbiter Indexes: gyumo_history_user_pnu" 가 나오면 정상
-- explain insert into public.gyumo_history (user_id, pnu, address)
--   values ('00000000-0000-0000-0000-000000000000', '0', 'x')
--   on conflict (user_id, pnu) do nothing;
