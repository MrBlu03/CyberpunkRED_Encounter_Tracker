# Foundry VTT Data Folder

This folder is for importing your Foundry VTT Cyberpunk RED Core compendium data.

## How to Add Your FVTT Data

1. **Locate your Foundry VTT data folder:**
   - Windows: `%localappdata%/FoundryVTT/Data/modules/cyberpunk-red-core/`
   - Mac: `~/Library/Application Support/FoundryVTT/Data/modules/cyberpunk-red-core/`
   - Linux: `~/.local/share/FoundryVTT/Data/modules/cyberpunk-red-core/`

2. **Copy the packs folder:**
   Copy the entire `packs` folder from the cyberpunk-red-core module into this directory.

3. **Or copy individual files:**
   You can also copy individual `.yaml` or `.json` files from the packs folder into the `items` subfolder.

## Folder Structure

```
fvtt/
├── README.md          # This file
├── packs/             # Copy your FVTT packs folder here
│   ├── core/
│   │   ├── weapons/
│   │   ├── armor/
│   │   ├── cyberware/
│   │   └── gear/
│   └── black-chrome/  # DLC content (optional)
└── items/             # Individual item files can go here
```

## Supported File Formats

- `.yaml` - YAML format (Foundry VTT default)
- `.json` - JSON format

## Data Format

Items should follow the Foundry VTT Cyberpunk RED Core format:

```yaml
_id: unique-id-here
name: Item Name
type: weapon|armor|cyberware|gear|drug|ammo|clothing
system:
  price:
    market: 100
  damage: "2d6"
  rof: 2
  weaponSkill: "Handgun"
  description:
    value: "<p>Item description</p>"
```

## Notes

- The shop generator will automatically load all items from this folder
- Items without a price will be hidden by default (can be shown with filter)
- The data is loaded client-side only - no data is sent to any server
