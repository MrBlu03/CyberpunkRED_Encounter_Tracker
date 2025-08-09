import Rules from "../../../utils/cpr-rules.js";

const UpdateSubRoles = () => {
  /**
   * When a Role Item is updated check to see if a multiplier is set.
   * If it is, we set values for the "sub-roles."
   *
   * @public
   * @memberof hookEvents
   * @param {Document} doc          The Item document which is being updated
   * @param {object} updateData     A trimmed object with the data provided for creation
   */
  Hooks.on("updateItem", (doc, updateData) => {
    if (updateData.system && updateData.system.abilities) {
      const roleRank = doc.system.rank;
      let subRolesValue = 0;
      doc.system.abilities.forEach((a) => {
        if (a.multiplier !== "--") {
          subRolesValue += a.rank * a.multiplier;
        }
      });
      if (subRolesValue > roleRank) {
        Rules.lawyer(false, "CPR.messages.invalidRoleData");
      }
    }
  });
};

export default UpdateSubRoles;
