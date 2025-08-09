const SyncBlackIceWithProgram = () => {
  /**
   * If the actor being updated is Black-ICE, reflect those changes on the owned
   * program Item.
   *
   *
   * @public
   * @memberof hookEvents
   * @param {CPRCharacterActor} actor - The pending document which is requested for creation
   * @param {object} updatedData      - The changed data object provided to the document creation request
   */
  Hooks.on("preUpdateActor", async (doc, updatedData) => {
    if (doc.type === "blackIce" && doc.isToken && updatedData.system?.stats) {
      const biToken = doc.token;

      const netrunnerTokenId = biToken.getFlag(
        game.system.id,
        "netrunnerTokenId"
      );
      const programUUID = biToken.getFlag(game.system.id, "programUUID");
      const sceneId = biToken.getFlag(game.system.id, "sceneId");
      const sceneList = game.scenes.filter((s) => s.id === sceneId);
      if (sceneList.length === 1) {
        const scene = sceneList[0];
        const tokenList = scene.tokens.filter((t) => t.id === netrunnerTokenId);
        if (tokenList.length === 1) {
          const netrunnerToken = tokenList[0];
          const netrunner = netrunnerToken.actor;
          const program = netrunner.getOwnedItem(programUUID);
          await program.update({
            "system.rez": updatedData.system.stats.rez,
          });
        }
      }
    }
  });
};

export default SyncBlackIceWithProgram;
