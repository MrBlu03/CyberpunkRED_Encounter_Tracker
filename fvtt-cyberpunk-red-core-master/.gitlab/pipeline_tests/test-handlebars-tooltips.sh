#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ERRORS=0
# Check hbs_location exits
HBS_LOCATION="src/templates/"

# Check the HBS_LOCATION exists
if [[ ! -d "${HBS_LOCATION}" ]]; then
  echo "❌ Unable to find ${HBS_LOCATION}"
  exit 1
fi

# Check we have files in hbs_location
ALL_FILES=$(find "${HBS_LOCATION}" -type f -print)

if [[ -z "${ALL_FILES}" ]]; then
  echo "❌ Unable to find any helper files in ${HBS_LOCATION}"
  exit 1
fi

for file in ${ALL_FILES}; do
  if grep --quiet ' title="' "${file}"; then
    echo "❌ 'title=' detected in ${file}"
    ((ERRORS = ERRORS + 1))
  fi
done

# If some trace messages are missing or incorrect fail this job
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ There are ${ERRORS} files containing the 'title' element as listed above."
  echo "   Please replace with the Foundry provided 'data-tooltip element."
  exit 1
else
  echo "🎉 All good!"
fi
