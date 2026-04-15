// scripts/seed-staging.ts
// Staging seed script — wipes and re-creates demo accounts + listings.
// Run: npm run seed
// NEVER run against production.

import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

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

  console.log("\nNothing seeded yet — more tasks to implement.");
}

main().catch((err) => {
  console.error("\nSeed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
