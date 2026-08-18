// src/stateServices/SaleItemStateService.js
//@ts-check
const { logger } = require("../utils/logger");
const SaleItem = require("../entities/SaleItem");

/**
 * SaleItemStateService handles side effects for sale items.
 * Currently, sale items don't have complex state transitions, but this placeholder
 * can be extended in the future (e.g., when batch depletion triggers alerts, etc.)
 */
class SaleItemStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.saleItemRepo = dataSource.getRepository(SaleItem);
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
   * Placeholder: called after a sale item is created (e.g., to validate batch stock)
   * @param {SaleItem} item
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onItemCreated(item, user = "system", queryRunner = null) {
    logger.info(`[SaleItemState] Item #${item.id} created for sale #${item.saleId}`);
    // Future: validate batch stock, trigger notifications
    return item;
  }

  /**
   * Placeholder: called before a sale item is deleted (e.g., to validate)
   * @param {number} itemId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onBeforeDelete(itemId, user = "system", queryRunner = null) {
    logger.info(`[SaleItemState] Item #${itemId} about to be deleted by ${user}`);
    // Future: check if sale is already processed
  }
}

module.exports = { SaleItemStateService };