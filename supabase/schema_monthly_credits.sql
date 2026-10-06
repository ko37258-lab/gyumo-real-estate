-- 등급별 월 크레딧 제도 (2026-09-23, 대표님 지시)
--
-- 규칙
--   · 정회원 · 멘토스쿨                              : 매달 15개 자동 지급, 그 달 한도 (다 쓰면 다음 달 1일까지 대기)
--   · VIP · 평생회원 · 미스터홈즈센터 · 스텝 · 관리자 : 무제한 (크레딧 차감 없음)
--   · 일반회원                            : 가입 보너스 3개 + 충전분만
--
-- 왜: 지금까지 등급은 '정회원'인데 크레딧이 0이라 "크레딧 부족 — 정회원 신청" 이 뜨는
--     사람이 7명 있었다(등급만 올리고 크레딧은 안 나감). 등급을 올리면 이용이 되도록 만든다.
--
-- 월 지급분은 source='monthly:YYYY-MM' 으로 한 달에 한 번만 들어가고(유니크),
-- 만료는 그 달 말일 24시 → 이월되지 않는다(매달 15개로 초기화).
-- 소비 순서는 기존 규칙(만료 임박 우선) 그대로라 월 지급분이 구매분보다 먼저 쓰인다.
--
-- 멱등: 여러 번 실행해도 안전.

-- 0) 등급 목록에 '평생회원' 추가 (DB CHECK 제약과 lib/membership.ts ALL_ROLES 는 항상 함께 고친다)
alter table public.gyumo_profiles drop constraint if exists gyumo_profiles_role_check;
alter table public.gyumo_profiles add constraint gyumo_profiles_role_check
  check (role = any (array['일반회원','정회원','VIP','평생회원','미스터홈즈센터','멘토스쿨','스텝']));

-- 1) 월 지급 배치 중복 방지 ─────────────────────────────────────────────
create unique index if not exists gyumo_credit_batches_monthly_once
  on public.gyumo_credit_batches (user_id, source)
  where source like 'monthly:%';

-- 2) 등급 정의 (한 곳에서만 관리) ───────────────────────────────────────
create or replace function public.gyumo_role_unlimited(p_role text)
returns boolean language sql immutable as $$
  select coalesce(p_role, '일반회원') in ('VIP', '평생회원', '미스터홈즈센터', '스텝');
$$;

create or replace function public.gyumo_role_monthly_credits(p_role text)
returns integer language sql immutable as $$
  select case when coalesce(p_role, '일반회원') in ('정회원', '멘토스쿨')
              then 15 else 0 end;
$$;

-- 3) 이번 달 지급분 보충 ────────────────────────────────────────────────
--    호출 시점에 이번 달 배치가 없으면 만들어 준다(로그인·조회 때마다 호출해도 1회만 들어감).
create or replace function public.gyumo_ensure_monthly_credits(p_user uuid)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_role   text;
  v_amount integer;
  v_src    text := 'monthly:' || to_char(now() at time zone 'Asia/Seoul', 'YYYY-MM');
  v_expire timestamptz := (date_trunc('month', (now() at time zone 'Asia/Seoul')) + interval '1 month')
                          at time zone 'Asia/Seoul';
begin
  select role into v_role from public.gyumo_profiles where id = p_user;
  v_amount := public.gyumo_role_monthly_credits(v_role);
  if v_amount <= 0 then
    return public.gyumo_credit_balance(p_user);
  end if;

  insert into public.gyumo_credit_batches(user_id, amount, remaining, source, expires_at)
  values (p_user, v_amount, v_amount, v_src, v_expire)
  on conflict do nothing;   -- 이번 달에 이미 받았으면 아무 일도 안 일어난다

  return public.gyumo_credit_balance(p_user);
end;
$$;

-- 4) 잔액 조회 시 월 지급분을 먼저 채운다 ───────────────────────────────
create or replace function public.gyumo_credit_balance_ensured(p_user uuid)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if auth.uid() is not null and auth.uid() <> p_user then
    raise exception 'forbidden';
  end if;
  perform public.gyumo_ensure_monthly_credits(p_user);
  return public.gyumo_credit_balance(p_user);
end;
$$;

-- 5) 차감도 월 지급분을 먼저 채운 뒤에 ──────────────────────────────────
--    (달이 바뀐 직후 첫 조회에서 "크레딧 없음"이 뜨지 않게)
create or replace function public.gyumo_consume_credit(p_user uuid)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare v_batch uuid; v_bal integer; v_role text;
begin
  if auth.uid() is not null and auth.uid() <> p_user then
    raise exception 'forbidden: cannot consume credits of another user';
  end if;

  select role into v_role from public.gyumo_profiles where id = p_user;

  -- VIP·스텝은 무제한 — 차감하지 않는다
  if public.gyumo_role_unlimited(v_role) then
    return 9999;
  end if;

  perform public.gyumo_ensure_monthly_credits(p_user);

  select id into v_batch
  from public.gyumo_credit_batches
  where user_id = p_user and remaining > 0
    and (expires_at is null or expires_at > now())
  order by (expires_at is null), expires_at asc   -- 만료 임박 우선 = 월 지급분 먼저
  limit 1 for update;

  if v_batch is null then
    return -1;
  end if;

  update public.gyumo_credit_batches set remaining = remaining - 1 where id = v_batch;
  select public.gyumo_credit_balance(p_user) into v_bal;
  update public.gyumo_profiles set credits = v_bal where id = p_user;
  return v_bal;
end;
$$;

grant execute on function public.gyumo_role_unlimited(text)         to anon, authenticated, service_role;
grant execute on function public.gyumo_role_monthly_credits(text)   to anon, authenticated, service_role;
grant execute on function public.gyumo_ensure_monthly_credits(uuid) to authenticated, service_role;
grant execute on function public.gyumo_credit_balance_ensured(uuid) to authenticated, service_role;

-- 6) 지금 등급이 있는 회원에게 이번 달분 즉시 지급 ──────────────────────
do $$
declare r record;
begin
  for r in select id from public.gyumo_profiles
           where public.gyumo_role_monthly_credits(role) > 0
  loop
    perform public.gyumo_ensure_monthly_credits(r.id);
  end loop;
end $$;
