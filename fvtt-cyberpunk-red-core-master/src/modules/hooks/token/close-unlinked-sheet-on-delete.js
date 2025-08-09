const CloseUnlinkedSheetOnDelete = () => {
  /**
   * When deleting an unlinked token while the sheet is open the data in the
   * sheet is orphaned as it loses the source of the data. This causes
   * foundry to throw an error. So we close any associated sheets to prevent
   * the error being thrown.
   *
   * @public
   * @memberof hookEvents
   * @param {TokenDocument} tokenDocument  The token object being deleted
   */
  Hooks.on("deleteToken", (tokenDocument) => {
    if (!tokenDocument.isLinked) {
      const tokenId = tokenDocument.id;
      const actorId = tokenDocument.actor.id;
      const currentWindows = Object.values(ui.windows);
      currentWindows.forEach((window) => {
        if (window.id === `actor-${actorId}-${tokenId}`) {
          window.close();
        }
      });
    }
  });
};

export default CloseUnlinkedSheetOnDelete;
