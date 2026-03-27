// Categories and tags service module.
// Read-only lookups for public.categories and public.tags,
// used to populate dropdowns in listing creation and search filters.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Category {
  id: string;
  // UUID of parent category for nested hierarchies, or null for top-level.
  parent_id: string | null;
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

// Get all active categories, sorted alphabetically.
export async function getCategories(): Promise<Category[]> {
  throw new Error("Not yet implemented");
}

// Get a single category by ID.
export async function getCategoryById(_id: string): Promise<Category> {
  void _id;
  throw new Error("Not yet implemented");
}

// Get all active tags, sorted alphabetically.
export async function getTags(): Promise<Tag[]> {
  throw new Error("Not yet implemented");
}
