import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { supabase } from "../../supabase-client.js";
import { getCategories, getCategoryById, getTags } from "../categories.js";

let categoryId = "";
let tagId = "";
let createdCategoryRow = false;
let createdTagRow = false;

beforeAll(async () => {
  const { data: existingCategory, error: categoryError } = await supabase
    .from("categories")
    .select("id")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (categoryError) {
    throw new Error(`Failed to fetch category for test setup: ${categoryError.message}`);
  }

  if (existingCategory?.id) {
    categoryId = existingCategory.id;
  } else {
    const { data: createdCategoryData, error: createCategoryError } = await supabase
      .from("categories")
      .insert({
        name: `Test Category ${Date.now()}`,
        description: "Temporary category for category tests",
      })
      .select("id")
      .single<{ id: string }>();

    if (createCategoryError || !createdCategoryData) {
      throw new Error(`Failed to create category test row: ${createCategoryError?.message ?? "unknown error"}`);
    }

    categoryId = createdCategoryData.id;
    createdCategoryRow = true;
  }

  const { data: existingTag, error: tagError } = await supabase
    .from("tags")
    .select("id")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (tagError) {
    throw new Error(`Failed to fetch tag for test setup: ${tagError.message}`);
  }

  if (existingTag?.id) {
    tagId = existingTag.id;
    return;
  }

  const { data: createdTagData, error: createTagError } = await supabase
    .from("tags")
    .insert({ name: `test-tag-${Date.now()}` })
    .select("id")
    .single<{ id: string }>();

  if (createTagError || !createdTagData) {
    throw new Error(`Failed to create tag test row: ${createTagError?.message ?? "unknown error"}`);
  }

  tagId = createdTagData.id;
  createdTagRow = true;
});

afterAll(async () => {
  if (createdCategoryRow && categoryId) {
    await supabase.from("categories").delete().eq("id", categoryId);
  }

  if (createdTagRow && tagId) {
    await supabase.from("tags").delete().eq("id", tagId);
  }
});

describe("categories service", () => {
  it("returns categories sorted and includes the seeded category", async () => {
    const categories = await getCategories();

    expect(categories.length).toBeGreaterThan(0);
    expect(categories.some((category) => category.id === categoryId)).toBe(true);
  });

  it("returns a category by id", async () => {
    const category = await getCategoryById(categoryId);

    expect(category.id).toBe(categoryId);
    expect(category.name).toBeTruthy();
  });

  it("throws for empty category id", async () => {
    await expect(getCategoryById("")).rejects.toThrow("Category ID is required");
  });

  it("throws for a missing category", async () => {
    await expect(getCategoryById("00000000-0000-0000-0000-000000000000")).rejects.toThrow();
  });

  it("returns tags sorted and includes the seeded tag", async () => {
    const tags = await getTags();

    expect(tags.length).toBeGreaterThan(0);
    expect(tags.some((tag) => tag.id === tagId)).toBe(true);
  });
});