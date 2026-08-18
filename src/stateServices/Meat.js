// src/stateServices/Meat.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const Meat = require("../entities/Meat");
const notificationService = require("../services/Notification");

/**
 * MeatStateService handles state transitions and side effects for meat products.
 * It does NOT contain CRUD operations – those belong to MeatService.
 * Methods here handle toggling active status, price changes, and other business rules.
 */
class MeatStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.meatRepo = dataSource.getRepository(Meat);
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
   * Activate a meat product (set isActive = true)
   * @param {number} meatId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async activate(meatId, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const repo = this._getRepo(queryRunner, Meat);

    const meat = await repo.findOne({ where: { id: meatId } });
    if (!meat) {
      throw new Error(`Meat with ID ${meatId} not found`);
    }

    if (meat.isActive) {
      logger.warn(`[MeatState] Meat #${meatId} is already active`);
      return meat;
    }

    const oldStatus = meat.isActive;
    meat.isActive = true;
    meat.updatedAt = new Date();

    const updated = await updateDb(repo, meat, { queryRunner, skipSignal: false });

    await auditLogger.logUpdate(
      "Meat",
      meatId,
      { isActive: oldStatus },
      { isActive: true },
      user
    );

    // Side effect: send notification (optional)
    try {
      await notificationService.create(
        {
          userId: 1,
          title: "Meat Product Activated",
          message: `Meat "${meat.name}" (SKU: ${meat.sku}) has been activated.`,
          type: "info",
          metadata: { meatId: meat.id },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[MeatState] Failed to send activation notification for meat #${meatId}:`, err);
    }

    logger.info(`[MeatState] Meat #${meatId} activated`);
    return updated;
  }

  /**
   * Deactivate a meat product (set isActive = false)
   * @param {number} meatId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async deactivate(meatId, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const repo = this._getRepo(queryRunner, Meat);

    const meat = await repo.findOne({ where: { id: meatId } });
    if (!meat) {
      throw new Error(`Meat with ID ${meatId} not found`);
    }

    if (!meat.isActive) {
      logger.warn(`[MeatState] Meat #${meatId} is already inactive`);
      return meat;
    }

    // Check if there are active batches – cannot deactivate if there are active batches
    const Batch = require("../entities/Batch");
    const batchRepo = this._getRepo(queryRunner, Batch);
    const activeBatches = await batchRepo.count({
      where: { meat: { id: meatId }, status: "active" },
    });
    if (activeBatches > 0) {
      throw new Error(
        `Cannot deactivate meat #${meatId} because it has ${activeBatches} active batch(es). Please deplete or expire them first.`
      );
    }

    const oldStatus = meat.isActive;
    meat.isActive = false;
    meat.updatedAt = new Date();

    const updated = await updateDb(repo, meat, { queryRunner, skipSignal: false });

    await auditLogger.logUpdate(
      "Meat",
      meatId,
      { isActive: oldStatus },
      { isActive: false },
      user
    );

    // Side effect: send notification
    try {
      await notificationService.create(
        {
          userId: 1,
          title: "Meat Product Deactivated",
          message: `Meat "${meat.name}" (SKU: ${meat.sku}) has been deactivated. All active batches must be cleared.`,
          type: "warning",
          metadata: { meatId: meat.id },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[MeatState] Failed to send deactivation notification for meat #${meatId}:`, err);
    }

    logger.info(`[MeatState] Meat #${meatId} deactivated`);
    return updated;
  }

  /**
   * Update price per kg with side effects (e.g., notify, audit)
   * @param {number} meatId
   * @param {number} newPrice
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async updatePrice(meatId, newPrice, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const repo = this._getRepo(queryRunner, Meat);

    if (newPrice < 0) {
      throw new Error("Price cannot be negative");
    }

    const meat = await repo.findOne({ where: { id: meatId } });
    if (!meat) {
      throw new Error(`Meat with ID ${meatId} not found`);
    }

    const oldPrice = meat.pricePerKg;
    meat.pricePerKg = newPrice;
    meat.updatedAt = new Date();

    const updated = await updateDb(repo, meat, { queryRunner, skipSignal: false });

    await auditLogger.logUpdate(
      "Meat",
      meatId,
      { pricePerKg: oldPrice },
      { pricePerKg: newPrice },
      user
    );

    // Side effect: notify about price change (optional)
    try {
      await notificationService.create(
        {
          userId: 1,
          title: "Price Updated",
          message: `Price for "${meat.name}" changed from ${oldPrice} to ${newPrice} per kg.`,
          type: "info",
          metadata: { meatId: meat.id, oldPrice, newPrice },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[MeatState] Failed to send price update notification for meat #${meatId}:`, err);
    }

    logger.info(`[MeatState] Price updated for meat #${meatId}: ${oldPrice} → ${newPrice}`);
    return updated;
  }

  /**
   * Bulk price update (side effects for each)
   * @param {Array<{ id: number, price: number }>} updates
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async bulkUpdatePrice(updates, user = "system", queryRunner = null) {
    const results = { updated: [], errors: [] };
    for (const { id, price } of updates) {
      try {
        const saved = await this.updatePrice(id, price, user, queryRunner);
        results.updated.push(saved);
      } catch (err) {
        results.errors.push({ id, price, error: err.message });
      }
    }
    return results;
  }
}

module.exports = { MeatStateService };