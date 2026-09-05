// src/subscribers/SaleSubscriber.js
//@ts-check
const Sale = require("../entities/Sale");
const { logger } = require("../utils/logger");
const { SaleStateService } = require("../stateServices/Sale");
const { AppDataSource } = require("../main/db/data-source");

logger.debug("[Subscriber] Loading SaleSubscriber");

class SaleSubscriber {
  constructor() {
    this.stateService = null;
  }

  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  async getStateService(dataSource) {
    if (!this.stateService) {
      this.stateService = new SaleStateService(dataSource);
    }
    return this.stateService;
  }

  listenTo() {
    return Sale;
  }

  /**
   * @param {import("../entities/Sale")} entity
   */
  beforeInsert(entity) {
    // ✅ Log the FULL entity
    logger.debug("[SaleSubscriber] beforeInsert - FULL ENTITY:", JSON.stringify(entity, null, 2));
    
    logger.debug("[SaleSubscriber] beforeInsert - SUMMARY:", {
      id: entity?.id,
      customerId: entity?.customerId,
      status: entity?.status,
      totalAmount: entity?.totalAmount,
      paymentMethod: entity?.paymentMethod,
      voucherCode: entity?.voucherCode,
      voucherDiscount: entity?.voucherDiscount, // ✅ Check this!
      usedVoucher: entity?.usedVoucher,
      loyaltyRedeemed: entity?.loyaltyRedeemed,
      pointsEarn: entity?.pointsEarn,
      notes: entity?.notes?.substring(0, 50),
    });
  }

  /**
   * @param {import("../entities/Sale")} entity
   */
  async afterInsert(entity, { manager, queryRunner }) {
    // ✅ Log the FULL entity after insert (with generated ID)
    logger.debug("[SaleSubscriber] afterInsert - FULL ENTITY:", JSON.stringify(entity, null, 2));
    
    logger.info("[SaleSubscriber] afterInsert - SUMMARY:", {
      id: entity.id,
      customerId: entity.customerId,
      status: entity.status,
      totalAmount: entity.totalAmount,
      paymentMethod: entity.paymentMethod,
      voucherCode: entity?.voucherCode,
      voucherDiscount: entity?.voucherDiscount, // ✅ Check this!
      usedVoucher: entity?.usedVoucher,
      pointsEarn: entity?.pointsEarn,
    });

    if (entity.status === "paid") {
      try {
        const service = await this.getStateService(manager.connection);
        await service.onPaid(entity.id, "system", queryRunner);
      } catch (err) {
        logger.error("[SaleSubscriber] Failed to process paid sale on insert:", err);
        throw err;
      }
    }
  }

  /**
   * @param {import("../entities/Sale")} entity
   */
  beforeUpdate(entity) {
    // ✅ Log the FULL entity before update
    logger.debug("[SaleSubscriber] beforeUpdate - FULL ENTITY:", JSON.stringify(entity, null, 2));
    
    logger.debug("[SaleSubscriber] beforeUpdate - SUMMARY:", {
      id: entity?.id,
      status: entity?.status,
      totalAmount: entity?.totalAmount,
      voucherCode: entity?.voucherCode,
      voucherDiscount: entity?.voucherDiscount,
    });
  }

  /**
   * @param {{ databaseEntity: any; entity: any }} event
   */
  async afterUpdate(event, { manager, queryRunner }) {
    const { entity, databaseEntity } = event;
    if (!entity) return;

    // ✅ Log the FULL entity after update
    logger.debug("[SaleSubscriber] afterUpdate - FULL ENTITY:", JSON.stringify(entity, null, 2));
    logger.debug("[SaleSubscriber] afterUpdate - DATABASE ENTITY:", JSON.stringify(databaseEntity, null, 2));

    logger.info("[SaleSubscriber] afterUpdate - SUMMARY:", {
      id: entity.id,
      oldStatus: databaseEntity?.status,
      newStatus: entity.status,
      oldTotal: databaseEntity?.totalAmount,
      newTotal: entity.totalAmount,
      oldVoucherDiscount: databaseEntity?.voucherDiscount,
      newVoucherDiscount: entity?.voucherDiscount,
      oldUsedVoucher: databaseEntity?.usedVoucher,
      newUsedVoucher: entity?.usedVoucher,
    });

    if (databaseEntity && databaseEntity.status === entity.status) {
      return;
    }

    try {
      const service = await this.getStateService(manager.connection);

      switch (entity.status) {
        case "paid":
          await service.onPaid(entity.id, "system", queryRunner);
          break;
        case "refunded":
          await service.onRefunded(entity.id, "", "system", queryRunner);
          break;
        case "voided":
          await service.onVoided(entity.id, "", "system", queryRunner);
          break;
        default:
          break;
      }
    } catch (err) {
      logger.error(`[SaleSubscriber] Failed to handle status change to ${entity.status}:`, err);
      throw err;
    }
  }

  /**
   * @param {import("../entities/Sale")} entity
   */
  beforeRemove(entity) {
    logger.debug("[SaleSubscriber] beforeRemove - FULL ENTITY:", JSON.stringify(entity, null, 2));
    logger.debug("[SaleSubscriber] beforeRemove:", {
      id: entity?.id,
      status: entity?.status,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  afterRemove(event) {
    logger.info("[SaleSubscriber] afterRemove:", {
      id: event.entityId,
    });
  }
}

module.exports = SaleSubscriber;