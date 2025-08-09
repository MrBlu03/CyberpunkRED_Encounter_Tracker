/* eslint no-console:0 */
export default class LOGGER {
  static log(msg) {
    console.log(`CPR LOG | ${msg}`);
  }

  static debug(msg) {
    if (game.settings.get(game.system.id, "debugLogs")) {
      console.debug(`CPR DBG | ${msg}`);
      if (typeof msg === "object" && msg !== null) {
        console.log(msg);
      }
    }
  }

  static debugObject(obj) {
    if (game.settings.get(game.system.id, "debugLogs")) {
      console.debug(obj);
    }
  }

  static warn(msg) {
    console.warn(`CPR WRN | ${msg}`);
  }

  static trace(msg) {
    if (game.settings.get(game.system.id, "traceLogs")) {
      console.log(`CPR TRC | ${msg}`);
    }
  }

  static error(msg, ...extraInfo) {
    if (typeof msg === "object") {
      console.error(msg, ...extraInfo);
    } else {
      console.error(`CPR ERR | ${msg}`, ...extraInfo);
    }
  }

  static credits() {
    console.log("SPECIAL THANKS TO MOO MAN FOR HIS PATIENCE AND HELP!");
    console.log(`
          (__)             (__)             (__)             (__)
          (oo)             (oo)             (oo)             (oo)
   /-------\\/      /-------\\/      /-------\\/      /-------\\/
  / |     ||       / |     ||       / |     ||       / |     ||
 *  ||----||      *  ||W---||      *  ||w---||      *  ||V---||
    ^^    ^^
    `);
  }
}
