import SystemUtils from "../../utils/cpr-systemUtils.js";

const UpdateRoleOnItemDelete = () => {
  /**
   * If a role is being deleted, we look up other roles that are available and
   * make one of them the new active role. Otherwise we warn that there is no
   * active role on the actor.
   *
   * @public
   * @memberof hookEvents
   * @param {CPRItem} doc - The document (item) to be deleted
   */
  Hooks.on("deleteItem", (doc) => {
    const actor = doc.parent;
    if (actor !== null) {
      if (
        doc.type === "role" &&
        actor.system.roleInfo.activeRole === doc.name
      ) {
        const actorRoles = actor.itemTypes.role.sort((a, b) =>
          a.name > b.name ? 1 : -1
        );
        if (actorRoles.length >= 1) {
          // If the actor has other roles besides the one being deleted:
          // First, we look for one with the same name. This covers a
          // degenerate case where an actor has 2 or more roles of the
          // same name configured, and a case where role items on an
          // actor get replaced during a data migration.
          let newRole;
          const sameNameRoles = actorRoles.filter(
            (r) => r.name === actor.system.roleInfo.activeRole
          );
          if (sameNameRoles.length >= 1) {
            newRole = sameNameRoles.find((r) => r.id !== doc.id);
          } else {
            // no other roles with the same name, pick the next in the list
            [newRole] = actorRoles;
            const warning = `${SystemUtils.Localize(
              "CPR.messages.warnDeleteActiveRole"
            )} ${newRole.name}`;
            SystemUtils.DisplayMessage("warn", warning);
          }
          actor.update({
            "system.roleInfo.activeRole": newRole.name,
            "system.roleInfo.activeNetRole": newRole.id,
          });
        } else {
          actor.update({
            "system.roleInfo.activeRole": "",
            "system.roleInfo.activeNetRole": "",
          });
          SystemUtils.DisplayMessage(
            "warn",
            SystemUtils.Localize(
              "CPR.characterSheet.bottomPane.role.noRolesWarning"
            )
          );
        }
      }
    }
  });
};

export default UpdateRoleOnItemDelete;
