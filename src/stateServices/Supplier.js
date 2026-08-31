// src/stateServices/Supplier.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const Supplier = require("../entities/Supplier");
const notificationService = require("../services/Notification");
const system = require("../utils/system");

/**
 * SupplierStateService handles SIDE EFFECTS only for supplier state changes.
 * It does NOT contain CRUD or business logic – those belong to SupplierService.
 * All methods here are event handlers (onCreated, onActivated, onDeactivated, etc.)
 * and are called by the subscriber after a change is detected.
 *
 * ✅ Every method sends IPC events to the UI for real-time updates.
 * ❌ No business logic (no activation/deactivation/merge operations)
 */
class SupplierStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.supplierRepo = dataSource.getRepository(Supplier);
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
        "[SupplierState] Failed to send IPC event (maybe not in Electron):",
        error.message,
      );
    }
  }

  // ============================================================
  // 🔄 SIDE EFFECTS (called by subscriber)
  // ============================================================

  /**
   * Side effect after a supplier is created
   * Called from SupplierSubscriber.afterInsert
   * @param {number} supplierId
   * @param {Supplier} supplier
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onCreated(supplierId, supplier, user = "system", queryRunner = null) {
    logger.info(`[SupplierState] ✅ Supplier #${supplierId} (${supplier.name}) created by ${user}`);

    // Broadcast to UI
    this._sendToRenderers("supplier:created", {
      id: supplier.id,
      name: supplier.name,
      contactInfo: supplier.contactInfo,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt,
    });

    // Audit log
    await auditLogger.logCreate("Supplier", supplierId, supplier, user);
  }

  /**
   * Side effect after a supplier is activated (isActive: false → true)
   * Called from SupplierSubscriber.afterUpdate
   * @param {number} supplierId
   * @param {Supplier} supplier
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onActivated(supplierId, supplier, user = "system", queryRunner = null) {
    logger.info(`[SupplierState] ✅ Supplier #${supplierId} (${supplier.name}) activated by ${user}`);

    // Broadcast to UI
    this._sendToRenderers("supplier:activated", {
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      activatedAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "Supplier",
      supplierId,
      { action: "activated" },
      { isActive: true },
      user
    );

    // Send notification (in-app)
    try {
      await notificationService.create(
        {
          userId: 1,
          title: "Supplier Activated",
          message: `Supplier "${supplier.name}" has been activated.`,
          type: "info",
          metadata: {
            supplierId: supplier.id,
            supplierName: supplier.name,
          },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[SupplierState] Failed to send activation notification for supplier #${supplierId}:`, err);
    }
  }

  /**
   * Side effect after a supplier is deactivated (isActive: true → false)
   * Called from SupplierSubscriber.afterUpdate
   * @param {number} supplierId
   * @param {Supplier} supplier
   * @param {Object} options
   * @param {number} [options.meatsReassigned] - Number of meats reassigned
   * @param {number} [options.reassignToSupplierId] - Target supplier ID
   * @param {number} [options.pendingPurchases] - Number of pending purchases
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onDeactivated(supplierId, supplier, options = {}, user = "system", queryRunner = null) {
    const { meatsReassigned = 0, reassignToSupplierId = null, pendingPurchases = 0 } = options;

    logger.info(`[SupplierState] ✅ Supplier #${supplierId} (${supplier.name}) deactivated by ${user}`);

    // Broadcast to UI
    this._sendToRenderers("supplier:deactivated", {
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      meatsReassigned,
      reassignToSupplierId,
      pendingPurchases,
      deactivatedAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "Supplier",
      supplierId,
      { action: "deactivated", meatsReassigned, pendingPurchases },
      { isActive: false },
      user
    );

    // Send notification (in-app)
    try {
      const message = `Supplier "${supplier.name}" has been deactivated.` +
        (meatsReassigned > 0 ? ` ${meatsReassigned} meat(s) were reassigned.` : "") +
        (pendingPurchases > 0 ? ` Note: ${pendingPurchases} pending purchase(s) exist.` : "");

      await notificationService.create(
        {
          userId: 1,
          title: "Supplier Deactivated",
          message,
          type: "warning",
          metadata: {
            supplierId: supplier.id,
            supplierName: supplier.name,
            meatsReassigned,
            reassignToSupplierId,
            pendingPurchases,
          },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[SupplierState] Failed to send deactivation notification for supplier #${supplierId}:`, err);
    }
  }

  /**
   * Side effect after suppliers are merged
   * Called from SupplierSubscriber.afterUpdate or directly from SupplierService
   * @param {Object} data
   * @param {number} data.sourceSupplierId
   * @param {Supplier} data.sourceSupplier
   * @param {number} data.targetSupplierId
   * @param {Supplier} data.targetSupplier
   * @param {number} data.meatsReassigned
   * @param {number} data.purchasesReassigned
   * @param {number} data.batchesReassigned
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onMerged(data, user = "system", queryRunner = null) {
    const {
      sourceSupplierId,
      sourceSupplier,
      targetSupplierId,
      targetSupplier,
      meatsReassigned = 0,
      purchasesReassigned = 0,
      batchesReassigned = 0,
    } = data;

    logger.info(
      `[SupplierState] ✅ Suppliers merged: #${sourceSupplierId} (${sourceSupplier.name}) → #${targetSupplierId} (${targetSupplier.name}) by ${user}`
    );

    // Broadcast to UI
    this._sendToRenderers("supplier:merged", {
      sourceSupplierId,
      sourceSupplierName: sourceSupplier.name,
      targetSupplierId,
      targetSupplierName: targetSupplier.name,
      meatsReassigned,
      purchasesReassigned,
      batchesReassigned,
      mergedAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "Supplier",
      sourceSupplierId,
      {
        action: "merged",
        targetSupplierId,
        meatsReassigned,
        purchasesReassigned,
        batchesReassigned,
      },
      { isActive: false },
      user
    );

    // Send notification (in-app)
    try {
      await notificationService.create(
        {
          userId: 1,
          title: "Suppliers Merged",
          message: `Supplier "${sourceSupplier.name}" has been merged into "${targetSupplier.name}". ` +
            `${meatsReassigned} meat(s), ${purchasesReassigned} purchase(s), and ${batchesReassigned} batch(es) were reassigned.`,
          type: "info",
          metadata: {
            sourceSupplierId,
            sourceSupplierName: sourceSupplier.name,
            targetSupplierId,
            targetSupplierName: targetSupplier.name,
            meatsReassigned,
            purchasesReassigned,
            batchesReassigned,
          },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[SupplierState] Failed to send merge notification:`, err);
    }
  }

  /**
   * Side effect after a supplier is updated (generic)
   * Called from SupplierSubscriber.afterUpdate for other changes
   * @param {number} supplierId
   * @param {Supplier} supplier
   * @param {Object} changes
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onUpdated(supplierId, supplier, changes, user = "system", queryRunner = null) {
    logger.info(`[SupplierState] ✅ Supplier #${supplierId} (${supplier.name}) updated (fields: ${Object.keys(changes).join(", ")})`);

    // Broadcast to UI
    this._sendToRenderers("supplier:updated", {
      id: supplier.id,
      name: supplier.name,
      changes,
      updatedAt: supplier.updatedAt,
    });

    // Audit log
    await auditLogger.logUpdate(
      "Supplier",
      supplierId,
      changes,
      supplier,
      user
    );
  }

  /**
   * Side effect after a supplier is soft-deleted
   * Called from SupplierSubscriber.afterRemove
   * @param {number} supplierId
   * @param {Supplier} supplier
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onDeleted(supplierId, supplier, user = "system", queryRunner = null) {
    logger.info(`[SupplierState] ✅ Supplier #${supplierId} (${supplier?.name}) soft-deleted by ${user}`);

    // Broadcast to UI
    this._sendToRenderers("supplier:deleted", {
      id: supplierId,
      name: supplier?.name,
      email: supplier?.email,
      phone: supplier?.phone,
      deletedAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logCreate("Supplier", supplierId, supplier, user);
  }

  /**
   * Side effect after a supplier is restored
   * @param {number} supplierId
   * @param {Supplier} supplier
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onRestored(supplierId, supplier, user = "system", queryRunner = null) {
    logger.info(`[SupplierState] ✅ Supplier #${supplierId} (${supplier.name}) restored by ${user}`);

    // Broadcast to UI
    this._sendToRenderers("supplier:restored", {
      id: supplier.id,
      name: supplier.name,
      email: supplier.email,
      phone: supplier.phone,
      restoredAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logUpdate(
      "Supplier",
      supplierId,
      { action: "restored" },
      { isActive: true },
      user
    );
  }
}

module.exports = { SupplierStateService };