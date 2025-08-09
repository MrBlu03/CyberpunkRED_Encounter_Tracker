const SyncTrackedArmor = () => {
  /**
   *
   * If the corresponding token for the actor is displaying a resource bar for
   * armor SP, update it to use newly equipped armor items when the equipment
   * changes.
   *
   *
   * @public
   * @memberof hookEvents
   * @param {CPRCharacterActor} actor - The pending document which is requested for creation
   * @param {object} updatedData      - The changed data object provided to the document creation request
   */
  Hooks.on("preUpdateActor", async (doc, updatedData) => {
    if (updatedData.system?.externalData) {
      Object.keys(updatedData.system.externalData).forEach((itemType) => {
        if (!updatedData.system.externalData[itemType].id) {
          const itemId = doc.system.externalData[itemType].id;
          const item = doc.getOwnedItem(itemId);
          const currentValue = updatedData.system.externalData[itemType].value;
          if (item) {
            switch (item.type) {
              case "armor": {
                if (itemType === "currentArmorBody") {
                  const armorList = doc.getEquippedArmors("body");
                  const updateList = [];
                  const diff =
                    item.system.bodyLocation.sp -
                    item.system.bodyLocation.ablation -
                    currentValue;
                  armorList.forEach((a) => {
                    const armorData = a.system;
                    if (diff > 0) {
                      armorData.bodyLocation.ablation = Math.min(
                        armorData.bodyLocation.ablation + diff,
                        armorData.bodyLocation.sp
                      );
                    }
                    if (diff < 0 && item._id === a._id) {
                      armorData.bodyLocation.ablation = Math.max(
                        armorData.bodyLocation.ablation + diff,
                        0
                      );
                    }
                    updateList.push({ _id: a.id, system: armorData });
                  });
                  doc.updateEmbeddedDocuments("Item", updateList);
                }
                if (itemType === "currentArmorHead") {
                  const armorList = doc.getEquippedArmors("head");
                  const updateList = [];
                  const diff =
                    item.system.headLocation.sp -
                    item.system.headLocation.ablation -
                    currentValue;
                  armorList.forEach((a) => {
                    const armorData = a.system;
                    if (diff > 0) {
                      armorData.headLocation.ablation = Math.min(
                        armorData.headLocation.ablation + diff,
                        armorData.headLocation.sp
                      );
                    }
                    if (diff < 0 && item._id === a._id) {
                      armorData.headLocation.ablation = Math.max(
                        armorData.headLocation.ablation + diff,
                        0
                      );
                    }
                    updateList.push({ _id: a.id, system: armorData });
                  });
                  doc.updateEmbeddedDocuments("Item", updateList);
                }
                if (itemType === "currentArmorShield") {
                  if (currentValue) {
                    item.system.shieldHitPoints.value = currentValue;
                  }
                  doc.updateEmbeddedDocuments("Item", [
                    { _id: item.id, system: item.system },
                  ]);
                }
                break;
              }
              default:
            }
          }
        }
      });
    }
  });
};

export default SyncTrackedArmor;
