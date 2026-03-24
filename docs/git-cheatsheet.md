---
title: Git Cheatsheet
description: The Git commands I reach for most often — branching, rebasing, stashing, and undoing mistakes.
tags: [git, version-control, cli]
category: Git
date: 2024-01-28
---

## Everyday Commands

```bash
git status                  # what's changed
git diff                    # unstaged changes
git diff --staged           # staged changes

git add -p                  # interactively stage hunks
git commit -m "feat: ..."   # commit with message
git commit --amend          # amend last commit (before push only)
```

## Branching

```bash
git branch                  # list local branches
git branch -a               # list all (including remote)

git checkout -b feature/xyz # create and switch
git switch -c feature/xyz   # modern equivalent

git branch -d feature/xyz   # delete (safe)
git branch -D feature/xyz   # delete (force)

git push origin feature/xyz                     # push branch
git push --set-upstream origin feature/xyz      # set tracking
```

## Merging and Rebasing

```bash
# Merge
git merge feature/xyz           # merge into current branch
git merge --no-ff feature/xyz   # always create merge commit

# Rebase
git rebase main                 # rebase onto main
git rebase -i HEAD~3            # interactive rebase (last 3 commits)

# Rebase operations in interactive mode:
# pick   — keep commit
# reword — edit commit message
# squash — meld into previous commit
# fixup  — like squash, discard message
# drop   — remove commit
```

## Stashing

```bash
git stash                       # stash current changes
git stash push -m "wip: ..."   # stash with a name
git stash list                  # show all stashes
git stash pop                   # apply latest and drop
git stash apply stash@{2}       # apply specific stash (keep it)
git stash drop stash@{0}        # delete specific stash
git stash clear                 # drop all stashes
```

## Undoing Things

```bash
# Unstage a file
git restore --staged <file>

# Discard working directory changes
git restore <file>

# Undo last commit, keep changes staged
git reset --soft HEAD~1

# Undo last commit, keep changes unstaged
git reset HEAD~1

# Completely undo last commit and discard changes
git reset --hard HEAD~1

# Revert a commit (safe — creates a new commit)
git revert <commit-hash>
```

## Useful Aliases

```bash
git config --global alias.lg "log --oneline --graph --decorate --all"
git config --global alias.st "status -s"
git config --global alias.co "checkout"
git config --global alias.br "branch"
```

## Log and Search

```bash
git log --oneline -20            # last 20 commits, one line
git log --author="Name"          # commits by author
git log -- path/to/file          # commits touching a file

git grep "TODO"                  # search working tree
git log -S "function name"       # commits that added/removed a string

git blame file.ts                # who wrote each line
git show <commit-hash>           # show commit details
```

## Remote Operations

```bash
git remote -v                            # list remotes
git remote add upstream <url>            # add upstream remote

git fetch --all                          # fetch all remotes
git pull --rebase                        # pull with rebase instead of merge

git push origin main                     # push to remote
git push --force-with-lease              # safer force push (checks for upstream changes)
```

## Cherry-pick

```bash
git cherry-pick <commit-hash>            # apply a single commit
git cherry-pick A..B                     # apply a range of commits
```
