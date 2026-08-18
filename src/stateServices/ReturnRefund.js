// src/stateServices/ReturnRefundStateService.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const ReturnRefund = require("../entities/ReturnRefund");
const ReturnRefundItem = require("../entities/ReturnRefundItem");
const Customer = require("../entities/Customer");
const LoyaltyTransaction = require("../entities/LoyaltyTransaction");
const notificationService = require("../services/Notification");
const { BatchStateService } = require("./Batch");

// Settings getters (you can implement these as async functions)
const emailEnabled = async () => true;
const smsEnabled = async () => true;
const companyName = async () => "Meatify Shop";

/**
 * ReturnRefundStateService handles state transitions for returns/refunds.
 * It does NOT contain CRUD operations – those belong to ReturnRefundService.
 * All methods here modify the status of returns and trigger side effects
 * like stock adjustments, notifications, loyalty reversals.
 */
class ReturnRefundStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.returnRepo = dataSource.getRepository(ReturnRefund);
    this.returnItemRepo = dataSource.getRepository(ReturnRefundItem);
    this.customerRepo = dataSource.getRepository(Customer);
    this.loyaltyRepo = dataSource.getRepository(LoyaltyTransaction);
    this.batchStateService = new BatchStateService(dataSource);
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
   * Process a return – add stock back to batches, reverse loyalty points, send notifications
   * @param {number} returnId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async processReturn(returnId, user = "system", queryRunner = null) {
    const { updateDb, saveDb } = require("../utils/dbUtils/dbActions");

    // Load return with relations
    const returnRepo = this._getRepo(queryRunner, ReturnRefund);
    const returnItemRepo = this._getRepo(queryRunner, ReturnRefundItem);

    const returnRefund = await returnRepo.findOne({
      where: { id: returnId },
      relations: ["sale", "sale.customer", "items", "items.meat", "items.batch", "customer"],
    });
    if (!returnRefund) {
      throw new Error(`Return #${returnId} not found`);
    }

    if (returnRefund.status !== "pending") {
      throw new Error(`Cannot process a return with status "${returnRefund.status}"`);
    }

    logger.info(`[ReturnRefundState] Processing return #${returnId}`);

    // --- STEP 1: Add stock back to batches ---
    for (const item of returnRefund.items) {
      if (item.batch) {
        await this.batchStateService.addToBatch(
          item.batch.id,
          item.weightKg,
          "refund",
          { 
            saleId: returnRefund.sale?.id, 
            notes: `Return #${returnRefund.id} - ${returnRefund.referenceNo}`
          },
          user,
          queryRunner
        );
      } else {
        logger.warn(`[ReturnRefundState] Return item #${item.id} has no batch, skipping stock reversal`);
      }
    }

    // --- STEP 2: Reverse loyalty points from the original sale (if any) ---
    if (returnRefund.sale && returnRefund.sale.pointsEarn > 0 && returnRefund.sale.customer) {
      const customerRepo = this._getRepo(queryRunner, Customer);
      const loyaltyRepo = this._getRepo(queryRunner, LoyaltyTransaction);

      const customer = await customerRepo.findOne({ 
        where: { id: returnRefund.sale.customer.id } 
      });
      if (customer) {
        // We need to deduct the points earned from the sale
        const pointsToDeduct = returnRefund.sale.pointsEarn;
        const oldBalance = customer.loyaltyPointsBalance;
        customer.loyaltyPointsBalance = Math.max(0, oldBalance - pointsToDeduct);
        customer.lifetimePointsEarned = Math.max(0, (customer.lifetimePointsEarned || 0) - pointsToDeduct);
        customer.updatedAt = new Date();
        await updateDb(customerRepo, customer, { queryRunner });

        // Create reversal transaction
        const tx = loyaltyRepo.create({
          pointsChange: -pointsToDeduct,
          transactionType: "refund",
          notes: `Return #${returnRefund.id} - reversed points from sale #${returnRefund.sale.id}`,
          customer: customer,
          sale: returnRefund.sale,
          timestamp: new Date(),
        });
        await saveDb(loyaltyRepo, tx, { queryRunner });

        await auditLogger.logUpdate(
          "Customer",
          customer.id,
          { loyaltyPointsBalance: oldBalance },
          { loyaltyPointsBalance: customer.loyaltyPointsBalance },
          user
        );

        logger.info(`[ReturnRefundState] Reversed ${pointsToDeduct} loyalty points for customer #${customer.id}`);
      }
    }

    // --- STEP 3: Update return status to processed ---
    returnRefund.status = "processed";
    returnRefund.updatedAt = new Date();
    const processedReturn = await updateDb(returnRepo, returnRefund, { queryRunner });

    // --- STEP 4: Audit log ---
    await auditLogger.logUpdate(
      "ReturnRefund",
      returnId,
      { status: "pending" },
      { status: "processed" },
      user
    );

    // --- STEP 5: Side effects (non-critical) ---
    try {
      // Notify customer (if email/SMS enabled)
      await this._notifyCustomer(returnRefund, "processed", user, queryRunner);

      // In-app notification for admin
      await notificationService.create(
        {
          userId: 1,
          title: "Return Processed",
          message: `Return #${returnRefund.referenceNo} has been processed for ${returnRefund.customer?.name || "customer"}. Amount: ₱${returnRefund.totalAmount.toFixed(2)}`,
          type: "info",
          metadata: { returnId: returnRefund.id, amount: returnRefund.totalAmount },
        },
        user,
        queryRunner
      );
    } catch (err) {
      logger.error(`[ReturnRefundState] Non-critical side effects failed for return #${returnId}:`, err);
    }

    logger.info(`[ReturnRefundState] Return #${returnId} processed successfully`);
    return processedReturn;
  }

  /**
   * Cancel a return – if already processed, reverse the stock additions
   * @param {number} returnId
   * @param {string} reason
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async cancelReturn(returnId, reason = "", user = "system", queryRunner = null) {
    const { updateDb, saveDb } = require("../utils/dbUtils/dbActions");

    const returnRepo = this._getRepo(queryRunner, ReturnRefund);
    const returnItemRepo = this._getRepo(queryRunner, ReturnRefundItem);

    const returnRefund = await returnRepo.findOne({
      where: { id: returnId },
      relations: ["sale", "sale.customer", "items", "items.meat", "items.batch", "customer"],
    });
    if (!returnRefund) {
      throw new Error(`Return #${returnId} not found`);
    }

    if (returnRefund.status === "cancelled") {
      throw new Error(`Return #${returnId} is already cancelled`);
    }
    if (returnRefund.status === "pending") {
      // Simple cancellation – just update status, no stock changes
      returnRefund.status = "cancelled";
      returnRefund.notes = returnRefund.notes 
        ? `${returnRefund.notes}\nCancelled: ${reason}`
        : `Cancelled: ${reason}`;
      returnRefund.updatedAt = new Date();
      const cancelled = await updateDb(returnRepo, returnRefund, { queryRunner });

      await auditLogger.logUpdate(
        "ReturnRefund",
        returnId,
        { status: "pending" },
        { status: "cancelled" },
        user
      );

      logger.info(`[ReturnRefundState] Return #${returnId} cancelled (was pending)`);
      return cancelled;
    }

    if (returnRefund.status === "processed") {
      // --- Reverse the stock additions (deduct from batches again) ---
      logger.info(`[ReturnRefundState] Cancelling processed return #${returnId} – reversing stock`);

      for (const item of returnRefund.items) {
        if (item.batch) {
          await this.batchStateService.deductFromBatch(
            item.batch.id,
            item.weightKg,
            "adjustment",
            { 
              saleId: returnRefund.sale?.id, 
              notes: `Cancellation of return #${returnRefund.id} - ${returnRefund.referenceNo}`
            },
            user,
            queryRunner
          );
        } else {
          logger.warn(`[ReturnRefundState] Return item #${item.id} has no batch, skipping stock reversal`);
        }
      }

      // --- Reverse loyalty reversal (add back points) ---
      if (returnRefund.sale && returnRefund.sale.pointsEarn > 0 && returnRefund.sale.customer) {
        const customerRepo = this._getRepo(queryRunner, Customer);
        const loyaltyRepo = this._getRepo(queryRunner, LoyaltyTransaction);

        const customer = await customerRepo.findOne({ 
          where: { id: returnRefund.sale.customer.id } 
        });
        if (customer) {
          const pointsToAdd = returnRefund.sale.pointsEarn;
          const oldBalance = customer.loyaltyPointsBalance;
          customer.loyaltyPointsBalance += pointsToAdd;
          customer.lifetimePointsEarned = (customer.lifetimePointsEarned || 0) + pointsToAdd;
          customer.updatedAt = new Date();
          await updateDb(customerRepo, customer, { queryRunner });

          // Create transaction to add back points
          const tx = loyaltyRepo.create({
            pointsChange: pointsToAdd,
            transactionType: "earn",
            notes: `Reversal of return cancellation #${returnRefund.id} - restored points from sale #${returnRefund.sale.id}`,
            customer: customer,
            sale: returnRefund.sale,
            timestamp: new Date(),
          });
          await saveDb(loyaltyRepo, tx, { queryRunner });

          await auditLogger.logUpdate(
            "Customer",
            customer.id,
            { loyaltyPointsBalance: oldBalance },
            { loyaltyPointsBalance: customer.loyaltyPointsBalance },
            user
          );

          logger.info(`[ReturnRefundState] Restored ${pointsToAdd} loyalty points for customer #${customer.id}`);
        }
      }

      // --- Update status to cancelled ---
      returnRefund.status = "cancelled";
      returnRefund.notes = returnRefund.notes 
        ? `${returnRefund.notes}\nCancelled: ${reason} (was processed)`
        : `Cancelled: ${reason} (was processed)`;
      returnRefund.updatedAt = new Date();
      const cancelled = await updateDb(returnRepo, returnRefund, { queryRunner });

      await auditLogger.logUpdate(
        "ReturnRefund",
        returnId,
        { status: "processed" },
        { status: "cancelled" },
        user
      );

      // --- Notify admin about cancellation ---
      try {
        await notificationService.create(
          {
            userId: 1,
            title: "Return Cancelled (Processed)",
            message: `Return #${returnRefund.referenceNo} was processed and then cancelled. Stock has been reversed.`,
            type: "warning",
            metadata: { returnId: returnRefund.id },
          },
          user,
          queryRunner
        );
      } catch (err) {
        logger.error(`[ReturnRefundState] Failed to send cancellation notification:`, err);
      }

      logger.info(`[ReturnRefundState] Return #${returnId} cancelled (was processed, stock reversed)`);
      return cancelled;
    }

    throw new Error(`Unexpected return status: ${returnRefund.status}`);
  }

  /**
   * Send email/SMS notification to customer about return status
   * @private
   */
  async _notifyCustomer(returnRefund, action, user, queryRunner) {
    const canSendEmail = await emailEnabled();
    const canSendSms = await smsEnabled();
    const company = await companyName();

    const customer = returnRefund.customer;
    if (!customer) {
      logger.warn(`[ReturnRefundState] No customer for return #${returnRefund.id}, skipping notification`);
      return;
    }

    const subject = action === "processed" 
      ? `Return Processed – ${returnRefund.referenceNo}`
      : `Return Cancelled – ${returnRefund.referenceNo}`;

    const itemsList = returnRefund.items
      .map(item => `${item.meat?.name || "Unknown"} – ${item.weightKg}kg @ ₱${item.unitPrice}`)
      .join("\n");

    const textBody = action === "processed"
      ? `Dear ${customer.name},\n\nWe have processed your return (ref. #${returnRefund.referenceNo}).\n\nReturned items:\n${itemsList}\n\nTotal refund amount: ₱${returnRefund.totalAmount.toFixed(2)}\nRefund method: ${returnRefund.refundMethod}\n\nThe amount will be credited according to your selected refund method.\n\nThank you for shopping with us,\n${company}`
      : `Dear ${customer.name},\n\nYour return request (ref. #${returnRefund.referenceNo}) has been cancelled.\n\nIf you have any questions, please contact our support.\n\nRegards,\n${company}`;

    const htmlBody = textBody.replace(/\n/g, "<br>");

    // Send email
    if (canSendEmail && customer.email) {
      try {
        // Use your email sender (e.g., via NotificationLogService)
        logger.info(`[ReturnRefundState] Would send email to ${customer.email}: ${subject}`);
        // await emailSender.send(customer.email, subject, htmlBody, textBody);
      } catch (err) {
        logger.error(`[ReturnRefundState] Failed to send email to ${customer.email}:`, err);
      }
    }

    // Send SMS
    if (canSendSms && customer.phone) {
      try {
        const smsMessage = action === "processed"
          ? `Return #${returnRefund.referenceNo} processed. Refund: ₱${returnRefund.totalAmount.toFixed(2)}. Check email for details.`
          : `Return #${returnRefund.referenceNo} cancelled. Check email for details.`;
        logger.info(`[ReturnRefundState] Would send SMS to ${customer.phone}: ${smsMessage}`);
        // await smsSender.send(customer.phone, smsMessage);
      } catch (err) {
        logger.error(`[ReturnRefundState] Failed to send SMS to ${customer.phone}:`, err);
      }
    }
  }
}

module.exports = { ReturnRefundStateService };