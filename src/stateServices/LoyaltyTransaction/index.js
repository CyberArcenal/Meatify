// src/stateServices/loyaltyTransaction/index.js
const { LoyaltyTransactionStateService } = require("./LoyaltyTransactionStateService");
const TransactionCreatedModule = require("./modules/status/TransactionCreatedModule");
const TransactionUpdatedModule = require("./modules/status/TransactionUpdatedModule");
const TransactionDeletedModule = require("./modules/status/TransactionDeletedModule");
const LoyaltyTransactionStatusModule = require("./modules/LoyaltyTransactionStatusModule");
const LoyaltyTransactionNotificationModule = require("./modules/LoyaltyTransactionNotificationModule");
const LoyaltyTransactionAuditModule = require("./modules/LoyaltyTransactionAuditModule");

module.exports = {
  LoyaltyTransactionStateService,
  TransactionCreatedModule,
  TransactionUpdatedModule,
  TransactionDeletedModule,
  LoyaltyTransactionStatusModule,
  LoyaltyTransactionNotificationModule,
  LoyaltyTransactionAuditModule,
};