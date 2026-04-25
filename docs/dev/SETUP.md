# Development Setup Guide

Quick start options for running Campus Marketplace locally.

## Prerequisites

- Node.js 18+ installed
- npm installed (comes with Node.js)
- Git (for cloning the repo)

## Quick Start

### **Option 1: Windows PowerShell (Recommended for Windows Users)**

```powershell
.\dev.ps1
```

This script will:

1. Install all dependencies
2. Start the development server
3. Open the app in your default browser

### **Option 2: macOS / Linux (Recommended for Mac/Linux Users)**

```bash
bash dev.sh
```

This script will:

1. Install all dependencies
2. Start the development server
3. Open the app in your default browser

### **Option 3: Node.js (Cross-Platform)**

```bash
node dev.mjs
```

Works on Windows, macOS, and Linux. Automatically detects your OS and opens the app in your browser.

### **Option 4: Manual Setup**

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Then open http://localhost:5173 in your browser.

---

## What Each Script Does

All setup scripts perform these steps:

1. **Install Dependencies** - Runs `npm install` to set up all packages
2. **Start Dev Server** - Launches Vite dev server (hot reload enabled)
3. **Open Browser** - Automatically opens http://localhost:5173

---

## Development Commands

Once the app is running, you can use these commands in separate terminals:

```bash
# Start frontend dev server
npm run dev

# Build both frontend and backend
npm run build

# Run linting checks
npm run lint

# Type check all code
npm run typecheck
```

---

## Project Structure

```
campus-marketplace/
├── apps/
│   ├── web/              # React frontend (Vite)
│   └── backend/          # TypeScript service layer (Supabase)
├── supabase/             # Database migrations
├── dev.ps1              # Windows setup script
├── dev.sh               # macOS/Linux setup script
└── dev.mjs              # Node.js cross-platform script
```

---

## Troubleshooting

### Script won't run (Windows)

If you get a permission error, run PowerShell as Administrator and execute:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port 5173 already in use

Kill the process using that port or use a different port:

```bash
# Use port 5174 instead
npm run dev -- --port 5174
```

### Dependencies not installing

Delete `node_modules` and `package-lock.json`, then run:

```bash
npm install
```

---

## Configuration

### Environment Variables

**Frontend** (apps/web/.env.local):

```env
VITE_SCHOOL_CODE=njit
```

**Backend** (apps/backend/.env.local):

```env
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-key
```

See `.env.example` files for more details.

---

## Next Steps

1. Set up Supabase credentials
2. Run database migrations: `supabase db push`
3. Implement backend services as needed
4. Connect frontend forms to backend functions

For more info, see:

- [Copilot Instructions](.github/copilot-instructions.md)
- [Git Workflow](docs/dev/GIT_WORKFLOW.md)
- [Backend README](apps/backend/README.md)
