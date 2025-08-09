#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

REQUIREMENTS="false"

# Work out if we have the right node modules
if npm list 2>/dev/null | grep -q gitlab-ci-local; then
  REQUIREMENTS="true"
fi

if [[ "${REQUIREMENTS}" == "true" ]]; then
  JOBS=$(
    npx gitlab-ci-local --list-json |
      jq --raw-output \
        '[.[] | select(.stage=="test") | .name] |
        select(length > 0) |
        join(" ")'
  )
else
  JOBS="none"
fi

echo "${JOBS}"
