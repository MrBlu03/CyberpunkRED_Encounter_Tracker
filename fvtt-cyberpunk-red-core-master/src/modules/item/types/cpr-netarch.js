import CPRItem from "../cpr-item.js";
import LOGGER from "../../utils/cpr-logger.js";
import SystemUtils from "../../utils/cpr-systemUtils.js";
import CPRDialog from "../../dialog/cpr-dialog-application.js";

/**
 * Extend the base CPRItem object with things specific to NET Architectures.
 * @extends {CPRItem}
 */
export default class CPRNetArchItem extends CPRItem {
  /**
   * We extend the constructor to include a bunch of configuration data related to floors and
   * drawing said floors in programmatically generated scene.
   *
   * @constructor
   */
  constructor(itemData, context) {
    super(itemData, context);
    this.options = {
      filePath: `systems/${game.system.id}/tiles/netarch/WebP/`,
      fileExtension: "webp",
      sceneName: null,
      gridSize: 110,
      connectorWidth: 1,
      connectorHeight: 1,
      levelWidth: 3,
      levelHeight: 3,
      cornerOffsetX: 2,
      cornerOffsetY: 2,
    };
    this.animated = false;
    this.scene = null;
    this.tileData = null;
    this.floorDict = {
      "CPR.netArchitecture.floor.options.password": "Password",
      "CPR.netArchitecture.floor.options.file": "File",
      "CPR.netArchitecture.floor.options.controlnode": "ControlNode",
      "CPR.global.programClass.blackice": "BlackIce",
      "CPR.netArchitecture.floor.options.blackIce.asp": "Asp",
      "CPR.netArchitecture.floor.options.blackIce.giant": "Giant",
      "CPR.netArchitecture.floor.options.blackIce.hellhound": "Hellhound",
      "CPR.netArchitecture.floor.options.blackIce.kraken": "Kraken",
      "CPR.netArchitecture.floor.options.blackIce.liche": "Liche",
      "CPR.netArchitecture.floor.options.blackIce.raven": "Raven",
      "CPR.netArchitecture.floor.options.blackIce.scorpion": "Scorpion",
      "CPR.netArchitecture.floor.options.blackIce.skunk": "Skunk",
      "CPR.netArchitecture.floor.options.blackIce.wisp": "Wisp",
      "CPR.netArchitecture.floor.options.blackIce.dragon": "Dragon",
      "CPR.netArchitecture.floor.options.blackIce.killer": "Killer",
      "CPR.netArchitecture.floor.options.blackIce.sabertooth": "Sabertooth",
      "CPR.netArchitecture.floor.options.demon.demon": "Demon",
      "CPR.netArchitecture.floor.options.demon.balron": "Balron",
      "CPR.netArchitecture.floor.options.demon.efreet": "Efreet",
      "CPR.netArchitecture.floor.options.demon.imp": "Imp",
      "CPR.netArchitecture.floor.options.root": "Root",
    };
  }

  /**
   * Generate a Netarch scene with floor tiles.
   *
   * @returns nothing
   */
  async _generateNetarchScene() {
    this.tileData = {
      arrow: {
        texture: {
          src: `${this.options.filePath}/Arrow.${this.options.fileExtension}`,
        },
        width: this.options.gridSize * this.options.connectorWidth,
        height: this.options.gridSize * this.options.connectorHeight,
        scale: 1,
        x: 0,
        y: 0,
        rotation: 0,
      },
      level: {
        texture: {
          src: `${this.options.filePath}/Root.${this.options.fileExtension}`,
        },
        width: this.options.gridSize * this.options.levelWidth,
        height: this.options.gridSize * this.options.levelHeight,
        scale: 1,
        x: 0,
        y: 0,
        rotation: 0,
      },
    };

    const floorData = foundry.utils.duplicate(this.system.floors);
    if (floorData.length === 0) {
      SystemUtils.DisplayMessage(
        "error",
        SystemUtils.Localize("CPR.netArchitecture.generation.noFloorError")
      );
      return;
    }
    if (this.options.sceneName === null) {
      if (this.animated) {
        if (
          game.scenes.find((f) => f.name === `${this.name} (animated)`) ===
            null ||
          game.scenes.find((f) => f.name === `${this.name} (animated)`) ===
            undefined
        ) {
          await this._duplicateScene(`${this.name} (animated)`);
        } else {
          this.scene = game.scenes.find(
            (f) => f.name === `${this.name} (animated)`
          );
          await this._removeAllTiles();
        }
      } else if (
        game.scenes.find((f) => f.name === this.name) === null ||
        game.scenes.find((f) => f.name === this.name) === undefined
      ) {
        await this._duplicateScene(`${this.name}`);
      } else {
        this.scene = game.scenes.find((f) => f.name === this.name);
        await this._removeAllTiles();
      }
    } else {
      this.scene = game.scenes.find((f) => f.name === this.options.sceneName);
      if (this.scene === null) {
        SystemUtils.DisplayMessage(
          "error",
          SystemUtils.Localize("CPR.netArchitecture.generation.noSceneError")
        );
        return;
      }
      await this._removeAllTiles();
    }
    const newTiles = [];
    const levelList = [];
    floorData.forEach((floor) => {
      const level = Number(floor.floor);
      const { branch } = floor;
      const dv = CPRNetArchItem._checkDV(floor.dv);
      const content = this._checkFloorType(floor);
      if (level === null) {
        SystemUtils.DisplayMessage(
          "error",
          SystemUtils.Localize(
            "CPR.netArchitecture.generation.floorFormattingError"
          )
        );
        return;
      }
      levelList.push([level, branch]);
      const newLevel = foundry.utils.duplicate(this.tileData.level);
      newLevel.x =
        this.options.gridSize *
        (this.options.cornerOffsetX +
          (this.options.levelWidth + this.options.connectorWidth) *
            (level - 1));
      if (branch === null) {
        newLevel.y = this.options.gridSize * this.options.cornerOffsetY;
      } else {
        newLevel.y =
          this.options.gridSize *
          (this.options.cornerOffsetY +
            (this.options.levelHeight + this.options.connectorHeight) *
              (branch.charCodeAt(0) - 97));
      }
      if (content !== null) {
        if (
          content === "Password" ||
          content === "File" ||
          content === "ControlNode"
        ) {
          if ([6, 8, 10, 12].includes(dv)) {
            newLevel.texture.src = `${this.options.filePath}/${content}DV${dv}.${this.options.fileExtension}`;
          } else {
            newLevel.texture.src = `${this.options.filePath}/${content}.${this.options.fileExtension}`;
          }
        } else {
          newLevel.texture.src = `${this.options.filePath}/${content}.${this.options.fileExtension}`;
        }
      }
      newTiles.push(newLevel);
      const newArrow = foundry.utils.duplicate(this.tileData.arrow);
      newArrow.x =
        this.options.gridSize *
        (this.options.cornerOffsetX -
          this.options.connectorWidth +
          (this.options.levelWidth + this.options.connectorWidth) *
            (level - 1));
      if (branch === null) {
        newArrow.y =
          this.options.gridSize *
          (this.options.cornerOffsetY +
            (this.options.levelHeight - this.options.connectorHeight) / 2);
      } else {
        newArrow.y =
          this.options.gridSize *
          (this.options.cornerOffsetY +
            (this.options.levelHeight - this.options.connectorHeight) / 2 +
            (this.options.levelHeight + this.options.connectorHeight) *
              (branch.charCodeAt(0) - 97));
      }
      newTiles.push(newArrow);
    });
    levelList.sort();
    const branchCounter = ["a"];
    levelList.forEach((level) => {
      if (level[1] !== null) {
        if (!branchCounter.includes(level[1])) {
          branchCounter.push(foundry.utils.duplicate(level[1]));
          const newArrow = foundry.utils.duplicate(this.tileData.arrow);
          let deltaHeight =
            this.options.connectorHeight +
            (this.options.levelHeight - this.options.connectorHeight) / 2;
          let deltaWidth =
            (this.options.levelWidth + this.options.connectorHeight) / 2;
          if (this.options.connectorHeight >= this.options.connectorWidth) {
            newArrow.rotation = 90;
            while (deltaHeight >= this.options.connectorWidth) {
              newArrow.x =
                this.options.gridSize *
                (this.options.cornerOffsetX +
                  (this.options.levelWidth + this.options.connectorWidth) *
                    (level[0] - 2) +
                  (this.options.levelWidth - this.options.connectorWidth) / 2);
              newArrow.y =
                this.options.gridSize *
                (this.options.cornerOffsetY +
                  (this.options.levelHeight - this.options.connectorHeight) /
                    2 +
                  (this.options.levelHeight + this.options.connectorHeight) *
                    (level[1].charCodeAt(0) - 97) -
                  deltaHeight +
                  (this.options.connectorWidth - this.options.connectorHeight) /
                    2);
              if (deltaHeight < 2 * this.options.connectorWidth) {
                newArrow.x -=
                  (newArrow.width / 2) *
                  (deltaHeight / this.options.connectorWidth - 1);
                newArrow.y +=
                  (newArrow.width / 2) *
                  (deltaHeight / this.options.connectorWidth - 1);
                newArrow.width *= deltaHeight / this.options.connectorWidth;
                deltaHeight = 0;
              }
              newTiles.push(foundry.utils.duplicate(newArrow));
              deltaHeight -= this.options.connectorWidth;
            }
            newArrow.rotation = 0;
            newArrow.width = this.tileData.arrow.width;
            while (deltaWidth >= this.options.connectorWidth) {
              newArrow.x =
                this.options.gridSize *
                (this.options.cornerOffsetX +
                  (this.options.levelWidth + this.options.connectorWidth) *
                    (level[0] - 2) +
                  (this.options.levelWidth - this.options.connectorHeight) / 2 +
                  deltaWidth -
                  this.options.connectorWidth);
              newArrow.y =
                this.options.gridSize *
                (this.options.cornerOffsetY +
                  (this.options.levelHeight - this.options.connectorHeight) /
                    2 +
                  (this.options.levelHeight + this.options.connectorHeight) *
                    (level[1].charCodeAt(0) - 97));
              if (deltaWidth < 2 * this.options.connectorWidth) {
                newArrow.x -=
                  newArrow.width *
                  (deltaWidth / this.options.connectorWidth - 1);
                newArrow.width *= deltaWidth / this.options.connectorWidth;
                deltaWidth = 0;
              }
              newTiles.push(foundry.utils.duplicate(newArrow));
              deltaWidth -= this.options.connectorWidth;
            }
          } else {
            newArrow.rotation = 90;
            while (deltaHeight >= this.options.connectorWidth) {
              newArrow.x =
                this.options.gridSize *
                (this.options.cornerOffsetX +
                  (this.options.levelWidth + this.options.connectorWidth) *
                    (level[0] - 2) +
                  (this.options.levelWidth - this.options.connectorWidth) / 2);
              newArrow.y =
                this.options.gridSize *
                (this.options.cornerOffsetY +
                  (this.options.levelHeight - this.options.connectorHeight) /
                    2 +
                  (this.options.levelHeight + this.options.connectorHeight) *
                    (level[1].charCodeAt(0) - 97) -
                  deltaHeight +
                  (this.options.connectorWidth - this.options.connectorHeight) /
                    2);
              if (deltaHeight < 2 * this.options.connectorWidth) {
                newArrow.x -=
                  (newArrow.width / 2) *
                  (deltaHeight / this.options.connectorWidth - 1);
                newArrow.y +=
                  (newArrow.width / 2) *
                  (deltaHeight / this.options.connectorWidth - 1);
                newArrow.width *= deltaHeight / this.options.connectorWidth;
                deltaHeight = 0;
              }
              newTiles.push(foundry.utils.duplicate(newArrow));
              deltaHeight -= this.options.connectorWidth;
            }
            newArrow.rotation = 0;
            newArrow.width = this.tileData.arrow.width;
            while (deltaWidth >= this.options.connectorWidth) {
              newArrow.x =
                this.options.gridSize *
                (this.options.cornerOffsetX +
                  (this.options.levelWidth + this.options.connectorWidth) *
                    (level[0] - 2) +
                  (this.options.levelWidth - this.options.connectorHeight) / 2 +
                  deltaWidth -
                  this.options.connectorWidth);
              newArrow.y =
                this.options.gridSize *
                (this.options.cornerOffsetY +
                  (this.options.levelHeight - this.options.connectorHeight) /
                    2 +
                  (this.options.levelHeight + this.options.connectorHeight) *
                    (level[1].charCodeAt(0) - 97));
              if (deltaWidth < 2 * this.options.connectorWidth) {
                newArrow.x -=
                  newArrow.width *
                  (deltaWidth / this.options.connectorWidth - 1);
                newArrow.width *= deltaWidth / this.options.connectorWidth;
                deltaWidth = 0;
              }
              newTiles.push(foundry.utils.duplicate(newArrow));
              deltaWidth -= this.options.connectorWidth;
            }
          }
        }
      }
    });
    await this._addTilesToScene(newTiles);
    await this.scene.view();
    SystemUtils.DisplayMessage(
      "notify",
      SystemUtils.Localize("CPR.netArchitecture.generation.done")
    );
  }

  /**
   * Duplicate a scene given a new name. Used to create a starting scene by copying one packed in
   * a compendium that comes with the system module.
   *
   * @param {String} newName - name for the new scene
   */
  async _duplicateScene(newName) {
    const sceneName = this.animated
      ? "Netarch Template - Animated"
      : "Netarch Template";
    const scene = await SystemUtils.GetCompendiumDoc(
      `${game.system.id}.other_scenes`,
      sceneName
    );
    const sceneData = foundry.utils.duplicate(scene);
    sceneData.id = null;
    sceneData.name = newName;
    await Scene.createDocuments([sceneData]);
    this.scene = game.scenes.find((f) => f.name === newName);
  }

  /**
   * Utility method to create a tile in a scene. A "tile" here is a netarch floor.
   *
   * @param {*} tileData - data about the ... tile to place
   * @returns nothing
   */
  async _addTilesToScene(tileData) {
    if (this.scene === null) {
      LOGGER.log("Error no scene defined!");
      return;
    }
    await this.scene.createEmbeddedDocuments("Tile", tileData);
  }

  /**
   * Utility method to remove all tiles from a scene
   *
   * @returns nothing
   */
  async _removeAllTiles() {
    const tileIds = [];
    this.scene.tiles.forEach((t) => {
      tileIds.push(t.id);
    });
    await this.scene.deleteEmbeddedDocuments("Tile", tileIds);
  }

  /**
   * Check that a given DV string is actually a number
   *
   * @param {String} dv - an unsanitized string we hope is a DV value (Number)
   * @returns the number given, or null if it is not a number
   */
  static _checkDV(dv) {
    const reg = /^[0-9]+$/;
    if (reg.test(dv)) {
      return Number(dv);
    }
    return null;
  }

  /**
   * What is the "type" of the given floor?
   *
   * @param {Object} floor - the floor to inspect
   * @returns whether the given floor is a black-ICE floor or other floor type
   */
  _checkFloorType(floor) {
    if (
      floor.content === "CPR.global.programClass.blackice" &&
      floor.blackice !== "--"
    ) {
      return this.floorDict[floor.blackice];
    }
    return this.floorDict[floor.content];
  }

  /**
   * Generate a scene with some additional customizations.
   *
   * @returns nothing
   */
  async _customize() {
    let formData = {
      animated: false,
      customTiles: false,
      filePath: `systems/${game.system.id}/tiles/netarch/WebP/`,
      fileExtension: "webp",
      sceneName: "",
      gridSize: 110,
      connectorWidth: 1,
      connectorHeight: 1,
      levelWidth: 3,
      levelHeight: 3,
      cornerOffsetX: 2,
      cornerOffsetY: 2,
      returnType: "string",
    };

    // Show "NetArch Scene Generation" prompt.
    formData = await CPRDialog.showDialog(formData, {
      // Set options for the dialog.
      title: SystemUtils.Localize("CPR.dialog.netArchitectureGeneration.title"),
      template: `systems/${game.system.id}/templates/dialog/cpr-netarch-scene-generation-prompt.hbs`,
    }).catch((err) => LOGGER.debug(err));
    if (formData === undefined) {
      return;
    }

    if (formData.customTiles) {
      this.options.filePath = formData.filePath;
      this.options.fileExtension = formData.fileExtension;
      this.options.gridSize = Number(formData.gridSize);
      this.options.connectorWidth = Number(formData.connectorWidth);
      this.options.connectorHeight = Number(formData.connectorHeight);
      this.options.levelWidth = Number(formData.levelWidth);
      this.options.levelHeight = Number(formData.levelHeight);
      this.options.cornerOffsetX = Number(formData.cornerOffsetX);
      this.options.cornerOffsetY = Number(formData.cornerOffsetY);
      if (formData.sceneName !== "") {
        this.options.sceneName = formData.sceneName;
      }
    } else if (formData.animated) {
      this.options.filePath = `systems/${game.system.id}/tiles/netarch/WebM`;
      this.options.fileExtension = "webm";
      this.animated = true;
    }

    this._generateNetarchScene();
  }
}
