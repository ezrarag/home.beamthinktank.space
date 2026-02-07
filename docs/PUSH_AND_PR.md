# Push and pull request workflow

If you **can’t push to `main`** (e.g. GitHub says "Push declined" or "branch is protected"), use a branch and pull request instead.

## One-time setup (if needed)

- Ensure your remote is correct:  
  `git remote -v`  
  You should see `origin` → `git@github.com:ezrarag/home.beamthinktank.space.git` (or the HTTPS URL).

## Push your current work via a branch and PR

From the repo root, with a clean working tree and your latest commit on `main`:

```bash
# 1. Create a branch from current main (keeps your commit on the branch)
git checkout -b next-security-update

# 2. Push the branch (this is allowed even when main is protected)
git push -u origin next-security-update
```

Then on GitHub:

1. Open **Pull requests** → **New pull request**.
2. Base: `main`, compare: `next-security-update`.
3. Create the PR and merge (e.g. "Merge pull request") once checks pass.

After merging, update your local `main` and remove the branch if you like:

```bash
git checkout main
git pull origin main
git branch -d next-security-update
```

## If the PR shows merge conflicts or "out of date"

Update your branch with the latest `main`:

```bash
git fetch origin
git checkout next-security-update   # or your branch name
git merge origin/main
# fix any conflicts, then:
git add .
git commit -m "Merge main into branch"
git push origin next-security-update
```

## If push hangs or asks for a passphrase

- **SSH**: Start the agent and add your key, then push again:
  - `eval "$(ssh-agent -s)"` then `ssh-add` (or add your key to the agent).
- **HTTPS**: Use a personal access token (PAT) as the password when Git prompts.

## Repo cleanup (already done)

- Removed `.git/gc.log` and ran `git prune` so Git’s "too many unreachable loose objects" / gc warning should stop.
