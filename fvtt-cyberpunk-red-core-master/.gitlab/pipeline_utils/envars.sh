#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# This script sets ENVARS we'll use throughout the GitLab CI pipeline.
# We set them during the 'init' job via this script rather than in
# .gitlab-ci.yml so we can conditionally set them as needed and all the
# logic is in one place.

# NOTE: All exported ENVARs MUST be uppercase!
#       Do NOT start ENVARs with 'CI_' as they are skipped in testing.

##################
# GitLab Variables
##################
# Variables that are set by GitLab CI environment
# CI_API_V4_URL, CI_PROJECT_ID, CI_COMMIT_TAG

# Set CI_COMMIT_TAG to "" if it does not exist as we use this to
# determine if we're tagging a release.
CI_COMMIT_TAG="${CI_COMMIT_TAG:-}"

##################
# System Variables
##################
# Variables directly related to the system and using by Gulp
# When adding/removing/changing these you MUST also update
# the 'gulp/conststants.mjs' file.

# SYSTEM_NAME is the Foundry system ID, used for paths etc.
SYSTEM_NAME="cyberpunk-red-core"

# SYSTEM_TITLE (display name for system in Foundry)
SYSTEM_TITLE="Cyberpunk RED - CORE"

# System manifest
SYSTEM_FILE="system.json"

# Changelog file
CHANGELOG_FILE="CHANGELOG.md"

########################
# Build System Variables
########################
# Variables that rarely change, can be overwritten later.

# Set the version number to the CI_COMMIT_TAG
SYSTEM_VERSION="${CI_COMMIT_TAG}"

# Base URL for the project
PROJECT_URL="${CI_API_V4_URL}/projects/${CI_PROJECT_ID}"

# Define the url we upload the packages to
REPO_URL="${PROJECT_URL}/packages/generic/fvtt-${SYSTEM_NAME}"

###################
# Dynamic Variables
###################
# Variables that need to be overwritten depending on the job needs.

# If the CI_COMMIT_TAG is empty we're probably merging to master so
# overwite the defaults. Used in the build stages.
if [[ -z "${CI_COMMIT_TAG}" ]]; then
  # Use the date/time as a version number
  SYSTEM_VERSION="v$(date +%Y%m%d.%H%M)"
  # Set the system title to inclue DEV to make identifying it easier in Foundry
  SYSTEM_TITLE="Cyberpunk RED - CORE - DEV"
  # Append "-dev" to the package repo name
  REPO_URL="${PROJECT_URL}/packages/generic/fvtt-${SYSTEM_NAME}-dev"
fi

###################
# Derived Variables
###################
# Mostly static variables that rely on Dynamic Variables before being set.

# Full name of the release including version
RELEASE_NAME="fvtt-${SYSTEM_NAME}-${SYSTEM_VERSION}"

# Set the ZIP name we'll publigh later
ZIP_FILE="${RELEASE_NAME}.zip"

##################
# Export Variables
##################
# Export the variables so we can use them later in the CI pipeline.

{
  echo "CHANGELOG_FILE=${CHANGELOG_FILE}"
  echo "PROJECT_URL=${PROJECT_URL}"
  echo "RELEASE_NAME=${RELEASE_NAME}"
  echo "REPO_URL=${REPO_URL}"
  echo "SYSTEM_FILE=${SYSTEM_FILE}"
  echo "SYSTEM_NAME=${SYSTEM_NAME}"
  echo "SYSTEM_TITLE=${SYSTEM_TITLE}"
  echo "SYSTEM_VERSION=${SYSTEM_VERSION}"
  echo "ZIP_FILE=${ZIP_FILE}"
} >vars.env
