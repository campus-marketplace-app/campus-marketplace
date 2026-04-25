# Documentation Index

This is the documentation root for the Campus Marketplace monorepo. Files are
grouped by audience.

## architecture/
High-level explanations of how subsystems are wired together. Read these to
understand *why* things are the way they are.

- [BACKEND_COVERAGE.md](architecture/BACKEND_COVERAGE.md) — what each backend
  service does and which DB tables it touches.
- [CACHING.md](architecture/CACHING.md) — TanStack Query caching policy,
  realtime invalidation, and stale-time conventions.
- [CACHING_EXPLAINED.md](architecture/CACHING_EXPLAINED.md) — long-form
  walkthrough of the same.
- [THEME_CONTEXT_EXPLAINED.md](architecture/THEME_CONTEXT_EXPLAINED.md) —
  CSS-variable theming, presets, and how the dark/light toggle plumbs through.

## usage/
Per-service integration guides for frontend developers. Each one shows imports,
typical call patterns, and edge cases for one backend service.

- [AUTH_USAGE.md](usage/AUTH_USAGE.md)
- [BLOCKS_USAGE.md](usage/BLOCKS_USAGE.md)
- [CATEGORIES_USAGE.md](usage/CATEGORIES_USAGE.md)
- [FAVORITES_USAGE.md](usage/FAVORITES_USAGE.md) *(legacy — favorites table was
  dropped; see WISHLIST in the listings service)*
- [LISTINGS_USAGE.md](usage/LISTINGS_USAGE.md)
- [MESSAGING_USAGE.md](usage/MESSAGING_USAGE.md)
- [NOTIFICATIONS_USAGE.md](usage/NOTIFICATIONS_USAGE.md)
- [PROFILE_USAGE.md](usage/PROFILE_USAGE.md)
- [REPORTS_USAGE.md](usage/REPORTS_USAGE.md)

## dev/
Setup, environment, and workflow references for contributors.

- [SETUP.md](dev/SETUP.md) — local environment + initial install.
- [SUPABASE_CONNECT.md](dev/SUPABASE_CONNECT.md) — credentials and `.env.local`.
- [MIGRATIONS.md](dev/MIGRATIONS.md) — how to add and apply database migrations.
- [GIT_WORKFLOW.md](dev/GIT_WORKFLOW.md) — branch naming and PR process.
- [GIT_CHEATSHEET.md](dev/GIT_CHEATSHEET.md) — common git commands.
- [TEMPLATE.md](dev/TEMPLATE.md) — template used when adding a new doc.

## db/
Schema diagrams (image files).

## NJIT Startup/
Project planning artifacts (proposal, scope, sprint plans).

## superpowers/
Workflow plans and specs produced via the `superpowers` skill — historical
record of feature design discussions.
