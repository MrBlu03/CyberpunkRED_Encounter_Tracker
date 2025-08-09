#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Variables that are set by GitLab CI environment
# DISCORD_ANNOUNCE_TOKEN

DISCORD_BASE_URL="https://discord.com/api/webhooks"
DISCORD_CHANNEL="1109188755526520852"
DISCORD_MESSAGE="dist/lang/release-notes/discord.json"

# URL to use as the base for out API calls
ANNOUNCE_URL="${DISCORD_BASE_URL}/${DISCORD_CHANNEL}/${DISCORD_ANNOUNCE_TOKEN}"

# Send message using discord webhook
function send_message() {
  response=$(
    curl \
      --silent \
      --request POST \
      --header "Content-Type: application/json" \
      --data "$(cat "${DISCORD_MESSAGE}")" \
      "${ANNOUNCE_URL}"
  )

  echo "${response}"

}

function main() {
  send_message
}

main
