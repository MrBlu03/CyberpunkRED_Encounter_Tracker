#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Tests our use of Font Awesome icons
# Even though Font Awesome Pro is available via Foundry we cannot use
# pro icons as we as a project do not have a license.

ERRORS=0

# Get a list of all Font Awesome free fonts
FONT_AWESOME=$(
  curl -s \
    -H "Content-Type: application/json" \
    -d '{ "query": "query { release (version: \"6.x\") { icons { id, familyStylesByLicense { free { style } } } } }" }' \
    https://api.fontawesome.com |
    jq -r '.data.release.icons[] | select(.familyStylesByLicense.free != []) | { id: ("fa-" + .id), styles: [.familyStylesByLicense.free[].style | "fa-" + .]} | tostring' |
    jq -s '.'
)

# Get a list of all Font Awesome Icons in use within the system
#
mapfile ICONS -t < <(
  grep -rohE \
    '(fas|fa-solid|far|fa-regular|fab|fa-brands|fa-sharp|fal|fa-light) fa-[A-Za-z0-9-]*' \
    src/ |
    sed 's/fas/fa-solid/g' |
    sed 's/far/fa-regular/g' |
    sed 's/fab/fa-brands/g' |
    sed 's/fal/fa-light/g' |
    sort -u
)

# Process each icon and check if it exists in the free set
for icon in "${ICONS[@]}"; do
  style=$(echo "${icon}" | cut -d' ' -f1)
  name=$(echo "${icon}" | cut -d' ' -f2)

  ## Check if the icon exists for the icon
  name_exists=$(
    echo "${FONT_AWESOME}" |
      jq \
        --arg name "${name}" \
        '.[] | select(.id == $name)'
  )

  # If the name does not exist, raise an error
  # If the name exists, check that it's using a non-pro style
  if [[ -z "${name_exists}" ]]; then
    echo "❌ ICON: '${name}' is non-free."
    ((ERRORS = ERRORS + 1))
  else
    # Returns the index of the style if it exists in the style array,
    # else it's null
    style_exists=$(
      echo "${FONT_AWESOME}" |
        jq \
          --arg name "${name}" \
          --arg style "${style}" \
          '.[] | select(.id == $name) | .styles | index($style)'
    )
    if [[ ! "${style_exists}" =~ ^[0-9]+$ ]]; then
      echo "❌ STYLE/ICON: '${style}/${name}' is non-free."
      ((ERRORS = ERRORS + 1))
    fi
  fi
done

# Check if any test above failed and fail or succed the job accordingly.
if [[ "${ERRORS}" -gt 0 ]]; then
  exit 1
else
  echo "🎉 All good!"
fi
