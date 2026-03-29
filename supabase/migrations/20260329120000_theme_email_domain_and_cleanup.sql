-- Add email_domain, background_color, and text_on_primary columns to school_themes.
-- These enable dynamic email validation, page background customization,
-- and explicit text-on-primary contrast per school.

ALTER TABLE public.school_themes
  ADD COLUMN IF NOT EXISTS email_domain text,
  ADD COLUMN IF NOT EXISTS background_color text,
  ADD COLUMN IF NOT EXISTS text_on_primary text;

-- Hex validation constraints for new color columns
ALTER TABLE public.school_themes
  ADD CONSTRAINT school_themes_background_color_hex
    CHECK (background_color IS NULL OR background_color ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT school_themes_text_on_primary_hex
    CHECK (text_on_primary IS NULL OR text_on_primary ~ '^#[0-9A-Fa-f]{6}$');

-- Populate NJIT row with new values
UPDATE public.school_themes
SET
  email_domain     = 'njit.edu',
  background_color = '#ececec',
  text_on_primary  = '#FFFFFF',
  font_family      = 'Arial, Helvetica, sans-serif'
WHERE school_code = 184782;

-- Remove duplicate NJIT row (school_code 2621 is a leftover from the text→integer migration)
DELETE FROM public.school_themes WHERE school_code = 2621;
