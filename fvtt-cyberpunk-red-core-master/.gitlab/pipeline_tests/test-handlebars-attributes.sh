#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ERRORS=0
# Check hbs_location exits
HBS_LOCATION="src/templates"

# Check the HBS_LOCATION exists
if [[ ! -d "${HBS_LOCATION}" ]]; then
  echo "❌ Unable to find ${HBS_LOCATION}"
  exit 1
fi

ALL_FILES=$(find "${HBS_LOCATION}" -type f -print)

if [[ -z "${ALL_FILES}" ]]; then
  echo "❌ Unable to find any template files in ${HBS_LOCATION}"
  exit 1
fi

for file in ${ALL_FILES}; do
  mapfile -t no_quotes < <(grep -Eo "[a-z-]*={{" "${file}" || true)
  for result in "${no_quotes[@]}"; do
    if [[ -n "${result}" ]]; then
      echo "❌ Unquoted attribute '${result//{{/}' found in ${file}"
      ((ERRORS += 1))
    fi
  done
done

# If some trace messages are missing or incorrect fail this job
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ There are ${ERRORS} hbs files with unquoted HTML Attributes."
  echo "   Please ensure all HTML Attribute values are double quoted"
  exit 1
else
  echo "🎉 All good!"
fi
