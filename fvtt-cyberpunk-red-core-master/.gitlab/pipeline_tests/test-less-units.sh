#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ERRORS=0
# Check hbs_location exits
LESS_LOCATION="src/less"

# Non-relative units to check
UNIT_LIST=(
  "px"
  "cm"
  "mm"
  "Q"
  "in"
  "pc"
  "pt"
  "px"
)

# Check the LESS_LOCATION exists
if [[ ! -d "${LESS_LOCATION}" ]]; then
  echo "❌ Unable to find ${LESS_LOCATION}"
  exit 1
fi

ALL_FILES=$(find "${LESS_LOCATION}" -type f -print -iname "*.less")

if [[ -z "${ALL_FILES}" ]]; then
  echo "❌ Unable to find any less files in ${LESS_LOCATION}"
  exit 1
fi

for FILE in ${ALL_FILES}; do
  for UNIT in "${UNIT_LIST[@]}"; do
    if grep -Eoq "[0-9]{1,5}${UNIT}" "${FILE}"; then
      echo "❌ ${UNIT} used in ${FILE}"
      ((ERRORS += 1))
    fi
  done
done

# If some trace messages are missing or incorrect fail this job
if [[ "${ERRORS}" -gt 0 ]]; then
  echo ""
  echo "❌ There are ${ERRORS} instances of non-relative units."
  echo "We use relatve units in our CSS to ensure proper scaling when using larger fonts."
  echo "Please use the 'rem' unit in place of 'px'"
  echo "This site preovides conversion: https://nekocalc.com/px-to-rem-converter"
  exit 1
else
  echo "🎉 All good!"
fi
