import empableItems from "./actor/empable-items.js";

/**
 * Loads actor functions from predefined modules and returns them as an object.
 *
 * @private
 * @returns {Object} An object where keys are function names and values
 *                   are the corresponding functions.
 */
function _loadActorFunctions() {
  const functions = {};

  // Statically added modules
  const modules = [empableItems];

  modules.forEach((module) => {
    if (typeof module === "function" && module.name) {
      // Function's name is used as the key
      const functionName = module.name;
      functions[functionName] = module;
    }
  });

  return functions;
}

/**
 * Initializes the API by creating the `game.cpr.api.actor` namespace and
 * loading actor functions.
 *
 * @returns {Object} The initialized `game.cpr.api` object with actor functions.
 */
function initializeAPI() {
  // Load actor functions synchronously
  const actorFunctions = _loadActorFunctions();
  // Return the initialized API object
  return { actor: actorFunctions };
}

export default initializeAPI;
