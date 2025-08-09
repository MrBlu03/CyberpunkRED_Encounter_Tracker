#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

STR="game.packs.get("

# Look for "game.packs.get" calls in the code, and fail if any are found.
# Contributors should be using SystemUtils.getCompendiumDoc instead.
if grep -r --include="*.js" --exclude="cpr-systemUtils.js" "${STR}" ./*; then
  echo "❌ 'game.packs.get' string found, use 'game.system.id' instead."
  exit 1
else
  echo "✅ 'game.packs.get' not found!"
fi
