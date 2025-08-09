#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ERRORS=0

mapfile -t SCRIPTS < <(
  find . \
    -not \( -path "./dist" -prune \) \
    -not \( -path "./node_modules" -prune \) \
    -iname "*.sh"
)

if [[ -z "${SCRIPTS[*]}" ]]; then
  echo "❌ Unable to find any scripts in the repo"
  exit 1
fi

for script in "${SCRIPTS[@]}"; do
  # Test we have a portable shebang and are strictmode compliant
  # http://redsymbol.net/articles/unofficial-bash-strict-mode/
  #
  # This could possibly be done better with grep or awk,
  # this way ensures we always have this at the top of the file for consistency

  first=$(sed -n '1p' "${script}")
  second=$(sed -n '2p' "${script}")
  third=$(sed -n '3p' "${script}")

  strictmode_errors=0
  # Check we have a prtable shebang
  if [[ "${first}" != '#!/usr/bin/env bash' ]]; then
    echo "❌ ${script##*/} does not use '#!/usr/bin/env bash'"
    ((strictmode_errors += 1))
  fi

  # Check we are setting '-euo pipefail'
  if [[ "${second}" != 'set -euo pipefail' ]]; then
    echo "❌ ${script##*/} does not set '-euo pipefail'"
    ((strictmode_errors += 1))
  fi

  # Check we are setting 'IFS' corectly
  if [[ "${third}" != 'IFS=$'\''\n\t'\''' ]]; then
    # shellcheck disable=SC2028
    echo "❌ ${script##*/} does not set 'IFS=\$'\n\t'"
    ((strictmode_errors += 1))
  fi

  # If any of the above fail add to the error count
  if [[ "${strictmode_errors}" -gt 0 ]]; then
    ((ERRORS = ERRORS + 1))
    echo "❌ ${script##*/} is not strictmode compliant."
  fi

  # Check we pass shellcheck
  if ! shellcheck "${script}"; then
    echo "❌ ${script##*/} does not validate with shellcheck"
    ((ERRORS = ERRORS + 1))
  fi

  if ! shfmt -d "${script}"; then
    echo "❌ ${script##*/} does not validate with shfmt"
    ((ERRORS = ERRORS + 1))
  fi
done

if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ ${ERRORS} files have errors please check the output above for more details"
  exit 1
else
  echo "🎉 All good!"
fi
