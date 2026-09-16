# Cyberpunk RED Encounter Tracker & GM Combat Command Center

A high-performance, polished web application for Game Masters running **Cyberpunk RED** tabletop RPG sessions. Designed from the ground up for speed, automation, and narrative immersion, this tool dramatically cuts down combat friction during complex shootouts and street gang wars.

---

## 🚀 Key Features

### ⚡ 1-Click Initiative & Turn Order
- **Instant NPC Roll**: Roll initiatives for all hostile and friendly NPCs with a single button (`1d10 + REF + Init Skill`, accounting for Kerenzikov and Sandevistan cyberware).
- **Inline PC Entry**: Direct number inputs on Player Character cards allow seamless manual initiative entry without cumbersome modals.
- **Automatic Initiative Sorting**: Dynamic round and turn progression with active combatant indicators.

### ⚔️ Auto-Resolved NPC vs NPC Combat
- **Lightning-Fast Mass Combat**: Auto-resolves all NPC vs NPC attacks in one batch with complete Cyberpunk RED RAW rule fidelity.
- **Bullet Dodging Mechanic**: Only combatants with REF 8+ or cybernetic reflexes (Kerenzikov/Sandevistan) attempt to evade ranged fire (DEX + Evasion DV check); others rely on static Range DVs.
- **Armor Halving for Melee**: Attacks with blades, brawling, and melee weapons automatically halve effective armor SP.
- **Damage & SP Ablation**: Penetrating damage reduces HP and ablates armor SP automatically. Armor-Piercing (AP) ammo ablates 2 SP.
- **GM Review Intercept for PCs**: When an attack targets a Player Character, execution halts and opens the **GM Combat Review Dialog** to let the GM inspect rolls, toggle hit/evasion, override damage, and select hit locations before applying consequences.

### 🎮 GM Exclusive Manual Control for Custom Allies & Bosses
- **Custom-Made NPCs**: When creating custom NPCs or friendly allies, the GM can flag them for **Exclusive Manual Control**.
- **Excluded from Auto-Resolve**: Generic goons follow the auto-combat rules, while custom-crafted allies and bosses remain 100% under GM manual command.
- **Opposed & Contest Check Engine**: A single Stat Number derives all NPC modifiers, with a 1-click **OPPOSE** button to contest any player check (Stealth, Athletics, Grapple, Social, Tech) using exploding 1d10 dice.

### 🎬 Cinematic Round Narration Engine with Initiative Hand-off
- **Automated Combat Sequence Narration**: Transforms mechanical combat actions of each round into vivid, cinematic prose.
- **Tone Presets**: Choose between **Cyberpunk Gritty**, **High-Octane Action Movie**, and **Tactical Breacher** styles.
- **Initiative Spotlight & Turn Hand-off**: Seamlessly transitions from the chaotic NPC firefight to the player's or GM-controlled ally's active turn with customized hand-off narration.
- **1-Click Clipboard Copy**: Instantly copy narration to read aloud or paste into virtual tabletops or Discord channels.

### 🎴 Night City Tarot & Critical Injury Rules
- **Tarot vs Normal Crits**: Automatically tracks how many `6`s are rolled on damage dice.
  - **2x Sixes**: Normal Critical Injury (+5 bonus HP damage and specific injury table roll with Cyberware/First Aid treatment DVs).
  - **3+ Sixes**: **Night City Tarot Critical Hit**, automatically drawing from the canonical 22 Major Arcana Tarot deck with mechanical effects.

### 🔫 Authentic Foundry VTT Compendium Integration (Zero Hardcoded Fallbacks)
- **100% Direct Data Extraction**: Weapons, armor, cyberware, ammo, and explosives are loaded directly from the official Foundry VTT Cyberpunk RED system pack (`foundryItems.json`).
- **Tactical Loadout Biases**: Equip squads with **Balanced**, **Melee-Heavy**, **Ranged Specialist**, or **Demolitionist** loadouts.
- **Dynamic Threat Scaling**: Enemy equipment and stats scale dynamically across **Street (Easy)**, **Dangerous (Medium)**, **Deadly (Hard)**, and **Overkill (Extreme)**:
  - *Deadly/Overkill* enemies automatically equip specialized Ammunition (Armor-Piercing, Incendiary, Smart, Expansive) and Ordnance (Frag, Flashbang, EMP, AP Grenades, and Rockets).
- **Ordnance Throw / Detonation**: Direct action buttons on combatant cards to throw grenades or fire rockets with explosive SP ablation rules.

### 🎯 Weapon Range DV Reference & Classification Normalizer
- **Interactive Range DV Chart**: Displays exact target DVs for all weapon categories across 0–6m, 7–12m, 13–25m, 26–50m, 51–100m, 101–200m, 201–400m, and 401–800m.
- **Quick Range Badges**: Normalized weapon categorization badges for instant DV checking on any equipped weapon.

### 🎲 Upgraded Cyberpunk RED Dice Roller
- Dedicated roller supporting exploding 1d10s, critical botches (Natural 1 with subtraction), damage dice (d6s), stat modifiers, and log history.

---

## 🛠️ Tech Stack

- **React 18** with **TypeScript**
- **Vite** build engine & development server
- **Tailwind CSS** with custom dark cyberpunk aesthetic
- **Lucide Icons**
- **Sonner** toast notifications
- **Foundry VTT Cyberpunk RED System Data** (`fvtt-cyberpunk-red-core`)

---

## 📦 Project Setup & Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/MrBlu03/CyberpunkRED_Encounter_Tracker.git
   cd CyberpunkRED_Encounter_Tracker/gm-tool
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

---

## 📜 License & Disclaimers

This project is an unofficial fan-made utility for Game Masters running **Cyberpunk RED**, governed by the Homebrew Content Policy of R. Talsorian Games. Cyberpunk RED is a trademark of R. Talsorian Games, Inc.
Item compendium data is derived from the open-source Foundry VTT Cyberpunk RED system.
