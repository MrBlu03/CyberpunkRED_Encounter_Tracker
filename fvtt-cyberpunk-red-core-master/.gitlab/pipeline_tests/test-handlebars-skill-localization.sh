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
mapfile -t ALL_FILES < <(find "${HBS_LOCATION}" -type f -print)

if [[ -z "${ALL_FILES[*]}" ]]; then
  echo "❌ Unable to find any helper files in ${HBS_LOCATION}"
  exit 1
fi

REGEX="{{localize.*skill.*}}"
ANTI_REGEX="(CPR|cprFindConfigValue|cprGetLocalizedlNameKey)"

for file in "${ALL_FILES[@]}"; do
  count=$(
    awk \
      -v pattern="${REGEX}" \
      -v anti="${ANTI_REGEX}" \
      'BEGIN{count=0} $0 ~ pattern && $0 !~ anti {count++} END{print count}' \
      "${file}"
  )
  if ((count > 0)); then
    echo "❌ ${file} contains a localization for a skill without using the"
    echo "   'cprGetLocalizedlNameKey' handlebars helper"
    ((ERRORS = ERRORS + 1))
  fi
done

# If some handlebars files use cprCOmpare to test booleans fail this job
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ There are ${ERRORS} files not using 'cprGetLocalizedlNameKey' for"
  echo "   localization of skill names."
  echo "   You probably want:"
  echo "     '{{localize (cprGetLocalizedlNameKey skill.name \"skill\")}}'"
  exit 1
else
  echo "🎉 All good!"
fi
