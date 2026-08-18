// src/stateServices/PurchaseItemStateService.js
//@ts-check
const { logger } = require("../utils/logger");
const PurchaseItem = require("../entities/PurchaseItem");

/**
 * PurchaseItemStateService handles side effects for purchase items.
 * Currently, purchase items don't have complex state transitions, but this placeholder
 * can be extended in the future (e.g., when expiry dates trigger alerts, etc.)
 */
class PurchaseItemStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.purchaseItemRepo = dataSource.getRepository(PurchaseItem);
  }

  /**
   * Helper: get repository (transactional if queryRunner provided)
   * @param {import("typeorm").QueryRunner | null} qr
   * @param {Function} entityClass
   * @returns {import("typeorm").Repository<any>}
   */
  _getRepo(qr, entityClass) {
    if (qr) {
      return qr.manager.getRepository(entityClass);
    }
    return this.dataSource.getRepository(entityClass);
  }

  /**
   * Placeholder: called after a purchase item is created (e.g., to notify about expiry)
   * @param {PurchaseItem} item
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onItemCreated(item, user = "system", queryRunner = null) {
    logger.info(`[PurchaseItemState] Item #${item.id} created for purchase #${item.purchaseId}`);
    // Future: check expiry and schedule notifications
    return item;
  }

  /**
   * Placeholder: called before a purchase item is deleted (e.g., to validate)
   * @param {number} itemId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onBeforeDelete(itemId, user = "system", queryRunner = null) {
    logger.info(`[PurchaseItemState] Item #${itemId} about to be deleted by ${user}`);
    // Future: check if purchase is completed
  }
}

module.exports = { PurchaseItemStateService };