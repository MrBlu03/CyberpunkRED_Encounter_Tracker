#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Tests the CHOOM_BOT_API envar is populated and the supplied key authenticates
# against the Gitlab API as expected.

echo "Testing CHOOM_BOT_API validity."

CI=${CI:-false}

# Only run if we're in GitLab CI
if [[ "${CI}" == "true" ]]; then
  # Check we have a value for CHOOM_BOT_API. If not exit with an error
  if [[ -z "${CHOOM_BOT_API}" ]]; then
    echo "❌ CHOOM_BOT_API is blank. See the wiki for more information."
    echo "https://gitlab.com/cyberpunk-red-team/fvtt-cyberpunk-red-core/-/wikis/ops/GitLab#bot-accounts--access-tokens"
    exit 1
  fi
  # Check if CHOOM_BOT_API can access the API as expected
  # Short circuit to true so we can parse the response
  CHOOM_TEST_RESPONSE=$(
    curl \
      --silent \
      --header "PRIVATE-TOKEN: ${CHOOM_BOT_API}" \
      "${CI_API_V4_URL}/user" || true
  )
else
  CHOOM_TEST_RESPONSE='{"state": "active"}'
fi

# Check if the user has "state": "active" in the response. Else error out
if [[ $(echo "${CHOOM_TEST_RESPONSE}" | jq -r '.state') == "active" ]]; then
  echo "🎉 All good."
  exit 0
else
  echo "❌ CHOOM_BOT_API cannot authenticate. See the wiki for more information."
  echo "https://gitlab.com/cyberpunk-red-team/fvtt-cyberpunk-red-core/-/wikis/ops/GitLab#bot-accounts--access-tokens"
  exit 1
fi
