import fs from "fs-extra";
import path from "path";
import log from "fancy-log";
import chalk from "chalk";

export const CI = process.env.CI ? process.env.CI : false;
export const DEBUG = process.env.DEBUG ? process.env.DEBUG : false;
export const TRACE = process.env.TRACE ? process.env.TRACE : false;
export const DEFAULT_DESTINATION_FOLDER = "dist";
export const SRC_DIR = "src";
export const PACKS_DIR = "packs";

export const CHANGELOG_FILE = process.env.CHANGELOG_FILE
  ? process.env.CHANGELOG_FILE
  : "CHANGELOG.md";

export const SYSTEM_NAME = process.env.SYSTEM_NAME
  ? process.env.SYSTEM_NAME
  : "cyberpunk-red-core";

export const SYSTEM_FILE = process.env.SYSTEM_FILE
  ? process.env.SYSTEM_FILE
  : "system.json";

export const SYSTEM_TITLE = process.env.SYSTEM_TITLE
  ? process.env.SYSTEM_TITLE
  : "Cyberpunk RED - CORE";

export const SYSTEM_VERSION = process.env.SYSTEM_VERSION
  ? process.env.SYSTEM_VERSION
  : "v0.0.0dev";

export const SOURCE_FILES = [
  { from: `${SRC_DIR}/cpr.js`, to: "" },
  { from: `${SRC_DIR}/environment.js`, to: "" },
  { from: `${SRC_DIR}/template.json`, to: "" },
];

export const SOURCE_DIRS = [
  { from: `${SRC_DIR}/babele/**/*`, to: "babele" },
  { from: `${SRC_DIR}/fonts/**/*`, to: "fonts" },
  { from: `${SRC_DIR}/lang/**/*`, to: "lang" },
  { from: `${SRC_DIR}/modules/**/*`, to: "modules" },
  { from: `${SRC_DIR}/templates/**/*`, to: "templates" },
];

/*
 * Determines the destination directory based on the local configuration or
 * returns a default path.
 */
function _getDestDir() {
  const localConfigPath = path.resolve("foundryconfig.json");
  const localConfigExists = fs.existsSync(localConfigPath);

  if (localConfigExists) {
    const localDataPath = fs.readJSONSync(localConfigPath).dataPath;
    const dataPath = path.resolve(
      path.join(localDataPath, "Data", "systems", SYSTEM_NAME)
    );
    if (fs.existsSync(path.join(dataPath, ".git"))) {
      // Check if a .git directoy exists in the dataPath. This will hopefully
      // prevent people blasting their repo if they stored it in their
      // Foundry datapath previously.
      throw Error(
        `'dataPath' appears to contain a '.git' directory.\n\n` +
          `Please check your foundryconfig.json and update 'dataPath' ` +
          `If you have previously \n` +
          `cloned the git repo to ` +
          `'${dataPath}'\n` +
          `please check CONTRIBUTING.md and clone the repo to another ` +
          `location.`
      );
    } else {
      return dataPath;
    }
  } else {
    log(
      `${chalk.yellow(
        "WARNING"
      )}: foundryconfig.json not found building to ${DEFAULT_DESTINATION_FOLDER}`
    );
  }
  return DEFAULT_DESTINATION_FOLDER;
}

export const DEST_DIR = _getDestDir();

// These are used for the discord announcement, they live here so the build file
// isn't completely unreadable :D
export const DISCORD_BOT_NAME = "Choom Bot";
export const DISCORD_BOT_AVATAR =
  "https://gitlab.com/uploads/-/system/project/avatar/22820629/Repo-Icon.png";
export const DISCORD_MESSAGE_HEADER = `**Version ${SYSTEM_VERSION}**`;
export const DISCORD_MESSAGE_BACKUP =
  ":rotating_light: Don't forget to [backup your data](https://www.youtube.com/watch?v=E04Z7UMc-ic) before upgrading! :rotating_light:";
export const DISCORD_MESSAGE_CHANGELOG = `Check out the full CHANGELOG [here](https://gitlab.com/cyberpunk-red-team/fvtt-cyberpunk-red-core/-/blob/${SYSTEM_VERSION}/CHANGELOG.md?pain=0)\n\n`;
export const DISCORD_MESSAGE_INTROS = [
  `Listen up, gonks! Choom Bot is here to deliver the news you've been waiting for. Version **${SYSTEM_VERSION}** of the 'Cyberpunk RED - Core' system has been released with an update from the hard-working CPRC Community! Brace yourselves for an adrenaline-fueled ride through a neon-soaked world teeming with exciting new features!`,
  `Attention, Night City runners! Choom Bot coming at you with breaking news. Version **${SYSTEM_VERSION}** of the 'Cyberpunk RED - Core' system is now available, courtesy of the relentless CPRC Community. Strap in, jack up your skills, and dominate the dark underbelly of Night City like never before!`,
  `Hey there, chooms and choombas! Choom Bot's got a message for you. Version **${SYSTEM_VERSION}** of the 'Cyberpunk RED - Core' system just dropped, thanks to the hard work of the CPRC Community. It's time to upgrade your arsenal and rewrite the rules in the neon-soaked playground of Night City!`,
  `Calling all edgerunners! Choom Bot here with the latest news. Version **${SYSTEM_VERSION}** of the 'Cyberpunk RED - Core' system has arrived, courtesy of the dedicated CPRC Community. Prepare for mind-blowing gameplay and thrilling adventures in the sprawling metropolis of Night City!`,
  `Attention, chooms! Choom Bot's got something special for you. Version **${SYSTEM_VERSION}** of the 'Cyberpunk RED - Core' system just hit the net, brought to you by the tireless CPRC Community. Dive into a world where danger lurks in every shadow, and your choices shape the future of Night City!`,
  `Listen up, Night City dwellers! Choom Bot is here to deliver the news you've been waiting for. Version **${SYSTEM_VERSION}** of the 'Cyberpunk RED - Core' system is now available, thanks to the dedicated efforts of the CPRC Community. Prepare to explore a dystopian world where survival is everything!`,
  `Hey there, fellow runners! Choom Bot has an exciting announcement. Version **${SYSTEM_VERSION}** of the 'Cyberpunk RED - Core' system just dropped, courtesy of the relentless CPRC Community. It's time to jack in, upgrade your skills, and run wild in the gritty streets of Night City!`,
  `Attention, choombas and gonks! Choom Bot's got some big news for you. Version **${SYSTEM_VERSION}** of the 'Cyberpunk RED - Core' system is now live, thanks to the hardworking CPRC Community. Brace yourselves for an immersive journey through the neon-lit abyss of Night City!`,
  `Listen up, Night City! Choom Bot is back with a vengeance. Version **${SYSTEM_VERSION}** of the 'Cyberpunk RED - Core' system has just been released by the dedicated CPRC Community. Prepare for an explosive upgrade that will redefine the way you play cyberpunk!`,
  `Hey there, chooms and choombas! Choom Bot has the latest scoop for you. Version **${SYSTEM_VERSION}** of the 'Cyberpunk RED - Core' system is now available, courtesy of the hardworking CPRC Community. Get ready to embark on a thrilling journey through the neon-soaked streets of Night City!`,
  `Attention, choombas! Choom Bot has breaking news for you. Version **${SYSTEM_VERSION}** of the 'Cyberpunk RED - Core' system has just hit the streets, brought to you by the relentless CPRC Community. It's time to gear up, dive into the shadows, and claim your place in the unforgiving world of Night City!`,
  `Listen up, Night City dwellers! Choom Bot is here with a transmission you won't want to miss. Version **${SYSTEM_VERSION}** of the 'Cyberpunk RED - Core' system is now available, thanks to the tireless efforts of the CPRC Community. Prepare to navigate the treacherous streets of Night City with enhanced features and endless possibilities!`,
  `Hey there, fellow runners! Choom Bot is back with electrifying news. Version **${SYSTEM_VERSION}** of the 'Cyberpunk RED - Core' system has just been released, courtesy of the dedicated CPRC Community. It's time to plug in, level up your skills, and seize control of the neon-lit underworld of Night City!`,
  `Attention, chooms and gonks! Choom Bot has some exciting tidbits for you. Version **${SYSTEM_VERSION}** of the 'Cyberpunk RED - Core' system is now live, thanks to the relentless work of the CPRC Community. Get ready to immerse yourself in a world where high-tech meets low-life, and your destiny awaits!`,
  `Listen up, Night City runners! Choom Bot is your guide to the future. Version **${SYSTEM_VERSION}** of the 'Cyberpunk RED - Core' system is available now, brought to you by the visionary CPRC Community. Prepare to hack, shoot, and survive in the neon-soaked urban jungle of Night City like never before!`,
  `Hey there, choombas and choombattas! Choom Bot has a revelation for you. Version **${SYSTEM_VERSION}** of the 'Cyberpunk RED - Core' system has just been unleashed, thanks to the tireless work of the CPRC Community. It's time to venture into the shadows and carve your name into the dark history of Night City!`,
  `Attention, Night City dwellers! Choom Bot is back with the latest scoop. Version **${SYSTEM_VERSION}** of the 'Cyberpunk RED - Core' system is now available, courtesy of the dedicated CPRC Community. Prepare to immerse yourself in a world of high-tech gadgets, dangerous missions, and thrilling adventures!`,
  `Listen closely, choombas! Choom Bot, your digital guide, is here with groundbreaking news. Version **${SYSTEM_VERSION}** of the 'Cyberpunk RED - Core' system has just been unleashed by the relentless CPRC Community. Get ready to embrace the chaos, challenge the powerful, and become a legend in the dark heart of Night City!`,
  `Hey there, Night City runners! Choom Bot is here to drop a bombshell. Version **${SYSTEM_VERSION}** of the 'Cyberpunk RED - Core' system is now live, thanks to the tireless efforts of the CPRC Community. It's time to rewrite your story, outsmart your enemies, and conquer the sprawling cityscape of Night City!`,
];
