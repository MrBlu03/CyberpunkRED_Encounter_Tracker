import fs from "fs-extra";
import log from "fancy-log";
import path from "path";

import PackUtils from "./utils/packUtils.mjs";
import {
  DEBUG,
  DEST_DIR,
  SRC_DIR,
  SYSTEM_FILE,
  SYSTEM_NAME,
  PACKS_DIR,
} from "./config.mjs";

/*
 * Asynchronously extracts packs from the system to YAML fragments.
 *
 * @returns {Promise} A promise which resolves when all packs have been processed.
 * @throws Will throw an error if the path for a specific pack does not exist.
 *
 */
async function extPacks() {
  const fragmentDir = path.resolve(SRC_DIR, PACKS_DIR);
  const sysFile = JSON.parse(
    fs.readFileSync(path.resolve(SRC_DIR, SYSTEM_FILE))
  );
  let { packs } = sysFile;

  // Skip the changelog pack as we generate that with 'generateChangelog'
  // so we don't need to extract it
  packs = packs.filter((pack) => pack.name !== "other_changelog");

  // Because we want to handle deleted items in git properly we first delete
  // the fragmentDir then re-create it before writing out files.
  if (fs.existsSync(fragmentDir)) {
    fs.rmSync(fragmentDir, { recursive: true });
  }
  fs.mkdirSync(fragmentDir, { recursive: true });

  // Loop over each pack in system.json
  const promises = packs.map(async (pack) => {
    const packName = pack.name;
    const packPath = path.resolve(DEST_DIR, pack.path);
    const outputDir = path.resolve(SRC_DIR, pack.path);

    if (DEBUG) {
      log(`DEBUG: Processing ${packName}`);
    }

    // As we are extracting packs here the packPath should always exist.
    // If the packPath doesn't exist throw and error rather than failing
    // silently.
    if (!fs.pathExistsSync(packPath)) {
      throw new Error(`${packPath} does not exist`);
    }

    // Make sure the outputDir exits
    // We create the packs directory above and create the per pack dirs here
    if (!fs.pathExistsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Unpack the database then return the promise so we're async
    await PackUtils.unpackLeveldb(packPath, outputDir);
    return [];
  });

  return Promise.all(promises);
}

/**
 * Generate packs by processing YAML fragments.
 *
 * @async
 * @function genPacks
 * @returns {Promise<void[]>} - A Promise that resolves with an array of empty
 *                              arrays once all packs are generated.
 *
 */
async function genPacks() {
  log("Generating Packs...");
  const packsDir = path.resolve(DEST_DIR, PACKS_DIR);
  const sysFile = JSON.parse(
    fs.readFileSync(path.resolve(SRC_DIR, SYSTEM_FILE))
  );
  const { packs } = sysFile;

  // Because we build the leveldb packs from YAML fragments we don't need the
  // contents of the currently built packs
  if (fs.existsSync(packsDir)) {
    fs.rmSync(packsDir, { recursive: true });
  }
  fs.mkdirSync(packsDir, { recursive: true });

  // Loop over each pack in system.json
  const promises = packs.map(async (pack) => {
    const packName = pack.name;
    const fragmentPath = path.resolve(SRC_DIR, pack.path);
    const outputDir = path.resolve(DEST_DIR, pack.path);

    if (DEBUG) {
      log(`DEBUG: Processing ${packName}`);
    }

    // Make sure the outputDir exits
    // We create the packs directory above and create the per pack dirs here
    if (!fs.pathExistsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Create the fragment dir if it's a new pack and the dir doesn't exist
    if (!fs.pathExistsSync(fragmentPath)) {
      fs.mkdirSync(fragmentPath, { recursive: true });
    }

    // Pack the database then return the promise so we're async
    await PackUtils.packLeveldb(fragmentPath, outputDir);
    return [];
  });

  return Promise.all(promises);
}

// Export from Foundry Packs to Babele files for translation
// Loop over each pack.db in `dataDir/packs` and create babele file for
// translation using crowdin
async function genPacksBabele() {
  log("Generating Babele Files...");
  // We only care about translating certian pack types
  const babeleDir = path.resolve(SRC_DIR, "babele", "en");
  const sysFile = JSON.parse(
    fs.readFileSync(path.resolve(SRC_DIR, SYSTEM_FILE))
  );
  const { packs } = sysFile;

  // Skip the changelog pack as we generate that with 'generateChangelog'
  // and it doesn't need to be translated
  // Skip the skills pack as translating that breaks tons of functioanlity
  // in the system
  const packsToRemove = ["internal_skills", "other_changelog"];
  const updatedPacks = PackUtils.removePacksByName(packs, packsToRemove);

  // To handle compendia renames we need to blast the files then rebuild them
  if (fs.existsSync(babeleDir)) {
    fs.rmSync(babeleDir, { recursive: true });
  }
  fs.mkdirSync(babeleDir);

  const promises = updatedPacks.map(async (pack) => {
    const packName = pack.name;
    const packLabel = pack.label;
    const fragmentPath = path.resolve(SRC_DIR, pack.path);
    const outputFile = path.resolve(
      SRC_DIR,
      babeleDir,
      `${SYSTEM_NAME}.${packName}.json`
    );

    if (DEBUG) {
      log(`DEBUG: Processing pack: ${packName}`);
    }

    await PackUtils.generateBabeleFile(fragmentPath, outputFile, packLabel);
  });
  log("Finished Generating Babele Files...");
  return Promise.all(promises);
}

export { extPacks, genPacks, genPacksBabele };
