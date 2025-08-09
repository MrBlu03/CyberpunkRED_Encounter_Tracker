import SystemUtils from "../../utils/cpr-systemUtils.js";

const SetDefaultImage = () => {
  /**
   * Overrides Foundry's default item images when items are created.
   *
   * @public
   * @memberof hookEvents
   * @param {Document} doc          The Item document which is requested for creation
   * @param {object} createData     A trimmed object with the data provided for creation
   */
  Hooks.on("preCreateItem", (doc, createData) => {
    const actor = doc.parent;

    // The first check makes sure the image isn't overridden if the item is
    // dragged from a character sheet to the sidebar, or imported to the
    // sidebar from a compendium. In both of these cases, createData.img is
    // defined, whereas when creating an item from the sidebar directly, it
    // is not.
    if (typeof createData.img === "undefined" && actor === null) {
      const itemImage = SystemUtils.GetDefaultImage("Item", createData.type);
      doc.updateSource({ img: itemImage });
    }

    return true;
  });
};

export default SetDefaultImage;
