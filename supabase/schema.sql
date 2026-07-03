-- ================================================================
-- gyumo Auth Schema v2
-- 멤버십 티어: 일반회원 / 정회원 / 미스터홈즈 / 스텝
-- 최고관리자: is_admin=true
-- ================================================================

-- 사용자 프로필 테이블
CREATE TABLE IF NOT EXISTS public.gyumo_profiles (
  id          UUID        REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email       TEXT        NOT NULL,
  full_name   TEXT,
  phone       TEXT,
  company     TEXT,
  role        TEXT        NOT NULL DEFAULT '일반회원'
                CHECK (role IN ('일반회원', '정회원', '미스터홈즈', '스텝')),
  daily_count INTEGER     NOT NULL DEFAULT 0,
  daily_reset DATE        NOT NULL DEFAULT CURRENT_DATE,
  is_admin    BOOLEAN     NOT NULL DEFAULT FALSE,
  agreed_terms BOOLEAN    NOT NULL DEFAULT FALSE,
  agreed_at   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 회원가입 시 자동으로 프로필 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.gyumo_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    '일반회원'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at 자동 갱신
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS gyumo_profiles_updated_at ON public.gyumo_profiles;
CREATE TRIGGER gyumo_profiles_updated_at
  BEFORE UPDATE ON public.gyumo_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS 활성화
ALTER TABLE public.gyumo_profiles ENABLE ROW LEVEL SECURITY;

-- 본인 프로필 조회
CREATE POLICY "own_read" ON public.gyumo_profiles
  FOR SELECT USING (auth.uid() = id);

-- 본인 프로필 수정 (is_admin, role은 변경 불가 — 관리자만 변경 가능)
CREATE POLICY "own_update" ON public.gyumo_profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin = (SELECT is_admin FROM public.gyumo_profiles WHERE id = auth.uid())
    AND role = (SELECT role FROM public.gyumo_profiles WHERE id = auth.uid())
  );

-- 관리자 & 스텝: 전체 조회
CREATE POLICY "admin_read_all" ON public.gyumo_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gyumo_profiles
      WHERE id = auth.uid()
      AND (is_admin = TRUE OR role = '스텝')
    )
  );

-- 관리자(is_admin): 전체 수정 포함 is_admin 변경 가능
CREATE POLICY "admin_update_all" ON public.gyumo_profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.gyumo_profiles WHERE id = auth.uid() AND is_admin = TRUE)
  );

-- 스텝: role만 수정 가능 (is_admin 변경 불가)
CREATE POLICY "staff_update_role" ON public.gyumo_profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.gyumo_profiles WHERE id = auth.uid() AND role = '스텝')
  )
  WITH CHECK (
    is_admin = (SELECT is_admin FROM public.gyumo_profiles p WHERE p.id = gyumo_profiles.id)
  );

-- 일별 사용 횟수 조회·증가 함수
CREATE OR REPLACE FUNCTION public.increment_daily_count(user_id UUID)
RETURNS TABLE(count INTEGER, limit_exceeded BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_role   TEXT;
  v_count  INTEGER;
  v_reset  DATE;
  v_limit  INTEGER;
BEGIN
  SELECT role, daily_count, daily_reset
  INTO v_role, v_count, v_reset
  FROM public.gyumo_profiles WHERE id = user_id FOR UPDATE;

  IF v_reset < CURRENT_DATE THEN
    v_count := 0;
    UPDATE public.gyumo_profiles SET daily_count = 0, daily_reset = CURRENT_DATE WHERE id = user_id;
  END IF;

  -- 일반회원: 일 3건, 나머지(정회원/미스터홈즈/스텝): 무제한
  v_limit := CASE v_role
    WHEN '일반회원' THEN 3
    ELSE 999999
  END;

  IF v_count >= v_limit THEN
    RETURN QUERY SELECT v_count, TRUE;
    RETURN;
  END IF;

  UPDATE public.gyumo_profiles SET daily_count = daily_count + 1 WHERE id = user_id;
  RETURN QUERY SELECT v_count + 1, FALSE;
END;
$$;

-- 조회 이력 테이블
CREATE TABLE IF NOT EXISTS public.gyumo_history (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  address    TEXT        NOT NULL,
  pnu        TEXT,
  zone_code  TEXT,
  zone_name  TEXT,
  area_sqm   NUMERIC,
  result     JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gyumo_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_history_read" ON public.gyumo_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "own_history_insert" ON public.gyumo_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_history_all" ON public.gyumo_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.gyumo_profiles
      WHERE id = auth.uid()
      AND (is_admin = TRUE OR role = '스텝')
    )
  );

-- 인덱스
CREATE INDEX IF NOT EXISTS gyumo_profiles_role_idx ON public.gyumo_profiles(role);
CREATE INDEX IF NOT EXISTS gyumo_profiles_admin_idx ON public.gyumo_profiles(is_admin) WHERE is_admin = TRUE;
CREATE INDEX IF NOT EXISTS gyumo_history_user_idx ON public.gyumo_history(user_id, created_at DESC);
