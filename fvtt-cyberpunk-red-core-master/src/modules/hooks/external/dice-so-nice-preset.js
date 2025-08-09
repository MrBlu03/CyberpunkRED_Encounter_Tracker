import SystemUtils from "../../utils/cpr-systemUtils.js";

const InitializeDSNPreset = () => {
  /**
   * Hook to create Q-Workshop's CyberpunkRED branded dice set into DsN options.
   * See CREDITS.md for attribution.
   * https://foundryvtt.com/packages/dice-so-nice/
   * @public
   * @memberof hookEvents
   */
  Hooks.once("diceSoNiceReady", (dice3d) => {
    /**
     * Register a new system
     * The id is to be used with the addDicePreset method
     * The name can be a localized string
     * The group is a string that is only used to group multiple systems in the system list. Could be the name of the brand, or of a collection
     * @param {Object} system {id, name, group}
     * @param {String} mode "preferred", "default". "preferred" will enable this system by default until a user changes it to anything else.
     * Default will add the system as a choice left to each user.
     */
    dice3d.addSystem(
      {
        id: "CRPQWL",
        name: SystemUtils.Localize("CPR.module.dsn.themeBrandedLogo"),
        group: SystemUtils.Localize("CPR.module.dsn.groupName"),
      },
      "preferred"
    );
    dice3d.addSystem(
      {
        id: "CRPQWN",
        name: SystemUtils.Localize("CPR.module.dsn.themeNumbersOnly"),
        group: SystemUtils.Localize("CPR.module.dsn.groupName"),
      },
      "default"
    );
    /**
     * Add a colorset (theme)
     * @param {Object} colorset (see below)
     * @param {String} mode= "default","preferred"
     * The "mode" parameter have 2 modes :
     * - "default" only register the colorset
     * - "preferred" apply the colorset if the player didn't already change his dice appearance for this world.
     */

    // This will add the user's color as a default while turning edges black.
    dice3d.addColorset(
      {
        name: "user",
        description: SystemUtils.Localize("CPR.module.dsn.colorsetDefault"),
        category: SystemUtils.Localize("CPR.module.dsn.groupName"),
        background: game.user.color.toString(16), // Omitting the background turns the numbers black.
        edge: "#000000",
        material: "glass",
      },
      "preferred"
    );

    dice3d.addColorset(
      {
        name: "red",
        description: SystemUtils.Localize("CPR.module.dsn.colorsetRed"),
        category: SystemUtils.Localize("CPR.module.dsn.groupName"),
        background: "#E64539",
        edge: "#000000",
        material: "glass",
      },
      "default"
    );

    dice3d.addColorset(
      {
        name: "yellow",
        description: SystemUtils.Localize("CPR.module.dsn.colorsetYellow"),
        category: SystemUtils.Localize("CPR.module.dsn.groupName"),
        background: "#FFF300",
        edge: "#000000",
        material: "glass",
      },
      "default"
    );

    /**
     * Register a new dice preset
     * @param {Object} data: The informations on the new dice preset (see below)
     * @param {String} (Optional) shape: should be explicit when using a custom die term.
     *                                   Supported shapes are d2,d4,d6,d8,d10,d12,d14,d16,d20,d24,d30
     */

    // dice with CP logo
    dice3d.addDicePreset({
      type: "df",
      labels: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/dfm.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/df.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/dfp.webp`,
      ],
      bumpMaps: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/dfmb.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/dfb.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/dfpb.webp`,
      ],
      system: "CRPQWL",
    });

    dice3d.addDicePreset({
      type: "d2",
      labels: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d2-1.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d2-2.webp`,
      ],
      bumpMaps: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d2-1b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d2-2b.webp`,
      ],
      system: "CRPQWL",
    });

    dice3d.addDicePreset({
      type: "dc",
      labels: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/dc-tails.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/dc-heads.webp`,
      ],
      bumpMaps: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/dc-tails-b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/dc-heads-b.webp`,
      ],
      system: "CRPQWL",
    });

    dice3d.addDicePreset({
      type: "d4",
      labels: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d4-1.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d4-2.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d4-3.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d4-4.webp`,
      ],
      system: "CRPQWL",
    });

    dice3d.addDicePreset({
      type: "d6",
      labels: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d6-1.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d6-2.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d6-3.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d6-4.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d6-5.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d6-logo.webp`,
      ],
      bumpMaps: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d6-1b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d6-2b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d6-3b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d6-4b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d6-5b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d6-logo-b.webp`,
      ],
      system: "CRPQWL",
    });

    dice3d.addDicePreset({
      type: "d8",
      labels: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d8-1.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d8-2.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d8-3.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d8-4.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d8-5.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d8-6.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d8-7.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d8-logo.webp`,
      ],
      bumpMaps: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d8-1b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d8-2b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d8-3b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d8-4b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d8-5b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d8-6b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d8-7b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d8-logo-b.webp`,
      ],
      system: "CRPQWL",
    });

    dice3d.addDicePreset({
      type: "d10",
      labels: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d10-1.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d10-2.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d10-3.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d10-4.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d10-5.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d10-6.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d10-7.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d10-8.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d10-9.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d10-logo.webp`,
      ],
      bumpMaps: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d10-1b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d10-2b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d10-3b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d10-4b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d10-5b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d10-6b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d10-7b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d10-8b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d10-9b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d10-logo-b.webp`,
      ],
      system: "CRPQWL",
    });

    dice3d.addDicePreset({
      type: "d12",
      labels: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-1.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-2.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-3.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-4.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-5.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-6.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-7.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-8.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-9.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-10.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-11.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-logo.webp`,
      ],
      bumpMaps: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-1b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-2b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-3b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-4b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-5b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-6b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-7b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-8b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-9b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-10b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-11b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-logo-b.webp`,
      ],
      system: "CRPQWL",
    });

    dice3d.addDicePreset({
      type: "d100",
      labels: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d100-10.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d100-20.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d100-30.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d100-40.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d100-50.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d100-60.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d100-70.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d100-80.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d100-90.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d100-logo.webp`,
      ],
      bumpMaps: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d100-10b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d100-20b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d100-30b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d100-40b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d100-50b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d100-60b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d100-70b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d100-80b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d100-90b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d100-logo-b.webp`,
      ],
      system: "CRPQWL",
    });

    dice3d.addDicePreset({
      type: "d20",
      labels: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-1.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-2.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-3.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-4.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-5.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-6.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-7.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-8.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-9.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-10.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-11.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-12.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-13.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-14.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-15.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-16.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-17.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-18.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-19.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-logo.webp`,
      ],
      bumpMaps: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-1b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-2b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-3b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-4b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-5b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-6b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-7b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-8b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-9b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-10b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-11b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-12b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-13b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-14b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-15b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-16b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-17b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-18b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-19b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-logo-b.webp`,
      ],
      system: "CRPQWL",
    });

    // dice with high-number
    dice3d.addDicePreset({
      type: "df",
      labels: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/dfm.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/df.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/dfp.webp`,
      ],
      bumpMaps: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/dfmb.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/dfb.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/dfpb.webp`,
      ],
      system: "CRPQWN",
    });

    dice3d.addDicePreset({
      type: "d2",
      labels: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d2-1.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d2-2.webp`,
      ],
      bumpMaps: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d2-1b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d2-2b.webp`,
      ],
      system: "CRPQWN",
    });

    dice3d.addDicePreset({
      type: "dc",
      labels: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/dc-tails.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/dc-heads.webp`,
      ],
      bumpMaps: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/dc-tails-b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/dc-heads-b.webp`,
      ],
      system: "CRPQWN",
    });

    dice3d.addDicePreset({
      type: "d4",
      labels: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d4-1.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d4-2.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d4-3.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d4-4.webp`,
      ],
      system: "CRPQWN",
    });

    dice3d.addDicePreset({
      type: "d6",
      labels: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d6-1.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d6-2.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d6-3.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d6-4.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d6-5.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d6-6.webp`,
      ],
      bumpMaps: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d6-1b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d6-2b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d6-3b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d6-4b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d6-5b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d6-6b.webp`,
      ],
      system: "CRPQWN",
    });

    dice3d.addDicePreset({
      type: "d8",
      labels: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d8-1.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d8-2.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d8-3.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d8-4.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d8-5.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d8-6.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d8-7.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d8-8.webp`,
      ],
      bumpMaps: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d8-1b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d8-2b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d8-3b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d8-4b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d8-5b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d8-6b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d8-7b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d8-8b.webp`,
      ],
      system: "CRPQWN",
    });

    dice3d.addDicePreset({
      type: "d10",
      labels: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d10-1.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d10-2.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d10-3.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d10-4.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d10-5.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d10-6.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d10-7.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d10-8.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d10-9.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d10-10.webp`,
      ],
      bumpMaps: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d10-1b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d10-2b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d10-3b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d10-4b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d10-5b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d10-6b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d10-7b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d10-8b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d10-9b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d10-10b.webp`,
      ],
      system: "CRPQWN",
    });

    dice3d.addDicePreset({
      type: "d12",
      labels: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-1.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-2.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-3.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-4.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-5.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-6.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-7.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-8.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-9.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-10.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-11.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d12-12.webp`,
      ],
      bumpMaps: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-1b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-2b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-3b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-4b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-5b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-6b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-7b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-8b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-9b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-10b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-11b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d12-12b.webp`,
      ],
      system: "CRPQWN",
    });

    dice3d.addDicePreset({
      type: "d100",
      labels: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d100-10.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d100-20.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d100-30.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d100-40.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d100-50.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d100-60.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d100-70.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d100-80.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d100-90.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d100-100.webp`,
      ],
      bumpMaps: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d100-10b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d100-20b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d100-30b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d100-40b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d100-50b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d100-60b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d100-70b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d100-80b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d100-90b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d100-100b.webp`,
      ],
      system: "CRPQWN",
    });

    dice3d.addDicePreset({
      type: "d20",
      labels: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-1.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-2.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-3.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-4.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-5.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-6.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-7.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-8.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-9.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-10.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-11.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-12.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-13.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-14.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-15.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-16.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-17.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-18.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-19.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/faces/d20-20.webp`,
      ],
      bumpMaps: [
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-1b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-2b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-3b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-4b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-5b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-6b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-7b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-8b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-9b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-10b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-11b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-12b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-13b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-14b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-15b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-16b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-17b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-18b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-19b.webp`,
        `systems/${game.system.id}/icons/dice/dice-so-nice/bump/d20-20b.webp`,
      ],
      system: "CRPQWN",
    });
  });
};

export default InitializeDSNPreset;
