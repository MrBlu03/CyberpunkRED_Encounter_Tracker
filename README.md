# Cyberpunk RED Encounter Tracker

A web-based tool for Game Masters running Cyberpunk RED tabletop RPG sessions. This tool provides various utilities to help manage encounters, including cover management, critical injury rolling, and more.

## 🚀 Live Demo

The application is deployed on GitHub Pages and can be accessed at:
**https://mrblu03.github.io/CyberpunkRED_Encounter_Tracker/**

## ✨ Features

### 🎯 Core Tools
- **Cover Management System** - Track and manage cover positions, types, and bonuses for combat encounters
- **Critical Injury Roller** - Automated critical injury generation with proper Cyberpunk RED rules
- **Tarot Card Integration** - Night City Tarot rules and card management
- **Encounter Tracker** - Comprehensive encounter management for GMs

### 🛡️ Combat Assistance
- **Armor Tracking** - Monitor armor ablation and damage application
- **Ammo Management** - Track ammunition usage and different ammo types
- **Damage Calculator** - Automated damage calculations with armor penetration
- **Critical Hit Handling** - Proper critical hit resolution and effects

### 📊 Data Management
- **Compendium Integration** - Access to comprehensive item databases
- **Custom Item Creation** - Create and manage custom weapons, armor, and gear
- **Character Sheet Integration** - Seamless integration with character data
- **Real-time Updates** - Live updates during combat and encounters

### 🎮 User Experience
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Modern UI** - Clean, intuitive interface following Cyberpunk RED aesthetics
- **Offline Capable** - Core functionality works without internet connection
- **Fast Performance** - Optimized for quick access during live gameplay

## 🛠️ Local Development

To run this project locally:

1. Navigate to the `gm-tool` directory:
   ```bash
   cd gm-tool
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and visit `http://localhost:5173`

## 🏗️ Building for Production

To build the project for production:

```bash
cd gm-tool
npm run build
```

The built files will be in the `gm-tool/dist` directory.

## 📦 Project Structure

- `gm-tool/` - Main React application built with Vite
- `fvtt-cyberpunk-red-core-master/` - Foundry VTT module data
- `NightCityTarrotRules/` - Tarot rules data

## 🙏 Credits & Acknowledgments

### Data Sources
This project utilizes data and content from the following sources:

- **[Cyberpunk RED Core - Foundry VTT System](https://foundryvtt.com/packages/cyberpunk-red-core)** - Comprehensive game system data including:
  - Item compendiums (weapons, armor, cyberware, gear)
  - Character sheet functionality
  - Combat mechanics and rules
  - Critical injury systems
  - Netrunning tools and programs

*DISCLAIMER: This game system is unofficial content provided under the Homebrew Content Policy of R. Talsorian Games and is not officially supported or endorsed by RTG. This content references materials that are the property of R. Talsorian Games and its licensees.*

### Development Team
- **CPR Dev Team** - Original Foundry VTT system development
- **Community Contributors** - Testing, coding, content creation, and feedback

### Technology Stack
- **React 18** - Frontend framework
- **Vite** - Build tool and development server
- **TypeScript** - Type-safe development
- **GitHub Pages** - Hosting and deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Links

- [Live Demo](https://mrblu03.github.io/CyberpunkRED_Encounter_Tracker/)
- [Foundry VTT Cyberpunk RED Core](https://foundryvtt.com/packages/cyberpunk-red-core)
- [R. Talsorian Games](https://rtalsoriangames.com/) - Official Cyberpunk RED publisher
