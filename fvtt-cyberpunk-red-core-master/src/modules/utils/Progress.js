export default class Progress {
  constructor({
    id = "cpr-default-progress",
    max = 100,
    label = game.i18n.localize("CPR.progress.default"),
    classes = [],
    closeWhenFull = false,
  } = {}) {
    this.id = id;
    this.value = 0;
    this.max = max;
    this.label = label;
    this.classes = classes;
    this.element = null;

    this.closeWhenFull = closeWhenFull;
  }

  static TEMPLATE = `templates/progress-bar.hbs`;

  /**
   * Percentage of progress completed.
   * Will return 0 if `NaN`.
   *
   * @returns {number}
   */
  get percent() {
    return Math.floor((this.value / this.max) * 100) || 0;
  }

  /**
   * Advances the progress by the specified amount and updates the progress bar.
   * Inspired by PF2e.
   *
   * @param {number} [by=1] - The amount to advance the progress by.
   * @return {void}
   */
  advance(by = 1) {
    if (this.value === this.max) return;
    this.value += Math.abs(by);
    this.render();
  }

  /**
   * Closes the progress bar by fading it out over a specified duration.
   *
   * @return {void}
   */
  close() {
    const bar = this.element;
    if (bar !== null) {
      if (!bar.hidden) {
        $(bar).fadeOut(2000);
      }
    }
  }

  /**
   * Create an HTML element for the progress bar
   * and appends it to the specified parent element.
   *
   * @param {Object} [options={}] - The options for creating the Progress bar element.
   * @param {HTMLElement} parentElement - The parent element to which the progress bar element will be appended.
   * @return {Promise<void>} A promise that resolves when the progress bar element is created and appended.
   */
  static async createElement(options = {}, parentElement = null) {
    const progress = new Progress(options);
    const rawTemplate = await renderTemplate(
      `systems/${game.system.id}/${this.TEMPLATE}`,
      progress
    );
    const htmlTemplate = document.createElement("template");
    htmlTemplate.innerHTML = rawTemplate;
    const [element] = htmlTemplate.content.children;
    progress.element = element;
    if (parentElement) {
      parentElement.appendChild(element);
    }
    return progress;
  }

  /**
   * Renders the progress bar with the specified percentage.
   *
   * @return {void}
   */
  render() {
    if (!this.element) return;

    const { element } = this;
    const progressBar = element.querySelector(".progress-bar");
    const label = element.querySelector(".progress-label");
    const currentCount = element.querySelector(".current-count");
    const maxCount = element.querySelector(".max-count");
    const percentLabel = element.querySelector(".progress-percent");

    progressBar.style = `width: ${this.percent}%`;
    label.innerHTML = game.i18n.localize(this.label);
    currentCount.innerHTML = this.value;
    maxCount.innerHTML = this.max;
    percentLabel.innerHTML = `${this.percent}%`;

    if (this.closeWhenFull && this.value === this.max) {
      this.close();
    }
  }
}
