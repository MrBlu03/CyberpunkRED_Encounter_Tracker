# Cyberpunk RED Encounter Tracker (Electron App)

## Setup Instructions

1. Install Node.js and npm if you haven't already:
    - Download from [nodejs.org](https://nodejs.org/)

2. Install dependencies:
    `
    npm install
    `

3. Run the application:
    `
    npm start
    `

4. Build distributable:
    `
    npm run build
    `
    
    For specific platforms:
    `
    npm run build:win
    npm run build:mac
    npm run build:linux
    `

## Project Structure

- /src: Application source files
  - /src/html: HTML pages
  - /src/css: Stylesheets
  - /src/js: JavaScript files
    - /src/js/components: Feature-specific components
    - /src/js/utils: Utility functions
- /assets: Icons and other static assets
- main.js: Electron main process
- preload.js: Secure preload script for IPC

## Development Notes

- The app uses Electron's context isolation for security
- File system access is provided through the preload API
- Native menus are configured in main.js
