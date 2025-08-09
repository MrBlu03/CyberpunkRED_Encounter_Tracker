import SystemUtils from "../../utils/cpr-systemUtils.js";

const SetDefaultImage = () => {
  /**
   * The preCreateActor Hook is provided by Foundry and triggered here. When an Actor is created, this hook is called just
   * prior to creation. In here, we inject a default portrait (icon) for the actor.
   *
   * @public
   * @memberof hookEvents
   * @param {Document} doc      - The pending Actor document which is requested for creation
   * @param {object} createData - The initial data object provided to the document creation request
   * @param {object} (unused)   - Additional options which modify the creation request
   * @param {string} (unused)   - The ID of the requesting user, always game.user.id
   */
  Hooks.on("preCreateActor", (doc, createData) => {
    if (typeof createData.img === "undefined") {
      const actorImage = SystemUtils.GetDefaultImage("Actor", createData.type);
      doc.updateSource({
        img: actorImage,
        "prototypeToken.texture.src": actorImage,
      });
    }
  });
};

export default SetDefaultImage;
