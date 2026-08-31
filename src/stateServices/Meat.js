// src/stateServices/Meat.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const Meat = require("../entities/Meat");
const notificationService = require("../services/Notification");

/**
 * MeatStateService handles SIDE EFFECTS only for meat products.
 * It does NOT contain CRUD or business logic – those belong to MeatService.
 * All methods here are event handlers (onCreated, onActivated, onDeactivated, etc.)
 * and are called by the subscriber after a change is detected.
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
   * Send event to all renderer windows (UI)
   * @param {string} channel
   * @param {any} data
   */
  _sendToRenderers(channel, data) {
    try {
      const { BrowserWindow } = require("electron");
      const windows = BrowserWindow.getAllWindows();
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send(channel, data);
        }
      });
    } catch (error) {
      logger.warn(
        "[MeatState] Failed to send IPC event (maybe not in Electron):",
        error.message,
      );
    }
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

    // Broadcast to UI
    this._sendToRenderers("meat:created", {
      id: meat.id,
      name: meat.name,
      sku: meat.sku,
      barcode: meat.barcode,
      pricePerKg: meat.pricePerKg,
      isActive: meat.isActive,
      categoryId: meat.categoryId,
      supplierId: meat.supplierId,
      createdAt: meat.createdAt,
    });

    // Audit log
    await auditLogger.logCreate("Meat", meatId, meat, user);
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

    // Broadcast to UI
    this._sendToRenderers("meat:activated", {
      id: meat.id,
      name: meat.name,
      sku: meat.sku,
      pricePerKg: meat.pricePerKg,
      activatedAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "Meat",
      meatId,
      { action: "activated" },
      { isActive: true },
      user
    );

    // Send notification (in-app)
    try {
      await notificationService.create(
        {
          userId: 1,
          title: "Meat Product Activated",
          message: `Meat "${meat.name}" (SKU: ${meat.sku}) has been activated.`,
          type: "info",
          metadata: {
            meatId: meat.id,
            meatName: meat.name,
            sku: meat.sku,
          },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[MeatState] Failed to send activation notification for meat #${meatId}:`, err);
    }
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

    // Broadcast to UI
    this._sendToRenderers("meat:deactivated", {
      id: meat.id,
      name: meat.name,
      sku: meat.sku,
      activeBatchCount,
      deactivatedAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "Meat",
      meatId,
      { action: "deactivated", activeBatchCount },
      { isActive: false },
      user
    );

    // Send notification (in-app)
    try {
      const message = `Meat "${meat.name}" (SKU: ${meat.sku}) has been deactivated.` +
        (activeBatchCount > 0 ? ` ${activeBatchCount} active batch(es) were cleared.` : "");

      await notificationService.create(
        {
          userId: 1,
          title: "Meat Product Deactivated",
          message,
          type: "warning",
          metadata: {
            meatId: meat.id,
            meatName: meat.name,
            sku: meat.sku,
            activeBatchCount,
          },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[MeatState] Failed to send deactivation notification for meat #${meatId}:`, err);
    }
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

    // Broadcast to UI
    this._sendToRenderers("meat:priceChanged", {
      id: meat.id,
      name: meat.name,
      sku: meat.sku,
      oldPrice,
      newPrice,
      changedAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "Meat",
      meatId,
      { pricePerKg: oldPrice },
      { pricePerKg: newPrice },
      user
    );

    // Send notification (in-app)
    try {
      await notificationService.create(
        {
          userId: 1,
          title: "Meat Price Updated",
          message: `Price for "${meat.name}" (SKU: ${meat.sku}) changed from ₱${oldPrice} to ₱${newPrice} per kg.`,
          type: "info",
          metadata: {
            meatId: meat.id,
            meatName: meat.name,
            oldPrice,
            newPrice,
          },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[MeatState] Failed to send price update notification for meat #${meatId}:`, err);
    }
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

    // Broadcast to UI
    this._sendToRenderers("meat:updated", {
      id: meat.id,
      name: meat.name,
      sku: meat.sku,
      changes,
      updatedAt: meat.updatedAt,
    });

    // Audit log
    await auditLogger.logUpdate(
      "Meat",
      meatId,
      changes,
      meat,
      user
    );
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

    // Broadcast to UI
    this._sendToRenderers("meat:deleted", {
      id: meatId,
      name: meat?.name,
      sku: meat?.sku,
      deletedAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logCreate("Meat", meatId, meat, user);
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

    // Broadcast to UI
    this._sendToRenderers("meat:restored", {
      id: meat.id,
      name: meat.name,
      sku: meat.sku,
      restoredAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "Meat",
      meatId,
      { action: "restored" },
      { isActive: true },
      user
    );
  }
}

module.exports = { MeatStateService };