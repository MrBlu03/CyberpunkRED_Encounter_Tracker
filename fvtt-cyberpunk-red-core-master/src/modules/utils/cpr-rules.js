import SystemUtils from "./cpr-systemUtils.js";

export default class Rules {
  static lawyer(rule, msg) {
    if (!rule) {
      SystemUtils.DisplayMessage("warn", msg);
    }
  }
}
