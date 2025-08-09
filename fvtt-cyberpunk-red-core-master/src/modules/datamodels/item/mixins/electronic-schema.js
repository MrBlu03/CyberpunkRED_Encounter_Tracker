import CPRSystemDataModel from "../../system-data-model.js";

export default class ElectronicSchema extends CPRSystemDataModel {
  static mixinName = "electronic";

  /**
   *
   * @param {Object} options
   *  @param {Boolean} options.isElectronic
   *  @param {Boolean} options.providesHardening
   *
   * @returns
   */
  static defineSchema({
    isElectronic = false,
    providesHardening = false,
  } = {}) {
    const { fields } = foundry.data;
    return {
      isElectronic: new fields.BooleanField({ initial: isElectronic }),
      providesHardening: new fields.BooleanField({
        initial: providesHardening,
      }),
    };
  }
}
