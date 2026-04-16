-- 14_functions_auth.sql
-- Register, confirm email, password reset, auth triggers

------------------------------------------------------------
-- Trigger: auto-create profiles row on auth.users INSERT
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_on_auth_user_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    username,
    first_name,
    last_name,
    phone,
    type,
    enabled,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'type')::user_type_enum, 'Gu'),
    false,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_on_auth_user_created();

------------------------------------------------------------
-- Trigger: sync user type to auth.users metadata
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_sync_user_type_to_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('user_type', NEW.type::text)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_user_type_to_auth
  AFTER UPDATE OF type ON profiles
  FOR EACH ROW
  WHEN (OLD.type IS DISTINCT FROM NEW.type)
  EXECUTE FUNCTION public.fn_sync_user_type_to_auth();

------------------------------------------------------------
-- fn_register_user
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_register_user(
  p_email TEXT,
  p_password TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_type user_type_enum,
  p_phone TEXT,
  p_username TEXT DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_hear_from_us TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_confirm_token TEXT;
BEGIN
  -- Generate confirm token
  v_confirm_token := encode(gen_random_bytes(32), 'hex');

  -- Create auth.users entry via Supabase Auth admin API
  -- The trigger fn_on_auth_user_created will create the profiles row
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NULL, -- not confirmed yet
    jsonb_build_object(
      'first_name', p_first_name,
      'last_name', p_last_name,
      'phone', p_phone,
      'type', p_type::text,
      'username', COALESCE(p_username, p_email)
    ),
    NOW(),
    NOW(),
    v_confirm_token
  )
  RETURNING id INTO v_user_id;

  -- Update profile with additional fields
  UPDATE profiles SET
    confirm_token = v_confirm_token,
    title = p_title,
    hear_from_us = p_hear_from_us,
    username = COALESCE(p_username, p_email)
  WHERE id = v_user_id;

  RETURN v_user_id;
END;
$$;

------------------------------------------------------------
-- fn_confirm_email
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_confirm_email(
  p_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM profiles
  WHERE confirm_token = p_token AND enabled = false;

  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Enable profile
  UPDATE profiles SET
    enabled = true,
    confirm_token = NULL,
    updated_at = NOW()
  WHERE id = v_user_id;

  -- Confirm in auth.users
  UPDATE auth.users SET
    email_confirmed_at = NOW(),
    updated_at = NOW()
  WHERE id = v_user_id;

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_change_password
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_change_password(
  p_old_password TEXT,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_hash TEXT;
BEGIN
  SELECT encrypted_password INTO v_current_hash
  FROM auth.users
  WHERE id = auth.uid();

  IF v_current_hash IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Verify old password
  IF v_current_hash != crypt(p_old_password, v_current_hash) THEN
    RAISE EXCEPTION 'Invalid current password';
  END IF;

  -- Update password
  UPDATE auth.users SET
    encrypted_password = crypt(p_new_password, gen_salt('bf')),
    updated_at = NOW()
  WHERE id = auth.uid();

  RETURN true;
END;
$$;

------------------------------------------------------------
-- fn_reset_password_request
------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_reset_password_request(
  p_email TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id
  FROM profiles
  WHERE email = p_email AND is_deleted = false;

  IF v_user_id IS NULL THEN
    -- Return true anyway to prevent email enumeration
    RETURN true;
  END IF;

  UPDATE profiles SET
    last_password_reset_email_sent_at = NOW(),
    updated_at = NOW()
  WHERE id = v_user_id;

  RETURN true;
END;
$$;
