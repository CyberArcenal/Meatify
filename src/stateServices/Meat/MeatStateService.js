// src/stateServices/meat/MeatStateService.js
//@ts-check
const { logger } = require("../../utils/logger");
const Meat = require("../../entities/Meat");
const MeatCreatedModule = require("./modules/status/MeatCreatedModule");
const MeatActivatedModule = require("./modules/status/MeatActivatedModule");
const MeatDeactivatedModule = require("./modules/status/MeatDeactivatedModule");
const MeatPriceChangeModule = require("./modules/status/MeatPriceChangeModule");
const MeatUpdatedModule = require("./modules/status/MeatUpdatedModule");
const MeatDeletedModule = require("./modules/status/MeatDeletedModule");
const MeatRestoredModule = require("./modules/status/MeatRestoredModule");
const MeatStatusModule = require("./modules/MeatStatusModule");
const MeatNotificationModule = require("./modules/MeatNotificationModule");
const MeatAuditModule = require("./modules/MeatAuditModule");

/**
 * MeatStateService - Orchestrates side effects for meat state changes.
 * It does NOT contain CRUD or business logic – those belong to MeatService.
 * All methods here are event handlers and are called by the subscriber after a change is detected.
 *
 * ✅ Every method sends IPC events to the UI for real-time updates.
 */
class MeatStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.meatRepo = dataSource.getRepository(Meat);

    // ─── Initialize modules ──────────────────────────────────────
    this.createdModule = new MeatCreatedModule();
    this.activatedModule = new MeatActivatedModule();
    this.deactivatedModule = new MeatDeactivatedModule();
    this.priceChangeModule = new MeatPriceChangeModule();
    this.updatedModule = new MeatUpdatedModule();
    this.deletedModule = new MeatDeletedModule();
    this.restoredModule = new MeatRestoredModule();
    this.statusModule = new MeatStatusModule();
    this.notificationModule = new MeatNotificationModule();
    this.auditModule = new MeatAuditModule();
  }

  /**
   * Helper: get repository (transactional if queryRunner provided)
   */
  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
  }

  // ============================================================
  // 🔄 SIDE EFFECTS (called by subscriber)
  // ============================================================

  /**
   * Side effect after a meat is created
   * Called from MeatSubscriber.afterInsert
   * @param {number} meatId
   * @param {Meat} meat
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onCreated(meatId, meat, user = "system", queryRunner = null) {
    logger.info(`[MeatState] ✅ Meat #${meatId} (${meat.name}) created by ${user}`);

    // 1. Handle creation side effects (UI broadcast)
    await this.createdModule.handle(meat, user);

    // 2. Audit log
    await this.auditModule.logCreated(meatId, meat, user);
  }

  /**
   * Side effect after a meat is activated (isActive: false → true)
   * Called from MeatSubscriber.afterUpdate
   * @param {number} meatId
   * @param {Meat} meat
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onActivated(meatId, meat, user = "system", queryRunner = null) {
    logger.info(`[MeatState] ✅ Meat #${meatId} (${meat.name}) activated by ${user}`);

    // 1. Validate activation (placeholder for future)
    const validation = this.statusModule.validateActivate(meat, {});
    if (!validation.valid) {
      logger.warn(`[MeatState] Activation validation: ${validation.reason}`);
    }

    // 2. Handle activation side effects (UI broadcast + notification)
    await this.activatedModule.handle(meat, user, queryRunner);

    // 3. Audit log
    await this.auditModule.logActivated(meatId, meat, user);
  }

  /**
   * Side effect after a meat is deactivated (isActive: true → false)
   * Called from MeatSubscriber.afterUpdate
   * @param {number} meatId
   * @param {Meat} meat
   * @param {Object} options
   * @param {number} [options.activeBatchCount] - Number of active batches that were cleared
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onDeactivated(meatId, meat, options = {}, user = "system", queryRunner = null) {
    const { activeBatchCount = 0 } = options;

    logger.info(`[MeatState] ✅ Meat #${meatId} (${meat.name}) deactivated by ${user}`);

    // 1. Validate deactivation (placeholder for future)
    const validation = this.statusModule.validateDeactivate(meat, { activeBatchCount });
    if (!validation.valid) {
      logger.warn(`[MeatState] Deactivation validation: ${validation.reason}`);
    }

    // 2. Handle deactivation side effects (UI broadcast + notification)
    await this.deactivatedModule.handle(meat, { activeBatchCount }, user, queryRunner);

    // 3. Audit log
    await this.auditModule.logDeactivated(meatId, meat, { activeBatchCount }, user);
  }

  /**
   * Side effect after a meat's price changes
   * Called from MeatSubscriber.afterUpdate
   * @param {number} meatId
   * @param {number} oldPrice
   * @param {number} newPrice
   * @param {Meat} meat
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onPriceChange(meatId, oldPrice, newPrice, meat, user = "system", queryRunner = null) {
    logger.info(`[MeatState] ✅ Meat #${meatId} (${meat.name}) price changed: ${oldPrice} → ${newPrice} by ${user}`);

    // 1. Validate price change (placeholder for future)
    const validation = this.statusModule.validatePriceChange(meat, newPrice, {});
    if (!validation.valid) {
      logger.warn(`[MeatState] Price change validation: ${validation.reason}`);
    }

    // 2. Handle price change side effects (UI broadcast + notification)
    await this.priceChangeModule.handle(meatId, oldPrice, newPrice, meat, user, queryRunner);

    // 3. Audit log
    await this.auditModule.logPriceChange(meatId, oldPrice, newPrice, meat, user);
  }

  /**
   * Side effect after a meat is updated (generic)
   * Called from MeatSubscriber.afterUpdate for other changes
   * @param {number} meatId
   * @param {Meat} meat
   * @param {Object} changes
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onUpdated(meatId, meat, changes, user = "system", queryRunner = null) {
    logger.info(`[MeatState] ✅ Meat #${meatId} (${meat.name}) updated (fields: ${Object.keys(changes).join(", ")})`);

    // 1. Handle update side effects (UI broadcast)
    await this.updatedModule.handle(meat, changes, user);

    // 2. Audit log
    await this.auditModule.logUpdated(meatId, changes, meat, user);
  }

  /**
   * Side effect after a meat is soft-deleted
   * Called from MeatSubscriber.afterRemove
   * @param {number} meatId
   * @param {Meat} meat
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onDeleted(meatId, meat, user = "system", queryRunner = null) {
    logger.info(`[MeatState] ✅ Meat #${meatId} (${meat?.name}) soft-deleted by ${user}`);

    // 1. Handle deletion side effects (UI broadcast)
    await this.deletedModule.handle(meatId, meat, user);

    // 2. Audit log
    await this.auditModule.logDeleted(meatId, meat, user);
  }

  /**
   * Side effect after a meat is restored
   * @param {number} meatId
   * @param {Meat} meat
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onRestored(meatId, meat, user = "system", queryRunner = null) {
    logger.info(`[MeatState] ✅ Meat #${meatId} (${meat.name}) restored by ${user}`);

    // 1. Handle restoration side effects (UI broadcast)
    await this.restoredModule.handle(meat, user);

    // 2. Audit log
    await this.auditModule.logRestored(meatId, meat, user);
  }
}

module.exports = { MeatStateService };