-- Looplet — Full database schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run (uses CREATE IF NOT EXISTS / DO blocks)

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               TEXT NOT NULL,
  full_name           TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subscription_status TEXT NOT NULL DEFAULT 'trialing'
                        CHECK (subscription_status IN ('trialing', 'active', 'expired')),
  trial_ends_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_select_own'
  ) THEN
    CREATE POLICY users_select_own ON public.users
      FOR SELECT USING (auth.uid() = id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_update_own'
  ) THEN
    CREATE POLICY users_update_own ON public.users
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- Auto-create a public.users row when someone signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- LOOPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.loops (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  child_name    TEXT,
  child_pronoun TEXT NOT NULL DEFAULT 'they',
  cadence       TEXT NOT NULL DEFAULT 'weekly'
                  CHECK (cadence IN ('weekly', 'biweekly', 'monthly')),
  reminder_day  INT NOT NULL DEFAULT 0 CHECK (reminder_day BETWEEN 0 AND 6),
  time_zone     TEXT NOT NULL DEFAULT 'UTC',
  last_sent_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.loops ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'loops' AND policyname = 'loops_owner'
  ) THEN
    CREATE POLICY loops_owner ON public.loops
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- RECIPIENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.recipients (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id    UUID NOT NULL REFERENCES public.loops(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.recipients ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'recipients' AND policyname = 'recipients_loop_owner'
  ) THEN
    CREATE POLICY recipients_loop_owner ON public.recipients
      USING (
        EXISTS (
          SELECT 1 FROM public.loops
          WHERE loops.id = recipients.loop_id
            AND loops.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================
-- LETTERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.letters (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_id          UUID NOT NULL REFERENCES public.loops(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'sent')),
  prompt_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'letters' AND policyname = 'letters_loop_owner'
  ) THEN
    CREATE POLICY letters_loop_owner ON public.letters
      USING (
        EXISTS (
          SELECT 1 FROM public.loops
          WHERE loops.id = letters.loop_id
            AND loops.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================
-- LETTER PHOTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.letter_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_id    UUID NOT NULL REFERENCES public.letters(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.letter_photos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'letter_photos' AND policyname = 'letter_photos_loop_owner'
  ) THEN
    CREATE POLICY letter_photos_loop_owner ON public.letter_photos
      USING (
        EXISTS (
          SELECT 1 FROM public.letters
          JOIN public.loops ON loops.id = letters.loop_id
          WHERE letters.id = letter_photos.letter_id
            AND loops.user_id = auth.uid()
        )
      );
  END IF;
END $$;
