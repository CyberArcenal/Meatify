// src/main/core/register-services.js
//@ts-check

const { APP_CONFIG } = require("./app-config");
const { ENVIRONMENT } = require("./environment");
const { logger } = require("./logger");
const { defaultContainer } = require("./service-container");

async function registerServices(mainWindow, splashWindow) {
  logger.debug("Registering services...");

  // ============================================================
  // 🆕 CORE SERVICES – INSTANCES (singleton)
  // ============================================================

  // Batch Service
  const batchService = require("../../services/Batch");
  defaultContainer.registerValue("batchService", batchService);

  // Sale Service
  const saleService = require("../../services/Sale");
  defaultContainer.registerValue("saleService", saleService);

  // Sale Item Service
  const saleItemService = require("../../services/SaleItem");
  defaultContainer.registerValue("saleItemService", saleItemService);

  // Inventory Movement Service
  const inventoryMovementService = require("../../services/InventoryMovement");
  defaultContainer.registerValue(
    "inventoryMovementService",
    inventoryMovementService,
  );

  // Customer Service
  const customerService = require("../../services/Customer");
  defaultContainer.registerValue("customerService", customerService);

  // Meat Service
  const meatService = require("../../services/Meat");
  defaultContainer.registerValue("meatService", meatService);

  // Supplier Service
  const supplierService = require("../../services/Supplier");
  defaultContainer.registerValue("supplierService", supplierService);

  // Category Service
  const categoryService = require("../../services/Category");
  defaultContainer.registerValue("categoryService", categoryService);

  // Purchase Service
  const purchaseService = require("../../services/Purchase");
  defaultContainer.registerValue("purchaseService", purchaseService);

  // Return Refund Service
  const returnRefundService = require("../../services/ReturnRefund");
  defaultContainer.registerValue("returnRefundService", returnRefundService);

  // Loyalty Transaction Service
  const loyaltyTransactionService = require("../../services/LoyaltyTransaction");
  defaultContainer.registerValue(
    "loyaltyTransactionService",
    loyaltyTransactionService,
  );

  // Notification Service
  const notificationService = require("../../services/Notification");
  defaultContainer.registerValue("notificationService", notificationService);

  // Notification Log Service
  const notificationLogService = require("../../services/NotificationLog");
  defaultContainer.registerValue(
    "notificationLogService",
    notificationLogService,
  );

  // System Setting Service – check the actual file name
  // If the file is 'Settings.js' but exports SystemSettingService class/instance
  const systemSettingService = require("../../services/Settings");
  defaultContainer.registerValue("systemSettingService", systemSettingService);

  // Audit Log Service
  const auditLogService = require("../../services/AuditLog");
  defaultContainer.registerValue("auditLogService", auditLogService);

  // ============================================================
  // 🖨️ HARDWARE SERVICES – check if class or instance
  // ============================================================

  // Printer Service – if it's a class, use registerClass; if instance, use registerValue
  const PrinterModule = require("../../services/Printer");
  // Determine if it's a class or instance
  if (typeof PrinterModule === "function" && PrinterModule.prototype) {
    // It's a class constructor
    defaultContainer.registerClass("printer", PrinterModule, {
      lifetime: "singleton",
    });
  } else {
    // It's already an instance
    defaultContainer.registerValue("printer", PrinterModule);
  }

  // Cash Drawer Service – same logic
  const CashDrawerModule = require("../../services/CashDrawer");
  if (typeof CashDrawerModule === "function" && CashDrawerModule.prototype) {
    defaultContainer.registerClass("cashDrawer", CashDrawerModule, {
      lifetime: "singleton",
    });
  } else {
    defaultContainer.registerValue("cashDrawer", CashDrawerModule);
  }

  // ============================================================
  // 🗄️ DATABASE SERVICE (factory)
  // ============================================================

  defaultContainer.register("database", () => require("../db/database"), {
    lifetime: "singleton",
  });

  // ============================================================
  // 📦 CONFIG & LOGGER (values)
  // ============================================================

  defaultContainer.registerValue("logger", logger);
  defaultContainer.registerValue("config", APP_CONFIG);
  defaultContainer.registerValue("environment", ENVIRONMENT);

  logger.debug(
    `Registered ${defaultContainer.getServiceNames().length} services`,
  );
}

module.exports = {
  registerServices,
};
