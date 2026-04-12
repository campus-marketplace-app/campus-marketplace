# Campus Marketplace

**A multi-school campus marketplace platform** enabling students to buy, sell, and offer services within a secure university ecosystem.

![Status](https://img.shields.io/badge/status-Early%20Prototyping-yellow) ![License](https://img.shields.io/badge/license-MIT-blue)

---

## 📋 About

Campus Marketplace is a React-based web application that allows students to:

- **Buy & Sell Items** — Listings with images, pricing, and condition details
- **Offer Services** — Academic help, tutoring, moving assistance, etc.
- **Direct Messaging** — Communicate securely with other users
- **Multi-School Support** — Different branding per university via theme system
- **User Profiles & Reviews** — Build reputation and trust

---

## 🏗️ Architecture

**Frontend → Service Layer → Supabase**

```
apps/web/                    # React 19 + Vite (frontend)
  └── src/
      ├── pages/            # Route components
      ├── features/         # Reusable UI components
      ├── layouts/          # Page wrappers
      └── shared/           # Utilities, types

apps/backend/                # TypeScript service layer
  └── src/
      ├── services/         # Domain functions (theme, listings, etc.)
      ├── supabase-client.ts # Only place Supabase SDK is imported
      └── index.ts          # Service exports

supabase/
  ├── migrations/           # Database schema (PostgreSQL)
  └── config.toml          # Supabase CLI config
```

**Key Principle:** Frontend **never** imports Supabase directly. All database queries go through backend service functions.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, Vite 8, TypeScript, Tailwind CSS 4, React Router 7
- **Backend:** TypeScript service layer
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Build:** TypeScript compiler, ESLint
- **Linting:** ESLint 9 + TypeScript ESLint

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm (comes with Node.js)

### Run Locally (One Command)

**Windows:**

```powershell
.\dev.ps1
```

**macOS/Linux:**

```bash
bash dev.sh
```

**or use Node.js (any OS):**

```bash
node dev.mjs
```

This will:

1. Install all dependencies
2. Start the development server
3. Open the app at `http://localhost:5173`

---

## 📚 Setup Guides

- **[SETUP.md](SETUP.md)** — How to run the app locally (3 options)
- **[SUPABASE_CONNECT.md](SUPABASE_CONNECT.md)** — Connect Supabase (credentials, auth, push migrations)
- **[SMTP_SETUP.md](docs/SMTP_SETUP.md)** — Configure custom SMTP for Supabase Auth email delivery
- **[MIGRATIONS.md](MIGRATIONS.md)** — Create & manage database migrations

---

## 📦 Project Structure

```
campus-marketplace/
├── apps/
│   ├── web/                  # React frontend
│   │   ├── src/
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── backend/              # Service layer
│       ├── src/services/     # theme.ts, listings.ts, etc.
│       └── package.json
├── supabase/
│   ├── migrations/           # 20260315120000_core_tables.sql
│   └── config.toml
├── docs/                     # Architecture docs
│── .github/
│   ├── copilot-instructions.md
│   └── instructions/
├── dev.ps1 / dev.sh / dev.mjs  # Setup scripts
├── SETUP.md
├── SUPABASE_CONNECT.md
└── MIGRATIONS.md
```

---

## 💻 Development

### Install Dependencies

```bash
npm install
```

### Start Dev Server

```bash
npm run dev
```

### Build & Lint

```bash
npm run build      # Build both frontend and backend
npm run lint       # Run ESLint checks
npm run typecheck  # TypeScript strict mode check
```

### Connect Supabase

```bash
# See SUPABASE_CONNECT.md for full details
npx supabase login
npx supabase link --project-ref your-project-ref
npx supabase db push
```

---

## 📊 Database Schema

16 tables including:

- **profiles** — User accounts (linked to Supabase Auth)
- **listings** — Items/services for sale
- **categories, subcategories, tags** — Metadata
- **messages, conversations** — Direct messaging
- **school_themes** — Multi-school branding (colors, fonts, logos)
- **favorites, reviews, reports** — Feature support tables

All tables use UUID primary keys and auto-managed `created_at`/`updated_at` timestamps.

See [supabase/migrations/20260315120000_core_tables.sql](supabase/migrations/20260315120000_core_tables.sql) for full schema.

---

## 🔧 Backend Services

Services are TypeScript functions that wrap Supabase queries. All in `apps/backend/src/services/`:

- **theme.ts** — `getThemeBySchoolCode()` — Fetch school branding
- **listings.ts** — CRUD for item listings (stubs: implement as needed)
- **profile.ts** — User profile queries (stubs)
- **messaging.ts** — Conversations and messages (stubs)
- **search.ts** — Advanced filtering (stubs)

Frontend imports these directly:

```typescript
import { getThemeBySchoolCode } from "@campus-marketplace/backend";
const theme = await getThemeBySchoolCode("njit");
```

---

## 🎨 Styling & Theming

- **Tailwind CSS** for component styling
- **CSS Variables** for dynamic theme colors
- Theme fetched from `school_themes` table on app startup
- Colors (primary, secondary, accent) set per school

Example:

```typescript
// Component uses CSS variable
style={{ backgroundColor: 'var(--color-primary)' }}
```

---

## 🔐 Environment Variables

**Frontend** (`apps/web/.env.local`):

```env
VITE_SCHOOL_CODE=njit
```

**Backend** (`apps/backend/.env.local`):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
NODE_ENV=development
```

**Never commit `.env.local` files!** See `.env.example` for templates.

---

## 📝 Git Workflow

Branch naming: `type/ticket-description`

- `feat/CM-123-item-posting`
- `fix/CM-124-message-bug`
- `chore/CM-125-update-deps`
- `docs/CM-126-readme`

See [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) for full details.

---

## 🚧 Current Status

✅ **Done:**

- Frontend scaffolding (pages, routes, layouts)
- Backend service layer foundation
- Supabase connection & authentication
- Database schema (16 tables)
- Development setup scripts
- TypeScript strict mode
- ESLint & Tailwind CSS configured

⏳ **In Progress:**

- Backend service implementations
- Frontend form handlers
- Theme system integration
- User authentication UI

❌ **Not Yet:**

- RLS (Row-Level Security) policies
- Image upload/storage
- Seed data
- Advanced search filters
- Messaging real-time updates
- Deployment pipeline

---

## 📖 References

- [Architecture & Rules](.github/copilot-instructions.md) — Read before coding
- [Setup Instructions](SETUP.md)
- [Supabase Connection Guide](SUPABASE_CONNECT.md)
- [Migration Management](MIGRATIONS.md)
- [Git Workflow](docs/GIT_WORKFLOW.md)
- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)

---

## 📄 License

MIT
