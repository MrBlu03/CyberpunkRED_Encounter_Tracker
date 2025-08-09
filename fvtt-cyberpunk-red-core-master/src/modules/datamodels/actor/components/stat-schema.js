import CPRSystemDataModel from "../../system-data-model.js";

export default class StatSchema extends CPRSystemDataModel {
  /**
   *
   * @param {Boolean} includeMax - whether this stat has a max property or not
   * @param {Number} [min = 0] - what the minimum value should be
   * @returns {Object}
   */
  static defineSchema({ includeMax = false, min = 0 } = {}) {
    if (includeMax) {
      return { ...this.valueStat(min), ...this.maxStat };
    }

    return { ...this.valueStat(min) };
  }

  static valueStat(min) {
    const { fields } = foundry.data;
    return {
      value: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 6,
        min,
      }),
    };
  }

  static get maxStat() {
    const { fields } = foundry.data;
    return {
      max: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 6,
        min: 0,
      }),
    };
  }
}
