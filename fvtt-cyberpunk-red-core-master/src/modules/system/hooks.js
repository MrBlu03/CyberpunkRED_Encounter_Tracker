import LOGGER from "../utils/cpr-logger.js";

/**
 * Writing imports then exports is tedious, just add them to an array and loop
 * over them.
 *
 * NOTE: This does limit us to using default exports but that was the pattern
 * before this change anyway
 */
const hooksImports = [
  "actor/check-emp-and-luck.js",
  "actor/set-default-image.js",
  "actor/sheet/persist-section-views.js",
  "actor/sheet/resize-name.js",
  "actor/sheet/resize-type-tag.js",
  "actor/sheet/update-tracked-armor.js",
  "actor/sync-black-ice-with-program.js",
  "actor/sync-tracked-armor.js",
  "actor/update-role-from-item.js",
  "actor/update-role-on-item-delete.js",
  "chat/add-glyphs.js",
  "chat/hide-blind-rolls.js",
  "chat/parse-red-command.js",
  "external/babele.js",
  "external/dice-so-nice-preset.js",
  "external/drag-ruler.js",
  "external/popout.js",
  "foundry/delete-folder.js",
  "foundry/ui/item-folder-upgraded-display.js",
  "foundry/ui/pause-animation.js",
  "foundry/ui/theme.js",
  "hotbar/generate-item-macro.js",
  "item/role/update-sub-roles.js",
  "item/set-default-image.js",
  "setup/create-black-ice-actor.js",
  "token/add-dv-token-hud.js",
  "token/close-unlinked-sheet-on-delete.js",
  "token/warn-on-moving-locked-container.js",
];

export default async function registerHooks() {
  const basePath = "../hooks/";
  const importPromises = hooksImports.map(async (relativePath) => {
    const fullPath = basePath + relativePath;
    try {
      const module = await import(fullPath);
      return module;
    } catch (error) {
      LOGGER.error(`Error importing module from ${fullPath}:`, error);
      return null;
    }
  });

  const importedModules = await Promise.all(importPromises);

  importedModules.forEach((module) => {
    if (module && module.default) {
      module.default(); // Execute the default export function
    }
  });
}
