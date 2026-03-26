# Migrations

We use one shared Supabase instance. Migration files in `supabase/migrations/` are just a record of what SQL has been applied to it.

---

## Creating a Migration

```bash
# 1. Generate the file
npx supabase migration new your_feature_name

# 2. Write your SQL in the generated file

# 3. Apply it to the shared DB
npx supabase db push

# 4. Commit and push
git add supabase/migrations/
git commit -m "migration: your_feature_name"
git push origin your-branch
# open PR → merge to develop
```

---

## Pulling Someone Else's Migration

```bash
git pull origin develop
```

That's it. The migration is already applied to the shared DB by your teammate. The file is just a record.

> Only run `npx supabase db push` after pulling if your teammate forgot to push before merging.

---

## Rules

- **Never apply migrations through the Supabase dashboard** — always use local files
- **Never edit a migration file after it's been pushed**
- **Coordinate with teammates** before creating migrations to avoid timestamp conflicts — a quick message first
