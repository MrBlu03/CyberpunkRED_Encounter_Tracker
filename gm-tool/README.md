# Cyberpunk RED GM Tool

A RAW-compliant GM utility for Cyberpunk RED, built with React + Vite using the FVTT Cyberpunk RED core data.

## Features Implemented

### ✅ Encounters & Initiative
- Add participants with name, REF, Initiative skill, and HP
- Roll 1d10 + REF + Initiative for all participants
- Auto-sort by initiative total
- Start encounters with round/turn tracking
- Auto-skip Seriously Wounded/Dead participants
- Real-time wound state calculation based on HP/Max HP ratio
- Visual indicators for current turn and wound states

### ✅ RAW Damage System
- Complete damage pipeline: Cover SP → Armor SP → HP → Headshot x2 → Critical +5
- Support for all damage types: Normal, Armor-Piercing, Half Armor (Melee), Ignore Armor
- Armor ablation: -1 SP (normal), -2 SP (AP) when penetrated
- Headshot detection and x2 damage multiplier
- Critical hit detection (+5 damage)
- Interactive damage calculator with step-by-step breakdown

### 🚧 In Progress
- NPC/Goon Generator (using FVTT pack data)
- Shop Generator (weapons, armor, gear from packs)
- Cover system implementation
- Critical injury tables integration
- Death saves automation

## Data Sources

The app extracts and uses data from `fvtt-cyberpunk-red-core-master/src/packs/`:
- Core weapons, armor, cyberware, skills, roles
- Black Chrome, DLC items
- Critical injury tables, NET architecture data
- Language files for proper labels

## Development

```bash
# Install dependencies
npm install

# Generate JSON data from FVTT YAML packs
npm run generate-data

# Start development server
npm run dev

# Build for production
npm run build
```

Visit http://localhost:5173/ to use the tool.

## Architecture

- **React + TypeScript**: Modern, type-safe UI
- **Vite**: Fast development and builds
- **YAML → JSON converter**: Extracts FVTT pack data to `public/data/`
- **RAW-compliant logic**: Faithful implementation of core rule mechanics
- **Modular design**: Each feature (encounters, damage, NPCs) in separate modules

## Next Steps

1. **NPC Generator**: Stats, skills, gear dropdowns from packs
2. **Shop System**: Filter by category, legality, Night Market mode
3. **Time Tracker**: Recovery, events, day/night cycle
4. **Settings**: House rules, theme, import/export
