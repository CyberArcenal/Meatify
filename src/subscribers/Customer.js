// src/subscribers/CustomerSubscriber.js
const Customer = require("../entities/Customer");
const { logger } = require("../utils/logger");
const { AppDataSource } = require("../main/db/data-source");

logger.debug("[Subscriber] Loading CustomerSubscriber");

class CustomerSubscriber {
  listenTo() {
    return Customer;
  }

  /**
   * @param {import("../entities/Customer")} entity
   */
  async beforeInsert(entity) {
    logger.debug("[CustomerSubscriber] beforeInsert:", {
      id: entity?.id,
      name: entity?.name,
      email: entity?.email,
      phone: entity?.phone,
    });
  }

  /**
   * @param {import("../entities/Customer")} entity
   */
  async afterInsert(entity, { manager, queryRunner }) {
    logger.info("[CustomerSubscriber] afterInsert:", {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      phone: entity.phone,
      status: entity.status,
      points: entity.loyaltyPointsBalance,
    });

    // Optional: call state service for creation side effects
    // Uncomment if you need onCreate side effects (notifications, UI broadcast, etc.)
    
    try {
      const { CustomerStateService } = require("../stateServices/Customer");
      const stateService = new CustomerStateService(AppDataSource);
      await stateService.onCreate(entity.id, entity, "system", queryRunner);
    } catch (err) {
      logger.error(`[CustomerSubscriber] Failed to handle afterInsert for customer #${entity.id}:`, err);
    }
    
  }

  /**
   * @param {import("../entities/Customer")} entity
   */
  async beforeUpdate(entity) {
    logger.debug("[CustomerSubscriber] beforeUpdate:", {
      id: entity?.id,
      status: entity?.status,
      points: entity?.loyaltyPointsBalance,
    });
  }

  /**
   * @param {{ databaseEntity: any; entity: any }} event
   */
  async afterUpdate(event, { manager, queryRunner }) {
    const { entity, databaseEntity } = event;
    const user = "system"; // TODO: Extract from context/session if available

    logger.info("[CustomerSubscriber] afterUpdate:", {
      id: entity?.id,
      oldStatus: databaseEntity?.status,
      newStatus: entity?.status,
      oldPoints: databaseEntity?.loyaltyPointsBalance,
      newPoints: entity?.loyaltyPointsBalance,
      oldLifetime: databaseEntity?.lifetimePointsEarned,
      newLifetime: entity?.lifetimePointsEarned,
    });

    // ────────────────────────────────────────────────────────────────
    // ✅ 1. Handle Status Change
    // ────────────────────────────────────────────────────────────────
    if (databaseEntity && databaseEntity.status !== entity.status) {
      try {
        logger.info(
          `[CustomerSubscriber] Customer #${entity.id} status changed: ${databaseEntity.status} → ${entity.status}`
        );

        const { CustomerStateService } = require("../stateServices/Customer");
        const stateService = new CustomerStateService(AppDataSource);

        await stateService.onStatusChange(
          entity.id,
          databaseEntity.status,
          entity.status,
          user,
          queryRunner
        );
      } catch (err) {
        logger.error(
          `[CustomerSubscriber] Failed to handle status change for customer #${entity.id}:`,
          err
        );
        // Don't re-throw – we don't want to break the transaction
      }
    }

    // ────────────────────────────────────────────────────────────────
    // ✅ 2. Handle Points Balance Change
    // ────────────────────────────────────────────────────────────────
    if (
      databaseEntity &&
      databaseEntity.loyaltyPointsBalance !== entity.loyaltyPointsBalance
    ) {
      try {
        const oldBalance = databaseEntity.loyaltyPointsBalance || 0;
        const newBalance = entity.loyaltyPointsBalance || 0;
        const diff = newBalance - oldBalance;

        logger.info(
          `[CustomerSubscriber] Customer #${entity.id} points changed: ${oldBalance} → ${newBalance} (diff: ${diff})`
        );

        const { CustomerStateService } = require("../stateServices/Customer");
        const stateService = new CustomerStateService(AppDataSource);

        await stateService.onPointsChange(
          entity.id,
          oldBalance,
          newBalance,
          user,
          queryRunner
        );
      } catch (err) {
        logger.error(
          `[CustomerSubscriber] Failed to handle points change for customer #${entity.id}:`,
          err
        );
        // Don't re-throw – we don't want to break the transaction
      }
    }

    // ────────────────────────────────────────────────────────────────
    // ✅ 3. Optional: Detect Lifetime Points Change (for milestone tracking)
    // ────────────────────────────────────────────────────────────────
    if (
      databaseEntity &&
      databaseEntity.lifetimePointsEarned !== entity.lifetimePointsEarned
    ) {
      try {
        logger.info(
          `[CustomerSubscriber] Customer #${entity.id} lifetime points changed: ${databaseEntity.lifetimePointsEarned} → ${entity.lifetimePointsEarned}`
        );
        // TODO: Add milestone notification logic if needed
        // This could call a separate method in state service like onLifetimePointsChange
      } catch (err) {
        logger.error(
          `[CustomerSubscriber] Failed to handle lifetime points change for customer #${entity.id}:`,
          err
        );
      }
    }

    // ────────────────────────────────────────────────────────────────
    // ✅ 4. Optional: Detect Significant Changes (e.g., threshold crossing)
    // ────────────────────────────────────────────────────────────────
    if (databaseEntity) {
      const oldStatus = databaseEntity.status;
      const newStatus = entity.status;
      const oldPoints = databaseEntity.loyaltyPointsBalance || 0;
      const newPoints = entity.loyaltyPointsBalance || 0;

      // Check if customer crossed VIP threshold (1000 points)
      const vipThreshold = 1000; // TODO: Get from system settings
      if (oldPoints < vipThreshold && newPoints >= vipThreshold) {
        logger.info(
          `[CustomerSubscriber] Customer #${entity.id} crossed VIP threshold (${vipThreshold} points)`
        );
        // Additional logic can be added here if needed
      }

      // Check if customer crossed Elite threshold (5000 points)
      const eliteThreshold = 5000; // TODO: Get from system settings
      if (oldPoints < eliteThreshold && newPoints >= eliteThreshold) {
        logger.info(
          `[CustomerSubscriber] Customer #${entity.id} crossed Elite threshold (${eliteThreshold} points)`
        );
        // Additional logic can be added here if needed
      }
    }
  }

  /**
   * @param {import("../entities/Customer")} entity
   */
  beforeRemove(entity) {
    logger.debug("[CustomerSubscriber] beforeRemove:", {
      id: entity?.id,
      name: entity?.name,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  async afterRemove(event) {
    logger.info("[CustomerSubscriber] afterRemove:", {
      id: event.entityId,
    });

    // Optional: call state service for deletion side effects
    // Uncomment if you need onDelete side effects
    
    try {
      const { CustomerStateService } = require("../stateServices/Customer");
      const stateService = new CustomerStateService(AppDataSource);
      
      // Note: entity may not be fully loaded in afterRemove
      // You might need to fetch it first or pass entityId only
    } catch (err) {
      logger.error(`[CustomerSubscriber] Failed to handle afterRemove for customer #${event.entityId}:`, err);
    }
    
  }
}

module.exports = CustomerSubscriber;