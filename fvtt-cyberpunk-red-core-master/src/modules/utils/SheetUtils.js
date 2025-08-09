/* eslint-env jquery */

import LOGGER from "./cpr-logger.js";

/**
 * CPR-C utilities that are used in sheets
 */
export default class CPRSheetUtils {
  /**
   * Dynamically adjusts the width of all elements with the specified class
   * within the provided HTML context. It ensures that all elements have a
   * consistent width equal to the width of the widest element. The width is
   * calculated by cloning the elements, appending them to the body invisibly,
   * measuring their width, and then applying this maximum width to all
   * elements in rem units.
   *
   * @param {Object} html - The jQuery HTML context in which to find and adjust
   *                        '.type-tag' elements.
   * @param {String} cssClass - The CSS class to target
   */
  static setCssClassWidth(html, cssClass) {
    const typeTags = html.find(cssClass);

    // As some elements might be hidden on other tabs or under expandos we need
    // to clone them and append them to the body to measure their width.
    const clonedElements = typeTags
      .clone()
      .css({
        position: "absolute",
        visibility: "hidden",
        display: "block",
      })
      .appendTo("body");

    // Measure the widths of these cloned elements with a named function
    const maxWidth = Math.max(
      ...clonedElements
        .map(function measureWidth() {
          return $(this).width();
        })
        .get()
    );

    // Remove the cloned elements from the body after measurement
    clonedElements.remove();

    // Convert the maxWidth from px to rem
    if (maxWidth > 0) {
      const rootFontSize = parseFloat(
        window.getComputedStyle(document.documentElement).fontSize
      );
      const maxWidthInRem = maxWidth / rootFontSize;

      // Apply the maximum width in rem to all specified elements
      typeTags.css("width", `${maxWidthInRem}rem`);
    }
  }

  /**
   * Dynamically adjusts the font size of the input element to fit its contents
   * within its bounds. It reduces the font size step by step until the text fits
   * or the minimum font size is reached.
   *
   * @param {HTMLElement|jQuery} inputElement - The DOM or jQuery object for the
   *                                            input field whose font size will
   *                                            be adjusted. It accepts both a raw
   *                                            DOM element or a jQuery element.
   */
  static adjustFontSizeToFit(inputElement) {
    // Use LOGGER to trace the call

    // Ensure we have the DOM element
    const input = inputElement.jquery ? inputElement.get(0) : inputElement;

    // Make sure we have a valid element to work with
    if (!input || !input.style) {
      LOGGER.warn(
        "adjustFontSizeToFit | CPRSheetUtils | No input element found or input element has no style property."
      );
      return;
    }

    // Maximum and minimum font sizes in rem
    const minFontSize = 0.5;
    const maxFontSize = 2;
    // How much to adjust the font size each time (in rem)
    const step = 0.1;

    let fontSize = maxFontSize;
    input.style.fontSize = `${fontSize}rem`;

    // Decrease the font size until the text fits within the input width
    while (fontSize > minFontSize && input.scrollWidth > input.clientWidth) {
      fontSize -= step;
      input.style.fontSize = `${fontSize}rem`;
    }

    // If the minimum font size is still too big, set it to the minimum
    if (input.scrollWidth > input.clientWidth) {
      input.style.fontSize = `${minFontSize}rem`;
    }
  }
}
