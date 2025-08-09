#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# The following vars are set during the 'init' CI job.
# REPO_URL SYSTEM_FILE SYSTEM_NAME SYSTEM_VERSION ZIP_FILE

# Create a Release in GitLab
# NOTE: This references the files created by the `build-artifacts` job.
if ! release-cli create \
  --name "${SYSTEM_VERSION}" \
  --description "Automated release of ${SYSTEM_VERSION}" \
  --tag-name "${SYSTEM_VERSION}" \
  --assets-link "{\"name\":\"${SYSTEM_FILE}\",\"url\":\"${REPO_URL}/${SYSTEM_VERSION}/${SYSTEM_FILE}\"}" \
  --assets-link "{\"name\":\"${ZIP_FILE}\",\"url\":\"${REPO_URL}/${SYSTEM_VERSION}/${ZIP_FILE}\"}"; then
  # TODO: We can probably parse CHANGELOG.md and publish the changelog
  # as part of the release as a file and as the description.

  echo "❌ Unable to create release for ${SYSTEM_NAME} ${SYSTEM_VERSION}"
else
  echo "🎉 Created ${SYSTEM_NAME} ${SYSTEM_VERSION} release successfully!"
fi
