#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# The following vars are set during the 'init' CI job.
# SYSTEM_FILE

ERRORS=0
SYSTEM_FILE="${SYSTEM_FILE:-src/system.json}"
TEMPLATE_FILE="${TEMPLATE_FILE:-src/template.json}"

if ! type jq >/dev/null; then
  echo "❌ 'jq' dependency not found. Please insall 'jq'."
  exit 1
fi

# Cleanup files used during testing
cleanup() {
  rm -rf results.json
  rm -rf errors.txt
}

# Trap any early exits for cleanup
trap cleanup EXIT

# Shortcut v84r as we're doing error handling based on the output
npx v8r src/packs/**/**/*.yaml \
  >results.json \
  2>errors.txt || true

# Validate we actually get JSON back
if ! jq empty results.json >/dev/null 2>&1; then
  echo "❌ v8r returned invalid JSON output:"
  cat errors.txt
  echo "---"
  cat results.json
  echo "Exiting"
  exit 1
fi

# If we do get JSON output, make sure that it contains the `results` key
if ! jq .results results.json >/dev/null 2>&1; then
  echo "❌ v8r output does not contain the 'results' key"
  cat errors.txt
  echo "---"
  cat results.json
  echo "Exiting"
  exit 1
fi

# Parse out errors from the results
all_errors=$(
  jq 'del(.results[]
      | select(.code == 0))
      | [.results[]
      | {file: .fileLocation, errors: .errors, code: .code}]' results.json
)

# Cleanup any files we've just used
cleanup

# Get a count of the errors
end=$(echo "${all_errors}" | jq length)

count=0
while [[ "${count}" -lt "${end}" ]]; do
  # Check the exit code of the test, and output the fielename, and error
  # https://github.com/chris48s/v8r#exit-codes
  code=$(echo "${all_errors}" | jq -r .["${count}"].code)
  echo "❌ Errors detected in $(echo "${all_errors}" | jq -r .["${count}"].file)"
  if [[ "${code}" -eq 99 ]]; then
    echo "${all_errors}" | jq -r '.['"${count}"'].errors | .[]'
  else
    echo "Could not find schema for this file."
  fi
  ((ERRORS = ERRORS + 1))
  ((count = count + 1))
done

if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ ${ERRORS} files have errors please check the output above for more details"
  exit 1
else
  echo "🎉 All good!"
fi
