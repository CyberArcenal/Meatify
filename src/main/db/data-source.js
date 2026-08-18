// src/main/db/data-source.js
//@ts-check
const fs = require("fs");
const path = require("path");
const { DataSource } = require("typeorm");
const { getDatabaseConfig } = require("./database");

// ===== IMPORT NG MGA ENTITIES =====
const { AuditLog } = require("../../entities/AuditLog");
const Customer = require("../../entities/Customer");
const InventoryMovement = require("../../entities/InventoryMovement");
const LoyaltyTransaction = require("../../entities/LoyaltyTransaction");

// ✅ BAGO: Meat (dating Product) at Batch
const Meat = require("../../entities/Meat");
const Batch = require("../../entities/Batch");

const Sale = require("../../entities/Sale");
const SaleItem = require("../../entities/SaleItem");
const { SystemSetting } = require("../../entities/systemSettings");
const Category = require("../../entities/Category");
const NotificationLog = require("../../entities/NotificationLog");
const Purchase = require("../../entities/Purchase");
const PurchaseItem = require("../../entities/PurchaseItem");
const ReturnRefund = require("../../entities/ReturnRefund");
const ReturnRefundItem = require("../../entities/ReturnRefundItem");
const Supplier = require("../../entities/Supplier");
const Notification = require("../../entities/Notification");

const config = getDatabaseConfig();

// ===== LISTAHAN NG MGA ENTITIES =====
const entities = [
  AuditLog,
  Customer,
  InventoryMovement,
  LoyaltyTransaction,
  Meat, 
  Batch,       
  Sale,
  SaleItem,
  SystemSetting,
  Category,
  NotificationLog,
  Purchase,
  PurchaseItem,
  ReturnRefund,
  ReturnRefundItem,
  Supplier,
  Notification,
];

const dataSourceOptions = {
  ...config,
  entities,
  migrations: Array.isArray(config.migrations)
    ? config.migrations
    : [config.migrations],
};

// @ts-ignore
const AppDataSource = new DataSource(dataSourceOptions);

module.exports = { AppDataSource };