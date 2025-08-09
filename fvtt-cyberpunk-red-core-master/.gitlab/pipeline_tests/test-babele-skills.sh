#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# If you're reading this in the future wondering why this job has failed you
# have probably renamed the `internal_skills` pack/compendium which unless there
# has also been a major re-write to allow skills to be translated by Babele
# without breaking you will need to update "PACK_NAME" below to whatever the
# new pack name is.
#
# If we translate the `internal_skills` pack it breaks many internal system that
# rely on the english names for these skills behind the scenes, as such we never
# want Crowdin/Babele translation files generated for these and handle it via
# `game.i8n` translations within Foundry.
#
# As such this test does 2 things:
#   1. Check if `internal_skills` exists in system.json as a pack
#      If it does not exist it means we have renamed the pack so we should fail
#      this job and make sure it is updated with the new pack name so we can
#      reliably check for gulp generating Balel files for the skill pack
#   2. Check for `internal_skills` translation files in `src/babele`

# The following vars are set during the 'init' CI job.
# SYSTEM_NAME

SYSTEM_NAME="${SYSTEM_NAME:-cyberpunk-red-core}"
SYSTEM_FILE="${SYSTEM_FILE:-system.json}"
PACK_NAME="internal_skills"
ERRORS=0

pack_exists=$(jq \
  --arg pack "${PACK_NAME}" \
  '[.packs[] | select(.name == $pack)] | length > 0' \
  <"src/${SYSTEM_FILE}")

if [[ "${pack_exists}" != "true" ]]; then
  echo "❌ '${PACK_NAME}' not found in system.json. If you have renamed this"
  echo "   compendium/pack please update this test with the new packname."
  ((ERRORS = ERRORS + 1))
fi

if find "src/babele" -type f -iname "*${PACK_NAME}*" | read -r; then
  echo "❌ '${SYSTEM_NAME}.${PACK_NAME}.json' translation file found in"
  echo "   'src/babele' this will break the system. Do not generate these files."
  ((ERRORS = ERRORS + 1))
fi

# Check if any test above failed and fail or succed the job accordingly.
if [[ "${ERRORS}" -gt 0 ]]; then
  exit 1
else
  echo "🎉 All good!"
fi
