-- Drop old text index before type change
DROP INDEX IF EXISTS public.idx_school_themes_school_code;

-- Change school_code: text → integer (IPEDS OPE ID). Table is empty, no data migration needed.
ALTER TABLE public.school_themes
  ALTER COLUMN school_code TYPE integer USING school_code::integer;

-- Add dark-mode colors + background image columns (all nullable; service fills fallbacks)
ALTER TABLE public.school_themes
  ADD COLUMN IF NOT EXISTS primary_color_dark        text,
  ADD COLUMN IF NOT EXISTS secondary_color_dark      text,
  ADD COLUMN IF NOT EXISTS accent_color_dark         text,
  ADD COLUMN IF NOT EXISTS background_image_url      text,
  ADD COLUMN IF NOT EXISTS background_image_url_dark text;

-- Hex CHECK constraints for new color columns
ALTER TABLE public.school_themes
  ADD CONSTRAINT school_themes_primary_color_dark_hex
    CHECK (primary_color_dark IS NULL OR primary_color_dark ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT school_themes_secondary_color_dark_hex
    CHECK (secondary_color_dark IS NULL OR secondary_color_dark ~ '^#[0-9A-Fa-f]{6}$'),
  ADD CONSTRAINT school_themes_accent_color_dark_hex
    CHECK (accent_color_dark IS NULL OR accent_color_dark ~ '^#[0-9A-Fa-f]{6}$');

-- Recreate lookup index for integer type
CREATE INDEX IF NOT EXISTS idx_school_themes_school_code ON public.school_themes(school_code);
