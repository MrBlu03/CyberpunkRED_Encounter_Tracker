const HideBlindRolls = () => {
  /**
   * Inject UI "tags" for rolls and whispers make it more clear that private
   * messages are being sent or received.
   *
   * @public
   * @memberof hookEvents
   * @param {ChatMessageData} (unused) - an instance of the ChatMessageData object
   * @param {object} html              - the HTML DOM of the chat card
   * @param {string} msg (unused)      - our simulation of the ChatData object
   */
  Hooks.on("renderChatMessage", async (_, html) => {
    // Do not display "Blind" chat cards to non-gm
    // Foundry doesn't support blind chat messages so this is how we get around
    // that.
    if (html.hasClass("blind") && !game.user.isGM) {
      // Remove header so Foundry does not attempt to update its timestamp
      html.find(".message-header").remove();
      html.html("").css("display", "none");
    }
  });
};

export default HideBlindRolls;
