# Campus Marketplace — Git Workflow

**Branches**
- `main` = hosted / production (always stable)
- `develop` = sprint integration
- `feat/*`, `fix/*`, `chore/*`, `docs/*` = work branches

---

## Table of contents
- [Rules](#rules)
- [Branch names](#branch-names)
- [Daily workflow](#daily-workflow)
- [PR checklist](#pr-checklist)
- [End-of-sprint release](#end-of-sprint-release)
- [Hotfixes](#hotfixes)
- [Command cheatsheet](#command-cheatsheet)
- [Common problems](#common-problems)

---

## Rules
1. **No direct commits** to `main` or `develop`
2. All changes go via **PR**
3. PR needs **1 review** + CI checks passing
4. **No secrets** committed (never commit `.env`)

---

## Branch names
Use: `type/short-desc` (optional ticket id)

- `feat/CM-123-item-posting`
- `fix/CM-45-message-bug`
- `chore/tooling-update`
- `docs/git-workflow`

---

## Daily workflow

### 1) Start a task
```bash
git checkout develop
git pull origin develop
git checkout -b feat/CM-123-short-desc
```

### 2) Work + commit
```bash
git add -A
git commit -m "feat: short clear message"
```

### 3) Push + open PR to develop
```bash
git push -u origin feat/CM-123-short-desc
```
Open a PR: **base = `develop`**, **compare = your branch**

### 4) Update your branch (avoid conflicts)
```bash
git checkout develop
git pull origin develop
git checkout feat/CM-123-short-desc
git merge develop
git push
```

> Beginners: we use `merge develop` (not rebase) to keep it simple.

---

## PR checklist
**Title:** `feat: ...` / `fix: ...` / `chore: ...`

**Description includes:**
- What changed (1–3 bullets)
- How to test (1–2 steps)
- Screenshot if UI changed

**Merge method:** **Squash and merge** into `develop`

---

## End-of-sprint release
At sprint end: merge **`develop` → `main`**

1) Confirm `develop` is green (CI passing)
2) Open PR: **base = `main`**, compare = `develop`
3) Title: `release: Sprint X (YYYY-MM-DD)`
4) Merge → hosting updates automatically

(Optional) Tag a release: `sprint-X` or `v0.X.0`

---

## Hotfixes
If `main` is broken:

```bash
git checkout main
git pull origin main
git checkout -b fix/hotfix-short-desc
# fix it
git add -A
git commit -m "fix: hotfix description"
git push -u origin fix/hotfix-short-desc
```

PR **to `main`**. After merge, open PR **`main` → `develop`** to keep branches in sync.

---

## Command cheatsheet
```bash
git status                 # what changed
git diff                   # see edits
git pull                   # update current branch
git fetch origin           # download remote updates (no merge)
git log --oneline --graph  # visualize history
```

Delete branches after merge:
```bash
git branch -d your-branch
git push origin --delete your-branch
```

---

## Common problems

### “My PR has conflicts”
```bash
git checkout develop
git pull origin develop
git checkout your-branch
git merge develop
# resolve files
git add -A
git commit -m "chore: resolve conflicts"
git push
```

### “I committed to the wrong branch”
Stop and ask in chat — easiest fix depends on what happened.
