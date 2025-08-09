/* eslint-env jquery */

/**
 * CPR-C utilities that are used for Text manipulation.
 *
 * Until FoundryVTT supports server-side html sanitation, we have client side
 * methods defined here. In Foundry's discord there were loose commitments to
 * implement server-side in v12. Newer editors built into Foundry may solve
 * this for us too.
 *
 * For more information, see the comments in MR !1143
 */
export default class CPRTextUtils {
  /**
   * Strip out html markup from a string. This is done with a combination of
   * jQuery to remove the html tags, and a JavaScript built-in to remove URL
   * codes like "&nbsp;".
   *
   * @static
   * @param {String} html - the html string to convert into plain text
    @returns {String}
   */
  static stripHTML(html) {
    return new Handlebars.SafeString($("<div>").html(html).text());
  }

  /**
   * Sanitize a string with EnrichedText and HTML.
   *
   * This static method takes a string containing enriched text and performs
   * sanitization by stripping HTML tags and replacing @UUID references with
   * their associated text.
   *
   * @param {string} str - The enriched text to be sanitized.
   * @returns {string} The sanitized text with HTML tags removed and @UUID
   *                   references replaced.
   *
   * @example
   * const enrichedText = "Some text @UUID[Actor.xjfzYCPKxygh3dSZ]{...}";
   * const sanitizedText = YourClass.sanitizeEnrichedText(enrichedText);
   * // Returns the sanitized version of the enriched text.
   */
  static sanitizeEnrichedText(str) {
    // Ensure str is not empty before proceeding
    if (typeof str !== "string") {
      // Handle cases where str is not a string
      // For example, you can return an empty string or handle it differently
      return "";
    }

    // Strip any UUID references from the string
    const uuidRegex = /@UUID\[[^\]]+\]{([^}]+)}/g;
    const strippedUuids = str.replace(
      uuidRegex,
      (match, capturedText) => capturedText
    );
    // Then strip any HTML
    const sanitizedText = this.stripHTML(strippedUuids).toString();

    return sanitizedText;
  }

  /**
   * Title case string values.
   *
   * This static method takes a string and returns it in title case.
   *
   * @param {string} str - The text to be title cased.
   * @returns {string} The text with the correct title casing.
   *
   * @example
   * const str = "some string"
   * const str = "Some String"
   */

  static toTitleCase(str) {
    // converts the string value to title case.
    return str.toLowerCase().replace(/\b\w/g, (s) => s.toUpperCase());
  }
}
