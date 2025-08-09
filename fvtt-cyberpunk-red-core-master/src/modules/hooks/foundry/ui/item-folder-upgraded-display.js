import SystemUtils from "../../../utils/cpr-systemUtils.js";

/**
 * This function is the thing that actually puts the list together in `prepareSubList()`. It works
 * recursively, calling itself if child items also have installed items.
 *
 * @param {CPRItem(Container)} parentItem - The parent item (not necessarily the top-most item)
 * @param {String} topLevelId - ID of the top-most item.
 * @param {Number} [level = 0] - The amount of indentation.
 * @returns {String}
 */
function recursiveHTML(parentItem, topLevelId, level = 0) {
  // Get all items installed in the parent and sort.
  const installedItems = parentItem.getInstalledItems().sort((a, b) => {
    // If items are the same type, sort alphabetically.
    if (a.type === b.type) return a.name > b.name ? 1 : -1;

    let sortOrder = [];
    switch (parentItem.type) {
      case "weapon":
      case "itemUpgrade":
        // For weapons and item upgrades, show loaded ammo at the top.
        sortOrder = ["ammo"];
        break;
      case "cyberdeck":
        // For cyberdecks, show installed programs at the top.
        sortOrder = ["program"];
        break;
      case "cyberware":
        // For cyberware, show installed cyberware at the top.
        sortOrder = ["cyberware"];
        break;
      default:
        break;
    }
    return sortOrder.indexOf(a.type) > sortOrder.indexOf(b.type) ? -1 : 1;
  }); // Sort so ammo always comes first

  let listItem = "";
  // For each installed item, create an <li> element with information about that item.
  for (const childItem of installedItems) {
    listItem += `<li class="item flexrow"`;
    listItem += `    data-row-level="${level}"`;
    listItem += `    data-top-level-parent="${topLevelId}"`;
    listItem += `    data-item-id="${childItem.id}">`;
    listItem += `  <a class="name item-view flex-center">${childItem.name}</a>`;
    listItem += `</li>`;
    // If the child item has its own installed items, call this function on the child item
    // and increase the indent.
    if (childItem.system.hasInstalled) {
      listItem += recursiveHTML(childItem, topLevelId, level + 1);
    }
  }
  return listItem;
}

/**
 * Prepare the html for the install tree sub-list. To be appended after each item which contains
 * other items
 *
 * @private
 * @param {jQuery} element - the element which represents an item with items installed into it.
 * @returns {String} - HTML of the element's install tree
 */
function _prepareSubList(element) {
  const item = game.items.get(element.dataset.documentId);
  // Only create a dropdown if the item has installed items & is not itself installed.
  if (item.system.hasInstalled && !item.system.isInstalled) {
    const showInstallFlag = game.user.getFlag(
      game.system.id,
      "showInstalledList"
    );
    const showNested = showInstallFlag?.[item.id];
    // Is nested list hidden or not
    const display = showNested ? "" : "item-hidden";
    // Generate the sublist
    const listItems = recursiveHTML(item, item.id);
    // Here we wrap the whole sub-list in a div, so that we can animate it
    let html = "";
    html += `<div class="sub-list ${display}" data-items-wrapper-for-parent="${item.id}">`;
    html += `  <ol>`;
    html += `    <li class="sub-list-header flexrow">`;
    html += `     ${SystemUtils.Localize("CPR.global.generic.installedItems")}`;
    html += `    </li>`;
    html += `    ${listItems}`;
    html += `  </ol>`;
    html += `</div>`;
    return html;
  }
  // Otherwise return a blank string.
  return "";
}

/**
 * Prepare the html for the chevron button/icon. Its state depends on whether or not the
 * install tree is displayed.
 *
 * @private
 * @param {jQuery} element - the element which represents an item with items installed into it.
 * @returns {String} - HTML for the chevron button.
 */
function _prepareChevron(element) {
  const itemID = element.dataset.documentId;
  const showInstallFlag = game.user.getFlag(
    game.system.id,
    "showInstalledList"
  );
  const display = showInstallFlag?.[itemID] ? "fa-flip-vertical" : "";
  return `<a class="toggle-install-list-button"><i class="fas fa-chevron-down ${display}"></i></a>`;
}

/**
 * Render the sheet of an installed item. For now, installed item sheets are view only.
 *
 * @callback
 * @private
 * @param {*} event - object with details of the event
 */
function _renderViewOnlyItemSheet(event) {
  const itemId = SystemUtils.GetEventDatum(event, "data-item-id");
  const item = game.items.get(itemId);
  item.sheet.render(true, { editable: false });
}

/**
 * Toggle display of nested installed items in the item directory.
 *
 * @callback
 * @private
 * @param {*} event - object with details of the event
 */
function _toggleInstalledVisibility(event) {
  // Step 1: Prepare data
  const itemId = SystemUtils.GetEventDatum(event, "data-document-id");

  // Step 2: Toggle the icon rotation to indicate state change.
  const iconElement = event.currentTarget.querySelector("i");
  if (iconElement) {
    iconElement.classList.toggle("fa-flip-vertical");
  }

  // Step 3: Identify the HTML elements in the sub-list involved in the toggling.
  const installedRow = $(event.currentTarget.closest(".directory-list")).find(
    `div[data-items-wrapper-for-parent="${itemId}"]`
  );

  installedRow.toggleClass("item-hidden");

  // Wait for the expand/collapse animation to complete before updating the installFlags (because it re-renders the handlebars)
  installedRow.one("transitionend", async () => {
    // A per-user flag that stores whether or not to show the nested list on a particular contaier item.
    const showInstallFlag = game.user.getFlag(
      game.system.id,
      "showInstalledList"
    );
    const showNested = showInstallFlag?.[itemId];
    const flagUpdate = { [itemId]: !showNested };
    // Update the showInstallFlags.
    await game.user.setFlag(game.system.id, "showInstalledList", flagUpdate);
  });
}

/**
 * Inject HTML and listeners for the Item Tab directory list. The content we inject displays
 * an items install tree.
 *
 */
const renderItemDirHooks = () => {
  Hooks.on("renderItemDirectory", (_, html) => {
    const itemElements = html.find("li.item");

    const hiddenElements = itemElements.filter((__, element) => {
      const item = game.items.get(element.dataset.documentId);
      return item.system.isInstalled;
    });
    hiddenElements.toggleClass("directory-item-hidden");

    // Get elements that represent items which have other items installed in them.
    const itemsWithInstalledElements = itemElements.filter((__, element) => {
      const item = game.items.get(element.dataset.documentId);
      return item.system.hasInstalled;
    });

    // Append the list to each element that represents an item with installed items.
    for (const element of Array.from(itemsWithInstalledElements)) {
      // Prepare the chevron icon (whether or not it should be in the open or closed position).
      const chevronIcon = _prepareChevron(element);
      // Append the chevron icon to the parent item.
      $(element).append(chevronIcon);

      // Prepare the html for the install tree.
      const installedListHTML = _prepareSubList(element);
      // Append the installed list to every parent element.
      $(element).after(installedListHTML);
    }

    // Give each item in the sublist an event listener for viewing sheets.
    html
      .find(".sub-list")
      .on("click", ".item-view", (event) => _renderViewOnlyItemSheet(event));

    // Give each button an event listener for toggling display of the install tree.
    itemElements.on("click", ".toggle-install-list-button", (event) => {
      _toggleInstalledVisibility(event);
    });
  });
};

export default renderItemDirHooks;
