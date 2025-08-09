import LOGGER from "../utils/cpr-logger.js";

export default function preloadHandlebarsTemplates() {
  LOGGER.log("Calling Preload Handlebars");
  return loadTemplates([
    // Actor: Character - Left Pane
    `systems/${game.system.id}/templates/actor/character/cpr-left-pane.hbs`,
    `systems/${game.system.id}/templates/actor/character/left-pane/cpr-left-pane-info.hbs`,
    `systems/${game.system.id}/templates/actor/character/left-pane/cpr-left-pane-stats.hbs`,

    // Actor: Character - Right Pane
    `systems/${game.system.id}/templates/actor/character/cpr-right-pane.hbs`,
    `systems/${game.system.id}/templates/actor/character/right-pane/cpr-cyberware.hbs`,
    `systems/${game.system.id}/templates/actor/character/right-pane/cpr-effects.hbs`,
    `systems/${game.system.id}/templates/actor/character/right-pane/cpr-gear.hbs`,
    `systems/${game.system.id}/templates/actor/character/right-pane/cpr-skills.hbs`,

    // Actor: Character - Bottom Pane
    `systems/${game.system.id}/templates/actor/character/cpr-bottom-pane.hbs`,

    `systems/${game.system.id}/templates/actor/character/bottom-pane/cpr-fight-tab.hbs`,
    `systems/${game.system.id}/templates/actor/character/bottom-pane/cpr-lifepath-tab.hbs`,
    `systems/${game.system.id}/templates/actor/character/bottom-pane/cpr-role-tab.hbs`,
    `systems/${game.system.id}/templates/actor/character/bottom-pane/fight/cpr-criticalInjuries.hbs`,

    // Actor: Character - Skill Tab
    `systems/${game.system.id}/templates/actor/character/right-pane/tabs/skills/cpr-skills-category.hbs`,

    // Actor: Character - Gear Tab
    `systems/${game.system.id}/templates/actor/character/right-pane/tabs/gear/cpr-ammo-content.hbs`,
    `systems/${game.system.id}/templates/actor/character/right-pane/tabs/gear/cpr-armor-content.hbs`,
    `systems/${game.system.id}/templates/actor/character/right-pane/tabs/gear/cpr-clothing-content.hbs`,
    `systems/${game.system.id}/templates/actor/character/right-pane/tabs/gear/cpr-cyberdeck-content.hbs`,
    `systems/${game.system.id}/templates/actor/character/right-pane/tabs/gear/cpr-cyberware-content.hbs`,
    `systems/${game.system.id}/templates/actor/character/right-pane/tabs/gear/cpr-cyberware-content.hbs`,
    `systems/${game.system.id}/templates/actor/character/right-pane/tabs/gear/cpr-drug-content.hbs`,
    `systems/${game.system.id}/templates/actor/character/right-pane/tabs/gear/cpr-gear-content.hbs`,
    `systems/${game.system.id}/templates/actor/character/right-pane/tabs/gear/cpr-itemUpgrade-content.hbs`,
    `systems/${game.system.id}/templates/actor/character/right-pane/tabs/gear/cpr-netarch-content.hbs`,
    `systems/${game.system.id}/templates/actor/character/right-pane/tabs/gear/cpr-program-content.hbs`,
    `systems/${game.system.id}/templates/actor/character/right-pane/tabs/gear/cpr-program-content.hbs`,
    `systems/${game.system.id}/templates/actor/character/right-pane/tabs/gear/cpr-vehicle-content.hbs`,
    `systems/${game.system.id}/templates/actor/character/right-pane/tabs/gear/cpr-weapon-content.hbs`,

    // Actor: Character - Cyberware Tab
    `systems/${game.system.id}/templates/actor/character/right-pane/tabs/cyberware/cpr-cyberware-content.hbs`,
    `systems/${game.system.id}/templates/actor/character/right-pane/tabs/cyberware/cpr-cyberware-foundational-content.hbs`,
    `systems/${game.system.id}/templates/actor/character/right-pane/tabs/cyberware/cpr-cyberware-optional-content.hbs`,

    // Actor: Character - Debug
    `systems/${game.system.id}/templates/actor/character/debug/cpr-item-debug.hbs`,

    // Actor: Mixins - Actions
    `systems/${game.system.id}/templates/actor/mixin/actions/cpr-actions.hbs`,
    `systems/${game.system.id}/templates/actor/mixin/actions/cpr-dv-glyph.hbs`,
    `systems/${game.system.id}/templates/actor/mixin/actions/cpr-changeAmmo-glyph.hbs`,
    `systems/${game.system.id}/templates/actor/mixin/actions/cpr-equip-glyph.hbs`,
    `systems/${game.system.id}/templates/actor/mixin/actions/cpr-install-cyberware-glyph.hbs`,
    `systems/${game.system.id}/templates/actor/mixin/actions/cpr-install-item-glyph.hbs`,
    `systems/${game.system.id}/templates/actor/mixin/actions/cpr-install-programs-glyph.hbs`,
    `systems/${game.system.id}/templates/actor/mixin/actions/cpr-reload-glyph.hbs`,
    `systems/${game.system.id}/templates/actor/mixin/actions/cpr-repair-glyph.hbs`,
    `systems/${game.system.id}/templates/actor/mixin/actions/cpr-snort-glyph.hbs`,
    `systems/${game.system.id}/templates/actor/mixin/actions/cpr-split-item.hbs`,
    `systems/${game.system.id}/templates/actor/mixin/actions/cpr-uninstall-glyph.hbs`,
    `systems/${game.system.id}/templates/actor/mixin/actions/cpr-upgrade-glyph.hbs`,

    // Actor: Mixins - Fight
    `systems/${game.system.id}/templates/actor/mixin/fight/cpr-armor-list.hbs`,
    `systems/${game.system.id}/templates/actor/mixin/fight/cpr-weapons-list.hbs`,
    `systems/${game.system.id}/templates/actor/mixin/fight/mixin/cpr-armor.hbs`,
    `systems/${game.system.id}/templates/actor/mixin/fight/mixin/cpr-weapon.hbs`,
    `systems/${game.system.id}/templates/actor/mixin/fight/mixin/cpr-armor-location.hbs`,

    // Actor: Mixins: Netrunning
    `systems/${game.system.id}/templates/actor/mixin/netrunning/cpr-installedPrograms.hbs`,
    `systems/${game.system.id}/templates/actor/mixin/netrunning/cpr-netActions.hbs`,
    `systems/${game.system.id}/templates/actor/mixin/netrunning/cpr-rezzedPrograms.hbs`,

    // Actor: Mook - Sheet
    `systems/${game.system.id}/templates/actor/mook/cpr-mook-criticalInjury.hbs`,
    `systems/${game.system.id}/templates/actor/mook/cpr-mook-cyberware-optional.hbs`,
    `systems/${game.system.id}/templates/actor/mook/cpr-mook-gear.hbs`,
    `systems/${game.system.id}/templates/actor/mook/cpr-mook-image.hbs`,
    `systems/${game.system.id}/templates/actor/mook/cpr-mook-program.hbs`,
    `systems/${game.system.id}/templates/actor/mook/cpr-mook-skills.hbs`,
    `systems/${game.system.id}/templates/actor/mook/cpr-mook-stats.hbs`,

    // Actor: Container - Sheet
    `systems/${game.system.id}/templates/actor/container/cpr-container-actions.hbs`,
    `systems/${game.system.id}/templates/actor/container/cpr-item-content.hbs`,
    `systems/${game.system.id}/templates/actor/cpr-container-sheet.hbs`,

    // Chat: Partials
    `systems/${game.system.id}/templates/chat/cpr-base-rollcard.hbs`,
    `systems/${game.system.id}/templates/chat/cpr-damage-application-card.hbs`,
    `systems/${game.system.id}/templates/chat/cpr-damage-rollcard.hbs`,
    `systems/${game.system.id}/templates/chat/cpr-rollcard-modifiers.hbs`,

    // Dialog: Partials
    `systems/${game.system.id}/templates/dialog/cpr-default-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-damage-application-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-dialog-buttons.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-install-cyberware-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-ledger-deletion-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-ledger-edit-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-ledger-form.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-load-ammo-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-mod-mook-skill-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-mook-name-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-role-ability-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-roll-critical-injury-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-select-compatible-ammo-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-select-role-bonuses-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-split-item-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/cpr-update-announcement.hbs`,
    `systems/${game.system.id}/templates/dialog/rolls/cpr-additional-modifiers.hbs`,
    `systems/${game.system.id}/templates/dialog/rolls/cpr-all-modifiers.hbs`,
    `systems/${game.system.id}/templates/dialog/rolls/cpr-base-verify-roll-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/rolls/cpr-situational-modifiers.hbs`,
    `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-roll-damage-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-roll-deathsave-prompt.hbs`,
    `systems/${game.system.id}/templates/dialog/rolls/cpr-verify-roll-roleAbility-prompt.hbs`,
    // Dialog: Migration App
    `systems/${game.system.id}/templates/migration/compendia-selection.hbs`,
    `systems/${game.system.id}/templates/migration/migration-buttons.hbs`,
    // Dialog: Miscellaneous
    `systems/${game.system.id}/templates/progress-bar.hbs`,

    // Item: Sheet
    `systems/${game.system.id}/templates/item/cpr-item-description.hbs`,
    `systems/${game.system.id}/templates/item/cpr-item-effects.hbs`,
    `systems/${game.system.id}/templates/item/cpr-item-name.hbs`,
    `systems/${game.system.id}/templates/item/cpr-item-settings.hbs`,
    `systems/${game.system.id}/templates/item/cpr-item-sheet.hbs`,

    // Item: Description - Mixins
    `systems/${game.system.id}/templates/item/description/mixin/cpr-attackable.hbs`,
    `systems/${game.system.id}/templates/item/description/mixin/cpr-container.hbs`,
    `systems/${game.system.id}/templates/item/description/mixin/cpr-effects.hbs`,
    `systems/${game.system.id}/templates/item/description/mixin/cpr-electronic.hbs`,
    `systems/${game.system.id}/templates/item/description/mixin/cpr-equippable.hbs`,
    `systems/${game.system.id}/templates/item/description/mixin/cpr-installable.hbs`,
    `systems/${game.system.id}/templates/item/description/mixin/cpr-loadable.hbs`,
    `systems/${game.system.id}/templates/item/description/mixin/cpr-physical.hbs`,
    `systems/${game.system.id}/templates/item/description/mixin/cpr-quality.hbs`,
    `systems/${game.system.id}/templates/item/description/mixin/cpr-stackable.hbs`,
    `systems/${game.system.id}/templates/item/description/mixin/cpr-upgradable.hbs`,
    `systems/${game.system.id}/templates/item/description/mixin/cpr-valuable.hbs`,

    // Item: Description - Types
    `systems/${game.system.id}/templates/item/description/cpr-ammo.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-armor.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-clothing.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-criticalInjury.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-cyberdeck.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-cyberware.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-drug.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-gear.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-itemUpgrade.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-netarch.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-program.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-role.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-skill.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-vehicle.hbs`,
    `systems/${game.system.id}/templates/item/description/cpr-weapon.hbs`,

    // Item: Settings - Mixins
    `systems/${game.system.id}/templates/item/settings/mixin/cpr-attackable.hbs`,
    `systems/${game.system.id}/templates/item/settings/mixin/cpr-container.hbs`,
    `systems/${game.system.id}/templates/item/settings/mixin/cpr-equippable.hbs`,
    `systems/${game.system.id}/templates/item/settings/mixin/cpr-electronic.hbs`,
    `systems/${game.system.id}/templates/item/settings/mixin/cpr-loadable.hbs`,
    `systems/${game.system.id}/templates/item/settings/mixin/cpr-installable.hbs`,
    `systems/${game.system.id}/templates/item/settings/mixin/cpr-loadable.hbs`,
    `systems/${game.system.id}/templates/item/settings/mixin/cpr-physical.hbs`,
    `systems/${game.system.id}/templates/item/settings/mixin/cpr-quality.hbs`,
    `systems/${game.system.id}/templates/item/settings/mixin/cpr-stackable.hbs`,
    `systems/${game.system.id}/templates/item/settings/mixin/cpr-upgradable.hbs`,
    `systems/${game.system.id}/templates/item/settings/mixin/cpr-valuable.hbs`,

    // Items: Settings - Types
    `systems/${game.system.id}/templates/item/settings/cpr-ammo.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-armor.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-clothing.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-criticalInjury.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-cyberdeck.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-cyberware.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-drug.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-gear.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-itemUpgrade.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-netarch.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-program.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-role.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-skill.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-vehicle.hbs`,
    `systems/${game.system.id}/templates/item/settings/cpr-weapon.hbs`,

    // Active Effects Sheet
    `systems/${game.system.id}/templates/effects/cpr-active-effect-sheet.hbs`,
  ]);
}
