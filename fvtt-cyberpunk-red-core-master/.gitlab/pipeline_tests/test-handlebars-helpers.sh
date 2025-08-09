#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Check if the helper file exists
HELPERFILE="src/modules/system/register-helpers.js"
ERRORS=0

if [[ ! -f "${HELPERFILE}" ]]; then
  echo "❌ ${HELPERFILE} not found"
  exit 1
fi

# Check if the helper file contains helpers
# Shortcut to true as we test this after so we can give an error message
HELPERS=$(grep registerHelper "${HELPERFILE}" | awk -F "\"" '{print $2}' || true)

if [[ -z "${HELPERS}" ]]; then
  echo "❌ No helpers found in ${HELPERFILE}"
  exit 1
fi

# Check if helpers are used and start with cpr
for helper in ${HELPERS}; do
  if ! grep -rq "${helper}" src/templates/*; then
    # it is ok if cprDebug and cprIsDebug are not used anywhere
    if [[ ! "${helper}" == "cprDebug" || "${helper}" == "cprIsDebug" ]]; then
      echo "❌ Handlebars helper not used: ${helper}"
      ((ERRORS = ERRORS + 1))
    fi
  elif [[ ! "${helper}" =~ ^cpr.* ]]; then
    echo "❌ Handbars helpers must start with 'cpr', ${helper} does not."
    ((ERRORS = ERRORS + 1))
  fi
done

# Fail if any issues were found
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ ${ERRORS} helpers have issues. Please correct them."
  exit 1
else
  echo "🎉 All good!"
fi
