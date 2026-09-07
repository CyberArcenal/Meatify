// src/stateServices/supplier/SupplierStateService.js
//@ts-check
const { logger } = require("../../utils/logger");
const Supplier = require("../../entities/Supplier");
const SupplierCreatedModule = require("./modules/status/SupplierCreatedModule");
const SupplierActivatedModule = require("./modules/status/SupplierActivatedModule");
const SupplierDeactivatedModule = require("./modules/status/SupplierDeactivatedModule");
const SupplierMergedModule = require("./modules/status/SupplierMergedModule");
const SupplierUpdatedModule = require("./modules/status/SupplierUpdatedModule");
const SupplierDeletedModule = require("./modules/status/SupplierDeletedModule");
const SupplierRestoredModule = require("./modules/status/SupplierRestoredModule");
const SupplierNotificationModule = require("./modules/SupplierNotificationModule");
const SupplierStatusModule = require("./modules/SupplierStatusModule");
const SupplierAuditModule = require("./modules/SupplierAuditModule");

/**
 * SupplierStateService - Orchestrates side effects for supplier state changes.
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

    // ─── Initialize modules ──────────────────────────────────────
    this.createdModule = new SupplierCreatedModule();
    this.activatedModule = new SupplierActivatedModule();
    this.deactivatedModule = new SupplierDeactivatedModule();
    this.mergedModule = new SupplierMergedModule();
    this.updatedModule = new SupplierUpdatedModule();
    this.deletedModule = new SupplierDeletedModule();
    this.restoredModule = new SupplierRestoredModule();
    this.notificationModule = new SupplierNotificationModule();
    this.statusModule = new SupplierStatusModule();
    this.auditModule = new SupplierAuditModule();
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
   * Side effect after a supplier is created
   * Called from SupplierSubscriber.afterInsert
   * @param {number} supplierId
   * @param {Supplier} supplier
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onCreated(supplierId, supplier, user = "system", queryRunner = null) {
    logger.info(`[SupplierState] ✅ Supplier #${supplierId} (${supplier.name}) created by ${user}`);

    // 1. Handle creation side effects (UI broadcast)
    await this.createdModule.handle(supplier, user);

    // 2. Audit log
    await this.auditModule.logCreated(supplierId, supplier, user);
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

    // 1. Validate activation (placeholder for future)
    const validation = this.statusModule.validateActivate(supplier, {});
    if (!validation.valid) {
      logger.warn(`[SupplierState] Activation validation: ${validation.reason}`);
    }

    // 2. Handle activation side effects (UI broadcast)
    await this.activatedModule.handle(supplier, user);

    // 3. Send notification (in-app)
    await this.notificationModule.notifyActivated(supplier, user, queryRunner);

    // 4. Audit log
    await this.auditModule.logActivated(supplierId, supplier, user);
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

    // 1. Validate deactivation (placeholder for future)
    const validation = this.statusModule.validateDeactivate(supplier, { pendingPurchases });
    if (!validation.valid) {
      logger.warn(`[SupplierState] Deactivation validation: ${validation.reason}`);
    }

    // 2. Handle deactivation side effects (UI broadcast)
    await this.deactivatedModule.handle(supplier, { meatsReassigned, reassignToSupplierId, pendingPurchases }, user);

    // 3. Send notification (in-app)
    await this.notificationModule.notifyDeactivated(supplier, { meatsReassigned, pendingPurchases }, user, queryRunner);

    // 4. Audit log
    await this.auditModule.logDeactivated(supplierId, supplier, { meatsReassigned, pendingPurchases }, user);
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

    logger.info(`[SupplierState] ✅ Suppliers merged: #${sourceSupplierId} → #${targetSupplierId} by ${user}`);

    // 1. Validate merge (placeholder for future)
    const validation = this.statusModule.validateMerge(sourceSupplier, targetSupplier, {});
    if (!validation.valid) {
      logger.warn(`[SupplierState] Merge validation: ${validation.reason}`);
    }

    // 2. Prepare merge data for modules
    const mergeData = {
      sourceSupplierId,
      sourceSupplierName: sourceSupplier.name,
      targetSupplierId,
      targetSupplierName: targetSupplier.name,
      meatsReassigned,
      purchasesReassigned,
      batchesReassigned,
    };

    // 3. Handle merge side effects (UI broadcast)
    await this.mergedModule.handle(mergeData, user);

    // 4. Send notification (in-app)
    await this.notificationModule.notifyMerged(mergeData, user, queryRunner);

    // 5. Audit log
    await this.auditModule.logMerged(mergeData, user);
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

    // 1. Handle update side effects (UI broadcast)
    await this.updatedModule.handle(supplier, changes, user);

    // 2. Audit log
    await this.auditModule.logUpdated(supplierId, changes, supplier, user);
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

    // 1. Handle deletion side effects (UI broadcast)
    await this.deletedModule.handle(supplierId, supplier, user);

    // 2. Audit log
    await this.auditModule.logDeleted(supplierId, supplier, user);
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

    // 1. Handle restoration side effects (UI broadcast)
    await this.restoredModule.handle(supplier, user);

    // 2. Audit log
    await this.auditModule.logRestored(supplierId, supplier, user);
  }
}

module.exports = { SupplierStateService };