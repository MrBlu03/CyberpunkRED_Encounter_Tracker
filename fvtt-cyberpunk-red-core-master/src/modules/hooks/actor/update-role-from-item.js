const UpdateRoleFromItem = () => {
  /**
   * Sets the Actor role field when Role Item is dragged to a sheet.
   *
   * @public
   * @memberof hookEvents
   * @param {CPRItem} doc - The pending document which is requested for creation
   */
  Hooks.on("createItem", async (doc) => {
    const actor = doc.parent;
    if (actor !== null) {
      if (doc.type === "role") {
        if (actor.system.roleInfo.activeRole === "") {
          actor.update({ "system.roleInfo.activeRole": doc.name });
        }
        if (
          !actor.itemTypes.role.some(
            (r) => r.id === actor.system.roleInfo.activeNetRole
          )
        ) {
          // If no roles are designated as activeNetRole, OR if an
          // activeNetRole has been set, but that role has since been
          // deleted, set activeNetRole.
          actor.update({ "system.roleInfo.activeNetRole": doc.id });
        }
      }
    }
  });
};

export default UpdateRoleFromItem;
