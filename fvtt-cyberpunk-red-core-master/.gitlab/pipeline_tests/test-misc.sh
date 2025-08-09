#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Check the modules directory exists
MODULES="src/modules"
ERRORS=0

if [[ ! -d "${MODULES}" ]]; then
  echo "❌ Unable to find ${MODULES} directory"
fi

# Count instances of "game.i18n" in modules
# Shortcut to true as we test this after so we can give an error message
COUNT=$(
  grep \
    --recursive \
    --line-number \
    --exclude=cpr-systemUtils.js \
    --exclude=migration.js \
    --exclude=pause-animation.js \
    --exclude=update-popup.js \
    "game.i18n" \
    "${MODULES}"/* |
    wc -l ||
    true
)

if [[ "${COUNT}" != 0 ]]; then
  echo "❌ There are ${COUNT} cases, where 'game.i18n' was used instead of our own localization."
  ((ERRORS = ERRORS + 1))
fi

# Count instances of "ui.notifications" in modules
# Shortcut to true as we test this after so we can give an error message
ERRORS=0
COUNT=$(
  grep \
    --recursive \
    --line-number \
    --exclude=cpr-systemUtils.js \
    --exclude=migration.js \
    "ui.notifications" \
    "${MODULES}"/* |
    wc -l ||
    true
)

if [[ "${COUNT}" != 0 ]]; then
  echo "❌ There are ${COUNT} cases, where ui.notifications was used instead of our own SystemUtils.DisplayMessage."
  ((ERRORS = ERRORS + 1))
fi

# Check if any test above failed and fail or succed the job accordingly.
if [[ "${ERRORS}" -gt 0 ]]; then
  exit 1
else
  echo "🎉 All good!"
fi
