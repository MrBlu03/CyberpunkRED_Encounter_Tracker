/* eslint-disable no-param-reassign  */
import fs from "fs-extra";
import log from "fancy-log";
import path from "path";
import sanitize from "sanitize-filename";
import YAML from "js-yaml";
import { ClassicLevel } from "classic-level";
import prettier from "prettier";

import { SRC_DIR, SYSTEM_FILE, SYSTEM_VERSION, TRACE } from "../config.mjs";

/*
 * PackUtils; helpful functions for dealing with packs
 */
export default class PackUtils {
  /**
   * Generates a random string based on the given length.
   * @private
   * @param {number} length - The length of the generated string.
   * @returns {string} A random string.
   */
  static GenerateId(length) {
    const characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    for (let i = 0; i < length; ) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters.charAt(randomIndex);
      i += 1;
    }

    return result;
  }

  /**
   * Extracts the pack type from a levelDB key.
   *
   * The input string is expected to be in the format:
   *
   * '!tables!4S3emhUCIIDNoTAg' or
   * '!tables.results!4S3emhUCIIDNoTAg.6Aob1Q13Wnq2fmKF'
   *
   * @param {string} str - The input string from which the pack type should be
   *                       extracted.
   * @returns {string} The extracted pack type from the input string.
   *
   * TODO: These functions will need to be made more flexible to support actors
   *       or possibly pre-upgraded items as they have three level deep keys
   *       like: !actor.item.effect! and I would guess these can be arbitrarily
   *       deep eg: !actor.item.item.effects! for a pre-upgraded item
   *       Might be worth checking the Foundry code/discord to see how they
   *       handle it
   */
  static getPackType(str) {
    return str.split("!")[1].split(".")[0];
  }

  /**
   * Extracts the pack sub-type from a levelDB key.
   *
   * The input string is expected to be in the format:
   *
   * '!tables!4S3emhUCIIDNoTAg' or
   * '!tables.results!4S3emhUCIIDNoTAg.6Aob1Q13Wnq2fmKF'
   *
   * @param {string} str - The input string from which the pack sub-type
   *                       should be extracted.
   * @returns {string} The extracted pack sub-type from the input string ""
   *                   (empty string) if not present.
   *
   */
  static getPackSubType(str) {
    return str.split("!")[1].split(".")[1]
      ? str.split("!")[1].split(".")[1]
      : "";
  }

  /**
   * Cleans a given file name by removing special characters and replacing whitespace.
   * This function sanitizes the input file name by performing a series of operations
   * to ensure a valid file name format. Each operation serves a specific purpose:
   *
   * 01. Removes Unicode format characters.
   * 02. Removes invisible whitespace (U+2060).
   * 03. Removes the character Σ (U+2211).
   * 04. Removes the character β (U+03B2).
   * 05. Removes left and right single quotation marks.
   * 06. Removes left and right double quotation marks.
   * 07. Removes single and double quotes.
   * 08. Removes parentheses.
   * 09. Replaces ampersands with the word "and".
   * 10. Replaces bullet points with dots.
   * 11. Replaces spaces with dots.
   * 12. Removes commas.
   * 13. Removes the registered trademark symbol.
   * 14. Removes the trademark symbol.
   * 15. Removes newlines.
   * 16. Replaces consecutive dots enclosed in hyphens with a single dot.
   * 17. Replaces multiple consecutive dots with a single dot.
   *
   * @param {string} str - The input file name to be cleaned.
   * @returns {string} The cleaned file name.
   */
  static cleanFileName(str) {
    if (TRACE) {
      log(`TRACE: PackUtils | cleanFilename called.`);
    }

    return sanitize(str)
      .replace(/\p{Cf}/gu, "")
      .replace(/\u2060/gu, "")
      .replace(/\u2211/g, "")
      .replace(/\u03B2/g, "")
      .replace(/[‘’]/gu, "")
      .replace(/[“”]/gu, "")
      .replace(/['"]/g, "")
      .replace(/[()]/g, "")
      .replace(/[&]/g, "and")
      .replace(/•/g, ".")
      .replace(/ /g, ".")
      .replace(/,/g, "")
      .replace(/®/g, "")
      .replace(/™/g, "")
      .replace(/\n/gm, "")
      .replace(/\.-\./g, ".")
      .replace(/\.+/g, ".");
  }

  /*
   * Normalize strings.
   *
   * Foundry/Browsers/Operating Systems/Users introduce different quirks to
   * text/html fields when editing. This function cleans up/normalizes strings
   * so they are more consistent across the system.
   *
   * 01. Replace all Zero-Width Space (\u2060) characters with an empty string.
   * 02. Replace all curly single quotes ‘’ with straight single quotes (').
   * 03. Replace all curly double quotes “” with straight double quotes (").
   * 04. Remove all occurrences of the HTML entity &nbsp;.
   * 05. Remove the ' dir="ltr"' attribute from HTML tags.
   * 06. Replace consecutive line breaks with '</p>\n<p>' to format paragraphs.
   * 07. Remove any leading space inside <p> tags.
   * 08. Ensure proper formatting for adjacent <p> tags by replacing '</p> <p>'
   *     with '</p>\n<p>'.
   * 09. Remove empty <p> tags containing only '<br>'.
   * 10. Collapse multiple consecutive whitespaces into a single space.
   * 10. Trim leading and trailing spaces.
   * 11. Add spaces around '<strong>' tags for proper spacing.
   * 12. Add spaces around '</strong>' tags for proper spacing.
   * 14. Add spaces before and after '</p>' tags to ensure proper spacing.
   * 15. Remove empty <p> tags.
   *
   * @param {string} str - The input string to be cleaned.
   * @returns {string} The cleaned string.
   */
  static cleanString(str) {
    if (TRACE) {
      log(`TRACE: PackUtils | cleanString called.`);
    }

    // Order of operations is important here.
    // If you are thinking of changing this make sure you understand what is
    // happening (and the result) in each step and how that affects the
    // following steps.
    return str
      .replace(/\u2060/gu, "")
      .replace(/[‘’]/gu, "'")
      .replace(/[“”]/gu, '"')
      .replace(/&nbsp;/gu, "")
      .replace(/\sdir="ltr"/g, "")
      .replace(/<br\s*\/?>\s*(?=<br\s*\/?>)/g, "</p>\n<p>")
      .replace(/<p> /g, "<p>")
      .replace(/<\/p> +<p>/gu, "</p>\n<p>")
      .replace(/<p><br><\/p>/gu, "")
      .replace(/[^\S\n]+/g, " ")
      .replace(/^\s+|\s+$/gu, "")
      .replace(/<strong> /g, " <strong>")
      .replace(/ <\/strong>/g, "</strong> ")
      .replace(/ <\/p>/gu, "</p>")
      .replace(/<p><\/p>/gu, "");
  }

  /**
   * Removes packs from the array based on their names.
   * @param {Array} packs - The array of packs.
   * @param {Array} packNamesToRemove - The array of pack names to remove.
   * @returns {Promise<Array>} - The updated array of packs after removal.
   */
  static removePacksByName(packs, packNamesToRemove) {
    return packs.filter((pack) => {
      return !packNamesToRemove.includes(pack.name);
    });
  }

  /*
   * Determine the name of the YAML fragment of an extracted pack
   *
   * This used to be easy as we just used $type.$name (with a workaround for
   * scenes).
   *
   * Unfortunately due to v11 now storing active effects as separate
   * documents.
   *
   * @param {object} data - The fragment data
   * @returns {string} - the calculated fragment filename
   */
  static getFragmentName(data) {
    if (TRACE) {
      log(`TRACE: PackUtils | getFragmentName called`);
    }

    /*
     * Since v11 Foundry stores pack data under a key in levelDB made of the
     * "type" of item they are (and possibly subType) along with the "_id" of
     * the item in the following format:
     *
     * '!items!GqYz689ddSKQHMen'
     * '!scenes!vTifY2SLaE82514t'
     *
     * If however the entry is an Active Effect it also have the `effects`
     * keyword appended as a "subType":
     *
     * '!items.effects!GqYz689ddSKQHMen.OnONUXyMY8mOquf7'
     *
     * This also applies to table results:
     *
     * '!tables.results!4S3emhUCIIDNoTAg.6Aob1Q13Wnq2fmKF'
     *
     * This gives us enough information to determine a usable filename for our
     * YAML fragments.
     *
     * We follow the below format:
     *
     * 'itemType.cleanName.yaml'
     *
     * Note: itemType here refers to the type of foundry item (gear, cyberware,
     *       program, etc.) not the entry type in levelDB.
     *
     * This translates to:
     *
     * 'gear.agent.yaml'
     * 'scene.dystopian.city.streets.yaml'
     *
     * For things with `subTypes` we append the _id
     *
     * 'effect.agent.OnONUXyMY8mOquf7.yaml'
     *     Note: Effect names come from the name of the Effect document, not
     *           from the item
     *
     */
    const key = data._key;
    const keyType = this.getPackType(key);
    const keySubType = this.getPackSubType(key);
    const id = data._id;
    const { type } = data;
    // We truncate this to 5 words to limitfile name length
    const name = data.name ? data.name.split(" ").slice(0, 5).join(" ") : "";
    const text = data.text ? data.text.split(" ").slice(0, 5).join(" ") : "";

    // Cast to lowercase for filenames
    const typeLower = typeof data.type === "string" ? type.toLowerCase() : "";
    const nameLower = data.name ? name.toLowerCase() : "";
    const textLower = data.text ? text.toLowerCase() : "";

    switch (keySubType) {
      case "":
        switch (keyType) {
          case "items":
            return this.cleanFileName(`${typeLower}.${nameLower}.yaml`);
          case "scenes":
            return this.cleanFileName(`scene.${nameLower}.yaml`);
          case "tables":
            return this.cleanFileName(`table.${nameLower}.yaml`);
          case "macros":
            return this.cleanFileName(`macro.${nameLower}.yaml`);
          default:
            throw new Error(
              `ERROR: Unable to determine filename for the above data`
            );
        }
      // To prevent name based clashes with effect/rolltable results we append
      // the _id as an identifier as this is globally unique which should
      // hopefully prevent silent data loss if 2 items have the effect/results
      // with the same name.
      // NOTE: Do not cast `id` it lowercase as this could lead to collisions
      case "effects":
        return this.cleanFileName(`effect.${nameLower}.${id}.yaml`);
      case "results":
        return this.cleanFileName(`result.${textLower}.${id}.yaml`);
      default:
        throw new Error(
          `ERROR: Unable to determine filename for the above data`
        );
    }
  }

  /*
   * Unpacks a LevelDB pack and writes its contents as individual YAML files to
   * the output directory.
   *
   * Inspired/taken from FoundryVTT-CLI:
   * https://github.com/foundryvtt/foundryvtt-cli/blob/main/commands/package.mjs
   *
   * This function reads the LevelDB pack located at the specified `packPath` and
   * extracts its contents, writing each entry as an individual YAML file in the
   * `outputDir`.
   *
   * @param {string} packDir - The path to the LevelDB pack to be unpacked.
   * @param {string} fragmentDir - The output directory where individual YAML files
   *                            will be written.
   * @returns {Promise<void>} - A Promise that resolves when the unpacking process
   *                           is completed.
   */
  static async unpackLeveldb(packDir, fragmentDir) {
    if (TRACE) {
      log(`TRACE: PackUtils | unpackLeveldb called.`);
    }

    // Load the leveldb compendium
    const db = new ClassicLevel(packDir, {
      keyEncoding: "utf8",
      valueEncoding: "json",
    });

    // Iterate over all entries in the db, writing them as individual YAML files
    for await (const [key, data] of db.iterator()) {
      // Add the _key to the data so we can use it in determine the filename
      // and for when we need to re-pack the data
      data._key = key;
      // Clean up the data
      const cleanData = this.cleanPackData(data);
      // work out the filename
      const fileName = `${fragmentDir}/${this.getFragmentName(data)}`;
      // Dump out to a YAML fragment file
      fs.writeFileSync(
        fileName,
        YAML.dump(cleanData, {
          sortKeys: true,
          quotingType: '"',
          lineWidth: 80,
        })
      );
    }

    await db.close();
  }

  /*
   * Reads YAML fragments in a directory and writes them to a levelDB pack
   *
   * Inspired/taken from FoundryVTT-CLI:
   * https://github.com/foundryvtt/foundryvtt-cli/blob/main/commands/package.mjs
   *
   * This function reads YAML fragments located at the specified `packPath` and
   * packs it's content into a levelDB specified by `outputDir`.
   *
   * @param {string} packDir - The path to the LevelDB pack to be unpacked.
   * @param {string} fragmentDir - The output directory where individual YAML
   *                               files will be written.
   * @returns {Promise<void>} - A Promise that resolves when the unpacking process
   *                           is completed.
   */
  static async packLeveldb(fragmentDir, packDir) {
    if (TRACE) {
      log(`TRACE: PackUtils | packLeveldb called.`);
    }

    const db = new ClassicLevel(packDir, {
      keyEncoding: "utf8",
      valueEncoding: "json",
    });
    const batch = db.batch();

    const files = fs.readdirSync(fragmentDir);
    for (const file of files) {
      const fileContents = fs.readFileSync(
        path.join(fragmentDir, file),
        "utf-8"
      );
      const data = YAML.load(fileContents);
      const key = data._key;
      // We don't want to store the key in the data so delete it from data
      delete data._key;
      // Scrub the data of anything we don't need
      const cleanData = this.cleanPackData(data);
      // Generate the `_stats` key
      const finalData = this.generateStats(cleanData);
      // Add the data to the batch to be written to the db
      batch.put(key, finalData);
    }

    // Write to the db
    await batch.write();
    await db.close();
  }

  /*
   * Reads YAML fragments in a directory and generates Babele translation files
   *
   * @param {string} fragmentDir - The directoryto read the fragment files from
   * @param {string} outputFile - The path to the file to write
   * @param {string} packLabel - The Label for the pack
   * @returns {Promise<void>} - A Promise that resolves when the generation
   *                           process is complete.
   */
  static async generateBabeleFile(fragmentDir, outputFile, packLabel) {
    if (TRACE) {
      log(`TRACE: PackUtils | generateBabeleFile called.`);
    }

    // Setup the base object for to be populated and output to the babele file
    const packData = {
      label: packLabel,
      mapping: {},
      entries: {},
    };

    const files = fs.readdirSync(fragmentDir);
    for (const file of files) {
      if (TRACE) {
        log(`Processing: ${file}`);
      }
      const fileContents = fs.readFileSync(
        path.join(fragmentDir, file),
        "utf-8"
      );
      const data = YAML.load(fileContents);
      const itemKey = data._key;
      const packType = this.getPackType(itemKey);
      const packSubType = this.getPackSubType(itemKey);
      const itemName = data.name;
      const itemDescription = data.system?.description?.value
        ? data.system.description.value
        : "";

      // We only want to process items, not effects
      if (packType === "items" && packSubType === "") {
        const item = {
          name: itemName,
          description: itemDescription,
        };

        // We need to translate the DV Table on items that have such a field,
        // i.e. items that have the attackable mixin. We simply check if this
        // field exists, and add it to the entry in the babele file if so.
        if (data.system?.dvTable) {
          item.dvTable = data.system.dvTable;
          // Make sure the dvTable field in babele files gets mapped to the correct item data field.
          if (!packData.mapping.dvTable) {
            packData.mapping.dvTable = "system.dvTable";
          }
        }

        // Add the item to the packData
        packData.entries[itemName] = item;
      }

      // We only want to process tables, not results
      if (packType === "tables" && packSubType === "") {
        const tableName = data.name;
        const tableResults = data.results;
        const resultsOutput = {};

        // We need to loop through the results array from the 'table' file and
        // find the relevant 'result' file and process it's contents and add
        // them to the packData as individual entries in the output babele file
        for (const result of tableResults) {
          // This assumes a single file is returned from the filter function.
          // Given the naming of the files this should always be the case.
          const resultFile = path.resolve(
            fragmentDir,
            fs
              .readdirSync(fragmentDir)
              .filter(
                (fn) =>
                  fn.startsWith(`result.`) && fn.endsWith(`${result}.yaml`)
              )[0]
          );
          const resContents = fs.readFileSync(resultFile, "utf-8");
          const resData = YAML.load(resContents);
          const key = resData.range.join("-");
          resultsOutput[key] = resData.text ? resData.text : "";

          // Add each result to the packData
          packData.entries[tableName] = {
            name: tableName,
            results: [resultsOutput],
          };
        }
      }
    }

    if (TRACE) {
      log(`TRACE: PackUtils | generateBabeleFile | writing ${outputFile}`);
    }

    // Write the Babele file
    fs.writeFileSync(outputFile, JSON.stringify(packData, null, 2));
  }

  /**
   * Generate statistics for the provided data by adding metadata related to the
   * data's origin and modifications. This method adds information such as core
   * version, creation time, modification details, and system version to the input
   * data.
   *
   * @param {object} data - The data object to which statistics and metadata will
   *                       be added.
   * @returns {object} A new object containing the input data along with added
   *                   statistics and metadata.
   *
   */
  static generateStats(data) {
    if (TRACE) {
      log(`TRACE: PackUtils | generateStats called.`);
    }

    const sysFile = JSON.parse(
      fs.readFileSync(path.resolve(SRC_DIR, SYSTEM_FILE))
    );
    const foundryVersion = sysFile.compatibility.minimum;
    const timestamp = new Date().getTime();

    const stats = {
      _stats: {
        coreVersion: foundryVersion,
        createdTime: timestamp,
        lastModifiedBy: "00CPRCBuildBot00",
        modifiedTime: timestamp,
        systemVersion: SYSTEM_VERSION,
      },
    };

    return { ...data, ...stats };
  }

  /**
   * Cleans the given pack data by removing unnecessary properties and fixing
   * common errors.
   *
   * @param {Object} data - The input pack data to be cleaned.
   * @returns {Object} - The cleaned pack data after performing the necessary
   *                     clean-up operations.
   */
  static cleanPackData(data) {
    if (TRACE) {
      log(`TRACE: PackUtils | cleanPackData called.`);
    }

    if ("author" in data) {
      delete data.author;
    }

    // Cleanup flags we don't care about
    if ("flags" in data) {
      if ("exportSource" in data.flags) {
        delete data.flags.exportSource;
      }
      if ("core" in data.flags) {
        // We don't care about the sourceId
        if ("sourceId" in data.flags.core) {
          delete data.flags.core.sourceId;
        }
        // If the flags.core object is empty we can safely delete it
        if (Object.keys(data.flags.core).length === 0) {
          delete data.flags.core;
        }
      }
      // and if flags object is empty we can ditch that as well
      if (Object.keys(data.flags).length === 0) {
        delete data.flags;
      }
    }

    // We generate _stats on build with `generateStats` so delete them if
    // they exist
    if ("_stats" in data) {
      delete data._stats;
    }

    //
    // Delete Foundry keys we don't need
    //

    // We don't use folders in our compendia preferring to have individual
    // compendia per release as this provides more flexibility for GMs when it
    // comes to showing/hiding the individual compendium form their game.
    if ("folder" in data) {
      delete data.folder;
    }
    if ("origin" in data) {
      delete data.origin;
    }
    if ("ownership" in data) {
      delete data.ownership;
    }
    if ("sort" in data) {
      delete data.sort;
    }
    if ("permission" in data) {
      delete data.permission;
    }

    // Only run on items
    if ("_key" in data) {
      if (this.getPackType(data._key) === "items") {
        const itemsWithEffects = [
          "armor",
          "clothing",
          "cyberware",
          "criticalInjury",
          "drug",
          "gear",
          "program",
          "weapon",
        ];

        // I have no idea where this data is coming from
        if ("system" in data) {
          delete data.system.allowedUsage;
          delete data.system.dvTableNames;
          delete data.system.isGM;
          delete data.system.isOwned;
          delete data.system.relativeSkills;
          delete data.system.tags;
        }

        // Remove empty values from system.ammoVariety
        if (data.type === "weapon") {
          const ammo = data.system.ammoVariety;
          const result = ammo.filter((i) => i !== "");
          data.system.ammoVariety = result;
        }

        // Remove critFailEffect if cyberware is not a weapon
        if (data.type === "cyberware" && !data.system.isWeapon) {
          delete data.system.critFailEffect;
        }

        // If an item should have effects
        if (itemsWithEffects.includes(data.type)) {
          // system.revealed should always be true
          data.system.revealed = true;

          // system.usage should always be one of:
          // 'equipped', 'installed', 'rezzed', 'snorted', or 'toggled'
          // never 'carried'
          // use 'equipped' as the default

          // If we're missing the usage key, set it to 'equipped'
          if ("usage" in data.system === false) {
            data.system.usage = "equipped";
          }
          // If system.usage is set to 'owned' set it to 'equipped' instead
          if (data.system.usage === "owned") {
            data.system.usage = "equipped";
          }
        } else {
          delete data.system?.revealed;
          delete data.system?.usage;
        }

        // Sanitize strings
        if (data.name) data.name = this.cleanString(data.name);
        if (data.label) data.label = this.cleanString(data.label);
        if (data.system?.description?.value) {
          const cleanDesc = this.cleanString(data.system.description.value);
          data.system.description.value = prettier.format(cleanDesc, {
            parser: "html",
          });
        }

        // Ensure values are ints
        if (data.system?.source?.page) {
          data.system.source.page = parseInt(data.system.source.page, 10);
        }

        if (data.system?.amount) {
          data.system.amount = parseInt(data.system.amount, 10);
        }

        if (data.system?.price) {
          data.system.price.market = parseInt(data.system.price.market, 10);
        }

        if (data.system?.rank) {
          data.system.rank = parseInt(data.system.rank, 10);
        }

        if (data.system?.humanityLoss?.static) {
          data.system.humanityLoss.static = parseInt(
            data.system.humanityLoss.static,
            10
          );
        }
      }
    }
    return data;
  }
}
