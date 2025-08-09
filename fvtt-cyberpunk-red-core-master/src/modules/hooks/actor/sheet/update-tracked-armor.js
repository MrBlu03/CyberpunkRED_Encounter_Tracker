const updateTrackedArmor = () => {
  /**
   * Executes only for tracked armor items. Updates the armor tracking on
   * the associated actor based on changes to shield hit points or body/head
   * locations.
   *
   * @param {Object} doc - The item document being updated.
   * @param {Object} updateData - The update data for the item.
   */
  Hooks.on("updateItem", (doc, updateData) => {
    // Only run if updateData exists
    if (updateData?.system == null) return;

    // Only run if the armor is tracked
    if (doc.type === "armor" && doc.system.isTracked) {
      const actor = game.actors.get(doc.parent._id);
      // Check the updateData to only fire when the relevant fields are editied
      if ("headLocation" in updateData.system) {
        actor.updateTrackedArmor("head", doc._id);
      }
      if ("bodyLocation" in updateData.system) {
        actor.updateTrackedArmor("body", doc._id);
      }
      if ("shieldHitPoints" in updateData.system) {
        actor.updateTrackedArmor("shield", doc._id);
      }
    }
  });
};

export default updateTrackedArmor;
