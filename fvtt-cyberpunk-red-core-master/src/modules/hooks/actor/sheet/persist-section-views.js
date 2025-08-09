import SystemUtils from "../../../utils/cpr-systemUtils.js";

const PersistSectionViews = () => {
  /**
   * Persist collapsed sections of a character when it is closed. That way they
   * are not lost when it is re-opened.
   *
   * @public
   * @memberof hookEvents
   * @param {CPRActorSheet} actorSheet - application object (the sheet)
   */
  Hooks.on("closeActorSheet", (actorSheet) => {
    SystemUtils.SetUserSetting(
      "sheetConfig",
      "sheetCollapsedSections",
      actorSheet.options.collapsedSections,
      actorSheet.id
    );
    // eslint-disable-next-line no-param-reassign
    actorSheet.options.setConfig = true;
  });
};

export default PersistSectionViews;
