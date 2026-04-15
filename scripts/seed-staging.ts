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

// One real photo per category, fetched from Lorem Picsum (seeded = same image every run).
// Storage paths are stable so re-seeding overwrites rather than accumulating files.
const CATEGORY_IMAGES: Record<string, { storagePath: string; picsumSeed: string }> = {
  "Textbooks":       { storagePath: "seed/cat-textbooks.jpg",    picsumSeed: "books42"    },
  "Electronics":     { storagePath: "seed/cat-electronics.jpg",  picsumSeed: "tech77"     },
  "Furniture":       { storagePath: "seed/cat-furniture.jpg",    picsumSeed: "room19"     },
  "Clothing":        { storagePath: "seed/cat-clothing.jpg",     picsumSeed: "fashion55"  },
  "Services":        { storagePath: "seed/cat-services.jpg",     picsumSeed: "people88"   },
  "Transportation":  { storagePath: "seed/cat-transport.jpg",    picsumSeed: "bike33"     },
  "Sports & Fitness":{ storagePath: "seed/cat-sports.jpg",       picsumSeed: "sport64"    },
  "Free Stuff":      { storagePath: "seed/cat-freestuff.jpg",    picsumSeed: "gift11"     },
};

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

// ─── Ensure demo accounts exist ───────────────────────────────────────────────
// Creates each demo account if it doesn't already exist, otherwise reuses it.
// Never deletes auth users — avoids Supabase auth rate limits.
// Returns email → userId map for all 5 accounts.

async function ensureUsers(): Promise<Map<string, string>> {
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(`Failed to list users: ${error.message}`);

  const existingByEmail = new Map(
    data.users
      .filter((u) => u.email && DEMO_ACCOUNTS.some((a) => a.email === u.email))
      .map((u) => [u.email!, u.id]),
  );

  const userMap = new Map<string, string>();

  for (const account of DEMO_ACCOUNTS) {
    const existingId = existingByEmail.get(account.email);

    if (existingId) {
      userMap.set(account.email, existingId);
      console.log(`  Reusing: ${account.email}`);
    } else {
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          display_name: account.displayName,
          account_type: account.accountType,
        },
      });
      if (createError || !created.user) {
        throw new Error(`Failed to create ${account.email}: ${createError?.message ?? "unknown"}`);
      }
      userMap.set(account.email, created.user.id);
      console.log(`  Created:  ${account.email}`);
    }

    await upsertProfile({
      user_id: userMap.get(account.email)!,
      display_name: account.displayName,
      account_type: account.accountType,
    });
  }

  return userMap;
}

// ─── Wipe demo listings ────────────────────────────────────────────────────────
// Hard-deletes all listings owned by demo accounts.
// Cascades to: item_details, service_details, listing_images, listing_tags.
// Does NOT touch auth users — accounts are kept between runs.

async function wipeDemoListings(userMap: Map<string, string>): Promise<number> {
  const userIds = [...userMap.values()];
  if (userIds.length === 0) return 0;

  const { count, error } = await supabase
    .from("listings")
    .delete({ count: "exact" })
    .in("user_id", userIds);

  if (error) throw new Error(`Failed to wipe demo listings: ${error.message}`);
  return count ?? 0;
}

// ─── Upload category images ────────────────────────────────────────────────────
// Fetches one real photo per category from Lorem Picsum and uploads to storage.
// Seeded URLs return the same photo every run, so re-seeding is stable.

async function uploadCategoryImages(): Promise<void> {
  for (const [category, { storagePath, picsumSeed }] of Object.entries(CATEGORY_IMAGES)) {
    const url = `https://picsum.photos/seed/${picsumSeed}/600/400`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image for "${category}": ${response.statusText}`);
    const buffer = Buffer.from(await response.arrayBuffer());

    const { error } = await supabase.storage
      .from("listing-images")
      .upload(storagePath, buffer, { contentType: "image/jpeg", upsert: true });
    if (error) throw new Error(`Failed to upload image for "${category}": ${error.message}`);
    console.log(`  Uploaded: ${storagePath}`);
  }
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

    // Insert category-specific image — each category has its own real photo.
    const imagePath = CATEGORY_IMAGES[def.category]?.storagePath ?? "seed/cat-freestuff.jpg";
    const { error: imgError } = await supabase.from("listing_images").insert({
      listing_id: listing.id,
      path: imagePath,
      alt_text: `${def.category} listing image`,
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

  const wipeOnly = process.argv.includes("--wipe-only");

  console.log("\nCampus Marketplace — Staging Seed Script");
  console.log("─────────────────────────────────────────");
  console.log(`Targeting: ${process.env.SUPABASE_URL}`);
  console.log("\nThis will:");
  console.log("  • Create demo accounts if they don't exist (accounts are kept between runs)");
  if (wipeOnly) {
    console.log("  • Delete all listings owned by demo accounts");
  } else {
    console.log("  • Delete all listings owned by demo accounts, then re-create ~25 fresh listings");
  }
  console.log();

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const answer = await rl.question("Proceed? (y/n) ");
  rl.close();

  if (answer.toLowerCase() !== "y") {
    console.log("Aborted.");
    process.exit(0);
  }

  console.log("\n[1/3] Ensuring demo accounts exist...");
  const userMap = await ensureUsers();

  console.log("\n[2/3] Wiping demo listings...");
  const wiped = await wipeDemoListings(userMap);
  console.log(`  Deleted ${wiped} listing(s)`);

  if (wipeOnly) {
    console.log("\n─────────────────────────────────────────");
    console.log(`Wiped ${wiped} listing(s). Accounts kept. Done.`);
    return;
  }

  console.log("\n[3/3] Seeding listings...");
  console.log("  Uploading category images...");
  await uploadCategoryImages();

  const [categories, tags] = await Promise.all([getCategories(), getTags()]);
  const categoryMap = new Map(categories.map((c) => [c.name, c.id]));
  const tagMap = new Map(tags.map((t) => [t.name, t.id]));
  const listingCount = await seedListings(userMap, categoryMap, tagMap);

  console.log("\n─────────────────────────────────────────");
  console.log(`Accounts 5 (reused or created)`);
  console.log(`Wiped   ${wiped} old listing(s)`);
  console.log(`Created ${listingCount} listings`);
  console.log("\nDone. Run 'npm run dev' to browse the seeded marketplace.");
}

main().catch((err) => {
  console.error("\nSeed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
