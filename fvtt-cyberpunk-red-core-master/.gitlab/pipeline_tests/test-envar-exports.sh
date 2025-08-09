#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ENVAR_FILE=".gitlab/pipeline_utils/envars.sh"
ERRORS=0

# Find all the ENVARS in the ENVAR_FILE.
# Exclude IFS and CI_ prefixed vars
mapfile -t ENVARS < <(
  grep -Eo '^[A-Z].*=' "${ENVAR_FILE}" |
    grep -Ev '^IFS=' |
    grep -Ev '^CI_.*=' |
    tr -d '='
)

# Loop over the ENVARs and check they are exported to vars.env
for envar in "${ENVARS[@]}"; do
  if ! grep -q "  echo \"${envar}=\${${envar}}" "${ENVAR_FILE}"; then
    echo "❌ ${envar} is not exported in ${ENVAR_FILE##*/}"
    ((ERRORS = ERRORS + 1))
  fi
done

if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ ${ERRORS} envars not exported, please check the output above for more details."
  exit 1
else
  echo "🎉 All good!"
fi
