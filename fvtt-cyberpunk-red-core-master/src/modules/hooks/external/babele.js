const InitializeBabeleIntegration = () => {
  /**
   * Babele Module Integration
   * https://foundryvtt.com/packages/babele
   *
   * @public
   * @memberof hookEvents
   */
  Hooks.on("init", () => {
    if (
      game.modules.get("babele") !== undefined &&
      game.modules.get("babele")?.active
    ) {
      Babele.get().setSystemTranslationsDir("babele");
    }
  });
};

export default InitializeBabeleIntegration;
