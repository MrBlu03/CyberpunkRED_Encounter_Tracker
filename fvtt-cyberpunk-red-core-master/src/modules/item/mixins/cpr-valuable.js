import CPR from "../../system/config.js";

/**
 * Valuable Items have a price and a price category. This might belong in "common" if we agree
 * every item in the game should have a price.
 */
const Valuable = function Valuable() {
  /**
   * Return the price of an Item that is set with the category.
   * This will be useful for future automation that sets the category
   * automatically based on the price. Not currently used anywhere.
   *
   * @param {String} category - the price category for an Item
   * @returns {Number} - the price of the item per the core rules
   */
  this.calcPrice = function calcPrice(category) {
    // Note: since we use "const", this map is not persisted on the Item object the mixin is added to
    let price = CPR.itemPriceCategoryMap[category];
    const cprItemData = this.system;
    if (this.type === "ammo") {
      if (cprItemData.variety !== "grenade" && cprItemData.variety !== "rocket")
        price /= 10;
    }
    return price;
  };

  /**
   * Opposite of calcPrice. Given a price, return the category. Used in the AE migration code.
   *
   * @param {Number} price
   * @returns {String}
   */
  this.getPriceCategory = function getPriceCategory(price) {
    let priceCategory = "free";
    const PRICE_CATEGORY_MAPPINGS = {};
    let priceTiers = [];
    for (const key of Object.keys(CPR.itemPriceCategoryMap)) {
      const integerValue = parseInt(CPR.itemPriceCategoryMap[key], 10);
      PRICE_CATEGORY_MAPPINGS[integerValue] = key;
      priceTiers.push(integerValue);
    }
    priceTiers = priceTiers.sort((a, b) => a - b);
    for (const priceTier of priceTiers) {
      priceCategory =
        priceTier <= price ? PRICE_CATEGORY_MAPPINGS[priceTier] : priceCategory;
      priceCategory =
        priceCategory === "free" && price > 0
          ? PRICE_CATEGORY_MAPPINGS[priceTier]
          : priceCategory;
    }
    return priceCategory;
  };
};

export default Valuable;
