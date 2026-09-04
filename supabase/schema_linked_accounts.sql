-- ============================================================
-- gyumo — 자기이름 등록 게이트 + 동일 전화번호 계정 묶음 (2026-09-04)
-- 멱등(여러 번 실행해도 안전). Supabase SQL Editor 또는 MCP apply_migration 으로 실행.
--
-- 1) gyumo_profiles.name_registered_at — 구글 가입자가 "자기이름 등록"을 마친 시각.
--    구글은 full_name 을 자동으로 채워 오므로 이름 유무로는 등록 여부를 알 수 없다.
--    NULL 인 구글 가입자는 proxy 게이트가 /register-name 으로 보낸다.
-- 2) gyumo_profiles.phone_norm — 전화번호 숫자만(생성 컬럼). 동일 전화번호 묶음 키.
-- 3) gyumo_linked_user_ids(uid) — 같은 전화번호(9자리 이상) + 같은 이름(공백 제거)인
--    계정 id 집합(본인 포함). 이름까지 같아야 묶는 것은 남의 전화번호를 넣어
--    크레딧을 끌어쓰는 악용을 막기 위한 안전장치.
-- 4) 크레딧 잔액·만료·차감 RPC 를 묶음 단위로 교체 — API 시그니처는 그대로.
-- ============================================================

ALTER TABLE public.gyumo_profiles ADD COLUMN IF NOT EXISTS name_registered_at TIMESTAMPTZ;

ALTER TABLE public.gyumo_profiles
  ADD COLUMN IF NOT EXISTS phone_norm TEXT
  GENERATED ALWAYS AS (regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g')) STORED;
CREATE INDEX IF NOT EXISTS gyumo_profiles_phone_norm_idx
  ON public.gyumo_profiles (phone_norm) WHERE phone_norm <> '';

-- 백필: 이메일 가입자(가입 폼에서 이름·전화 입력)와 이미 전화를 넣은 구글 가입자는 등록 완료로 본다
UPDATE public.gyumo_profiles
   SET name_registered_at = COALESCE(created_at, NOW())
 WHERE name_registered_at IS NULL
   AND (signup_provider IS DISTINCT FROM 'google'
        OR regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') <> '');

-- 연결 계정 집합 (본인 포함)
CREATE OR REPLACE FUNCTION public.gyumo_linked_user_ids(p_user UUID)
RETURNS SETOF UUID LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT p2.id
    FROM public.gyumo_profiles p1
    JOIN public.gyumo_profiles p2
      ON p2.phone_norm = p1.phone_norm
     AND length(p1.phone_norm) >= 9
     AND regexp_replace(COALESCE(p2.full_name, ''), '\s', '', 'g')
       = regexp_replace(COALESCE(p1.full_name, ''), '\s', '', 'g')
     AND regexp_replace(COALESCE(p1.full_name, ''), '\s', '', 'g') <> ''
   WHERE p1.id = p_user
  UNION
  SELECT p_user;
$$;
GRANT EXECUTE ON FUNCTION public.gyumo_linked_user_ids(UUID) TO authenticated, anon, service_role;

-- 잔액 (묶음 합계)
CREATE OR REPLACE FUNCTION public.gyumo_credit_balance(p_user UUID)
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(SUM(remaining), 0)::INTEGER
  FROM public.gyumo_credit_batches
  WHERE user_id IN (SELECT public.gyumo_linked_user_ids(p_user))
    AND remaining > 0
    AND (expires_at IS NULL OR expires_at > NOW());
$$;

-- 가장 임박한 만료일 (묶음)
CREATE OR REPLACE FUNCTION public.gyumo_credit_next_expiry(p_user UUID)
RETURNS TIMESTAMPTZ LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT MIN(expires_at)
  FROM public.gyumo_credit_batches
  WHERE user_id IN (SELECT public.gyumo_linked_user_ids(p_user))
    AND remaining > 0
    AND expires_at IS NOT NULL
    AND expires_at > NOW();
$$;

-- 1크레딧 소모 — 묶음 안에서 만료 임박 배치 우선(동률이면 본인 배치 우선). 잔액 없으면 -1
CREATE OR REPLACE FUNCTION public.gyumo_consume_credit(p_user UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_batch UUID; v_bal INTEGER;
BEGIN
  SELECT id INTO v_batch
  FROM public.gyumo_credit_batches
  WHERE user_id IN (SELECT public.gyumo_linked_user_ids(p_user))
    AND remaining > 0
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY (expires_at IS NULL), expires_at ASC, (user_id = p_user) DESC
  LIMIT 1 FOR UPDATE;

  IF v_batch IS NULL THEN
    RETURN -1;
  END IF;

  UPDATE public.gyumo_credit_batches SET remaining = remaining - 1 WHERE id = v_batch;
  SELECT public.gyumo_credit_balance(p_user) INTO v_bal;
  UPDATE public.gyumo_profiles SET credits = v_bal
   WHERE id IN (SELECT public.gyumo_linked_user_ids(p_user));
  RETURN v_bal;
END;
$$;

-- 확인용
-- SELECT id, email, full_name, phone_norm, name_registered_at FROM public.gyumo_profiles ORDER BY created_at DESC LIMIT 20;
-- SELECT * FROM public.gyumo_linked_user_ids('<uuid>');
