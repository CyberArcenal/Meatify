// src/stateServices/Supplier.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const Supplier = require("../entities/Supplier");
const Meat = require("../entities/Meat");
const Purchase = require("../entities/Purchase");
const Batch = require("../entities/Batch");
const notificationService = require("../services/Notification");
const system = require("../utils/system"); // ✅ ADDED - for flexible settings

// ❌ REMOVED hardcoded functions:
// const emailEnabled = async () => true;
// const smsEnabled = async () => true;
// const companyName = async () => "Meatify Shop";

/**
 * SupplierStateService handles state transitions and side effects for suppliers.
 * It does NOT contain CRUD operations – those belong to SupplierService.
 * All methods here manage activation/deactivation and related side effects.
 */
class SupplierStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.supplierRepo = dataSource.getRepository(Supplier);
    this.meatRepo = dataSource.getRepository(Meat);
    this.purchaseRepo = dataSource.getRepository(Purchase);
    this.batchRepo = dataSource.getRepository(Batch);
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
   * Activate a supplier (set isActive = true)
   * @param {number} supplierId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async activate(supplierId, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const repo = this._getRepo(queryRunner, Supplier);

    const supplier = await repo.findOne({ where: { id: supplierId } });
    if (!supplier) {
      throw new Error(`Supplier with ID ${supplierId} not found`);
    }

    if (supplier.isActive) {
      logger.warn(`[SupplierState] Supplier #${supplierId} is already active`);
      return supplier;
    }

    const oldStatus = supplier.isActive;
    supplier.isActive = true;
    supplier.updatedAt = new Date();

    const updated = await updateDb(repo, supplier, { queryRunner, skipSignal: false });

    await auditLogger.logUpdate(
      "Supplier",
      supplierId,
      { isActive: oldStatus },
      { isActive: true },
      user
    );

    // Side effect: send notification
    try {
      await notificationService.create(
        {
          userId: 1,
          title: "Supplier Activated",
          message: `Supplier "${supplier.name}" has been activated.`,
          type: "info",
          metadata: { supplierId: supplier.id },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[SupplierState] Failed to send activation notification for supplier #${supplierId}:`, err);
    }

    logger.info(`[SupplierState] Supplier #${supplierId} activated`);
    return updated;
  }

  /**
   * Deactivate a supplier (set isActive = false) - with optional reassignment
   * @param {number} supplierId
   * @param {Object} options
   * @param {number} [options.reassignToSupplierId] - Optional supplier to reassign meats to
   * @param {boolean} [options.allowWithPendingPurchases=false] - Allow deactivation even with pending purchases
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async deactivate(
    supplierId,
    options = {},
    user = "system",
    queryRunner = null
  ) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const supplierRepo = this._getRepo(queryRunner, Supplier);
    const meatRepo = this._getRepo(queryRunner, Meat);
    const purchaseRepo = this._getRepo(queryRunner, Purchase);

    const supplier = await supplierRepo.findOne({ where: { id: supplierId } });
    if (!supplier) {
      throw new Error(`Supplier with ID ${supplierId} not found`);
    }

    if (!supplier.isActive) {
      logger.warn(`[SupplierState] Supplier #${supplierId} is already inactive`);
      return supplier;
    }

    // Check for pending purchases
    const pendingPurchases = await purchaseRepo.count({
      where: { supplier: { id: supplierId }, status: "pending" },
    });

    if (pendingPurchases > 0 && !options.allowWithPendingPurchases) {
      throw new Error(
        `Cannot deactivate supplier #${supplierId} because it has ${pendingPurchases} pending purchase(s). Complete or cancel them first, or use allowWithPendingPurchases option.`
      );
    }

    // Check for meats in this supplier
    const meats = await meatRepo.find({
      where: { supplier: { id: supplierId }, isActive: true },
      relations: ["supplier"],
    });

    // Handle reassignment if there are meats
    if (meats.length > 0) {
      if (options.reassignToSupplierId) {
        const targetSupplier = await supplierRepo.findOne({
          where: { id: options.reassignToSupplierId, isActive: true },
        });
        if (!targetSupplier) {
          throw new Error(
            `Target supplier with ID ${options.reassignToSupplierId} not found or inactive`
          );
        }

        // Reassign all meats to target supplier
        for (const meat of meats) {
          const oldSupplierName = meat.supplier?.name;
          meat.supplier = targetSupplier;
          meat.updatedAt = new Date();
          await updateDb(meatRepo, meat, { queryRunner, skipSignal: false });

          await auditLogger.logUpdate(
            "Meat",
            meat.id,
            { supplierId: supplierId },
            { supplierId: options.reassignToSupplierId },
            user
          );

          logger.info(
            `[SupplierState] Reassigned meat #${meat.id} from supplier #${supplierId} to #${options.reassignToSupplierId}`
          );
        }

        // Log the reassignment
        await logger.debug(
          `Reassigned ${meats.length} meat(s) from supplier "${supplier.name}" to "${targetSupplier.name}"`
        );
      } else {
        // If no reassignment target, prevent deactivation
        throw new Error(
          `Cannot deactivate supplier #${supplierId} because it has ${meats.length} active meat(s). Provide a reassignToSupplierId or deactivate the meats first.`
        );
      }
    }

    // Also handle batches from this supplier - we'll keep them but set a flag or just note
    const batchRepo = this._getRepo(queryRunner, Batch);
    const batches = await batchRepo.find({
      where: { supplier: { id: supplierId }, status: "active" },
    });

    if (batches.length > 0) {
      logger.info(
        `[SupplierState] Supplier #${supplierId} has ${batches.length} active batches. They will remain active but with a deactivated supplier.`
      );
      // Optionally, we could set a flag or notify
    }

    // Deactivate the supplier
    const oldStatus = supplier.isActive;
    supplier.isActive = false;
    supplier.updatedAt = new Date();

    const updated = await updateDb(supplierRepo, supplier, { queryRunner, skipSignal: false });

    await auditLogger.logUpdate(
      "Supplier",
      supplierId,
      { isActive: oldStatus },
      { isActive: false },
      user
    );

    // Side effect: send notification
    try {
      const message = `Supplier "${supplier.name}" has been deactivated.` +
        (meats.length > 0 ? ` ${meats.length} meat(s) were reassigned.` : "") +
        (pendingPurchases > 0 ? ` Note: ${pendingPurchases} pending purchase(s) exist.` : "");

      await notificationService.create(
        {
          userId: 1,
          title: "Supplier Deactivated",
          message: message,
          type: "warning",
          metadata: {
            supplierId: supplier.id,
            meatsReassigned: meats.length,
            pendingPurchases,
            reassignToSupplierId: options.reassignToSupplierId || null,
          },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[SupplierState] Failed to send deactivation notification for supplier #${supplierId}:`, err);
    }

    logger.info(`[SupplierState] Supplier #${supplierId} deactivated`);
    return updated;
  }

  /**
   * Merge a source supplier into a target supplier
   * @param {number} sourceSupplierId - Supplier to merge from (will be deactivated)
   * @param {number} targetSupplierId - Supplier to merge into (must be active)
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async mergeSuppliers(
    sourceSupplierId,
    targetSupplierId,
    user = "system",
    queryRunner = null
  ) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const supplierRepo = this._getRepo(queryRunner, Supplier);
    const meatRepo = this._getRepo(queryRunner, Meat);
    const purchaseRepo = this._getRepo(queryRunner, Purchase);
    const batchRepo = this._getRepo(queryRunner, Batch);

    if (sourceSupplierId === targetSupplierId) {
      throw new Error("Cannot merge a supplier into itself");
    }

    const sourceSupplier = await supplierRepo.findOne({
      where: { id: sourceSupplierId },
    });
    if (!sourceSupplier) {
      throw new Error(`Source supplier with ID ${sourceSupplierId} not found`);
    }

    const targetSupplier = await supplierRepo.findOne({
      where: { id: targetSupplierId, isActive: true },
    });
    if (!targetSupplier) {
      throw new Error(`Target supplier with ID ${targetSupplierId} not found or inactive`);
    }

    // Get all meats from source supplier
    const meats = await meatRepo.find({
      where: { supplier: { id: sourceSupplierId } },
    });

    // Reassign meats to target supplier
    for (const meat of meats) {
      meat.supplier = targetSupplier;
      meat.updatedAt = new Date();
      await updateDb(meatRepo, meat, { queryRunner, skipSignal: false });

      await auditLogger.logUpdate(
        "Meat",
        meat.id,
        { supplierId: sourceSupplierId },
        { supplierId: targetSupplierId },
        user
      );
    }

    // Get all purchases from source supplier and reassign
    const purchases = await purchaseRepo.find({
      where: { supplier: { id: sourceSupplierId } },
    });

    for (const purchase of purchases) {
      purchase.supplier = targetSupplier;
      purchase.updatedAt = new Date();
      await updateDb(purchaseRepo, purchase, { queryRunner, skipSignal: false });

      await auditLogger.logUpdate(
        "Purchase",
        purchase.id,
        { supplierId: sourceSupplierId },
        { supplierId: targetSupplierId },
        user
      );
    }

    // Get all batches from source supplier and reassign
    const batches = await batchRepo.find({
      where: { supplier: { id: sourceSupplierId } },
    });

    for (const batch of batches) {
      batch.supplier = targetSupplier;
      batch.updatedAt = new Date();
      await updateDb(batchRepo, batch, { queryRunner, skipSignal: false });

      await auditLogger.logUpdate(
        "Batch",
        batch.id,
        { supplierId: sourceSupplierId },
        { supplierId: targetSupplierId },
        user
      );
    }

    // Deactivate source supplier
    sourceSupplier.isActive = false;
    sourceSupplier.updatedAt = new Date();
    await updateDb(supplierRepo, sourceSupplier, { queryRunner, skipSignal: false });

    // Audit logs
    await logger.debug(
      `Merged supplier "${sourceSupplier.name}" into "${targetSupplier.name}". ` +
      `${meats.length} meat(s), ${purchases.length} purchase(s), and ${batches.length} batch(es) reassigned.`,
      user
    );

    // Side effect: send notification
    try {
      await notificationService.create(
        {
          userId: 1,
          title: "Suppliers Merged",
          message: `Supplier "${sourceSupplier.name}" has been merged into "${targetSupplier.name}". ` +
            `${meats.length} meat(s), ${purchases.length} purchase(s), and ${batches.length} batch(es) were reassigned.`,
          type: "info",
          metadata: {
            sourceSupplierId,
            targetSupplierId,
            meatsReassigned: meats.length,
            purchasesReassigned: purchases.length,
            batchesReassigned: batches.length,
          },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[SupplierState] Failed to send merge notification:`, err);
    }

    logger.info(
      `[SupplierState] Merged supplier #${sourceSupplierId} into #${targetSupplierId}. ` +
      `${meats.length} meats, ${purchases.length} purchases, ${batches.length} batches reassigned.`
    );

    return {
      sourceSupplier,
      targetSupplier,
      meatsReassigned: meats.length,
      purchasesReassigned: purchases.length,
      batchesReassigned: batches.length,
    };
  }

  /**
   * Bulk deactivate suppliers with optional reassignment
   * @param {Array<number>} supplierIds
   * @param {Object} options
   * @param {number} [options.reassignToSupplierId]
   * @param {boolean} [options.allowWithPendingPurchases=false]
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async bulkDeactivateSuppliers(
    supplierIds,
    options = {},
    user = "system",
    queryRunner = null
  ) {
    const results = { deactivated: [], errors: [] };

    for (const supplierId of supplierIds) {
      try {
        const result = await this.deactivate(supplierId, options, user, queryRunner);
        results.deactivated.push(result);
      } catch (err) {
        results.errors.push({ supplierId, error: err.message });
      }
    }

    return results;
  }

  /**
   * Send notification to supplier (email/SMS)
   * @param {number} supplierId
   * @param {string} subject
   * @param {string} message
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async notifySupplier(
    supplierId,
    subject,
    message,
    user = "system",
    queryRunner = null
  ) {
    const repo = this._getRepo(queryRunner, Supplier);
    const supplier = await repo.findOne({ where: { id: supplierId } });
    if (!supplier) {
      throw new Error(`Supplier with ID ${supplierId} not found`);
    }

    // ✅ Use system settings instead of hardcoded values
    const canSendEmail = await system.emailEnabled();
    const canSendSms = await system.smsEnabled();
    const company = await system.companyName();

    // Email
    if (canSendEmail && supplier.email) {
      const fullMessage = `Dear ${supplier.name},\n\n${message}\n\nRegards,\n${company}`;
      const htmlMessage = fullMessage.replace(/\n/g, "<br>");

      try {
        logger.info(`[SupplierState] Would send email to ${supplier.email}: ${subject}`);
        // await emailSender.send(supplier.email, subject, htmlMessage, fullMessage);
      } catch (err) {
        logger.error(`[SupplierState] Failed to send email to ${supplier.email}:`, err);
      }
    }

    // SMS
    if (canSendSms && supplier.phone) {
      try {
        const smsMessage = `${subject}: ${message}`;
        logger.info(`[SupplierState] Would send SMS to ${supplier.phone}: ${smsMessage}`);
        // await smsSender.send(supplier.phone, smsMessage);
      } catch (err) {
        logger.error(`[SupplierState] Failed to send SMS to ${supplier.phone}:`, err);
      }
    }

    return supplier;
  }
}

module.exports = { SupplierStateService };