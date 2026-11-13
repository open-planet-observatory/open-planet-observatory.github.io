#!/usr/bin/env bash
# Commits rebuilt files to a new branch and opens a pull request instead of pushing to main (main is protected
# since 12 Nov 2026: every change goes through a PR, the five "PR check" jobs must pass, and the maintainer merges).
# A PR opened with the Actions token does not start pull_request workflows, so this also starts "PR check" by hand
# on the branch; its results attach to the branch's commit, which is what the required checks look at.
# Usage: .github/scripts/open-pr.sh "<commit message>" <path> [<path> ...]
# Needs: GH_TOKEN, and job permissions contents: write, pull-requests: write, actions: write.
set -euo pipefail
msg="$1"; shift
git config user.name "observatory-bot"
git config user.email "observatory-bot@users.noreply.github.com"
git add -- "$@"
if git diff --cached --quiet; then echo "No change: nothing to propose."; exit 0; fi
slug=$(echo "${GITHUB_WORKFLOW:-build}" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' '-' | sed 's/^-//;s/-$//')
branch="bot/${slug}-${GITHUB_RUN_ID:-$(date +%s)}"
git checkout -b "$branch"
git commit -m "$msg"
git push -u origin "$branch"
gh pr create --base main --head "$branch" --title "$msg" --body "Rebuilt by the \"${GITHUB_WORKFLOW:-build}\" workflow (run ${GITHUB_SERVER_URL:-https://github.com}/${GITHUB_REPOSITORY:-}/actions/runs/${GITHUB_RUN_ID:-}). Files: $*. PR check has been started on this branch; merge when it is green."
gh workflow run pr-check.yml --ref "$branch"
echo "Opened a PR from $branch and started PR check."
