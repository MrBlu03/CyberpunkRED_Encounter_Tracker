import chalk from "chalk";
import fs from "fs-extra";
import log from "fancy-log";
import gulp from "gulp";
import less from "gulp-less";
import path from "path";
import { optimize } from "svgo";
import through2 from "through2";
import ChangelogUtils from "./utils/changelogUtils.mjs";

import {
  CI,
  DEBUG,
  DEST_DIR,
  DISCORD_BOT_AVATAR,
  DISCORD_BOT_NAME,
  DISCORD_MESSAGE_BACKUP,
  DISCORD_MESSAGE_CHANGELOG,
  DISCORD_MESSAGE_HEADER,
  DISCORD_MESSAGE_INTROS,
  SRC_DIR,
  SOURCE_FILES,
  SOURCE_DIRS,
  SYSTEM_FILE,
  SYSTEM_TITLE,
  SYSTEM_VERSION,
  PACKS_DIR,
} from "./config.mjs";

// Helter function to create the target directory we're building into
async function _createDist() {
  if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR);
  }
}

// Blast the build directory to ensure it's fresh
async function cleanDist() {
  if (fs.existsSync(DEST_DIR)) {
    fs.emptyDirSync(DEST_DIR);
  }
}

// Compile less in to CSS
async function compileLess() {
  return new Promise((cb) => {
    log("Building CSS...");
    _createDist();
    gulp
      .src(path.resolve(SRC_DIR, "less/main.less"))
      .pipe(less({ javascriptEnabled: true }))
      .on("error", () => {
        // If we're in CI throw a hard error, else a soft error
        if (CI) {
          throw new Error("CSS failed to compile.");
        } else {
          log.error(chalk.red("CSS failed to compile."));
        }
      })
      .pipe(gulp.dest(path.resolve(DEST_DIR)))
      .on("finish", () => {
        log("Finished Building CSS.");
        cb();
      });
  });
}

// Copy all static assets into the build directory
// defined in `./config.mjs`
async function copyAssets() {
  return new Promise((cb) => {
    log("Copying static assets...");
    _createDist();
    [...SOURCE_FILES, ...SOURCE_DIRS].forEach((asset) => {
      if (DEBUG) {
        log(`DEBUG: Copying ${asset.from}`);
      }
      gulp.src(asset.from).pipe(gulp.dest(path.resolve(DEST_DIR, asset.to)));
    });
    log("Finished copying static assets.");
    cb();
  });
}

async function buildManifest() {
  return new Promise((cb) => {
    log(`Building ${SYSTEM_FILE}...`);
    _createDist();
    // Read the template system.json from src/
    const systemRaw = fs.readFileSync(path.resolve(SRC_DIR, SYSTEM_FILE));
    const system = JSON.parse(systemRaw);
    // If we're in CI use $VERSION as the version, else use a dummy version
    const version = SYSTEM_VERSION;
    // Construct some URLs
    const repoUrl = process.env.CI
      ? process.env.REPO_URL
      : "http://example.com";
    const zipFile = process.env.CI ? process.env.ZIP_FILE : "cpr.zip";
    const manifestUrl = `${repoUrl}/latest/${SYSTEM_FILE}`;
    const downloadUrl = `${repoUrl}/${version}/${zipFile}`;

    system.version = version;
    system.manifest = manifestUrl;
    system.download = downloadUrl;
    system.title = SYSTEM_TITLE;

    fs.writeFileSync(
      path.resolve(DEST_DIR, SYSTEM_FILE),
      JSON.stringify(system, null, 2)
    );
    log(`Finished building ${SYSTEM_FILE}.`);
    cb();
  });
}

// Create the release notes for the version and put it in the distDir
async function buildDiscordMessage() {
  return new Promise((cb) => {
    log("Generating Release Notes...");
    const changelogFile = "CHANGELOG.md";
    const changelog = fs.readFileSync(path.resolve(changelogFile), "utf-8");

    // Get the latest release data from the CHANGELOG
    const releaseData = ChangelogUtils.markdownToJson(changelog, 2)[0];
    // Make an array of each H3 section from the latest release Data
    const releaseSections = ChangelogUtils.markdownToJson(
      releaseData.content,
      3
    );

    // The main Message can only be 2000 chars long, so we'll build it from
    // the above string then add the actual changes in as embeds.
    const message = [];
    message.push(DISCORD_MESSAGE_HEADER);
    message.push(
      DISCORD_MESSAGE_INTROS[
        Math.floor(Math.random() * DISCORD_MESSAGE_INTROS.length)
      ]
    );
    message.push(DISCORD_MESSAGE_BACKUP);
    message.push(DISCORD_MESSAGE_CHANGELOG);

    const jsonData = {
      username: DISCORD_BOT_NAME,
      avatar_url: DISCORD_BOT_AVATAR,
      content: message.join("\n\n"),
      embeds: [],
    };

    // Generate the embeds
    releaseSections.forEach((section) => {
      const sectionTempData = [];
      const sectionHeading = section.heading.replace("### ", "");
      const sectionItems = ChangelogUtils.markdownToJson(section.content, 4);

      if (sectionItems.length > 0) {
        // Loop over each h4 in the parent h3
        sectionItems.forEach((item) => {
          const itemHeading = item.heading.replace("#### ", "");
          // Strip out any unordered lists, we only want the headline changes
          const itemContent = item.content
            .replace(/^(\s*)[-+*]\s+.+$/gm, "")
            .replace(/\n{2,}/g, "");
          // If once we've stripped the ol/uls the section has no content, skip it
          if (itemContent !== "") {
            sectionTempData.push(`**${itemHeading}**\n\n${itemContent}`);
          }
        });
      } else {
        // Strip out any unordered lists, we only want the headline changes
        const itemContent = section.content
          .replace(/^(\s*)[-+*]\s+.+$/gm, "")
          .replace(/\n{2,}/g, "");

        sectionTempData.push(itemContent);
      }

      const sectionData = sectionTempData.join("\n\n");

      // Discord uses decimal rather than hex for colors
      // Set color in the following way:
      //   Action Needed: red
      //   Bug Fixes: blue
      //   Changes: orange
      //   New Features: green (default)
      const sectionColor = sectionHeading.includes("Action Needed")
        ? 16711680
        : sectionHeading.includes("Bug Fixes")
        ? 5814783
        : sectionHeading.includes("Changes")
        ? 15300864
        : 962304;

      if (sectionData !== "") {
        jsonData.embeds.push({
          title: `**${sectionHeading}**`,
          description: sectionData,
          color: sectionColor,
        });
      }
    });

    // Write the discord message data to a file
    fs.writeFileSync(
      path.join(DEST_DIR, "lang/release-notes/", `discord.json`),
      JSON.stringify(jsonData, null, "  "),
      { mode: 0o644 }
    );
    log("Finished Generating Discord Release Notes.");
    cb();
  });
}

/**
 * Generates YAML changelog files from the CHANGELOG for all different
 * languages and stick them in the PACKS_DIR so we can build them into a
 * compendium.
 *
 * @returns {Promise<void>} A promise that resolves when the changelog
 * generation is complete.
 */
async function buildChangelog() {
  log("Generating Changelog...");
  const fragmentDir = path.resolve(SRC_DIR, PACKS_DIR);
  const changelogDir = path.resolve(fragmentDir, "other/changelog");
  const systemRaw = fs.readFileSync(path.resolve(SRC_DIR, SYSTEM_FILE));
  const system = JSON.parse(systemRaw);
  const { languages } = system;

  // Delete then re-create
  if (fs.pathExistsSync(changelogDir)) {
    fs.rmSync(changelogDir, { recursive: true });
  }
  fs.mkdirSync(changelogDir, { recursive: true });

  // Loop over each language
  const promises = Object.values(languages).map(async (value) => {
    const langShort = value.lang;
    const langFull = value.name;
    const changelogFile =
      langShort !== "en" ? `CHANGELOG.${langShort}.md` : "CHANGELOG.md";
    const changelog = fs.readFileSync(path.resolve(changelogFile), "utf-8");
    await ChangelogUtils.GenerateChangelogJournal(
      changelog,
      langFull,
      changelogDir
    );
  });

  await Promise.all(promises);
  log("Finished Generating Changelog...");
}

async function processImages() {
  return new Promise((cb) => {
    log("Processing Images...");
    gulp
      .src("src/**/*.{jpg,jpeg,png,webp,webm}", { base: SRC_DIR })
      .on("data", (file) => {
        if (DEBUG) {
          log(
            `DEBUG: Processing Image: ${path.relative(
              process.cwd(),
              file.path
            )}`
          );
        }
      })
      .pipe(gulp.dest(DEST_DIR))
      .on("finish", () => {
        log("Finished Processing Images.");
        cb();
      });
  });
}

/**
 * Processes all SVG files, applying optimization and standardizing dimensions.
 * @returns {Promise<void>} A promise that resolves when SVG processing is complete
 */
async function processSvgs() {
  return new Promise((resolve) => {
    log("Processing SVGs...");

    // SVGO configuration
    const svgoConfig = {
      multipass: true,
      plugins: [
        // Basic optimizations
        "cleanupAttrs",
        "removeDoctype",
        "removeComments",
        "removeXMLProcInst",
        "removeUselessDefs",
        "convertStyleToAttrs",

        // Custom plugin to set dimensions
        {
          name: "customSetDimensions",
          type: "visitor",
          fn: () => ({
            element: {
              enter: (node) => {
                if (node.name === "svg") {
                  // Set default dimensions to 512 if value is missing
                  if (node.attributes.width === undefined) {
                    node.attributes.width = "512";
                  }
                  if (node.attributes.height === undefined) {
                    node.attributes.height = "512";
                  }
                  // Set viewbox if value is missing
                  if (node.attributes.viewBox === undefined) {
                    node.attributes.viewBox = `0 0 ${node.attributes.width} ${node.attributes.height}`;
                  }
                }
              },
            },
          }),
        },
      ],
    };

    gulp
      .src("src/**/*.svg", { base: SRC_DIR })
      .pipe(
        through2.obj(function (file, enc, callback) {
          if (file.isNull()) {
            callback(null, file);
            return;
          }

          if (DEBUG) {
            log(
              `DEBUG: Processing SVG: ${path.relative(
                process.cwd(),
                file.path
              )}`
            );
          }

          // Get SVG content as string
          const svgString = file.contents.toString("utf8");

          try {
            // Process with SVGO
            const result = optimize(svgString, {
              path: file.path,
              ...svgoConfig,
            });

            // Update file content with optimized SVG
            file.contents = Buffer.from(result.data);

            callback(null, file);
          } catch (error) {
            log(`Error processing ${file.path}: ${error.message}`);
            callback(error);
          }
        })
      )
      .pipe(gulp.dest(DEST_DIR))
      .on("error", (err) => {
        log(`SVG processing error: ${err.message}`);
        resolve(err);
      })
      .on("finish", () => {
        log("Finished Processing SVGs.");
        resolve();
      });
  });
}

async function watchSrc() {
  // Helper - watch the pattern, copy the output on change
  function watcher(pattern, out) {
    gulp
      .watch(pattern)
      .on("all", () =>
        gulp.src(pattern).pipe(gulp.dest(path.resolve(DEST_DIR, out)))
      );
  }

  SOURCE_FILES.forEach((file) => watcher(file.from, file.to));
  SOURCE_DIRS.forEach((folder) => watcher(folder.from, folder.to));
  gulp.watch("src/**/*.less").on("all", () => compileLess());
  // disabling while we fix Crowdin
  // gulp.watch("src/lang/*.json").on("all", () => propagateLangs());
  gulp
    .watch("src/**/*.{jpeg,jpg,png,webp,webm}")
    .on("all", () => processImages());
  gulp.watch("src/**/*.svg").on("all", () => processSvgs());
}

export {
  buildManifest,
  buildChangelog,
  buildDiscordMessage,
  cleanDist,
  copyAssets,
  compileLess,
  watchSrc,
  processImages,
  processSvgs,
};
