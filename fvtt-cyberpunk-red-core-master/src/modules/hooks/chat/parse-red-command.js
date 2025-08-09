import CPRChat from "../../chat/cpr-chat.js";

const ParseRedCommand = () => {
  /**
   * Intercept the chat message text and check if the /red command was invoked.
   * If it was, handle it.
   *
   * @public
   * @memberof hookEvents
   * @param {ChatLog} (unused)     - an instance of the ChatLog object
   * @param {object} message       - the text of the message sent
   * @return {boolean|void}        - Explicitly return false to prevent creation
   *                                 of this Document
   */
  Hooks.on("chatMessage", (_, message) => {
    if (message !== undefined && message.startsWith("/red")) {
      const fragment = message.slice(4);
      CPRChat.HandleCPRCommand(fragment);
      // do not continue further processing of the ChatMessage
      return false;
    }
    // permit Foundry to display the chat message we caught as-is
    return true;
  });
};

export default ParseRedCommand;
