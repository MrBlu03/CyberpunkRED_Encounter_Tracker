#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Variables that are set by GitLab CI environment
# CI_API_V4_URL, CI_COMMIT_SHA, CI_PROJECT_ID, CHOOM_BOT_API

# URL to use as the base for out API calls
PROJECT_URL="${CI_API_V4_URL}/projects/${CI_PROJECT_ID}"

# Labels used to filter issues
# Case sensitive
LABELS_TO_REMOVE=(
  "Workflow::In Dev"
  "Workflow::Dev Merge"
  "Workflow::Hotfix Merge"
  "Test Me!"
)

# Find all issues labelled with LABELS_TO_REMOVE
# We have to loop over each label and add it to an array here as you can't
# just query multiple lables at once
declare -a TEMP_ISSUES

for label in "${LABELS_TO_REMOVE[@]}"; do
  mapfile -t label_issues < <(
    curl \
      --request GET \
      --data-urlencode "scope=all" \
      --data-urlencode "state=closed" \
      --data-urlencode "per_page=100" \
      --data-urlencode "labels=${label}" \
      --silent \
      --header "PRIVATE-TOKEN: ${CHOOM_BOT_API}" \
      "${PROJECT_URL}/issues" |
      jq '.[].iid'
  )
  TEMP_ISSUES+=("${label_issues[@]}")
done

# Dedupe the list of issues
declare -a ISSUES
IFS=" " read -r -a ISSUES <<<"$(echo "${TEMP_ISSUES[@]}" | tr ' ' '\n' | sort -u | tr '\n' ' ')"

# Update the Labels using LABELS_TO_REMOVE defined above
# $1 = issue_id
function remove_labels() {
  echo "Removing labels from issue $1"
  curl \
    --request PUT \
    --silent \
    --header "PRIVATE-TOKEN: ${CHOOM_BOT_API}" \
    --data-urlencode "remove_labels=$(
      IFS=,
      printf '%s' "${LABELS_TO_REMOVE[*]}"
    )" \
    "${PROJECT_URL}/issues/$1" >/dev/null

  # Add a sleep so we don't spam the api, we don't care if this takes a while
  sleep 1
}

function main() {
  for issue in "${ISSUES[@]}"; do
    remove_labels "${issue}"
  done
}

main
