#!/bin/sh
# Clones the real repo into /workspace on every container start (cheap:
# scale-to-zero means this only runs on a cold start, not per-request), so
# the backend always reads/writes the latest models/*.json and schema files
# rather than a stale copy baked into the image at build time.
set -eu

: "${GH_TOKEN:?GH_TOKEN environment variable is required (repo clone + gh CLI auth)}"
: "${GITHUB_REPO:?GITHUB_REPO environment variable is required, e.g. owner/repo}"
: "${API_KEY:?API_KEY environment variable is required}"

WORKSPACE=/workspace

if [ ! -d "$WORKSPACE/.git" ]; then
  git clone --depth 1 "https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPO}.git" "$WORKSPACE"
else
  git -C "$WORKSPACE" fetch origin main
  git -C "$WORKSPACE" checkout main
  git -C "$WORKSPACE" reset --hard origin/main
fi

git -C "$WORKSPACE" config user.name "chatbot-bot"
git -C "$WORKSPACE" config user.email "chatbot-bot@users.noreply.github.com"

mkdir -p "$WORKSPACE/chatbot/backend"
ln -sfn /app/dist "$WORKSPACE/chatbot/backend/dist"
ln -sfn /app/node_modules "$WORKSPACE/chatbot/backend/node_modules"

cd "$WORKSPACE/chatbot/backend"
exec node dist/api/server.js
