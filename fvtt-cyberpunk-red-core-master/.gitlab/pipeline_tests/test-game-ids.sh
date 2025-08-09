#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# The following vars are set during the 'init' CI job.
# SYSTEM_NAME

SYSTEM_NAME="cyberpunk-red-core"

# Look for "cyberpunk-red-core" in the code, and fail if any is found.
# Contributors should be using game.system.id instead.
#
# We exclude certian files as these are loaded in foundry before
# `${game.system.id}` is available.
if grep -r \
  --include="*.js" \
  --exclude="config.js" \
  --exclude="migration-app.js" \
  "${SYSTEM_NAME}" ./*; then
  echo "❌ '${SYSTEM_NAME}' string found, use 'game.system.id' instead."
  exit 1
else
  echo "✅ '${SYSTEM_NAME}' not found!"
fi
