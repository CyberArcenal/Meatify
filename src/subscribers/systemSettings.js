// src/subscribers/SystemSettingSubscriber.js
const { SystemSetting } = require("../entities/systemSettings");
const { logger } = require("../utils/logger");
const { SystemSettingStateTransitionService } = require("../stateServices/systemSettings");
const { BrowserWindow } = require("electron");

console.log("[Subscriber] Loading SystemSettingSubscriber");

class SystemSettingSubscriber {
  constructor() {
    this.transitionService = null;
  }

  async getTransitionService(dataSource) {
    if (!this.transitionService) {
      this.transitionService = new SystemSettingStateTransitionService(dataSource);
    }
    return this.transitionService;
  }

  listenTo() {
    return SystemSetting;
  }

  async beforeInsert(entity, { manager, queryRunner }) {
    try {
      logger.info("[SystemSettingSubscriber] beforeInsert", {
        id: entity.id,
        key: entity.key,
        setting_type: entity.setting_type,
      });
    } catch (err) {
      logger.error("[SystemSettingSubscriber] beforeInsert error", err);
      throw err;
    }
  }

  async afterInsert(entity, { manager, queryRunner }) {
    try {
      logger.info("[SystemSettingSubscriber] afterInsert", {
        id: entity.id,
        key: entity.key,
        setting_type: entity.setting_type,
      });
      const service = await this.getTransitionService(manager.connection);
      if (service.onApply) {
        await service.onApply(entity, null, entity.value, "system", queryRunner);
      }
    } catch (err) {
      logger.error("[SystemSettingSubscriber] afterInsert error", err);
      throw err;
    }
  }

  async beforeUpdate(entity, { manager, queryRunner }) {
    try {
      logger.info("[SystemSettingSubscriber] beforeUpdate", { id: entity.id });
    } catch (err) {
      logger.error("[SystemSettingSubscriber] beforeUpdate error", err);
      throw err;
    }
  }

  async afterUpdate(event, { manager, queryRunner }) {
    try {
      const { entity, databaseEntity } = event;
      logger.info("[SystemSettingSubscriber] afterUpdate", { id: entity.id });

      const service = await this.getTransitionService(manager.connection);
      if (service.onApply) {
        await service.onApply(
          entity,
          databaseEntity.value,
          entity.value,
          "system",
          queryRunner
        );
      }

      // ============================================================
      // 🥩 MEATIFY-SPECIFIC SETTING CHANGE HANDLING
      // ============================================================

      // Tax rate change logging
      if (entity.key === "tax_rate" && entity.value !== databaseEntity.value) {
        logger.info("[SystemSettingSubscriber] Tax rate changed", {
          old: databaseEntity.value,
          new: entity.value,
        });
      }

      // Loyalty settings change
      if (
        (entity.key === "enable_loyalty_points" ||
         entity.key === "loyalty_point_rate" ||
         entity.key === "loyalty_vip_threshold" ||
         entity.key === "loyalty_elite_threshold") &&
        entity.value !== databaseEntity.value
      ) {
        logger.info("[SystemSettingSubscriber] Loyalty settings changed", {
          key: entity.key,
          old: databaseEntity.value,
          new: entity.value,
        });
      }

      // Discount settings change
      if (
        (entity.key === "enable_discounts" ||
         entity.key === "default_discount_rate" ||
         entity.key === "max_discount_percent") &&
        entity.value !== databaseEntity.value
      ) {
        logger.info("[SystemSettingSubscriber] Discount settings changed", {
          key: entity.key,
          old: databaseEntity.value,
          new: entity.value,
        });
      }

      // Inventory settings change
      if (
        (entity.key === "allow_negative_stock" ||
         entity.key === "low_stock_threshold" ||
         entity.key === "enable_auto_reorder") &&
        entity.value !== databaseEntity.value
      ) {
        logger.info("[SystemSettingSubscriber] Inventory settings changed", {
          key: entity.key,
          old: databaseEntity.value,
          new: entity.value,
        });
      }

      // Refund settings change
      if (
        (entity.key === "enable_refunds" ||
         entity.key === "refund_window_days") &&
        entity.value !== databaseEntity.value
      ) {
        logger.info("[SystemSettingSubscriber] Refund settings changed", {
          key: entity.key,
          old: databaseEntity.value,
          new: entity.value,
        });
      }

      // Printer settings change
      if (
        (entity.key === "enable_receipt_printing" ||
         entity.key === "receipt_printer_type") &&
        entity.value !== databaseEntity.value
      ) {
        logger.info("[SystemSettingSubscriber] Printer settings changed", {
          key: entity.key,
          old: databaseEntity.value,
          new: entity.value,
        });
      }

      // ============================================================
      // ✅ Notify UI about changes
      // ============================================================
      const statusKeys = [
        "tax_rate", "enable_discounts", "allow_negative_stock",
        "enable_loyalty_points", "enable_refunds", "enable_receipt_printing",
        "currency", "company_name",
      ];
      if (
        statusKeys.includes(entity.key) &&
        entity.value !== databaseEntity.value
      ) {
        logger.info("[SystemSettingSubscriber] UI-relevant setting changed", {
          key: entity.key,
          old: databaseEntity.value,
          new: entity.value,
        });

        // Send IPC event to all renderer windows
        const windows = BrowserWindow.getAllWindows();
        windows.forEach((win) => {
          if (!win.isDestroyed()) {
            win.webContents.send("system:statusChanged", {
              key: entity.key,
              newValue: entity.value,
              oldValue: databaseEntity.value,
            });
          }
        });
      }
    } catch (err) {
      logger.error("[SystemSettingSubscriber] afterUpdate error", err);
      throw err;
    }
  }

  async beforeRemove(entity, { manager, queryRunner }) {
    try {
      logger.info("[SystemSettingSubscriber] beforeRemove", { id: entity.id });
    } catch (err) {
      logger.error("[SystemSettingSubscriber] beforeRemove error", err);
      throw err;
    }
  }

  async afterRemove(event, { manager, queryRunner }) {
    try {
      logger.info("[SystemSettingSubscriber] afterRemove", { id: event.entityId });
    } catch (err) {
      logger.error("[SystemSettingSubscriber] afterRemove error", err);
      throw err;
    }
  }
}

module.exports = SystemSettingSubscriber;