#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

ERRORS=0
# Check hbs_location exits
HBS_LOCATION="src/templates"

# HTML Tags to check
TAG_LIST=("div" "li" "ul" "ol")

# Check the HBS_LOCATION exists
if [[ ! -d "${HBS_LOCATION}" ]]; then
  echo "❌ Unable to find ${HBS_LOCATION}"
  exit 1
fi

ALL_FILES=$(find "${HBS_LOCATION}" -type f -print)

if [[ -z "${ALL_FILES}" ]]; then
  echo "❌ Unable to find any template files in ${HBS_LOCATION}"
  exit 1
fi

for FILE in ${ALL_FILES}; do
  for TAG in "${TAG_LIST[@]}"; do
    # Sort circuit here as grep will error if we don't find any results in a file
    OPEN_TAG=$(grep -Eo "<${TAG}" "${FILE}" | wc -l || true)
    CLOSE_TAG=$(grep -Eo "</${TAG}" "${FILE}" | wc -l || true)
    if [[ ${OPEN_TAG} -ne ${CLOSE_TAG} ]]; then
      echo "❌ Mismatch of '<${TAG}' (${OPEN_TAG}) and '</${TAG}' (${CLOSE_TAG}) in ${FILE}"
      ((ERRORS += 1))
    fi
  done
done

# If some trace messages are missing or incorrect fail this job
if [[ "${ERRORS}" -gt 0 ]]; then
  echo "❌ There are ${ERRORS} hbs files with unbalanced open/close tags."
  echo "Each HBS file should have a matching closing tag to every open tag."
  echo "Tags tested: " + "${TAG_LIST[@]}"
  echo "Please correct these issues."
  exit 1
else
  echo "🎉 All good!"
fi
