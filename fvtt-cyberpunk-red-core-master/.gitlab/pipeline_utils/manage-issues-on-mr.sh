#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Variables that are set by GitLab CI environment
# CHOOM_BOT_API
# CI_API_V4_URL
# CI_MERGE_REQUEST_ASSIGNEES
# CI_MERGE_REQUEST_IID
# CI_PROJECT_ID

# URL to use as the base for out API calls
PROJECT_URL="${CI_API_V4_URL}/projects/${CI_PROJECT_ID}"

# Get the MR_IID from the environment
MR_IID="${CI_MERGE_REQUEST_IID:-''}"

# If we have a MR_IID get a list of issues mentioned in the MR
if [[ -n ${MR_IID} ]]; then
  mapfile -t ISSUES < <(
    curl \
      --silent \
      --header "PRIVATE-TOKEN: ${CHOOM_BOT_API}" \
      "${PROJECT_URL}/merge_requests/${MR_IID}" |
      jq '.description' |
      grep -oE '#[0-9]{1,10}' |
      tr -d '#' |
      sort -u
  )
  echo "Issues linked from MR: ${ISSUES[*]}"
else
  echo "Unable to find Merge Request IID"
  echo "No issue management will be done in this pipeline"
  exit 0
fi

# Labels to add to the Issues in ISSUES
# Case sensitive
LABELS_TO_ADD=(
  "Workflow::Dev Merge"
)

# If we havent changed the Bug scoped variable change it to 'Bug::Confirmed'
BUG_LABELS_TO_CHANGE=(
  "Bug::Unconfirmed"
  "Bug::New"
)

# Run checks on an issue
# $1 == issue_id
function check_issue() {
  local response
  local errors
  local state

  response=$(
    curl \
      --silent \
      --header "PRIVATE-TOKEN: ${CHOOM_BOT_API}" \
      "${PROJECT_URL}/issues/$1"
  )

  errors=$(echo "${response}" | jq --raw-output '.message')
  state=$(echo "${response}" | jq --raw-output '.state')

  # Let's check if we want to process the linked issue
  if [[ "${errors}" == "404 Not found" ]]; then
    # If we can't find the issue we don't want to process
    echo "Issue $1 not found"
    return 1
  elif [[ "${state}" == "closed" ]]; then
    # If the state is closed we don't want to process
    echo "Issue $1 already closed, ignoring"
    return 1
  else
    # Otherwise continue
    echo "Processing issue $1"
    return 0
  fi
}

# Update the Labels using LABELS_TO_ADD defined above
# $1 == issue_id
function add_labels() {
  echo "Adding labels to issue $1"
  curl \
    --data-urlencode "add_labels=$(
      IFS=,
      echo "${LABELS_TO_ADD[*]}"
    )" \
    --request PUT \
    --silent \
    --header "PRIVATE-TOKEN: ${CHOOM_BOT_API}" \
    "${PROJECT_URL}/issues/$1" >/dev/null
}
# Update labels on an Issue
# $1 == issue_id
function change_labels() {
  echo "Updating labels on issue $1"
  curl \
    --data-urlencode "add_labels=Bug::Confirmed" \
    --request PUT \
    --silent \
    --header "PRIVATE-TOKEN: ${CHOOM_BOT_API}" \
    "${PROJECT_URL}/issues/$1" >/dev/null
}

# Update asignees on an Issue
# $1 == issue_id
function set_issue_assignees() {
  local issue_assignees
  local mr_author

  # get the assignees for the issue
  mapfile -t issue_assignees < <(
    curl \
      --silent \
      --header "PRIVATE-TOKEN: ${CHOOM_BOT_API}" \
      "${PROJECT_URL}/issues/$1" |
      jq --raw-output '.assignees[].id'
  )

  # Get the id of the MR author
  mr_author=$(
    curl \
      --silent \
      --header "PRIVATE-TOKEN: ${CHOOM_BOT_API}" \
      "${PROJECT_URL}/merge_requests/${MR_IID}" |
      jq --raw-output '.author.id'
  )

  # Check if the mr_author is in issue_assignees
  # if not add them to issue_assignees
  if ! echo "${issue_assignees[*]}" | grep -q "${mr_author}"; then
    issue_assignees+=("${mr_author}")
  fi

  echo "Setting issue assignee to ${mr_author}"

  # Update the issue assignees
  curl \
    --data-urlencode "assignee_ids=$(
      IFS=,
      echo "${issue_assignees[*]}"
    )" \
    --request PUT \
    --silent \
    --header "PRIVATE-TOKEN: ${CHOOM_BOT_API}" \
    "${PROJECT_URL}/issues/$1" >/dev/null
}

function main() {
  # Loop over each issue
  for issue in "${ISSUES[@]}"; do
    # Only process the issue if 'check_issue' passes
    # shellcheck disable=SC2310
    if check_issue "${issue}"; then
      # Get a list of labels for the issue
      mapfile -t labels < <(
        curl \
          --silent \
          --header "PRIVATE-TOKEN: ${CHOOM_BOT_API}" \
          "${PROJECT_URL}/issues/${issue}" |
          jq --raw-output '.labels[]'
      )

      # Check if the issue's labels are in our BUG_LABELS_TO_CHANGE array
      change=0
      for label in "${labels[@]}"; do
        for ltc in "${BUG_LABELS_TO_CHANGE[@]}"; do
          if [[ "${ltc}" == "${label}" ]]; then
            # If there is a match mark the issue to be changed
            ((change = change + 1))
          fi
        done
      done
      # Close if in BUG_LABELS_TO_CHANGE
      if [[ ${change} -gt 0 ]]; then
        change_labels "${issue}"
      fi
      add_labels "${issue}"
      set_issue_assignees "${issue}"
    fi
  done
}

main
