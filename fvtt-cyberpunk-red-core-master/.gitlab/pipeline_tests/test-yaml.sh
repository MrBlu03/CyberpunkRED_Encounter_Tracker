#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ERRORS=0

# Get a list of all yaml files, ignore dirs we don't care about
mapfile -t DOCS < <(
  find . \
    -not \( -path "./dist" -prune \) \
    -not \( -path "./node_modules" -prune \) \
    -iname "*.yml" \
    -o -iname "*.yaml"
)

# Check we get files returned
if [[ -z "${DOCS[*]}" ]]; then
  echo "❌ Unable to find any yaml files in the repo"
  exit 1
fi

# Loop over the files and run through yaml-lint
for doc in "${DOCS[@]}"; do
  if ! yamllint "${doc}"; then
    echo "❌ ${doc} does not validate with yaml-lint"
    ((ERRORS = ERRORS + 1))
  fi
done

# Check if we got any errors
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ ${ERRORS} files have errors please check the output above for more details"
  exit 1
else
  echo "🎉 All good!"
fi
