import { supabase } from "../supabase-client.js";

/**
 * School branding record from `public.school_themes`.
 *
 * `school_code` is an integer IPEDS OPE ID (6-digit numeric identifier assigned by the
 * US Department of Education). It was changed from text to integer in migration
 * 20260318235729_theme_dark_mode_ipeds_code.
 *
 * Dark-mode color columns and background image columns were also added in that migration.
 * All new columns are optional — schools that have not configured dark-mode branding will
 * return null for those fields.
 */
export interface SchoolTheme {
  school_code: number;
  school_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color?: string;
  logo_url?: string;
  font_family?: string;
  button_style?: string;
  /** Dark-mode variant of primary_color. Null if not configured. */
  primary_color_dark?: string;
  /** Dark-mode variant of secondary_color. Null if not configured. */
  secondary_color_dark?: string;
  /** Dark-mode variant of accent_color. Null if not configured. */
  accent_color_dark?: string;
  /** Light-mode background image URL. Null if not configured. */
  background_image_url?: string;
  /** Dark-mode background image URL. Null if not configured. */
  background_image_url_dark?: string;
}

/**
 * Returns school branding data for the given IPEDS OPE ID.
 * Intended for frontend consumption to apply CSS variables at startup.
 *
 * @param schoolCode - Integer IPEDS OPE ID (set via the VITE_SCHOOL_CODE env var).
 * @returns The matching SchoolTheme record.
 * @throws If the DB query fails or no theme is found for the given code.
 */
export async function getThemeBySchoolCode(schoolCode: number): Promise<SchoolTheme> {
  const { data, error } = await supabase
    .from("school_themes")
    .select(
      "school_code, school_name, primary_color, secondary_color, accent_color, logo_url, font_family, button_style, primary_color_dark, secondary_color_dark, accent_color_dark, background_image_url, background_image_url_dark",
    )
    .eq("school_code", schoolCode)
    .single();

  if (error) {
    throw new Error(
      `Failed to fetch theme for school code "${schoolCode}": ${error.message}`,
    );
  }

  return data;
}
