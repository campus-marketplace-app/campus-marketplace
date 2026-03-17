import { supabase } from "../supabase-client.js";

export interface SchoolTheme {
  school_code: string;
  school_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color?: string;
  logo_url?: string;
  font_family?: string;
  button_style?: string;
}

/**
 * Returns school branding data for the given school code.
 * Intended for frontend consumption to apply CSS variables at startup.
 */
export async function getThemeBySchoolCode(schoolCode: string): Promise<SchoolTheme> {
  if (!schoolCode?.trim()) {
    throw new Error("schoolCode must not be empty");
  }

  const { data, error } = await supabase
    .from("school_themes")
    .select(
      "school_code, school_name, primary_color, secondary_color, accent_color, logo_url, font_family, button_style"
    )
    .eq("school_code", schoolCode)
    .single();

  if (error) {
    throw new Error(
      `Failed to fetch theme for school code "${schoolCode}": ${error.message}`
    );
  }

  return data;
}
