# Cyberpunk RED GM Toolkit — Functional & Technical Specification

## Overview
A multi-platform GM utility (browser-based & Electron desktop) for Cyberpunk RED, fully RAW-compliant, enabling:
- Encounter & Initiative Tracking
- NPC/Goon Generation (RAW-compliant & Custom)
- Combat, Damage, Armor, Critical Injuries
- Netrunning Interface
- Time/Event Tracking
- Night City Tarot Integration (optional rule)
- Player Character Management
- Shop Generator (weapons, cyberware, gear)
- Data Persistence & Import/Export

---

## 1. Encounters & Initiative

### Initiative
- **RAW**: 1d10 + REF + Initiative skill (p. 168).
- Roll for each participant or all at once; manual override allowed.
- Auto-sort by total initiative.

### Encounter Management
- Create, start, end, and archive encounters.
- Tracks **Rounds** (10 seconds) and **Turns** in correct order.
- Skips **Seriously Wounded** or **Dead** participants automatically.

### Participants
- Add custom or catalog NPCs from archetypes.
- Fields: Name, Base Initiative, HP, SP (Head/Body), weapons, notes.
- Apply **Shield SP** only if granted by gear or cyberware (house rule toggle).
- Notes sync between PCs and encounter participants.

---

## 2. Combat, Damage & Armor

### Damage Resolution (RAW p. 181–182)
1. Apply **Cover SP** first (if any).
2. Apply **Armor SP** for hit location.
3. Remaining damage → HP.
4. **Armor Ablation**: -1 SP when penetrated; -2 if armor-piercing.
5. **Half Armor** for melee/martial arts.
6. **Ignore Armor** if permitted by rules.
7. **Headshots**: ×2 damage after SP.

### Critical Injuries (p. 187–189)
- Trigger: ≥2 sixes on damage dice (RAW).
- Roll on correct Head/Body table; +5 damage.
- No duplicate crits in same location unless replaced.

### Death Saves (p. 188)
- Roll d10 ≤ BODY; penalties applied as per rules.

---

## 3. Cover Rules (p. 192–193)
- Cover Types: Light/Medium/Heavy (correct HP & SP).
- Destroyed at 0 HP.
- **Human Shield**: body hits only; 50% miss redirection if miss ≤4.

---

## 4. NPC / Goon Generator

### NPC Types
- **Grunts/Mooks**: No Role, Role Ability, or LUCK (RAW).
- **Elites/Named NPCs**: Optional Roles/Abilities/LUCK toggle.

### Stats & Derived
- STATs: INT, REF, DEX, TECH, COOL, WILL, LUCK, MOVE, BODY, EMP.
- HP: BODY-based; wound states auto-tracked.
- Initiative: 1d10 + REF + Initiative.

### Skills
- **Grunt mode**: Direct Skill Base entry.
- **Named NPC mode**: STAT + Skill ranks; tool computes total.

### Armor & Damage
- Highest SP per location; ablate all armor in that location together.
- Headshots, AP, Half Armor, Ignore Armor handled per RAW.

### Weapons
- Dropdowns from packs: autofill stats, damage, ROF, ammo, conceal, cost.
- Ammo & quality adjustments (Poor/Standard/Excellent).

### Cyberware
- Enforce foundational requirements & slot limits.
- Categories: Neuralware, Fashionware, Cyberoptics, etc.
- HL tracked; install source (Mall/Clinic/Hospital) displayed.

### Gear & Armor Presets
- Dropdowns for official armor, gear, grenades, etc.
- Role starting kits for quick load.

### Builders & Randomizers
- **Quick Grunt**: Select archetype & threat tier → auto-fill stats, skills, gear.
- **Encounter-aware seeding**: Matching augmentations & weapon swaps.

### Custom NPC Editor
- Weapons, cyberware, armor, gear via dropdowns.
- Validations: SP stacking, slot limits, foundational rules.

---

## 5. Shop Generator

### Data Source
- Reads YAML/JSON packs of:
  - Weapons
  - Armor
  - Cyberware
  - Gear
  - Ammo & explosives

### Features
- Filter by category, legality, cost category, source book.
- Night Market mode: limit availability by price category & dice roll.
- Autofill install times & HL for cyberware.
- Bulk add to cart; export purchase list.

---

## 6. Dice Roller
- Supports d10 checks, damage rolls, and hit location.
- Crit detection per RAW and optional Tarot variant.

---

## 7. Player Character Manager
- Full PC sheets with stats, skills, weapons, armor, cyberware.
- Import/export as JSON or share codes.
- Sync notes with encounters.

---

## 8. Netrunning Interface
- Build Architectures (RAW p. 200–211).
- Node types with correct DVs & ICE stats.
- Net Actions = Interface.
- Black ICE auto-attacks & damage resolution.
- Random architecture generator.

---

## 9. Time Tracker
- Advance time in increments; day/night cycle.
- Create events (Jobs, Recovery, Lifestyle, etc.).
- Recovery: RAW healing rates (1 HP/day, 2 with Surgery).
- Optional weather generator.

---

## 10. Night City Tarot Deck (Optional Rule)
- One Tarot-triggered critical per session.
- RAW crit system remains default.

---

## 11. Settings & Data Management
- Themes, critical system toggle.
- Export/import all local data.
- Clear all data (preserves theme & crit setting).

---

## Guardrails
- NPCs adhere to RAW unless explicitly toggled to “House Rule” mode.
- Crits & damage follow official step order.
- Cyberware legality enforced at selection.
