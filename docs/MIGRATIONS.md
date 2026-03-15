# Running Migrations

## Push New Migrations to Database

From project root:

```bash
npx supabase db push
```

Supabase will:

1. Detect new migration files in `supabase/migrations/`
2. Prompt you to confirm
3. Apply only unapplied migrations to remote database

---

## Create a New Migration

1. Create file: `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
   - Use timestamp format: `20260320150000` = March 20, 2026, 3:00 PM

2. Write SQL:

   ```sql
   -- supabase/migrations/20260320150000_add_new_feature.sql
   ALTER TABLE listings ADD COLUMN new_field TEXT;
   ```

3. Push:
   ```bash
   npx supabase db push
   ```

---

## Rules

✅ **DO:**

- Create new migration files for schema changes
- Use `YYYYMMDDHHMMSS_description` naming
- Include timestamp to define execution order

❌ **DON'T:**

- Edit migrations after they're pushed
- Manually edit `_supabase_migrations` table
- Commit `.env.local` files

---

## Verify Migrations Applied

In Supabase Dashboard:

1. **SQL Editor** → Run:
   ```sql
   SELECT * FROM _supabase_migrations ORDER BY executed_at DESC;
   ```

See all applied migrations with timestamps.
