import SystemUtils from "../../utils/cpr-systemUtils.js";

const CheckEmpAndLuck = () => {
  /**
   * Check that EMP and LUCK values are not > 3 digits so that display on sheet
   * doesn't get messed up.
   *
   *
   * @public
   * @memberof hookEvents
   * @param {CPRCharacterActor} actor - The pending document which is requested for creation
   * @param {object} updatedData      - The changed data object provided to the document creation request
   */
  Hooks.on("preUpdateActor", async (_, updatedData) => {
    if (updatedData.system?.stats?.emp || updatedData.system?.stats?.luck) {
      const updatedValue = updatedData.system.stats.emp
        ? updatedData.system.stats.emp.value
        : updatedData.system.stats.luck.value;
      const updatedMax = updatedData.system.stats.emp
        ? updatedData.system.stats.emp.max
        : updatedData.system.stats.luck.max;
      if (updatedValue && Number(updatedValue) > 99) {
        SystemUtils.DisplayMessage(
          "warn",
          SystemUtils.Localize("CPR.messages.tripleDigitStatValueWarn")
        );
      }
      if (updatedMax && Number(updatedMax) > 99) {
        SystemUtils.DisplayMessage(
          "warn",
          SystemUtils.Localize("CPR.messages.tripleDigitStatMaxWarn")
        );
      }
    }
  });
};

export default CheckEmpAndLuck;
