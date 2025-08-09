import CPRSystemDataModel from "../system-data-model.js";
import CommonSchema from "./mixins/common-schema.js";
import ContainerSchema from "../shared/container-schema.js";

export default class MookDataModel extends CPRSystemDataModel.mixin(
  CommonSchema,
  ContainerSchema
) {
  static defineSchema() {
    return this.mergeSchema(
      super.defineSchema({
        initialAllowedTypes: ["cyberware"],
        includeSlots: false,
      }),
      {}
    );
  }
}
