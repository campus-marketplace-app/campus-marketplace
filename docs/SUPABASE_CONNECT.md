# Connecting Supabase to Campus Marketplace

Complete step-by-step guide to connect your Supabase project to the app.

---

## Step 1: Get Your Supabase Credentials

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your **Campus Marketplace** project
3. Click **Settings** (bottom left sidebar)
4. Click **API** tab
5. Copy:
   - **Project URL** (labeled "URL")
   - **Service Role Key** (under "API keys" - look for "service_role")

⚠️ **Keep these secret!** Never commit to Git.

---

## Step 2: Create Backend Environment File

Create `apps/backend/.env.local`:

```bash
cp apps/backend/.env.example apps/backend/.env.local
```

Edit the new file and paste your credentials:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...your-service-key-here...
NODE_ENV=development
```

---

## Step 3: Create Frontend Environment File

Create `apps/web/.env.local`:

```bash
cp apps/web/.env.example apps/web/.env.local
```

File should contain:

```env
VITE_SCHOOL_CODE=njit
```

---

## Step 4: Authenticate with Supabase CLI

From project root:

```bash
npx supabase login
```

This opens your browser to authenticate. Follow the prompt and return to terminal when done.

---

## Step 5: Link Your Supabase Project

Find your **Project Reference ID**:

- Dashboard URL: `app.supabase.com/project/[YOUR-REF]`
- Or Settings → General → "Reference ID"

Link your project:

```bash
npx supabase link --project-ref your-project-ref
```

Example:

```bash
npx supabase link --project-ref vltgriopiaopykdyqjsf
```

When prompted, enter your database password (from Supabase dashboard).

---

## Step 6: Push Database Migration

Create migration file (`supabase/migrations/` must have timestamp prefix):

```bash
npx supabase db push
```

This runs all unapplied migrations in `supabase/migrations/` that match pattern `YYYYMMDDHHMMSS_name.sql`.

When prompted, enter `Y` to confirm.

✅ **Your database schema is now live!**

---

## Step 7: Configure Custom SMTP for Auth Emails

Supabase's built-in email provider is limited (for example, 2 emails/hour) and only intended for non-production testing.

To enable production-ready email delivery for signup confirmations and password reset links:

1. Open Supabase Dashboard
2. Go to **Authentication -> Email -> SMTP Settings**
3. Enable custom SMTP and provide your SMTP host, port, username, password, sender email, and sender name
4. Save settings
5. Go to **Authentication -> Rate Limits** and increase `rate_limit_email_sent` as needed

For a full checklist, follow [SMTP_SETUP.md](SMTP_SETUP.md).

---

## Verify Connection

### Check Tables in Dashboard

1. Go to Supabase Dashboard
2. **SQL Editor**
3. Run:
   ```sql
   SELECT tablename FROM pg_tables WHERE schemaname = 'public';
   ```

Should see: `profiles`, `listings`, `categories`, `school_themes`, etc.

### Check Backend Can Connect

```bash
cd apps/backend
npm run build
```

No errors = connection working ✅

---

## All Set!

Your app is now connected to Supabase:

- ✅ Backend configured with credentials
- ✅ Database schema migrated
- ✅ Ready to implement services

Next: Start the app with `.\dev.ps1`
