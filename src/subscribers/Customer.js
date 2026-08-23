// src/subscribers/CustomerSubscriber.js
const Customer = require("../entities/Customer");
const { logger } = require("../utils/logger");

logger.debug("[Subscriber] Loading CustomerSubscriber");

class CustomerSubscriber {
  listenTo() {
    return Customer;
  }

  /**
   * @param {import("../entities/Customer")} entity
   */
  beforeInsert(entity) {
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
  afterInsert(entity, { manager, queryRunner }) {
    logger.info("[CustomerSubscriber] afterInsert:", {
      id: entity.id,
      name: entity.name,
      email: entity.email,
      phone: entity.phone,
      status: entity.status,
      points: entity.loyaltyPointsBalance,
    });
  }

  /**
   * @param {import("../entities/Customer")} entity
   */
  beforeUpdate(entity) {
    logger.debug("[CustomerSubscriber] beforeUpdate:", {
      id: entity?.id,
      status: entity?.status,
      points: entity?.loyaltyPointsBalance,
    });
  }

  /**
   * @param {{ databaseEntity: any; entity: any }} event
   */
  afterUpdate(event, { manager, queryRunner }) {
    const { entity, databaseEntity } = event;
    logger.info("[CustomerSubscriber] afterUpdate:", {
      id: entity?.id,
      oldStatus: databaseEntity?.status,
      newStatus: entity?.status,
      oldPoints: databaseEntity?.loyaltyPointsBalance,
      newPoints: entity?.loyaltyPointsBalance,
      oldLifetime: databaseEntity?.lifetimePointsEarned,
      newLifetime: entity?.lifetimePointsEarned,
    });

    // Detect status change
    if (databaseEntity && databaseEntity.status !== entity.status) {
      logger.info(`[CustomerSubscriber] Customer #${entity.id} status changed: ${databaseEntity.status} → ${entity.status}`);
    }

    // Detect significant points changes
    const pointsDiff = (entity.loyaltyPointsBalance || 0) - (databaseEntity?.loyaltyPointsBalance || 0);
    if (Math.abs(pointsDiff) > 100) {
      logger.info(`[CustomerSubscriber] Customer #${entity.id} points changed by ${pointsDiff}`);
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
  afterRemove(event) {
    logger.info("[CustomerSubscriber] afterRemove:", {
      id: event.entityId,
    });
  }
}

module.exports = CustomerSubscriber;