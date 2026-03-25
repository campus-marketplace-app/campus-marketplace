# Git Cheatsheet

## Syncing with Remote

`git fetch` — downloads latest from GitHub without touching your files

`git fetch origin` — same as above, explicit about using the `origin` remote

`git pull origin develop` — fetches and merges remote develop into your current branch
equivalent: `git fetch origin` + `git merge origin/develop`

`git merge origin/develop` — merges the already-fetched remote develop into your current branch

---

## Branches

`git branch --show-current` — shows your current branch name

`git branch -a` — lists all local and remote branches

`git checkout develop` — switches to your local develop branch

`git checkout feat/my-feature` — switches to an existing local branch

`git checkout -b feat/my-feature` — creates a new branch and switches to it

`git checkout -b feat/my-feature origin/feat/my-feature` — creates a local copy of a remote branch and switches to it

`git branch -d feat/my-feature` — deletes a local branch (safe — only works if fully merged)

---

## Staging & Committing

`git status` — shows what branch you're on and which files changed

`git add .` — stages all changed files

`git add path/to/file` — stages a single file

`git diff` — shows unstaged changes

`git diff --staged` — shows staged changes (what will be committed)

`git commit -m "message"` — commits staged changes with a message

---

## Pushing

`git push origin feat/my-feature` — pushes your local branch to GitHub

`git push -u origin feat/my-feature` — pushes and sets upstream so future `git push` works without arguments

---

## Inspecting

`git log --oneline` — compact commit history for current branch

`git log --oneline HEAD..origin/develop` — commits develop has that your branch does not

`git rev-list --count HEAD..origin/develop` — how many commits your branch is behind develop

`git diff develop origin/develop` — difference between your local develop and remote develop

`git diff --name-only origin/develop...HEAD` — files your branch has changed compared to develop (what a PR would touch)

---

## Merging

`git merge develop` — merges your local develop into your current branch

`git merge origin/develop` — merges remote develop into your current branch

`git merge --abort` — cancels an in-progress merge and restores the previous state

---

## Undoing

`git restore path/to/file` — discards unstaged changes to a file

`git restore --staged path/to/file` — unstages a file without losing changes

`git reset --soft HEAD~1` — undoes last commit but keeps changes staged

`git reset --hard HEAD~1` — undoes last commit and discards all changes (destructive)
