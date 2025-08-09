#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ERRORS=0
LANG_DIR="src/babele/en"

mapfile -t CHANGED_FILES < <(
  git status -s "${LANG_DIR}" |
    awk '{print $2}' |
    cut -d "/" -f 4 |
    sed 's/cyberpunk-red-core\.//g' | sed 's/\.json//g'
)

for file in "${CHANGED_FILES[@]}"; do
  echo "❌ ${file} has changes not exported to Babele"
  ((ERRORS += 1))
done

# Check if we got any errors
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ ${ERRORS} missing pack changes."
  echo "   Run 'npx gulp generateBabele' locally to resolve these issues."
  exit 1
else
  echo "🎉 All good!"
fi
