-- ================================================================
-- gyumo 크레딧 시스템 (v3, 추가 마이그레이션)
-- 기존 schema.sql 위에 실행. 멱등(IF NOT EXISTS / OR REPLACE)이라 재실행 안전.
--
-- 모델:
--   · 가입 시 무료 3크레딧 1회 지급 (source=signup, 무기한)
--   · 정회원 신청 = 입금 → 관리자 승인 → 크레딧 지급(source=purchase, 승인 후 2개월 만료) + 정회원 승격
--   · 조회 1건당 1크레딧 차감 (만료 임박 배치 우선)
--   · 크레딧 지급/차감은 모두 SECURITY DEFINER 함수로만 (클라이언트 직접 변경 불가)
-- ================================================================

-- 프로필: 표시용 크레딧 잔액 캐시 (실제 진실은 gyumo_credit_batches 합계)
ALTER TABLE public.gyumo_profiles
  ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0;

-- 정회원 신청 시 추가로 받는 정보
ALTER TABLE public.gyumo_profiles
  ADD COLUMN IF NOT EXISTS region TEXT;

-- ── 크레딧 배치 (지급 단위 · 배치별 만료) ──────────────────────
CREATE TABLE IF NOT EXISTS public.gyumo_credit_batches (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount     INTEGER     NOT NULL,           -- 지급된 크레딧
  remaining  INTEGER     NOT NULL,           -- 남은 크레딧
  source     TEXT        NOT NULL,           -- 'signup' | 'purchase' | 'admin'
  expires_at TIMESTAMPTZ,                    -- NULL = 무기한 (가입 축하 등)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS gyumo_credit_batches_user_idx
  ON public.gyumo_credit_batches(user_id, expires_at);

ALTER TABLE public.gyumo_credit_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_batches_read" ON public.gyumo_credit_batches;
CREATE POLICY "own_batches_read" ON public.gyumo_credit_batches
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_batches_read" ON public.gyumo_credit_batches;
CREATE POLICY "admin_batches_read" ON public.gyumo_credit_batches
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.gyumo_profiles
            WHERE id = auth.uid() AND (is_admin = TRUE OR role = '스텝'))
  );
-- INSERT/UPDATE 정책 없음 → SECURITY DEFINER 함수·service role로만 변경 가능

-- ── 크레딧 구매/충전 신청 (입금 확인 대기) ─────────────────────
CREATE TABLE IF NOT EXISTS public.gyumo_credit_requests (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  email          TEXT,
  plan           TEXT        NOT NULL,        -- '10' | '30'
  amount_won     INTEGER     NOT NULL,        -- 입금액
  credits        INTEGER     NOT NULL,        -- 지급 예정 크레딧
  depositor_name TEXT        NOT NULL,        -- 입금자 성함
  phone_last4    TEXT        NOT NULL,        -- 전화번호 뒤 4자리
  company        TEXT,                        -- 정회원 신청 정보
  region         TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending'  -- pending | approved | rejected
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  processed_by   UUID,
  processed_at   TIMESTAMPTZ,
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS gyumo_credit_requests_status_idx
  ON public.gyumo_credit_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS gyumo_credit_requests_user_idx
  ON public.gyumo_credit_requests(user_id, created_at DESC);

ALTER TABLE public.gyumo_credit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_requests_read" ON public.gyumo_credit_requests;
CREATE POLICY "own_requests_read" ON public.gyumo_credit_requests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin_requests_all" ON public.gyumo_credit_requests;
CREATE POLICY "admin_requests_all" ON public.gyumo_credit_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.gyumo_profiles
            WHERE id = auth.uid() AND (is_admin = TRUE OR role = '스텝'))
  );
-- 신청 생성은 서버(service role)에서 처리 → 사용자 INSERT 정책 불필요

-- ── 유효 크레딧 잔액 ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.gyumo_credit_balance(p_user UUID)
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(SUM(remaining), 0)::INTEGER
  FROM public.gyumo_credit_batches
  WHERE user_id = p_user
    AND remaining > 0
    AND (expires_at IS NULL OR expires_at > NOW());
$$;

-- ── 가장 임박한 만료일 (표시용, 없으면 NULL) ──────────────────
CREATE OR REPLACE FUNCTION public.gyumo_credit_next_expiry(p_user UUID)
RETURNS TIMESTAMPTZ LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT MIN(expires_at)
  FROM public.gyumo_credit_batches
  WHERE user_id = p_user
    AND remaining > 0
    AND expires_at IS NOT NULL
    AND expires_at > NOW();
$$;

-- ── 1크레딧 소모 (만료 임박 배치 우선) ────────────────────────
--   성공: 소모 후 잔액 반환 / 잔액 없음: -1 반환
CREATE OR REPLACE FUNCTION public.gyumo_consume_credit(p_user UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_batch UUID; v_bal INTEGER;
BEGIN
  SELECT id INTO v_batch
  FROM public.gyumo_credit_batches
  WHERE user_id = p_user AND remaining > 0
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY (expires_at IS NULL), expires_at ASC   -- 만료 있는 것 먼저, 임박순
  LIMIT 1 FOR UPDATE;

  IF v_batch IS NULL THEN
    RETURN -1;
  END IF;

  UPDATE public.gyumo_credit_batches SET remaining = remaining - 1 WHERE id = v_batch;
  SELECT public.gyumo_credit_balance(p_user) INTO v_bal;
  UPDATE public.gyumo_profiles SET credits = v_bal WHERE id = p_user;
  RETURN v_bal;
END;
$$;

-- ── 크레딧 지급 (배치 생성) ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.gyumo_grant_credits(
  p_user UUID, p_amount INTEGER, p_source TEXT, p_expires TIMESTAMPTZ
) RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_bal INTEGER;
BEGIN
  INSERT INTO public.gyumo_credit_batches(user_id, amount, remaining, source, expires_at)
  VALUES (p_user, p_amount, p_amount, p_source, p_expires);
  SELECT public.gyumo_credit_balance(p_user) INTO v_bal;
  UPDATE public.gyumo_profiles SET credits = v_bal WHERE id = p_user;
  RETURN v_bal;
END;
$$;

GRANT EXECUTE ON FUNCTION public.gyumo_credit_balance(UUID)     TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.gyumo_credit_next_expiry(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.gyumo_consume_credit(UUID)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.gyumo_grant_credits(UUID, INTEGER, TEXT, TIMESTAMPTZ) TO authenticated, service_role;

-- ── 신규 가입 시: 프로필 보정 + 무료 3크레딧 1회 지급 ──────────
--   ⚠ 이 Supabase 프로젝트는 여러 앱이 공유한다(테이블 prefix가 gyumo_ 인 이유).
--     공용 이름인 public.handle_new_user() 를 덮어쓰면 다른 앱의 가입 처리가
--     깨질 수 있으므로 절대 건드리지 않고, gyumo 전용 함수·트리거를 따로 단다.
--     (PostgreSQL은 한 테이블에 트리거 여러 개를 허용하며, 이름 알파벳 순으로 실행된다.)
CREATE OR REPLACE FUNCTION public.gyumo_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- 프로필이 없을 때만 생성 (기존 트리거가 이미 만들었으면 건너뜀)
  INSERT INTO public.gyumo_profiles (id, email, full_name, role, credits)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    '일반회원',
    3
  )
  ON CONFLICT (id) DO NOTHING;

  -- 가입 축하 크레딧은 1회만 (중복 실행·재가입 대비)
  IF NOT EXISTS (
    SELECT 1 FROM public.gyumo_credit_batches
    WHERE user_id = NEW.id AND source = 'signup'
  ) THEN
    INSERT INTO public.gyumo_credit_batches(user_id, amount, remaining, source, expires_at)
    VALUES (NEW.id, 3, 3, 'signup', NULL);
  END IF;

  UPDATE public.gyumo_profiles
  SET credits = public.gyumo_credit_balance(NEW.id)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

-- gyumo 전용 트리거 (기존 on_auth_user_created 는 그대로 둔다)
DROP TRIGGER IF EXISTS on_auth_user_created_gyumo_credits ON auth.users;
CREATE TRIGGER on_auth_user_created_gyumo_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.gyumo_handle_new_user();

-- ── 기존 회원 소급: signup 배치가 없는 회원에게 3크레딧 1회 지급 ──
INSERT INTO public.gyumo_credit_batches(user_id, amount, remaining, source, expires_at)
SELECT p.id, 3, 3, 'signup', NULL
FROM public.gyumo_profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.gyumo_credit_batches b
  WHERE b.user_id = p.id AND b.source = 'signup'
);
UPDATE public.gyumo_profiles p
SET credits = public.gyumo_credit_balance(p.id);
