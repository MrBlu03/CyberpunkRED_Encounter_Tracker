#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'

# Need a list of translated names from Babele files?
#
# Prints the results one per line with surrounding double quotes followed
# by a comma (JS Array style).
#
# EG: "Foo Bar",
#     "BazQux",
#
# ITEMS: An array of the names you're looking up
#   EG: {"entries": {"Agent": {"name": "Агент"}}}
#       {"entries": {"$ITEM": {"name": "ITEM"}}}
# ITEM_FILE: The name of the translated json file
#   EG: "cyberpunk-red-core.gear-items.json"
# LANGS: The langages you want to extract
#  EG: ("de" "es")

ITEM_FILE="cyberpunk-red-core.ammo.json"

ITEMS=(
  #"Arrow (Biotoxin)"
  #"Arrow (Poison)"
  #"Arrow (Sleep)"
  #"Grenade (Biotoxin)"
  #"Grenade (Flashbang)"
  #"Grenade (Sleep)"
  #"Grenade (Teargas)"
  #"Shotgun Shell (Basic)"
  #"Poison Arrow"
  #"Paintball (Biotoxin)"
  #"Paintball (Posion)"
  "Paintball (Basic)"
  "Paintball (Acid)"
)

mapfile -t LANGS < <(
  find src/babele -mindepth 1 -maxdepth 1 -print -type d |
    sed 's~src/babele/~~g'
)

all_items=()
for lang in "${LANGS[@]}"; do
  for item in "${ITEMS[@]}"; do
    all_items+=("${item}")
    translated_item=$(
      jq -r \
        ".entries.\"${item}\".name" \
        "src/babele/${lang}/${ITEM_FILE}"
    )
    if [[ "${translated_item}" != 'null' ]]; then
      all_items+=("${translated_item}")
    fi
  done
done

printf '"%s",\n' "${all_items[@]}" | sort | uniq
