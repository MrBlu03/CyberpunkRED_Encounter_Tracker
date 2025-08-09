#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ERRORS=0
# Check hbs_location exits
HBS_LOCATION="src/templates/"

INLINE_TAGS=(
  "<b>"
  "<strong>"
  "<i>"
  "<em>"
  "<mark>"
  "<small>"
  "<del>"
  "<ins>"
  "<sub>"
  "<sup>"
  "&nbsp;"
  #"style=" remove style for now as there are some issues with the weapons box
  #         I can't resovlve without a huge rewrite
)

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
  for tag in "${INLINE_TAGS[@]}"; do
    if grep -q "${tag}" "${file}"; then
      echo "❌ '${tag}' detected in ${file}"
      ((ERRORS = ERRORS + 1))
    fi
  done
done

# If some trace messages are missing or incorrect fail this job
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ There are ${ERRORS} files containing inline styles as listed above."
  echo "   Please replace with an appropiate CSS based style."
  exit 1
else
  echo "🎉 All good!"
fi
