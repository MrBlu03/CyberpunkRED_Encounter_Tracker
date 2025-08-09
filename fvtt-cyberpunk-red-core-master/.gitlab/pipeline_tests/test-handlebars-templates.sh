#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# The following vars are set during the 'init' CI job.
# SYSTEM_FILE

ERRORS=0
PRELOAD="src/modules/system/preload-templates.js"
CODE_DIR="src/modules"

# Extract paths from the PRELOAD file.
# SC2016 enforces double quotes, but we have an edge case here were we
# do NOT want to expand {game.system.id} in shell.
#shellcheck disable=SC2016
HBS_FILES=$(grep 'systems/${game.system.id}/templates' "${PRELOAD}" | sed -e 's/\s*`systems\/\${game.system.id}\///g' -e 's/`,//g')

# Loop over each template file
for hbs_file in ${HBS_FILES}; do
  if ! grep -rq "${hbs_file}" "${CODE_DIR}"; then
    echo "❌ ${hbs_file} is not used in the code base! Please remove it."
    ((ERRORS += 1))
  fi
done

# Check if we got any errors
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ ${ERRORS} templates that are not used anywhere in the code base."
  exit 1
else
  echo "🎉 All good!"
fi
