// src/subscribers/LoyaltyTransactionSubscriber.js
const { logger } = require("../utils/logger");
const { AppDataSource } = require("../main/db/data-source");
const LoyaltyTransaction = require("../entities/LoyaltyTransaction");

logger.debug("[Subscriber] Loading LoyaltyTransactionSubscriber");

class LoyaltyTransactionSubscriber {
  listenTo() {
    return LoyaltyTransaction;
  }

  /**
   * @param {import("../entities/LoyaltyTransaction")} entity
   */
  beforeInsert(entity) {
    logger.debug("[LoyaltyTransactionSubscriber] beforeInsert:", {
      id: entity?.id,
      customerId: entity?.customerId,
      type: entity?.transactionType,
      points: entity?.pointsChange,
    });
  }

  /**
   * @param {import("../entities/LoyaltyTransaction")} entity
   */
  async afterInsert(entity, { manager, queryRunner }) {
    logger.info("[LoyaltyTransactionSubscriber] afterInsert:", {
      id: entity.id,
      customerId: entity.customerId,
      type: entity.transactionType,
      points: entity.pointsChange,
      notes: entity.notes,
    });

    try {
      const { LoyaltyTransactionStateService } = require("../stateServices/LoyaltyTransaction");
      const stateService = new LoyaltyTransactionStateService(AppDataSource);

      // ✅ Call state service for side effects (notifications, audit logs, UI broadcast)
      await stateService.onTransactionCreated(
        entity.id,
        entity,
        "system", // TODO: Extract from context/session if available
        queryRunner
      );
    } catch (err) {
      logger.error(
        `[LoyaltyTransactionSubscriber] Failed to handle afterInsert for transaction #${entity.id}:`,
        err
      );
      throw err; // Rethrow to ensure transaction rollback
    }
  }

  /**
   * @param {import("../entities/LoyaltyTransaction")} entity
   */
  beforeUpdate(entity) {
    logger.debug("[LoyaltyTransactionSubscriber] beforeUpdate:", {
      id: entity?.id,
      notes: entity?.notes,
      // Other fields are usually immutable
    });
  }

  /**
   * @param {{ databaseEntity: any; entity: any }} event
   */
  async afterUpdate(event, { manager, queryRunner }) {
    const { entity, databaseEntity } = event;

    logger.info("[LoyaltyTransactionSubscriber] afterUpdate:", {
      id: entity?.id,
      oldNotes: databaseEntity?.notes,
      newNotes: entity?.notes,
      oldDeletedAt: databaseEntity?.deletedAt,
      newDeletedAt: entity?.deletedAt,
    });

    // Only handle meaningful changes (e.g., notes update, soft delete)
    const hasSignificantChange =
      (databaseEntity && databaseEntity.notes !== entity.notes) ||
      (databaseEntity && databaseEntity.deletedAt !== entity.deletedAt);

    if (hasSignificantChange) {
      try {
        const { LoyaltyTransactionStateService } = require("../stateServices/LoyaltyTransaction");
        const stateService = new LoyaltyTransactionStateService(AppDataSource);

        // ✅ Call state service for update side effects
        await stateService.onTransactionUpdated(
          entity.id,
          entity,
          {
            oldNotes: databaseEntity?.notes,
            newNotes: entity?.notes,
            oldDeletedAt: databaseEntity?.deletedAt,
            newDeletedAt: entity?.deletedAt,
          },
          "system",
          queryRunner
        );
      } catch (err) {
        logger.error(
          `[LoyaltyTransactionSubscriber] Failed to handle afterUpdate for transaction #${entity.id}:`,
          err
        );
        throw err; // Rethrow to ensure transaction rollback
      }
    }
  }

  /**
   * @param {import("../entities/LoyaltyTransaction")} entity
   */
  beforeRemove(entity) {
    logger.debug("[LoyaltyTransactionSubscriber] beforeRemove:", {
      id: entity?.id,
      customerId: entity?.customerId,
    });
  }

  /**
   * @param {{ databaseEntity?: any; entityId: any }} event
   */
  async afterRemove(event) {
    logger.info("[LoyaltyTransactionSubscriber] afterRemove:", {
      id: event.entityId,
    });

    // Optional: call state service for deletion side effects
    /*
    try {
      const { LoyaltyTransactionStateService } = require("../stateServices/LoyaltyTransaction");
      const stateService = new LoyaltyTransactionStateService(AppDataSource);
      // Note: entity may not be fully loaded; you can pass entityId and fetch if needed
      await stateService.onTransactionDeleted(event.entityId, "system");
    } catch (err) {
      logger.error(`[LoyaltyTransactionSubscriber] Failed to handle afterRemove for transaction #${event.entityId}:`, err);
      throw err; // Rethrow to ensure transaction rollback
    }
    */
  }
}

module.exports = LoyaltyTransactionSubscriber;