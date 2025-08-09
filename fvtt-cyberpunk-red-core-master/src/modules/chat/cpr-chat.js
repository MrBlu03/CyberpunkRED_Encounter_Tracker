import LOGGER from "../utils/cpr-logger.js";
import { CPRRoll, CPRDamageRoll, CPRInitiative } from "../rolls/cpr-rolls.js";
import SystemUtils from "../utils/cpr-systemUtils.js";
import CPRDialog from "../dialog/cpr-dialog-application.js";

/**
 * For the sake of aesthetics, we have a class for Chat cards. It wraps around
 * ChatMessage, but note it does not actually extend the Foundry-provided class.
 */
export default class CPRChat {
  /**
   * Set up chat data in a manner similar to Foundry ChatMessages
   *
   * @static
   * @param {*} content - html content of the chat message
   * @param {*} modeOverride - a means to override the "roll mode" (blind, private, etc)
   * @param {*} forceWhisper - a flag forcing the chat message to be a whisper
   * @param {*} isRoll - a flag indicating whether the chat message is from a dice roll
   * @returns {*} - object encapsulating chat message data
   */
  static ChatDataSetup(content, modeOverride, forceWhisper, isRoll = false) {
    const chatData = {
      user: game.user.id,
      rollMode: modeOverride || game.settings.get("core", "rollMode"),
      content,
    };

    if (isRoll) {
      chatData.sound = CONFIG.sounds.dice;
    }

    if (["gmroll", "blindroll"].includes(chatData.rollMode)) {
      chatData.whisper = ChatMessage.getWhisperRecipients("GM").map(
        (u) => u.id
      );
    }

    if (chatData.rollMode === "blindroll") {
      chatData.blind = true;
    } else if (chatData.rollMode === "selfroll") {
      chatData.whisper = [game.user];
    }

    if (forceWhisper) {
      chatData.speaker = ChatMessage.getSpeaker();
      chatData.whisper = ChatMessage.getWhisperRecipients(forceWhisper);
    }

    return chatData;
  }

  /**
   * Render a chat message meant to show dice results. Often called Roll Cards.
   *
   * @static
   * @param {} cprRoll - from cpr-roll.js, a custom roll object that includes the results
   * @returns - a created chat message
   */
  static RenderRollCard(incomingRoll) {
    const cprRoll = incomingRoll;

    cprRoll.criticalCard = cprRoll.wasCritical();
    if (cprRoll instanceof CPRInitiative && !cprRoll.calculateCritical) {
      cprRoll.criticalCard = false;
    }

    return renderTemplate(cprRoll.rollCard, cprRoll).then((html) => {
      const chatOptions = this.ChatDataSetup(html);

      if (cprRoll.entityData !== undefined && cprRoll.entityData !== null) {
        let actor;
        const actorId = cprRoll.entityData.actor;
        const tokenId = cprRoll.entityData.token;
        if (tokenId) {
          actor = Object.keys(game.actors.tokens).includes(tokenId)
            ? game.actors.tokens[tokenId]
            : game.actors.find((a) => a.id === actorId);
        } else {
          [actor] = game.actors.filter((a) => a.id === actorId);
        }
        const alias = actor.name;
        chatOptions.speaker = { actor, alias };
      }
      return ChatMessage.create(chatOptions);
    });
  }

  /**
   * Render an "item card" for an item linked to chat.
   *
   * This implementation has an edge-case design flaw. The content of item descriptions can
   * be any length, and this code arbitrarily limits it to 5000 characters to avoid excessively
   * long chat messages. The content of a chat message (and an Item card) is html though, so
   * the 5000 character limit might cut right into an html tag, creating bizarre UI results.
   * This design is not fixable with built-in JavaScript because html is a context-free language.
   * Neither regular expressions nor built-in parsers can reliably parse html.
   *
   * The real fix is to either store non-html versions of the item description on the item, or
   * bring in a more serious parser as a 3rd party module.
   *
   * @static
   * @param {*} item - an Item object representing the item to render details about.
   * @returns - the rendered template that will be displayed
   */
  static RenderItemCard(item) {
    const trimmedItem = item;
    const itemTemplate = `systems/${game.system.id}/templates/item/cpr-item-roll-card.hbs`;

    // trim strings so layout does not get too goofy
    const maxNameLen = 16;
    trimmedItem.trimName = item.name;
    if (trimmedItem.name === null || trimmedItem.trimName.length > maxNameLen) {
      trimmedItem.trimName = `${trimmedItem.trimName.slice(
        0,
        maxNameLen - 1
      )}…`;
    }
    const maxDescLen = 5000;
    trimmedItem.trimDesc = item.system.description.value;
    if (trimmedItem.trimDesc === null || trimmedItem.trimDesc.length === 0) {
      trimmedItem.trimDesc = "(No description)";
    } else if (trimmedItem.trimDesc.length > maxDescLen) {
      // here is the dangerous code
      trimmedItem.trimDesc = `${trimmedItem.trimDesc.slice(
        0,
        maxDescLen - 1
      )}…`;
    }

    return renderTemplate(itemTemplate, trimmedItem).then((html) => {
      const chatOptions = this.ChatDataSetup(html);
      if (item.entityData !== undefined && item.entityData !== null) {
        const actor = game.actors.filter(
          (a) => a.id === item.entityData.actor
        )[0];
        let alias = actor.name;
        if (item.entityData.token !== null) {
          const token = game.actors.tokens[item.entityData.token];
          if (token !== undefined) {
            alias = token.name;
          }
        }
        chatOptions.speaker = { actor, alias };
      }
      return ChatMessage.create(chatOptions, false);
    });
  }

  /**
   * When damage is applied to an actor using the glyph on a damage card, we render another
   * chat card indicating the damage dealth and armor ablation.
   *
   * @param {Object} damageData - details about the damage dealt
   * @returns ChatMessage
   */
  static RenderDamageApplicationCard(damageData) {
    const damageApplicationTemplate = `systems/${game.system.id}/templates/chat/cpr-damage-application-card.hbs`;

    return renderTemplate(damageApplicationTemplate, damageData).then(
      (html) => {
        const chatOptions = this.ChatDataSetup(html);

        if (
          damageData.entityData !== undefined &&
          damageData.entityData !== null
        ) {
          let actor;
          const actorId = damageData.entityData.actor;
          const tokenId = damageData.entityData.token;
          if (tokenId) {
            actor = Object.keys(game.actors.tokens).includes(tokenId)
              ? game.actors.tokens[tokenId]
              : game.actors.find((a) => a.id === actorId);
          } else {
            [actor] = game.actors.filter((a) => a.id === actorId);
          }
          const alias = actor.name;
          chatOptions.speaker = { actor, alias };
        }
        return ChatMessage.create(chatOptions);
      }
    );
  }

  /**
   * Process a /red command typed into chat. This rolls dice based on arguments
   * passed in, among other things.
   *
   * @async
   * @static
   * @param {*} data - a string of whatever the user typed in with /red
   */
  static async HandleCPRCommand(data) {
    // First, let's see if we can figure out what was passed to /red
    // Right now, we will assume it is a roll
    const modifiersRegex = /[+-][0-9][0-9]*/;
    const diceRegex = /[0-9][0-9]*d[0-9][0-9]*/;
    const ablationRegex = /a[0-9][0-9]*/;
    let formula = "1d10";
    let rollDescription = "";
    if (data.includes("#")) {
      rollDescription = data.slice(data.indexOf("#") + 1);
    }
    if (data.match(diceRegex)) {
      [formula] = data.match(diceRegex);
    }
    if (data.match(modifiersRegex)) {
      const formulaModifiers = data.match(modifiersRegex);
      formula = `${formula}${formulaModifiers}`;
    }
    if (formula) {
      let cprRoll;
      if (formula.includes("d6")) {
        let ablation = 1;
        if (data.match(ablationRegex)) {
          [ablation] = data.match(ablationRegex);
          ablation = ablation.slice(1);
        }
        cprRoll = new CPRDamageRoll(
          SystemUtils.Localize("CPR.rolls.roll"),
          formula
        );
        cprRoll.rollCardExtraArgs.ablationValue = ablation;
      } else {
        cprRoll = new CPRRoll(SystemUtils.Localize("CPR.rolls.roll"), formula);
      }
      if (rollDescription !== "") {
        cprRoll.rollCardExtraArgs.rollDescription = rollDescription;
      }
      if (cprRoll.die !== "d6" && cprRoll.die !== "d10") {
        cprRoll.calculateCritical = false;
        cprRoll.die = "generic";
      }
      await cprRoll.roll();
      this.RenderRollCard(cprRoll);
    }
  }

  /**
   * Provide listeners (just like on actor sheets) that do things when an element is
   * clicked. In particular here, this is for showing/hiding roll details, and rolling
   * damage.
   *
   * @async
   * @static
   * @param {*} html - html DOM
   */
  static async chatListeners(html) {
    html.on("click", ".clickable", async (event) => {
      const clickAction = SystemUtils.GetEventDatum(event, "data-action");

      switch (clickAction) {
        case "toggleVisibility": {
          const elementName = SystemUtils.GetEventDatum(
            event,
            "data-visible-element"
          );
          $(html).find(`.${elementName}`).toggleClass("hide");
          break;
        }
        case "rollDamage": {
          // This will let us click a damage link off of the attack card
          const actorId = SystemUtils.GetEventDatum(event, "data-actor-id");
          const itemId = SystemUtils.GetEventDatum(event, "data-item-id");
          const tokenId = SystemUtils.GetEventDatum(event, "data-token-id");
          const location = SystemUtils.GetEventDatum(
            event,
            "data-damage-location"
          );
          const attackType = SystemUtils.GetEventDatum(
            event,
            "data-attack-type"
          );
          const actor = Object.keys(game.actors.tokens).includes(tokenId)
            ? game.actors.tokens[tokenId]
            : game.actors.find((a) => a.id === actorId);
          const item = actor ? actor.items.find((i) => i.id === itemId) : null;
          const displayName = actor === null ? "ERROR" : actor.name;
          if (!item) {
            SystemUtils.DisplayMessage(
              "warn",
              `[${displayName}] ${SystemUtils.Localize(
                "CPR.actormissingitem"
              )} ${itemId}`
            );
            return;
          }

          // If item isn't a cyberdeck, rollType is for regular damage. If item is a cyberdeck,
          // we will roll damage through the cpr-cyberdeck.js (either through createCyberdeckRoll or createInterfaceRoll)
          let rollType =
            item.type !== "cyberdeck" ? "damage" : "cyberdeckProgram";
          let cprRoll;
          if (item.type !== "cyberdeck") {
            cprRoll = item.createRoll(rollType, actor, {
              damageType: attackType,
            });
          } else {
            const programId = SystemUtils.GetEventDatum(
              event,
              "data-program-id"
            );
            // Warn if no damage is configured.
            const program = actor.getOwnedItem(programId);
            if (
              programId !== "zap" &&
              typeof program === "object" &&
              !program.system?.damage.standard &&
              !program.system?.damage.blackIce
            ) {
              SystemUtils.DisplayMessage(
                "warn",
                SystemUtils.Localize("CPR.chat.rollDamage.warningProgramDmg")
              );
              return;
            }
            rollType = programId === "zap" ? "interfaceAbility" : rollType; // reassign rollType to "interfaceAbility" if this is a Zap roll.
            const netRoleItem = actor.itemTypes.role.find(
              (r) => r.id === actor.system.roleInfo.activeNetRole
            );
            cprRoll = item.createRoll(rollType, actor, {
              cyberdeckId: itemId,
              interfaceAbility: "zap",
              programId,
              executionType: "damage",
              netRoleItem,
            });
          }

          if (location) {
            cprRoll.location = location;
          }

          const keepRolling = await cprRoll.handleRollDialog(
            event,
            actor,
            item
          );
          if (!keepRolling) {
            return;
          }

          cprRoll = await item.confirmRoll(cprRoll);
          await cprRoll.roll();

          const targetedTokens =
            SystemUtils.getUserTargetedOrSelected("targeted"); // get user targeted tokens for output to chat
          cprRoll.entityData = {
            actor: actorId,
            token: tokenId,
            item: itemId,
            tokens: targetedTokens,
          };
          CPRChat.RenderRollCard(cprRoll);
          break;
        }
        case "itemEdit": {
          const itemId = SystemUtils.GetEventDatum(event, "data-item-id");
          const actorId = SystemUtils.GetEventDatum(event, "data-actor-id");
          const tokenId = SystemUtils.GetEventDatum(event, "data-token-id");
          const actor = Object.keys(game.actors.tokens).includes(tokenId)
            ? game.actors.tokens[tokenId]
            : game.actors.find((a) => a.id === actorId);
          const item = actor.items.find((i) => i._id === itemId);
          item.sheet.render(true, { editable: false });
          break;
        }

        // Gets injury item ID and compendium value, searches compendium pack for value and renders an item card
        case "displayInjury": {
          const injuryName = SystemUtils.GetEventDatum(event, "data-item-name");
          const injuryComp = SystemUtils.GetEventDatum(event, "data-item-comp");
          const injury = await SystemUtils.GetCompendiumDoc(
            injuryComp,
            injuryName
          );
          injury.sheet.render(true, { editable: false });
          break;
        }

        case "applyDamage": {
          this.damageApplication(event);
          break;
        }

        case "reverseDamage": {
          const actorId = SystemUtils.GetEventDatum(event, "data-actor-id");
          const tokenId = SystemUtils.GetEventDatum(event, "data-token-id");
          const hpReduction = parseInt(
            SystemUtils.GetEventDatum(event, "data-hp-reduction"),
            10
          );
          const location = SystemUtils.GetEventDatum(event, "data-location");
          const ablation = parseInt(
            SystemUtils.GetEventDatum(event, "data-ablation"),
            10
          );
          const shieldAblation = parseInt(
            SystemUtils.GetEventDatum(event, "data-shield-ablation"),
            10
          );
          const actor = Object.keys(game.actors.tokens).includes(tokenId)
            ? game.actors.tokens[tokenId]
            : game.actors.find((a) => a.id === actorId);
          actor._reverseDamage(hpReduction, location, ablation, shieldAblation);
          break;
        }
        default: {
          LOGGER.warn(`No action defined for ${clickAction}`);
        }
      }
    });
  }

  /**
   * This is called from a hook in chat.js. Whenever a chat message is displayed, a few
   * tag elements are injected into the chat message to indicate if it was a whisper, or
   * the type of roll that occurred, such as blind or self.
   *
   * There is a minor design flaw here too. This code cannot tell if the messageData is a roll
   * because CPR never sets roll information to chat messages. This is due to our Dice So Nice integration.
   *
   * @param {*} html - html DOM
   * @param {*} messageData - an object with a bunch of chat message data (see ChatDataSetup above)
   */
  static addMessageTags(html, messageData) {
    const timestampTag = html.find(".message-timestamp");
    const whisperTargets = messageData.message.whisper;
    const isBlind = messageData.message.blind || false;
    const isWhisper = whisperTargets?.length > 0 || false;
    const isSelf =
      isWhisper &&
      whisperTargets.length === 1 &&
      whisperTargets[0] === messageData.message.author;
    const indicatorElement = $("<span>");
    indicatorElement.addClass("chat-mode-indicator");

    // Inject tag to the left of the timestamp
    if (isBlind) {
      indicatorElement.text(SystemUtils.Localize("CPR.chat.blind"));
      timestampTag.before(indicatorElement);
    } else if (isSelf) {
      indicatorElement.text(SystemUtils.Localize("CPR.chat.self"));
      timestampTag.before(indicatorElement);
    } else if (isWhisper) {
      indicatorElement.text(SystemUtils.Localize("CPR.chat.whisper"));
      timestampTag.before(indicatorElement);
    }
  }

  /**
   * Handle the damage application from the chat message. It is called from the chatListeners.
   *
   * @param {*} event - event data from the chat message
   */
  static async damageApplication(event) {
    // Define a bunch of constants to be used in the rest of the function.
    const totalDamage = SystemUtils.isNumeric(
      parseInt(SystemUtils.GetEventDatum(event, "data-total-damage"), 10)
    )
      ? parseInt(SystemUtils.GetEventDatum(event, "data-total-damage"), 10)
      : 0;

    const bonusDamage = SystemUtils.isNumeric(
      parseInt(SystemUtils.GetEventDatum(event, "data-bonus-damage"), 10)
    )
      ? parseInt(SystemUtils.GetEventDatum(event, "data-bonus-damage"), 10)
      : 0;

    const damageLethal = /true/i.test(
      SystemUtils.GetEventDatum(event, "data-damage-lethal")
    );
    const ammoVariety = SystemUtils.GetEventDatum(event, "data-ammo-variety");
    let location = SystemUtils.GetEventDatum(event, "data-damage-location");
    if (location !== "head" && location !== "brain") {
      location = "body";
    }

    const ablation = SystemUtils.isNumeric(
      parseInt(SystemUtils.GetEventDatum(event, "data-ablation"), 10)
    )
      ? parseInt(SystemUtils.GetEventDatum(event, "data-ablation"), 10)
      : 0;

    const ignoreArmorPercent = SystemUtils.isNumeric(
      parseFloat(SystemUtils.GetEventDatum(event, "data-ignore-armor-percent"))
    )
      ? parseFloat(
          SystemUtils.GetEventDatum(event, "data-ignore-armor-percent")
        )
      : 0;

    const ignoreBelowSP = SystemUtils.isNumeric(
      parseInt(SystemUtils.GetEventDatum(event, "data-ignore-below-sp"), 10)
    )
      ? parseInt(SystemUtils.GetEventDatum(event, "data-ignore-below-sp"), 10)
      : 0;

    // Whether or not to show Brain Damage Reduction as an option in the DamageApplicationPrompt
    const showBrainDamageReduction = location === "brain";

    const allowedTypesMessage = `${SystemUtils.Format(
      "CPR.chat.damageApplication.prompt.allowedTypes",
      { location }
    )}`;
    const scope = SystemUtils.GetEventDatum(event, "data-scope");

    // Define dialog information.
    const dialogOptions = {
      title: SystemUtils.Localize("CPR.chat.damageApplication.prompt.title"),
      template: `systems/${game.system.id}/templates/dialog/cpr-damage-application-prompt.hbs`,
    };

    let dialogData = {
      // data to feed to _applyDamage
      damageReductionRole: true,
      damageReductionAE: true,
      useShield: true,
      brainDamageReduction: true,
      // Data for the form.
      allowedTypesMessage,
      allowedActors: [],
      showBrainDamageReduction,
    };

    // check if the button is on a single token (aka local; the list at the bottom of the damage Roll Card)
    // If not local, it can apply to multiple tokens (disregarding the list at the bottom of the damage Roll Card)
    if (scope === "local") {
      const actorId = SystemUtils.GetEventDatum(event, "data-actor-id");
      const tokenId = SystemUtils.GetEventDatum(event, "data-token-id");
      const actor = Object.keys(game.actors.tokens).includes(tokenId)
        ? game.actors.tokens[tokenId]
        : game.actors.find((a) => a.id === actorId);

      dialogData.allowedActors.push(actor);
      // eslint-disable-next-line prefer-const
      if (!event.ctrlKey) {
        // Show "Damage Application" prompt.
        dialogData = await CPRDialog.showDialog(
          dialogData,
          dialogOptions
        ).catch((err) => LOGGER.debug(err));
      }
      if (!dialogData) {
        return;
      }
      actor._applyDamage(
        totalDamage,
        bonusDamage,
        location,
        ablation,
        ammoVariety,
        ignoreArmorPercent,
        ignoreBelowSP,
        damageLethal,
        dialogData
      );
    } else {
      const tokens = SystemUtils.getUserTargetedOrSelected("selected"); // get user selected tokens
      if (tokens.length === 0) {
        SystemUtils.DisplayMessage(
          "warn",
          "CPR.chat.damageApplication.noTokenSelected"
        );
        return;
      }
      const allowedTypes = ["character", "mook", "demon", "blackIce"];
      const allowedActors = [];
      const forbiddenActors = [];
      tokens.forEach((t) => {
        const { actor } = t;
        if (allowedTypes.includes(actor.type)) {
          allowedActors.push(actor);
        } else {
          forbiddenActors.push(actor);
        }
      });
      allowedActors.sort((a, b) => (a.name > b.name ? 1 : -1));
      forbiddenActors.sort((a, b) => (a.name > b.name ? 1 : -1));

      let count = 0;
      while (count < allowedActors.length) {
        if (!dialogData) return;
        if (!event.ctrlKey) {
          dialogData.count = count;
          dialogData.allowedActors = allowedActors;
          dialogData.forbiddenActors = forbiddenActors;

          // Show "Damage Application" prompt.
          // eslint-disable-next-line no-await-in-loop
          dialogData = await CPRDialog.showDialog(
            dialogData,
            dialogOptions
          ).catch((err) => LOGGER.debug(err));
        }
        if (dialogData) {
          allowedActors[count]._applyDamage(
            totalDamage,
            bonusDamage,
            location,
            ablation,
            ammoVariety,
            ignoreArmorPercent,
            ignoreBelowSP,
            damageLethal,
            dialogData
          );
        }
        count += 1;
      }
    }
  }
}
