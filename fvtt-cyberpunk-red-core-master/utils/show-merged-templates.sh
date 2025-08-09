#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Utility script to create full json definitions of all objects in template.json
# Not designed to be used in CI, just in pipeline_utils as I don't have a better
# place for it right now

TEMPLATE_FILE="src/template.json"

mapfile -t ITEM_TYPES < <(
  jq -r \
    '.Item.types[]' \
    "${TEMPLATE_FILE}"
)

# Check we get item_types returned
if [[ -z "${ITEM_TYPES[*]}" ]]; then
  echo "❌ Unable to find any Item Types in ${TEMPLATE_FILE}"
  exit 1
fi

# Loop over the files and run through json lint
for type in "${ITEM_TYPES[@]}"; do
  # Create get the item without templates
  mapfile -t item < <(jq -c '.Item.'"${type}"' | del(.templates)' "${TEMPLATE_FILE}")
  # Get the item templates
  mapfile -t templates < <(jq -r '.Item.'"${type}"'.templates[]' "${TEMPLATE_FILE}")

  # Loop over each template for each item and append the JSON to the item array
  for template in "${templates[@]}"; do
    mapfile -t -O "${#item[@]}" item < <(
      jq -c '.Item.templates.'"${template}"'' "${TEMPLATE_FILE}"
    )
  done

  # Merge the item array into a single json blob
  merged_item=$(echo "${item[@]}" | jq -s add | jq --sort-keys)

  echo "${type}"
  echo "${merged_item}"
  echo ""
done
