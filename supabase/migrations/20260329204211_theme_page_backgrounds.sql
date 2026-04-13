-- Add page-specific background image columns to school_themes.
-- login_background_url: full-page background for the login page.
-- signup_background_url: full-page background for the signup page.

ALTER TABLE public.school_themes
  ADD COLUMN IF NOT EXISTS login_background_url text,
  ADD COLUMN IF NOT EXISTS signup_background_url text;
