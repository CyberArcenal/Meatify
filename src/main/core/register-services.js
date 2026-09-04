// src/main/core/register-services.js
//@ts-check

const { APP_CONFIG } = require("./app-config");
const { ENVIRONMENT } = require("./environment");
const { logger } = require("./logger");
const { defaultContainer } = require("./service-container");

async function registerServices(mainWindow, splashWindow) {
  logger.debug("Registering services...");

  // ============================================================
  // 🆕 REGISTER BATCH SERVICE
  // ============================================================
  const BatchService = require("../../services/Batch");
  defaultContainer.registerClass("batchService", BatchService, {
    lifetime: "singleton",
  });

  // ============================================================
  // 🆕 REGISTER SALE SERVICE
  // ============================================================
  const SaleService = require("../../services/Sale");
  defaultContainer.registerClass("saleService", SaleService, {
    lifetime: "singleton",
  });

  // ============================================================
  // 🆕 REGISTER SALE ITEM SERVICE (dependency ng SaleService)
  // ============================================================
  const SaleItemService = require("../../services/SaleItem");
  defaultContainer.registerClass("saleItemService", SaleItemService, {
    lifetime: "singleton",
  });

  // ============================================================
  // 🆕 REGISTER INVENTORY MOVEMENT SERVICE
  // ============================================================
  const InventoryMovementService = require("../../services/InventoryMovement");
  defaultContainer.registerClass(
    "inventoryMovementService",
    InventoryMovementService,
    {
      lifetime: "singleton",
    },
  );

  // ============================================================
  // 🆕 REGISTER CUSTOMER SERVICE
  // ============================================================
  const CustomerService = require("../../services/Customer");
  defaultContainer.registerClass("customerService", CustomerService, {
    lifetime: "singleton",
  });

  // ============================================================
  // 🆕 REGISTER MEAT SERVICE
  // ============================================================
  const MeatService = require("../../services/Meat");
  defaultContainer.registerClass("meatService", MeatService, {
    lifetime: "singleton",
  });

  // ============================================================
  // 🆕 REGISTER SUPPLIER SERVICE
  // ============================================================
  const SupplierService = require("../../services/Supplier");
  defaultContainer.registerClass("supplierService", SupplierService, {
    lifetime: "singleton",
  });

  // ============================================================
  // 🆕 REGISTER CATEGORY SERVICE
  // ============================================================
  const CategoryService = require("../../services/Category");
  defaultContainer.registerClass("categoryService", CategoryService, {
    lifetime: "singleton",
  });

  // ============================================================
  // 🆕 REGISTER PURCHASE SERVICE
  // ============================================================
  const PurchaseService = require("../../services/Purchase");
  defaultContainer.registerClass("purchaseService", PurchaseService, {
    lifetime: "singleton",
  });

  // ============================================================
  // 🆕 REGISTER RETURN REFUND SERVICE
  // ============================================================
  const ReturnRefundService = require("../../services/ReturnRefund");
  defaultContainer.registerClass("returnRefundService", ReturnRefundService, {
    lifetime: "singleton",
  });

  // ============================================================
  // 🆕 REGISTER LOYALTY TRANSACTION SERVICE
  // ============================================================
  const LoyaltyTransactionService = require("../../services/LoyaltyTransaction");
  defaultContainer.registerClass(
    "loyaltyTransactionService",
    LoyaltyTransactionService,
    {
      lifetime: "singleton",
    },
  );

  // ============================================================
  // 🆕 REGISTER NOTIFICATION SERVICE
  // ============================================================
  const NotificationService = require("../../services/Notification");
  defaultContainer.registerClass("notificationService", NotificationService, {
    lifetime: "singleton",
  });

  // ============================================================
  // 🆕 REGISTER NOTIFICATION LOG SERVICE
  // ============================================================
  const NotificationLogService = require("../../services/NotificationLog");
  defaultContainer.registerClass(
    "notificationLogService",
    NotificationLogService,
    {
      lifetime: "singleton",
    },
  );

  // ============================================================
  // 🆕 REGISTER SYSTEM SETTING SERVICE
  // ============================================================
  const SystemSettingService = require("../../services/Settings");
  defaultContainer.registerClass("systemSettingService", SystemSettingService, {
    lifetime: "singleton",
  });

  // ============================================================
  // 🆕 REGISTER AUDIT LOG SERVICE
  // ============================================================
  const AuditLogService = require("../../services/AuditLog");
  defaultContainer.registerClass("auditLogService", AuditLogService, {
    lifetime: "singleton",
  });

  // ============================================================
  // EXISTING SERVICES
  // ============================================================

  // Printer Service
  const PrinterService = require("../../services/Printer");
  defaultContainer.registerClass("printer", PrinterService, {
    lifetime: "singleton",
  });

  // Cash Drawer Service
  const CashDrawerService = require("../../services/CashDrawer");
  defaultContainer.registerClass("cashDrawer", CashDrawerService, {
    lifetime: "singleton",
  });

  // Database Service
  defaultContainer.register(
    "database",
    () => {
      return require("../db/database");
    },
    { lifetime: "singleton" },
  );

  // Logger Service
  defaultContainer.registerValue("logger", logger);

  // Configuration Service
  defaultContainer.registerValue("config", APP_CONFIG);
  defaultContainer.registerValue("environment", ENVIRONMENT);

  logger.debug(
    `Registered ${defaultContainer.getServiceNames().length} services`,
  );
}

module.exports = {
  registerServices,
};
