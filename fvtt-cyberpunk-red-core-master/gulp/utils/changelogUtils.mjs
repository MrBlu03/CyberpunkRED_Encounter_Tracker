import fs from "fs-extra";
import log from "fancy-log";
import YAML from "js-yaml";
import path from "path";
import * as marked from "marked";

import PackUtils from "./packUtils.mjs";

export default class ChangelogUtils {
  /**
   * Extracts and formats the version number from the given input string.
   *
   * @param {string} input - The input string containing version information.
   * @returns {string} The extracted and formatted version number, or "Unknown"
   */
  static _getVersion(input) {
    const versionRegex = /Version\s*:? (\d+\.\d+\.\d+)/;
    const match = input.match(versionRegex);

    if (match) {
      const versionParts = match[1].split(".");
      if (versionParts.length === 2) {
        versionParts.push("0");
      }
      return `v${versionParts.join(".")}`;
    }

    return "Unknown";
  }

  /**
   * Splits markdown by heading level with content from heading to next
   * heading as an array of objects.
   *
   * @param {string} markdown - The markdown text to be converted.
   * @param {number} level - The level of headings to target
   *                         (e.g., 1 for "#", 2 for "##", etc.).
   * @returns {Array<{Object>} An array of objects containing extracted
   *                           headings and content.
   *                           {heading: heading, content: content}
   */
  static markdownToJson(markdown, level) {
    const regex = new RegExp(
      `^(#{${level}}\\s.*)[\\s\\S]*?(?=(^#{1,${level + 1}}\\s)|$)`,
      "gm"
    );
    const data = [];
    let match = regex.exec(markdown);

    while (match != null) {
      const headingText = match[1].replace(`#{${level}}`, "").trim();
      const startIndex = match.index + match[0].length;
      const endIndex = markdown.indexOf(`\n${"#".repeat(level)} `, startIndex);
      const content = markdown
        .substring(startIndex, endIndex !== -1 ? endIndex : undefined)
        .trim();

      data.push({ heading: headingText, content });

      match = regex.exec(markdown);
    }

    return data;
  }

  /**
   * Generate a changelog journal pack from the provided markdown content.
   *
   * @param {string} markdown - The markdown content containing changelog entries.
   * @param {string} lang - The language identifier.
   * @param {string} outDir - The output directory for writing generated files.
   * @returns {Promise<void>} - A Promise that resolves once the journal pack is generated and written.
   */
  static async GenerateChangelogJournal(markdown, lang, outDir) {
    const mdArray = this.markdownToJson(markdown, 2);

    const journalId = PackUtils.GenerateId(16);
    const pagesList = [];

    // Loop Over each entry and make a journal pack page
    for (const entry of mdArray) {
      const version = this._getVersion(entry.heading);

      if (version !== "Unknown") {
        const sort = version.replace(/[v.]+/g, "") * 100;
        const pageId = PackUtils.GenerateId(16);
        const page = {
          sort,
          name: version,
          type: "text",
          _id: pageId,
          _key: `!journal.pages!${journalId}.${pageId}`,
          title: {
            show: true,
          },
          image: {},
          text: {
            format: 1,
            content: marked.parse(entry.content),
          },
          video: {
            controls: true,
            volume: 0.5,
          },
          src: null,
          system: {},
          ownership: {
            default: -1,
          },
          flags: {},
        };
        const finalPage = PackUtils.generateStats(page);

        pagesList.push(pageId);

        fs.writeFileSync(
          path.resolve(
            outDir,
            `page.${PackUtils.cleanFileName(
              lang
            ).toLowerCase()}.${version}.yaml`
          ),
          YAML.dump(finalPage)
        );
      }
    }

    // Write out journal pack
    const journal = {
      _id: journalId,
      _key: `!journal!${journalId}`,
      name: `Changelog ${lang}`,
      pages: pagesList,
      flags: {
        core: {
          viewMode: "JournalSheet.VIEW_MODES.MULTIPLE",
        },
      },
    };
    fs.writeFileSync(
      path.resolve(
        outDir,
        `journal.${PackUtils.cleanFileName(lang).toLowerCase()}.yaml`
      ),
      YAML.dump(journal)
    );
  }
}
