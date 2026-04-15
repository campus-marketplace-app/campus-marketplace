// scripts/seed-staging.ts
// Staging seed script — wipes and re-creates demo accounts + listings.
// Run: npm run seed
// NEVER run against production.

async function main(): Promise<void> {
  console.log("Seed script placeholder — tasks to be implemented.");
}

main().catch((err) => {
  console.error("Seed failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
