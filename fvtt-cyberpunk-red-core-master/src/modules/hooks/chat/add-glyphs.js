import CPRChat from "../../chat/cpr-chat.js";

const AddGlyphs = () => {
  /**
   * Enables listeners so that clickable damage glyphs work.
   *
   * @public
   * @memberof hookEvents
   * @param {ChatMessageData} (unused) - an instance of the ChatMessageData object
   * @param {object} html              - the HTML DOM of the chat card
   * @param {string} msg               - our simulation of the ChatData object
   *                                     that provides options and flags about
   *                                     the chat message
   */
  Hooks.on("renderChatMessage", async (_, html, msg) => {
    CPRChat.chatListeners(html);
    CPRChat.addMessageTags(html, msg);
  });
};

export default AddGlyphs;
