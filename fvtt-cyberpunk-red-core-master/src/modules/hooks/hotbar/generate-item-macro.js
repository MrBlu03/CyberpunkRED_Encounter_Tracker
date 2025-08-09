/* eslint-disable consistent-return */

/**
 * Hooks have a set of args that are passed to them from Foundry. Even if we do not use them here,
 * we document them all for clarity's sake and to make future development/debugging easier.
 */
const hotbarHooks = () => {
  /**
   * The hotbarDrop Hook is provided by Foundry and triggered here. When something is dropped on the hotbar, this
   * fires. In our code, we use that translate a dragged thing into a usable macro. Examples:
   *
   * Create a macro when dropping an entity on the hotbar
   * Item      - open roll dialog for item
   * Actor     - open actor sheet
   * Journal   - open journal sheet
   *
   * @public
   * @memberof hookEvents
   * @param {Hotbar} (unused)    - the instance of the Hotbar object provided by Foundry
   * @param {Object} data        - a trimmed object representing what dragged
   * @param {Number} slot        - The slot # that was dragged to
   * @return {Null}
   */
  Hooks.on("hotbarDrop", (_, data, slot) => {
    const document = fromUuidSync(data.uuid);
    const macroObject = {
      name: `${game.user.name} - ${document.name}`, // Prepend the user's name to prevent duplicates with different permissions.
      type: "script",
      img: document.img,
      command: `Hotbar.toggleDocumentSheet("${document.uuid}")`,
    };
    let macro = null;
    let command = `Hotbar.toggleDocumentSheet("${document.uuid}")`;
    switch (data.type) {
      case "Item":
        {
          // Create item macro if rollable item - weapon, cyberware weapon or skill
          if (
            document.type !== "weapon" &&
            !(document.type === "cyberware" && document.system.isWeapon) &&
            !(
              document.type === "itemUpgrade" &&
              document.system.modifiers.secondaryWeapon.configured
            ) &&
            document.type !== "skill"
          ) {
            break;
          }
          command =
            "// Set this to true if you want to skip the roll verify prompt.\n";
          command +=
            "// Do not delete the semi-colon at the end of the line!\n";
          command += "const skipPrompt = false;\n";
          command += "\n";
          const itemName = document.name
            .replace(/\\/g, "\\\\")
            .replace(/\\([\s\S])|(")/g, "\\$1$2");
          if (
            document.type === "weapon" ||
            (document.type === "cyberware" && document.system.isWeapon) ||
            (document.type === "itemUpgrade" &&
              document.system.modifiers.secondaryWeapon.configured)
          ) {
            command +=
              "// The roll type of the weapon for this macro is configurable.\n";
            command +=
              "// By default, we do the standard attack, however the rollType,\n";
            command +=
              "// may be configured by setting it to a different value:\n";
            command += "//\n";
            command +=
              "// damage - Set the rollType to this to roll damage instead of an attack\n";
            command += "//\n";
            if (document.system.isRanged) {
              command +=
                "// For ranged weapons, you can configure a number of alternate fire:\n";
              command += "// attacks:\n";
              command += "//\n";
              command += "// aimed       - Performs an aimed shot\n";
              command += "// autofire    - Performs an autofire attack,\n";
              command +=
                "//               use only for SMG types and Assault Rifles\n";
              command +=
                "// suppressive - Performs a suppressive fire attack,\n";
              command +=
                "//               use only for SMG types and Assault Rifles\n";
              command += "//\n";
            }
            command +=
              '// Simply change the "attack" to one of the above to change the function.\n';
            command += "\n";
            command += 'const rollType = "attack";\n';
            command += "\n";
            command += "// Do not edit anything below this line, please.\n";
            command += "\n";
            command += `game.cpr.macro.rollItemMacro("${itemName}", {skipPrompt, rollType});`;
          } else if (document.type === "skill") {
            command += `game.cpr.macro.rollItemMacro("${itemName}", {skipPrompt});`;
          }
          macroObject.command = command;

          macroObject.img =
            document.type === "skill"
              ? `systems/${game.system.id}/icons/chip-skill.png`
              : document.img;
        }
        break;
      case "JournalEntry":
        macroObject.img = `systems/${game.system.id}/icons/memory-card.svg`;
        break;
      case "Macro":
        return true;
      default:
        break;
    }

    macro = game.macros.contents.find(
      (m) => m.name === macroObject.name && m.command === command && m.isOwner
    );

    if (!macro) {
      Macro.create(macroObject, { displaySheet: false }).then((newMacro) => {
        game.user.assignHotbarMacro(newMacro, slot);
      });
    } else {
      game.user.assignHotbarMacro(macro, slot);
    }

    return false;
  });
};

export default hotbarHooks;
