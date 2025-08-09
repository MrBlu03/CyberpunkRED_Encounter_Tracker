#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# The following vars are set during the 'init' CI job.
# RELEASE_NAME REPO_URL SYSTEM_FILE SYSTEM_VERSION ZIP_FILE

# Then stick them in an array so we can loop over them later
declare -a UPLOAD_FILES
UPLOAD_FILES=(
  "${SYSTEM_FILE}"
  "${ZIP_FILE}"
)

# Build the system
if ! npm run build; then
  echo "❌ Failed to build system using npm build"
  exit 1
else
  echo "✅ Project successfully built!"
fi

# Copy the system.json so we can export it as an artifact
if ! cp "dist/${SYSTEM_FILE}" "${SYSTEM_FILE}"; then
  echo "❌ Unable to copy 'dist/${SYSTEM_FILE}'"
  exit 1
else
  echo "✅ Copied dist/${SYSTEM_FILE}!"
fi

# Rename the dist dir so it's the correct name in the zip
if ! mv dist "${RELEASE_NAME}"; then
  echo "❌ Unable to rename 'dist/' to '${RELEASE_NAME}'"
  exit 1
else
  echo "✅ Moved 'dist/' '${RELEASE_NAME}'!"
fi

# Zip up the system directory to create the system artifact
if ! zip --quiet "${ZIP_FILE}" --recurse-paths "${RELEASE_NAME}"; then
  echo "❌ Unable to zip ${SYSTEM_NAME}"
  exit 1
else
  echo "✅ Successfully zipped ${SYSTEM_NAME}!"
fi

# Upload UPLOAD_FILES to generic repo
# Available at: https://gitlab.com/api/v4/projects/39692371/packages/generic/fvtt-cyberpunk-red-core/${version}/${file}.json

for file in "${UPLOAD_FILES[@]}"; do
  # Upload the file and grab the response from the api
  response=$(
    curl \
      --silent \
      --header "JOB-TOKEN: ${CI_JOB_TOKEN}" \
      --upload-file "${file}" "${REPO_URL}/${SYSTEM_VERSION}/${file}"
  )

  # Check the response
  if [[ "$(echo "${response}" | jq -r .message)" != "201 Created" ]]; then
    echo "❌ Uploading ${file} failed, please see the message below"
    echo "❌ ${response}"
    exit 1
  else
    echo "🎉 Uploaded ${file} successfully"
  fi
done
