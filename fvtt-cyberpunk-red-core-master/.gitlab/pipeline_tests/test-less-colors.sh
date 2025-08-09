#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ERRORS=0
# Check hbs_location exits
LESS_LOCATION="src/less"

# Check the LESS_LOCATION exists
if [[ ! -d "${LESS_LOCATION}" ]]; then
  echo "❌ Unable to find ${LESS_LOCATION}"
  exit 1
fi

ALL_FILES=$(
  find "${LESS_LOCATION}" -type f -print -iname "*.less" | grep -v variables.less
)

if [[ -z "${ALL_FILES}" ]]; then
  echo "❌ Unable to find any less files in ${LESS_LOCATION}"
  exit 1
fi

for FILE in ${ALL_FILES}; do
  mapfile -t errors < <(grep \
    -Pn '((.*:\ )(#[a-fA-F0-9]{3,6}|rgba.*|.*#[a-fA-Z0-9]{3,6}|.*rgba.*);)' \
    "${FILE}" ||
    true)

  if [[ "${#errors[@]}" -ne 0 ]]; then
    echo ""
    echo "${FILE}:"
  fi

  for e in "${errors[@]}"; do
    ((ERRORS += 1))
    line="$(echo "${e}" | cut -d ":" -f 1)"
    problem="$(echo "${e}" | cut -d ":" -f 2)"
    echo "❌ Line ${line} does not use a variable for: ${problem}"
  done
done

# If some trace messages are missing or incorrect fail this job
if [[ "${ERRORS}" -gt 0 ]]; then
  echo ""
  echo "❌ There are ${ERRORS} instances of colors not set using a variable."
  echo "We use variables to set colors in our CSS to allow user theming."
  echo "Please use a relevant variable from less/variables.less or create a new one."
  exit 1
else
  echo "🎉 All good!"
fi
