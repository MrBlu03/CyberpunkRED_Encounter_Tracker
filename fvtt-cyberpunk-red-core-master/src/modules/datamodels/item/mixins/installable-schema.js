import CPR from "../../../system/config.js";
import CPRSystemDataModel from "../../system-data-model.js";

export default class InstallableSchema extends CPRSystemDataModel {
  static mixinName = "installable";

  static defineSchema({ initialSize = 1 } = {}) {
    const { fields } = foundry.data;
    return {
      installLocation: new fields.StringField({
        initial: "mall",
        choices: Object.keys(CPR.cyberwareInstallList),
      }),
      size: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: initialSize,
        min: 0,
      }),
    };
  }

  /**
   * This and `installedIn` are getters so that `containerItem.system.installedItems.list` is
   * always the source of truth for what is installed where.
   *
   * @getter
   * @returns {Boolean} - whether or not this is installed in an actor/item.
   */
  get isInstalled() {
    const { id } = this.parent;
    const actor = this.parent.isEmbedded ? this.parent.actor : false;
    if (actor) {
      return (
        // Container actors do not have `installdItems.list`.
        actor.system.installedItems?.list.includes(id) ||
        actor.items.some((i) => i.system?.installedItems?.list?.includes(id))
      );
    }
    return game.items.some((i) => i.system?.installedItems?.list?.includes(id));
  }

  /**
   * World installable items can be installed into multiple other world items.
   *
   * Most actor embedded items should only be installed in a single other embedded item.
   * Ammo is the exception. Ammo can be installed into multiple different weapons.
   *
   * @getter
   * @returns {Array<String>} - the id or list of ids of the item(s) that this is installed in.
   */
  get installedIn() {
    const { id } = this.parent;
    const actor = this.parent.isEmbedded ? this.parent.actor : false;
    // If this item lives on an actor...
    if (actor) {
      // ...and if this item is intsalled in the actor directly...
      const inActor = actor.system.installedItems?.list.includes(id);
      if (inActor) {
        // ...return the actor's ID in an array
        return [actor.id];
      }

      // If not installed in the actor directly,
      // check if this is installed in other embedded items.
      const ownedItems = actor.items.filter((i) =>
        i.system?.installedItems?.list?.includes(id)
      );
      // ...return the list of owned items this is installed in (or an empty array).
      return ownedItems.map((i) => i.id);
    }

    // If the item is not embedded (i.e. it exists in the world)...
    const worldItems = game.items.filter((i) =>
      i.system?.installedItems?.list?.includes(id)
    );
    // ... return the list of world items this is installed in (or an empty array).
    return worldItems.map((i) => i.id);
  }

  /**
   * There are times it may be useful to know how many layers deep an item is installed. For example,
   * a Skill Chip in a Chipware Socket in a Neural Ware in an Actor is 3 layers deep:
   *
   * Actor (Depth: 0) -> Neural Ware (Depth: 1) -> Chipware Socket (Depth: 2) -> Skill Chip (Depth: 3)
   *
   * We use a recursive function to get to the depth.
   *
   * @getter
   * @returns {Number} - The amount of layers deep that this item is installed. Returns 0 if uninstalled.
   */
  get installDepth() {
    function getDepth(doc, n = 0) {
      const actor = doc?.isEmbedded ? doc.actor : false;
      if (doc.system.isInstalled && doc.documentName !== "Actor") {
        const parentDoc = actor
          ? actor.getOwnedItem(doc.system.installedIn[0]) || actor
          : game.items.get(doc.system.installedIn[0]);
        return getDepth(parentDoc, n + 1);
      }
      return n;
    }

    return getDepth(this.parent);
  }
}
