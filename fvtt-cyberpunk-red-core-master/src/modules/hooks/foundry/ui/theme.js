import SystemUtils from "../../../utils/cpr-systemUtils.js";

const SetTheme = () => {
  /**
   * Set the CSS theme on init
   *
   * @public
   * @memberof hookEvents
   */
  Hooks.on("init", () => {
    SystemUtils.SetTheme();
  });
};

export default SetTheme;
