// scripts/seed-staging.ts
// Staging seed script — wipes and re-creates demo accounts + listings.
// Run: npm run seed
// NEVER run against production.

import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { supabase } from "../apps/backend/src/supabase-client.js";
import { upsertProfile } from "../apps/backend/src/services/profile.js";
import {
  createListing,
  upsertItemDetails,
  upsertServiceDetails,
  publishListing,
} from "../apps/backend/src/services/listings.js";
import { getCategories, getTags } from "../apps/backend/src/services/categories.js";

// ─── Demo account definitions ─────────────────────────────────────────────────

const DEMO_ACCOUNTS = [
  { email: "demo.alex@demo.edu",   password: "demo1234", displayName: "Alex (Demo)",   accountType: "student"  as const },
  { email: "demo.sam@demo.edu",    password: "demo1234", displayName: "Sam (Demo)",    accountType: "student"  as const },
  { email: "demo.jordan@demo.edu", password: "demo1234", displayName: "Jordan (Demo)", accountType: "student"  as const },
  { email: "demo.riley@demo.edu",  password: "demo1234", displayName: "Riley (Demo)",  accountType: "business" as const },
  { email: "demo.casey@demo.edu",  password: "demo1234", displayName: "Casey (Demo)",  accountType: "student"  as const },
];

const PLACEHOLDER_STORAGE_PATH = "seed/placeholder.png";

// ─── Safety check ─────────────────────────────────────────────────────────────
// Set SUPABASE_PROD_REF in your shell (not committed) to match your production
// Supabase project ref string (e.g. "abcxyzproject123"). The script exits if
// the staging URL contains it.

function checkNotProduction(): void {
  const url = process.env.SUPABASE_URL ?? "";
  const env = process.env.NODE_ENV ?? "";
  const prodRef = process.env.SUPABASE_PROD_REF ?? "";

  if (env === "production") {
    console.error("ERROR: NODE_ENV=production — refusing to seed.");
    process.exit(1);
  }
  if (prodRef && url.includes(prodRef)) {
    console.error("ERROR: SUPABASE_URL matches SUPABASE_PROD_REF — refusing to seed.");
    console.error(`  URL: ${url}`);
    process.exit(1);
  }
}

// ─── Wipe demo accounts ────────────────────────────────────────────────────────
// Finds each demo email in auth.users and deletes it.
// Cascade: profiles, listings, listing_images, item_details, service_details, listing_tags.

async function wipeDemo(): Promise<number> {
  const targetEmails = new Set(DEMO_ACCOUNTS.map((a) => a.email));
  let wiped = 0;

  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`Failed to list users: ${error.message}`);

  for (const user of data.users) {
    if (user.email && targetEmails.has(user.email)) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (deleteError) throw new Error(`Failed to delete ${user.email}: ${deleteError.message}`);
      wiped++;
    }
  }
  return wiped;
}

// ─── Upload placeholder image ──────────────────────────────────────────────────
// Uploads a single 1×1 PNG to the listing-images bucket.
// All seed listings share this path — avoids 25 separate uploads.

async function uploadPlaceholder(): Promise<void> {
  // Fetch a real placeholder image so listing cards don't render as black squares.
  const response = await fetch("https://placehold.co/600x400/e2e8f0/94a3b8.png");
  if (!response.ok) throw new Error(`Failed to fetch placeholder image: ${response.statusText}`);
  const buffer = Buffer.from(await response.arrayBuffer());

  const { error } = await supabase.storage
    .from("listing-images")
    .upload(PLACEHOLDER_STORAGE_PATH, buffer, {
      contentType: "image/png",
      upsert: true,
    });
  if (error) throw new Error(`Failed to upload placeholder: ${error.message}`);
}

// ─── Seed users ────────────────────────────────────────────────────────────────
// Creates 5 demo accounts via admin API (no email verification needed).
// Returns a map of email → Supabase user UUID for use in listing creation.

async function seedUsers(): Promise<Map<string, string>> {
  const userMap = new Map<string, string>();

  for (const account of DEMO_ACCOUNTS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: {
        display_name: account.displayName,
        account_type: account.accountType,
      },
    });

    if (error || !data.user) {
      throw new Error(`Failed to create ${account.email}: ${error?.message ?? "unknown"}`);
    }

    await upsertProfile({
      user_id: data.user.id,
      display_name: account.displayName,
      account_type: account.accountType,
    });

    userMap.set(account.email, data.user.id);
    console.log(`  Created: ${account.email}`);
  }
  return userMap;
}

// ─── Listing definitions ──────────────────────────────────────────────────────

type ItemCondition = "new" | "like_new" | "good" | "fair" | "poor";

type ListingDef = {
  seller: string;
  title: string;
  description: string;
  type: "item" | "service";
  category: string;
  price: number;
  location: string;
  tags: string[];
  item?: { condition: ItemCondition; quantity: number };
  service?: { duration_minutes: number; price_unit: string };
};

const LISTINGS: ListingDef[] = [
  // ── Alex: Textbooks + Electronics ────────────────────────────────────────────
  { seller: "demo.alex@demo.edu", title: "CHEM 101 Textbook", description: "Zumdahl Chemistry 10th ed. A few highlights inside.", type: "item", category: "Textbooks", price: 35, location: "North Campus", tags: ["negotiable", "pickup-only"], item: { condition: "good", quantity: 1 } },
  { seller: "demo.alex@demo.edu", title: "Calculus: Early Transcendentals", description: "Stewart 9th edition, no writing inside.", type: "item", category: "Textbooks", price: 50, location: "North Campus", tags: ["like-new"], item: { condition: "like_new", quantity: 1 } },
  { seller: "demo.alex@demo.edu", title: "TI-84 Plus CE Calculator", description: "Used one semester, works perfectly.", type: "item", category: "Electronics", price: 80, location: "Library", tags: ["negotiable"], item: { condition: "good", quantity: 1 } },
  { seller: "demo.alex@demo.edu", title: "USB-C Laptop Stand", description: "Adjustable aluminum stand, lightly used.", type: "item", category: "Electronics", price: 20, location: "Library", tags: ["pickup-only"], item: { condition: "like_new", quantity: 1 } },
  { seller: "demo.alex@demo.edu", title: "Wireless Noise-Cancelling Headphones", description: "Sony WH-1000XM4. Great battery life, minor scratches on headband.", type: "item", category: "Electronics", price: 120, location: "North Campus", tags: ["OBO"], item: { condition: "good", quantity: 1 } },
  // ── Sam: Textbooks + Clothing ─────────────────────────────────────────────────
  { seller: "demo.sam@demo.edu", title: "BIO 201 Lab Manual", description: "Clean copy, all pages intact.", type: "item", category: "Textbooks", price: 15, location: "South Dorms", tags: ["semester-end-sale", "negotiable"], item: { condition: "fair", quantity: 1 } },
  { seller: "demo.sam@demo.edu", title: "Intro to Psychology (Myers)", description: "Highlights only in first 3 chapters.", type: "item", category: "Textbooks", price: 25, location: "South Dorms", tags: ["negotiable", "OBO"], item: { condition: "good", quantity: 1 } },
  { seller: "demo.sam@demo.edu", title: "North Face Rain Jacket — Size M", description: "Waterproof, worn twice. Dark blue.", type: "item", category: "Clothing", price: 65, location: "South Dorms", tags: ["like-new", "negotiable"], item: { condition: "like_new", quantity: 1 } },
  { seller: "demo.sam@demo.edu", title: "Campus Hoodie — Size L", description: "University hoodie, washed once.", type: "item", category: "Clothing", price: 20, location: "South Dorms", tags: ["semester-end-sale"], item: { condition: "good", quantity: 1 } },
  { seller: "demo.sam@demo.edu", title: "Running Shoes — Size 10", description: "Nike Pegasus, 3 months old. Light use.", type: "item", category: "Clothing", price: 45, location: "South Dorms", tags: ["negotiable"], item: { condition: "good", quantity: 1 } },
  // ── Jordan: Services + Electronics ───────────────────────────────────────────
  { seller: "demo.jordan@demo.edu", title: "Python & Data Structures Tutoring", description: "CS major offering tutoring for CS101/201. $20/hr.", type: "service", category: "Services", price: 20, location: "Library", tags: [], service: { duration_minutes: 60, price_unit: "per hour" } },
  { seller: "demo.jordan@demo.edu", title: "Resume & Cover Letter Review", description: "Career center trained, helped 20+ students get internships.", type: "service", category: "Services", price: 15, location: "Library", tags: ["delivery-available"], service: { duration_minutes: 45, price_unit: "per session" } },
  { seller: "demo.jordan@demo.edu", title: "iPad Air (5th gen) — 64GB WiFi", description: "Space Gray, barely used, comes with Apple Pencil case.", type: "item", category: "Electronics", price: 350, location: "East Quad", tags: ["negotiable"], item: { condition: "like_new", quantity: 1 } },
  { seller: "demo.jordan@demo.edu", title: "Mechanical Keyboard — TKL", description: "Keychron K2, brown switches, backlit.", type: "item", category: "Electronics", price: 60, location: "East Quad", tags: ["OBO"], item: { condition: "good", quantity: 1 } },
  { seller: "demo.jordan@demo.edu", title: "Stats Tutoring (STAT 301/401)", description: "PhD student offering stats help. R and SPSS.", type: "service", category: "Services", price: 25, location: "Science Building", tags: [], service: { duration_minutes: 60, price_unit: "per hour" } },
  // ── Riley (Business): Furniture + Services ────────────────────────────────────
  { seller: "demo.riley@demo.edu", title: "Ergonomic Desk Chair", description: "Mesh back, lumbar support, adjustable armrests.", type: "item", category: "Furniture", price: 85, location: "West Campus Apts", tags: ["pickup-only", "negotiable"], item: { condition: "good", quantity: 1 } },
  { seller: "demo.riley@demo.edu", title: "Mini Fridge — 3.2 cu ft", description: "Perfect for dorm. Runs quietly, no damage.", type: "item", category: "Furniture", price: 70, location: "West Campus Apts", tags: ["semester-end-sale", "pickup-only"], item: { condition: "good", quantity: 1 } },
  { seller: "demo.riley@demo.edu", title: "Graphic Design & Flyer Work", description: "Design club president. Logos, event flyers, social media graphics.", type: "service", category: "Services", price: 30, location: "Art Building", tags: ["delivery-available"], service: { duration_minutes: 90, price_unit: "per project" } },
  { seller: "demo.riley@demo.edu", title: "Bookshelf — 5 Tier", description: "IKEA Billy, white. Disassembled for easy transport.", type: "item", category: "Furniture", price: 40, location: "West Campus Apts", tags: ["pickup-only", "OBO"], item: { condition: "fair", quantity: 1 } },
  { seller: "demo.riley@demo.edu", title: "Moving Help — End of Semester", description: "Truck + muscle. Available weekends in May.", type: "service", category: "Services", price: 50, location: "West Campus Apts", tags: ["urgent"], service: { duration_minutes: 120, price_unit: "per hour" } },
  // ── Casey: Sports + Free Stuff ────────────────────────────────────────────────
  { seller: "demo.casey@demo.edu", title: "Road Bike — 54cm Frame", description: "Trek FX3, 21-speed, replaced tires last semester.", type: "item", category: "Transportation", price: 250, location: "Bike Racks — Rec Center", tags: ["negotiable"], item: { condition: "good", quantity: 1 } },
  { seller: "demo.casey@demo.edu", title: "Yoga Mat + Blocks Set", description: "Lululemon mat, barely used. Includes two cork blocks.", type: "item", category: "Sports & Fitness", price: 40, location: "Rec Center", tags: ["like-new"], item: { condition: "like_new", quantity: 1 } },
  { seller: "demo.casey@demo.edu", title: "Adjustable Dumbbell Set (5–25 lb)", description: "Bowflex SelectTech, great condition.", type: "item", category: "Sports & Fitness", price: 150, location: "South Dorms", tags: ["OBO", "pickup-only"], item: { condition: "good", quantity: 1 } },
  { seller: "demo.casey@demo.edu", title: "FREE: Moving Boxes (10 pack)", description: "Large and medium sizes. Clean and ready to use.", type: "item", category: "Free Stuff", price: 0, location: "South Dorms", tags: ["pickup-only", "urgent"], item: { condition: "good", quantity: 10 } },
  { seller: "demo.casey@demo.edu", title: "FREE: Desk Lamp", description: "LED desk lamp, works perfectly, no longer needed.", type: "item", category: "Free Stuff", price: 0, location: "South Dorms", tags: ["pickup-only"], item: { condition: "good", quantity: 1 } },
];

// ─── Seed listings ─────────────────────────────────────────────────────────────
// Creates ~25 active listings spread across 5 sellers.
// Each listing gets: details (item/service), one placeholder image, tags, then published.

async function seedListings(
  userMap: Map<string, string>,
  categoryMap: Map<string, string>,
  tagMap: Map<string, string>,
): Promise<number> {
  let count = 0;

  for (const def of LISTINGS) {
    const userId = userMap.get(def.seller);
    const categoryId = categoryMap.get(def.category);
    if (!userId) throw new Error(`User not found for seller: ${def.seller}`);
    if (!categoryId) throw new Error(`Category not found: "${def.category}"`);

    const listing = await createListing({
      user_id: userId,
      type: def.type,
      title: def.title,
      description: def.description,
      price: def.price,
      category_id: categoryId,
      location: def.location,
    });

    if (def.type === "item" && def.item) {
      await upsertItemDetails(listing.id, userId, {
        condition: def.item.condition,
        quantity: def.item.quantity,
      });
    }

    if (def.type === "service" && def.service) {
      await upsertServiceDetails(listing.id, userId, {
        duration_minutes: def.service.duration_minutes,
        price_unit: def.service.price_unit,
        available_from: null,
        available_to: null,
      });
    }

    // Insert placeholder image row directly — reuses the one uploaded in uploadPlaceholder().
    const { error: imgError } = await supabase.from("listing_images").insert({
      listing_id: listing.id,
      path: PLACEHOLDER_STORAGE_PATH,
      alt_text: "Demo listing image",
      order_no: 0,
    });
    if (imgError) throw new Error(`Failed to insert image for "${def.title}": ${imgError.message}`);

    // Attach tags by name lookup — skips unknown tag names gracefully.
    for (const tagName of def.tags) {
      const tagId = tagMap.get(tagName);
      if (!tagId) continue;
      const { error: tagError } = await supabase.from("listing_tags").insert({
        listing_id: listing.id,
        tag_id: tagId,
      });
      if (tagError) throw new Error(`Failed to attach tag "${tagName}" to "${def.title}": ${tagError.message}`);
    }

    // publishListing validates readiness and sets status → active.
    await publishListing(listing.id, userId);
    console.log(`  Created: ${def.title}`);
    count++;
  }

  return count;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  checkNotProduction();

  console.log("\nCampus Marketplace — Staging Seed Script");
  console.log("─────────────────────────────────────────");
  console.log(`Targeting: ${process.env.SUPABASE_URL}`);
  console.log("\nThis will:");
  console.log("  • Delete demo accounts (demo.alex/sam/jordan/riley/casey @demo.edu) + all their listings");
  console.log("  • Create 5 fresh demo accounts with ~25 listings\n");

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await rl.question("Proceed? (y/n) ");
  rl.close();

  if (answer.toLowerCase() !== "y") {
    console.log("Aborted.");
    process.exit(0);
  }

  console.log("\n[1/4] Wiping demo accounts...");
  const wiped = await wipeDemo();
  console.log(`  Deleted ${wiped} existing demo account(s)`);

  console.log("\n[2/4] Uploading placeholder image...");
  await uploadPlaceholder();
  console.log(`  Uploaded ${PLACEHOLDER_STORAGE_PATH}`);

  console.log("\n[3/4] Creating demo users...");
  const userMap = await seedUsers();

  console.log("\n[4/4] Creating listings...");
  const [categories, tags] = await Promise.all([getCategories(), getTags()]);
  const categoryMap = new Map(categories.map((c) => [c.name, c.id]));
  const tagMap = new Map(tags.map((t) => [t.name, t.id]));
  const listingCount = await seedListings(userMap, categoryMap, tagMap);

  console.log("\n─────────────────────────────────────────");
  console.log(`Wiped   ${wiped} demo account(s)`);
  console.log(`Created 5 users`);
  console.log(`Created ${listingCount} listings`);
  console.log("\nDone. Run 'npm run dev' to browse the seeded marketplace.");
}

main().catch((err) => {
  console.error("\nSeed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
