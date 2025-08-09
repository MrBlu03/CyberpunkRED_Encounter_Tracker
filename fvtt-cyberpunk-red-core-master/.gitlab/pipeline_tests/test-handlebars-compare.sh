#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Checks for usage like:
# {{#if (cprCompare foo.bar "===" true)}}

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

# Split this into a different line as it's so long
REGEX='#if\s*\(cprCompare\s*[a-z.].*".*"\s*(true|false|"true"|"false")\)'

for file in ${ALL_FILES}; do
  if grep --quiet --extended-regexp "${REGEX}" "${file}"; then

    echo "❌ ${file} uses cprCompare to test a boolean"
    ((ERRORS = ERRORS + 1))
  fi
done

# If some handlebars files use cprCOmpare to test booleans fail this job
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ There are ${ERRORS} files containing using cprCompare to test booleans."
  echo "   Replace with '{{#if thing.to.test }}' or '{{#unless thing.to.test}}'."
  exit 1
else
  echo "🎉 All good!"
fi
