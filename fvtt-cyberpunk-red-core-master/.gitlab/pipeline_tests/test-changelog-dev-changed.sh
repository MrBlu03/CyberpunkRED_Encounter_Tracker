#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# The following vars are set during the 'init' CI job.
# CHANGELOG_FILE

# The following vare are set by GitLab CI
# CI_MERGE_REQUEST_TARGET_BRANCH_NAME, CI_MERGE_REQUEST_IID

# Get the MR_IID from the environment
MR_IID="${CI_MERGE_REQUEST_IID:-''}"

# As we can't filter this job in the GitLab CI triggering we will get a
# list of issues releated to the MR from the MR's description and only run
# if it's not in the LABELS_TO_SKIP array

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
else
  ISSUES=()
fi

# Issue lables to not run the test on
# We don't need to run on all Issues
# We ignore `Bug::Dev` as this is used for bugs in development which don't usually
# need changelog changes as these are following a Feature merge.
LABELS_TO_TEST=(
  "Bug::Confirmed"
  "Bug::New"
  "Bug::Regression"
  "Bug::Unconfirmed"
  "Compendium"
  "Feature"
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
    return 1
  elif [[ "${state}" == "closed" ]]; then
    # If the state is closed we don't want to process
    return 1
  else
    # Otherwise continue
    return 0
  fi
}

function check_changelog() {
  # Check that Gitlab has the target branch fetched and if not fetch it
  if ! git branch -a | grep -q "remotes/origin/${BRANCH}"; then
    if ! git fetch --quiet origin "${BRANCH}"; then
      echo "❌ Unable to fetch ${BRANCH}"
      echo "Check the target branch exists and re-run the job"
      exit 1
    fi
  fi

  # Test if the CHANGELOG has been updated
  if git diff --quiet HEAD "remotes/origin/${BRANCH}" -- "${CHANGELOG_FILE}"; then
    echo "❌ Changelog not changed"
    exit 1
  else
    echo "✅ Changelog changed"
  fi
}

# If not during a MR related job this will not be set, so default to master
BRANCH="${CI_MERGE_REQUEST_TARGET_BRANCH_NAME:-master}"

function main() {
  check=0
  for issue in "${ISSUES[@]}"; do
    # Only process the issue if 'check_issue' passes
    # shellcheck disable=SC2310
    if check_issue "${issue}"; then
      # Get a list of issue from the issue, ignore 'Workflow'/'Size' scoped labels
      mapfile -t issue_labels < <(
        curl \
          --silent \
          --header "PRIVATE-TOKEN: ${CHOOM_BOT_API}" \
          "${PROJECT_URL}/issues/${issue}" |
          jq --raw-output '.labels[]'
      )

      # Check if any of the lables in LABELS_TO_SKIP are in the Issues labels
      for label in "${LABELS_TO_TEST[@]}"; do
        if echo "${issue_labels[@]}" | grep -q "${label}"; then
          ((check = check + 1))
        fi
      done
    fi
  done

  # if any of the issue say we need to check the changelog, check it
  if [[ "${check}" -gt 0 ]]; then
    check_changelog
  else
    echo "✅ No Changelog changes needed."
  fi
}

main
