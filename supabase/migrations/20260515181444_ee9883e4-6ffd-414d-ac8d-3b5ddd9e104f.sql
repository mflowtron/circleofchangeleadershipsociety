
DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
BEGIN
  -- Skip if already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'lovable-qa@coclc.org') THEN
    RETURN;
  END IF;

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    v_user_id, 'authenticated', 'authenticated',
    'lovable-qa@coclc.org',
    crypt('LovableQA!2026', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Lovable QA"}'::jsonb,
    now(), now(), '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', 'lovable-qa@coclc.org'),
    'email', v_user_id::text,
    now(), now(), now()
  );

  -- Ensure profile exists & is approved
  INSERT INTO public.profiles (user_id, full_name, role, is_approved)
  VALUES (v_user_id, 'Lovable QA', 'member', true)
  ON CONFLICT (user_id) DO UPDATE SET is_approved = true;
END $$;
