import SystemUtils from "../utils/cpr-systemUtils.js";

export default class LedgerEditPrompt {
  static async RenderPrompt(title) {
    return new Promise((resolve, reject) => {
      renderTemplate(
        `systems/${game.system.id}/templates/dialog/cpr-ledger-edit-prompt.hbs`
      ).then((html) => {
        const _onCancel = () => {
          reject(new Error("Promise rejected: Window Closed"));
        };
        // eslint-disable-next-line no-shadow
        const _onConfirm = (html) => {
          const fd = new FormDataExtended(html.find("form")[0]);
          const formData = foundry.utils.expandObject(fd.object);
          resolve(formData);
        };
        new Dialog({
          title: SystemUtils.Localize(title),
          content: html,
          buttons: {
            confirm: {
              icon: '<i class="fas fa-check"></i>',
              label: SystemUtils.Localize("CPR.dialog.common.confirm"),
              // eslint-disable-next-line no-shadow
              callback: (html) => _onConfirm(html),
            },
            cancel: {
              icon: '<i class="fas fa-xmark"></i>',
              label: SystemUtils.Localize("CPR.dialog.common.cancel"),
              callback: () => _onCancel(html),
            },
          },
          default: "confirm",
          close: () => {
            reject(new Error("Promise rejected: Window Closed"));
          },
        }).render(true);
      });
    });
  }
}
