/* eslint-disable no-param-reassign */

import BaseMigrationScript from "../base-migration-script.js";

export default class NetarchTilesMigration extends BaseMigrationScript {
  static version = 31;

  static name = "Misc: Netarch Tiles";

  async migrateMisc() {
    const scenes = game.scenes.contents;

    for (const scene of scenes) {
      const tiles = scene.tiles.contents;
      for (const tile of tiles) {
        const { src } = tile.texture;
        if (src?.includes(`systems/${game.system.id}/tiles/netarch`)) {
          const newSrc = src.replace(/PNG/, "WebP").replace(/.png/, ".webp");
          tile.update({ "texture.src": newSrc });
        }
      }
    }
  }
}
