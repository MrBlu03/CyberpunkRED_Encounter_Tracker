import SheetUtils from "../../../utils/SheetUtils.js";

const ResizeName = () => {
  /**
   * Resizes the font size of the 'name' input field to accommodate long names
   * without text overflow. This is done by calling `SheetUtils.adjustFontSizeToFit`
   * on the 'input[name="name"]' element.
   *
   * @public
   * @memberof hookEvents
   * @param {CPRActorSheet} app - application object (unused)
   * @param {Object} html - HTML DOM object
   */
  Hooks.on("renderActorSheet", (_, html) => {
    const inputElement = html.find('input[name="name"]');
    if (inputElement.length) {
      window.requestAnimationFrame(() => {
        SheetUtils.adjustFontSizeToFit(inputElement);
      });
    }
  });
};

export default ResizeName;
