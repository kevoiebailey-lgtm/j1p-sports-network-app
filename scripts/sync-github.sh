#!/usr/bin/env bash
set -e

export GIT_TERMINAL_PROMPT=0

REPO_URL="https://github.com/kevoiebailey-lgtm/j1p-sports-network-app.git"
GITHUB_USER="kevoiebailey-lgtm"
PAT="${GITHUB_PAT:-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}"

COMMIT_MSG="${1:-Auto-update from Just1Play Studio $(date -u +'%Y-%m-%d %H:%M:%S UTC')}"

echo "🔄 Initializing workspace push..."
rm -rf .git
git init -b main
git config user.name "$GITHUB_USER"
git config user.email "kevoiebailey@gmail.com"

git remote add origin "https://${GITHUB_USER}:${PAT}@github.com/${GITHUB_USER}/j1p-sports-network-app.git"

git add .
git commit -m "$COMMIT_MSG"

echo "🚀 Pushing to GitHub (main)..."
git push -u origin main --force

# Cleanup .git to prevent container file watcher timeouts
rm -rf .git

echo "🎉 Successfully synced to ${REPO_URL}"

