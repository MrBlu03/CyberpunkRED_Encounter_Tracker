/**
 * Filter out electronic items that are EMPable. An item is considered
 * EMPable if none of its installed items, sibling items, or itself provide
 * hardening against EMP attacks. Returns a list of EMPable items.
 *
 * @example
 * // Load actor data from currently controlled token
 * actorData = canvas.tokens.controlled[0].actor;
 * empableItems = game.cpr.api.actor.getEMPableItems(actorData);
 * console.log(empableItems)
 * // Returns: ["item1name", "item2name", "item3name"]
 *
 * @param {Object} actorData The actor's data containing items
 * @return: {Array<String>} A list of EMPable electronic items
 */
function getEMPableItems(actorData) {
  const electronicItems = actorData.items.reduce((acc, item) => {
    if (item.system.isElectronic) {
      if (
        item.system.equipped === "carried" ||
        item.system.equipped === "equipped" ||
        item.system.isInstalledInActor
      ) {
        acc.push(item);
      }
    }
    return acc;
  }, []);

  const empableItems = [];

  electronicItems.forEach((item) => {
    // 1. Check if the item itself provides hardening
    // 2. Check if the item has an item installed that provides hardening
    // 3. Check if the item has a sibling which provides hardening
    const installedItemsList = item.system.installedItems.list;
    const installedItems = [];
    installedItemsList.forEach((i) => {
      installedItems.push(actorData.items.get(i));
    });

    // Work out the parent item
    const parentItem = electronicItems.reduce((acc, i) => {
      if (i.system.installedItems.list.includes(item._id)) {
        acc.push(i._id);
      }
      return acc;
    }, [])[0];

    // Work out the other items installed in the same parent
    const siblingItems = [];
    if (parentItem) {
      const itemList =
        actorData.items.get(parentItem).system.installedItems.list;

      itemList.forEach((i) => {
        siblingItems.push(actorData.items.get(i));
      });
    }

    // Work out if any siblingitems provide hardening
    const siblingProvidesHardening = siblingItems
      .reduce((acc, i) => {
        if (item._id !== i._id) {
          if (i.system.providesHardening) {
            acc.push(true);
          } else {
            acc.push(false);
          }
        }
        return acc;
      }, [])
      .some((value) => value);

    const childProvidesHardedning = installedItems
      .reduce((acc, i) => {
        if (i.system.providesHardening) {
          acc.push(true);
        } else {
          acc.push(false);
        }
        return acc;
      }, [])
      .some((value) => value);

    const itemProvidesHardening = item.system.providesHardening;

    // If nothing provides hardening add it to the list of empableItems
    if (
      !siblingProvidesHardening &&
      !childProvidesHardedning &&
      !itemProvidesHardening
    ) {
      empableItems.push(item.name);
    }
  });
  return empableItems;
}

export default getEMPableItems;
