const PreDeleteFolder = () => {
  /**
   * Add a call to the `preDeleteItem` Hook when deleting a Folder of items.
   * For some reason this doesn't exist in Foundry by default.
   *
   * Can be deleted once this Feature Request is done/released:
   * https://github.com/foundryvtt/foundryvtt/issues/6861
   *
   * @public
   * @memberof hookEvents
   * @param {Document} folder - The folder object
   * @param {object} options  - Options for deletion
   */
  Hooks.on("preDeleteFolder", (folder, options) => {
    let deleteFolder = true;
    // if the folder deletion deletes the items within
    //   and we are deleting a folder of Items
    //   and the folder contains Items
    // Call preDeleteItem hook to make sure we aren't deleting installed world
    // items.
    if (
      options.deleteContents &&
      folder.type === "Item" &&
      folder.contents.length > 0
    ) {
      for (const item of folder.contents) {
        deleteFolder = Hooks.call("preDeleteItem", item);
      }
      return deleteFolder;
    }
    return deleteFolder;
  });
};

export default PreDeleteFolder;
