// Categories and tags service module.
// Read-only lookups for public.categories and public.tags,
// used to populate dropdowns in listing creation and search filters.

import { supabase } from "../supabase-client.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Category {
  id: string;
  parent_id: string | null; // UUID of parent category for nested hierarchies, or null for top-level.
  name: string;
  description: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

const categorySelect = "id,parent_id,name,description,created_at"; // Reusable select string for categories.
const tagSelect = "id,name,created_at"; // Reusable select string for tags.

// Get all active categories, sorted alphabetically.
export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select(categorySelect)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return (data as Category[]) ?? []; // Return empty array if no categories found, instead of null.
}

// Get a single category by ID.
export async function getCategoryById(id: string): Promise<Category> {

  if (!id.trim()) {
    throw new Error("Category ID is required");
  }

  const { data, error } = await supabase
    .from("categories")
    .select(categorySelect)
    .eq("id", id)
    .is("deleted_at", null)
    .single<Category>();

  if (error) {
    throw new Error(`Failed to fetch category: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Category not found: ${id}`);
  }

  return data; // The category with the given ID, or an error if not found.
}

// Get all active tags, sorted alphabetically.
export async function getTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from("tags")
    .select(tagSelect)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch tags: ${error.message}`);
  }

  return (data as Tag[]) ?? []; // Return empty array if no tags found, instead of null.
}
