import { supabase } from "../supabase-client.js";

// Theme service module.
// Provides school branding values used by the frontend to set CSS variables.

export interface Theme {
  // Mirrors columns from public.school_themes.
  theme_id: string;
  school_code: string;
  school_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color?: string;
  logo_url?: string;
  font_family?: string;
  button_style?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Fetch school theme by school code
 * Used to load branding (colors, fonts, logo) on app startup
 */
export async function getThemeBySchoolCode(schoolCode: string): Promise<Theme> {
  const { data, error } = await supabase
    .from("school_themes")
    .select("*")
    .eq("school_code", schoolCode)
    .single();

  if (error) {
    throw new Error(
      `Failed to fetch theme for school code "${schoolCode}": ${error.message}`,
    );
  }

  if (!data) {
    throw new Error(`Theme not found for school code: ${schoolCode}`);
  }

  return data;
}
