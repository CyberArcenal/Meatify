// src/stateServices/ReturnRefundItem.js
//@ts-check
const { logger } = require("../utils/logger");
const ReturnRefundItem = require("../entities/ReturnRefundItem");

/**
 * ReturnRefundItemStateService handles side effects for return refund items.
 * Currently, return refund items don't have complex state transitions, but this placeholder
 * can be extended in the future (e.g., when items are processed, stock adjustments, etc.)
 */
class ReturnRefundItemStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.returnItemRepo = dataSource.getRepository(ReturnRefundItem);
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
   * Placeholder: called after a return item is created
   * @param {ReturnRefundItem} item
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onItemCreated(item, user = "system", queryRunner = null) {
    logger.info(`[ReturnRefundItemState] Item #${item.id} created for return #${item.returnRefundId}`);
    // Future: validate batch stock, trigger notifications
    return item;
  }

  /**
   * Placeholder: called before a return item is deleted
   * @param {number} itemId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onBeforeDelete(itemId, user = "system", queryRunner = null) {
    logger.info(`[ReturnRefundItemState] Item #${itemId} about to be deleted by ${user}`);
    // Future: check if return is already processed
  }

  /**
   * Placeholder: called when a return item is processed (stock adjustment)
   * @param {number} itemId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onProcessed(itemId, user = "system", queryRunner = null) {
    logger.info(`[ReturnRefundItemState] Item #${itemId} processed - stock adjusted`);
    // Future: actual stock adjustment logic would be handled by parent ReturnRefundStateService
  }
}

module.exports = { ReturnRefundItemStateService };