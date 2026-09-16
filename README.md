# Cyberpunk RED Encounter Tracker & GM Combat Command Center

A high-performance, polished web application for Game Masters running **Cyberpunk RED** tabletop RPG sessions. Designed from the ground up for speed, automation, and narrative immersion, this tool dramatically cuts down combat friction during complex shootouts, netruns, and street gang wars.

---

## 🚀 Key Features

### ⚡ 1-Click Initiative & Turn Order
- **Instant NPC Roll**: Roll initiatives for all hostile and friendly NPCs with a single button (`1d10 + REF + Init Skill`, accounting for Kerenzikov and Sandevistan cyberware).
- **Inline PC Entry**: Direct number inputs on Player Character cards allow seamless manual initiative entry without cumbersome modals.
- **Automatic Initiative Sorting**: Dynamic round and turn progression with active combatant indicators.

### ⚔️ Initiative-Ordered Turn-by-Turn Combat Automation
- **Person-by-Person Initiative Execution**: Combat progresses sequentially as the GM cycles through initiative order (`Next Turn`), perfectly matching tabletop cadence.
- **Player & Manual Ally Deference**: When a Player Character or GM-controlled ally is active in initiative, the system immediately defers to them—**zero premature attack popups**. The GM listens to the player's declaration and manually applies damage to the enemy of their choice.
- **Automated NPC Turn Execution**: When an automated generic NPC's turn arrives in initiative, the system kicks in automatically:
  - If targeting another NPC: rolls and auto-resolves attack checks, defenses, armor SP absorption, and HP damage in real-time.
- **Consecutive Automated NPC Batching**: When clicking `Next Turn`, all consecutive automated NPCs who follow each other in initiative are executed in one single go (unless an NPC targets a player, which immediately halts on that NPC to prompt GM review). A clean, compact **Tactical NPC Batch Summary** dialog itemizes all resolved strikes (`[Attacker] ➔ [Defender]: HIT (-X HP, SP ablated)`), and smoothly lands initiative on the next Player Character or manual combatant.
- **Persistent Compact Floating Combat Dock**: A sleek, non-intrusive floating HUD stays pinned to the bottom right of the viewport as you scroll, displaying current Round & Turn, Active Combatant, and who is "On Deck" (Next in initiative), with quick advance and pause controls.
- **Round-Start Dynamic Opponent Retargeting**: Every round at round start, enemies dynamically acquire a new opponent from the opposing faction (PCs and friendly NPCs), rotating targets systematically across all active combatants so enemies don't dogpile the same character indefinitely.
- **Dedicated Player Damage Application on Enemies**: An intuitive, inline **"Player Dmg"** panel on every enemy card allows the GM to effortlessly take in player attack damage, choose Body or Head (x2 dmg), toggle Armor-Piercing (AP, -2 SP), and press `Enter` to automatically calculate RAW SP absorption, SP ablation, and penetrating HP loss.
- **RAW Range Chart vs Player Evade Adjudication**: When an attack targets a Player Character, the review dialog adjudicates the hit using official Cyberpunk RED **Range Chart DVs** (0-6m, 7-12m, 13-25m, etc.) by default, or opposed roll if the player declared Evade.
- **Armor Halving for Melee**: Attacks with blades, brawling, and melee weapons automatically halve effective armor SP.
- **Damage & SP Ablation**: Penetrating damage reduces HP and ablates armor SP automatically. Armor-Piercing (AP) ammo ablates 2 SP.

### 📜 Prominent Live Combat & Dice Roll Feed
- **Unmistakable Real-Time Telemetry**: Every single exploding 1d10 roll, attack total, Range Chart DV check, opposed roll, damage dice roll, SP absorption, and ablation is prominently logged with high-contrast cyberpunk styling.
- **Top Header Quick-Jump & Badge**: A dedicated **"Rolls & Log"** button with a real-time action counter in the top bar smoothly scrolls directly to the live feed.
- **Filter Chips Bar**: Instantly filter logged events by **All Rolls**, **Hits**, **Evades/Misses**, **Crits**, and **Opposed Checks**.
- **Full Calculation Transparency**: Every entry displays exact formulas, modifiers, and defender vital statuses (e.g. `d10[8] + Bonus[11] vs DV 15`, `Dmg 14 [4+5+5] vs SP 11 -> Net -3 HP`).

### 🎮 GM Exclusive Manual Control for Custom Allies & Bosses
- **Custom-Made NPCs**: When creating custom NPCs or friendly allies, the GM can flag them for **Exclusive Manual Control**.
- **Excluded from Auto-Resolve**: Generic goons follow the auto-combat rules, while custom-crafted allies and bosses remain 100% under GM manual command.
- **Streamlined 1-Click Oppose Check**: A single Stat Number derives all NPC modifiers, with a 1-click **OPPOSE** button to instantly roll exploding 1d10 + Stat# and display the outcome inline without popup modals.

### 🎬 Full-Screen Tactical SITREP Teleprompter (Zero Fluff)
- **Strictly Tactical SITREP Telemetry**: No AI prose fluff—presents an itemized military-grade sitrep breakdown with exact hit/evade checks, damage dealt, armor ablation, and critical injuries so the GM can spice up the scene with their own flair.
- **Full-Screen Theater & Teleprompter**: Opens in an immersive high-contrast full-screen terminal teleprompter with font size toggles (**Normal**, **Large**, **Teleprompter**).
- **Initiative Spotlight & Turn Hand-off**: Concludes every sitrep by passing active combat initiative to the Player Character or GM-controlled ally whose turn is up.
- **1-Click Clipboard Copy**: Instantly copy the entire sitrep to clipboard.

### 🔄 Granular Encounter Reset & Clear Engine
- **3-Option Encounter Reset**:
  1. *Clear NPCs Only (Keep PCs)*: Wipes hostile and friendly NPCs while keeping Player Characters intact in standby.
  2. *Reset Combat State (Keep Combatants)*: Restores all combatants to full max HP and armor SP, clears wounds and initiative, without deleting cards.
  3. *Wipe Everything (Full Reset)*: Clean slate wiping all combatants and resetting combat state to Round 0.

### 🏪 Night City Market & Shop (100% Authentic Foundry Data)
- **Direct Pack Integration (Zero Hardcoded Fallbacks)**: Directly imports all 913 authentic items from official Foundry VTT Cyberpunk RED system compendiums (`foundryItems.json`).
- **RAW Night Market Generator**: Roll procedural underground Night Markets with flavored atmospheric venues (Cargo Superfreighters, Subway Concourse, Megabuilding Atrium, Nomad Perimeter) and specialized merchant stalls (Armory, Cyberware Chop-Shop, Tactical Armor, Tech, Pharmaceuticals, Luxury Fashion, Nomad Vehicles).
- **Fixer Operator Rank Requirements**: Visual badges on every item indicating required Fixer Operator rank (Everyday ≤100eb, Costly ≤500eb, Premium ≤1,000eb, Expensive ≤5,000eb, Very Expensive ≤10,000eb, Luxury >10,000eb).
- **Interactive Haggling Assistant**: Rolls 1d10 Exploding + Trading Skill vs Merchant DV (13, 15, 17, 21). On success, applies a 10% or 20% discount directly to the active shopping cart; on fumble, vendor demands a 10% surcharge.
- **Full Cart & Text Invoice Export**: Real-time quantity adjustments, price calculations, and 1-click text receipt export.

### 🌐 Interactive Netrunner Action HUD
- **Turn-Based NET Action Point Tracking**: Implements RAW NET Actions per turn based on Interface rank (Rank 1–3: 2 actions, Rank 4–6: 3 actions, Rank 7–9: 4 actions, Rank 10: 5 actions).
- **Canonical Netrunning Roll Actions**:
  - **Pathfinder** (DV 6 Survey, DV 8 ICE Scan, DV 10 Full Architecture Blueprint) with automated floor reveals.
  - **Backdoor**: Crack password nodes on current floor using Interface + 1d10 vs DV.
  - **Control Node**: Seize control of automated sentry turrets, cameras, elevators, and maglock doors.
  - **Eye-Dee**: Decrypt confidential data files and display secret intel.
  - **Slide**: Disengage and flee from hostile Black ICE using Interface vs ICE Perception.
  - **Zap**: Direct attack dealing 1d6 damage to Black ICE REZ.
  - **Plant Virus**: Program custom payload instructions with complexity DVs (DV 6, 8, 10, 12).
- **Next Turn / Refresh Actions**: 1-click turn advance and action pool replenishment.

### ⏱️ Campaign Time, Survival & Emergency Hub
- **Night City Master Clock & Calendar**: Dynamic 24-hour day/night cycle, day of the week, and quick time skips (+5m, +15m, +30m, +1h, +4h, +8h, +1d, +7d).
- **RAW Natural Healing Rate Calculator**:
  - Calculates HP recovery per full day of rest based on **BODY stat** (Core p. 222).
  - Toggles for Medtech Care (+2 HP/day bonus), Cryotank (2x healing rate, Critical Injuries healed in half time), and Speedheal boost.
  - 1-Click **"Rest Until Full Health"** button that automatically advances in-game time by the exact number of days needed.
- **Trauma Team AV-4 Emergency Dispatch Timer**:
  - Canonical response times: Executive Silver (3 min / 60 rounds), High Priority (7 min / 140 rounds), Standard (10 min / 200 rounds).
  - Live countdown timer with 3-second combat rounds remaining and animated en-route status.
  - **Web Audio Synthesizer**: Plays authentic dual-tone emergency beacon sirens upon dispatch and arrival.
- **Monthly Rent & Lifestyle Billing Tracker**:
  - Tracks days remaining until rent is due on the 1st of every month.
  - Housing tiers (Cube Hotel €$500, Cargo Container €$1,000, Studio €$1,500, Two-Bedroom €$2,500, Penthouse €$15,000).
  - Food & lifestyle tiers (Kibble €$100, Prepak €$600, Good Prepak €$1,200, Fresh Food €$1,500).
  - 1-Click **"Pay Rent & Advance to 1st of Next Month"** button.

### 🎴 Night City Tarot & Critical Injury Rules
- **Tarot vs Normal Crits**: Automatically tracks how many `6`s are rolled on damage dice.
  - **2x Sixes**: Normal Critical Injury (+5 bonus HP damage and specific injury table roll with Cyberware/First Aid treatment DVs).
  - **3+ Sixes**: **Night City Tarot Critical Hit**, automatically drawing from the canonical 22 Major Arcana Tarot deck with mechanical effects.

### 🔫 Tactical Squad & Encounter Generator
- **Procedural Scenario Presets**: Generate street gang ambushes, corporate security extractions, high-security compound raids, and cyberpsycho hunts.
- **Combat Style Biases**: Generate fireteams with **Balanced**, **Melee-Focused**, **Ranged Specialist**, or **Demolitionist** loadouts.
- **Authentic Weapon & Ordnance Loadouts**: Equipped directly from Foundry packs with special ammo (Armor-Piercing, Incendiary, Expansive, Smart) and ordnance (Frag, EMP Grenades, Rockets).
- **Role-Based Combat Cyberware**: Automatically equips Subdermal Armor, Kerenzikov, Sandevistan, Wolvers, and Targeting Scopes.
- **Single Stat Block Support**: All units generated with `isGoon: true`, `Combat Number (CN)`, and `Non-Combat Number (NCN)`.

### 🎯 Weapon Range DV Reference & Classification Normalizer
- **Interactive Range DV Chart**: Displays exact target DVs for all weapon categories across 0–6m, 7–12m, 13–25m, 26–50m, 51–100m, 101–200m, 201–400m, and 401–800m.
- **Quick Range Badges**: Normalized weapon categorization badges for instant DV checking on any equipped weapon.

---

## 🛠️ Tech Stack

- **React 18** with **TypeScript**
- **Vite** build engine & development server
- **Tailwind CSS** with custom dark cyberpunk aesthetic
- **Lucide Icons**
- **Sonner** toast notifications
- **Web Audio API** synthesized audio alerts
- **Foundry VTT Cyberpunk RED System Data** (`foundryItems.json`)

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
