# Git Cheatsheet

## Syncing with Remote

Downloads latest from GitHub without touching your files
```bash
git fetch
```

Same as above, explicit about using the `origin` remote
```bash
git fetch origin
```

Fetches and merges remote develop into your current branch
```bash
git pull origin develop
```
equivalent: `git fetch origin` + `git merge origin/develop`

Merges the already-fetched remote develop into your current branch
```bash
git merge origin/develop
```

---

## Branches

Shows your current branch name
```bash
git branch --show-current
```

Lists all local and remote branches
```bash
git branch -a
```

Switches to your local develop branch
```bash
git checkout develop
```

Switches to an existing local branch
```bash
git checkout feat/my-feature
```

Creates a new branch and switches to it
```bash
git checkout -b feat/my-feature
```

Creates a local copy of a remote branch and switches to it
```bash
git checkout -b feat/my-feature origin/feat/my-feature
```

Deletes a local branch (safe — only works if fully merged)
```bash
git branch -d feat/my-feature
```

---

## Staging & Committing

Shows what branch you're on and which files changed
```bash
git status
```

Stages all changed files
```bash
git add .
```

Stages a single file
```bash
git add path/to/file
```

Shows unstaged changes
```bash
git diff
```

Shows staged changes (what will be committed)
```bash
git diff --staged
```

Commits staged changes with a message
```bash
git commit -m "message"
```

---

## Pushing

Pushes your local branch to GitHub
```bash
git push origin feat/my-feature
```

Pushes and sets upstream so future `git push` works without arguments
```bash
git push -u origin feat/my-feature
```

---

## Inspecting

Compact commit history for current branch
```bash
git log --oneline
```

Commits develop has that your branch does not
```bash
git log --oneline HEAD..origin/develop
```

How many commits your branch is behind develop
```bash
git rev-list --count HEAD..origin/develop
```

Difference between your local develop and remote develop
```bash
git diff develop origin/develop
```

Files your branch has changed compared to develop (what a PR would touch)
```bash
git diff --name-only origin/develop...HEAD
```

---

## Merging

Merges your local develop into your current branch
```bash
git merge develop
```

Merges remote develop into your current branch
```bash
git merge origin/develop
```

Cancels an in-progress merge and restores the previous state
```bash
git merge --abort
```

---

## Undoing

Discards unstaged changes to a file
```bash
git restore path/to/file
```

Unstages a file without losing changes
```bash
git restore --staged path/to/file
```

Undoes last commit but keeps changes staged
```bash
git reset --soft HEAD~1
```

Undoes last commit and discards all changes (destructive)
```bash
git reset --hard HEAD~1
```
