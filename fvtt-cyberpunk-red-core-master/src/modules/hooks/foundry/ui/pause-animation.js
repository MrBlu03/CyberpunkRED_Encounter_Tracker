import enablePauseAnimation from "../../../system/pause-animation.js";

const PauseAnimation = () => {
  /**
   * When the game is paused, an animation is rendered in the bottom-middle of
   * the screen to indicate the paused state. When this rendering happens, this
   * hook is called. We use it to change the animation from the default to
   * something more Cyberpunk in theme.
   *
   * @public
   * @memberof hookEvents
   */
  Hooks.on("renderPause", () => {
    enablePauseAnimation();
  });
};

export default PauseAnimation;
