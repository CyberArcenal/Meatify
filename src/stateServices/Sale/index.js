// src/stateServices/sale/index.js
const { SaleStateService } = require("./SaleStateService");
const SalePaidModule = require("./modules/status/SalePaidModule");
const SaleRefundedModule = require("./modules/status/SaleRefundedModule");
const SaleVoidedModule = require("./modules/status/SaleVoidedModule");
const SaleInventoryModule = require("./modules/SaleInventoryModule");
const SaleLoyaltyModule = require("./modules/SaleLoyaltyModule");
const SalePaymentModule = require("./modules/SalePaymentModule");
const SaleNotificationModule = require("./modules/SaleNotificationModule");
const SaleStatusModule = require("./modules/SaleStatusModule");
const SaleAuditModule = require("./modules/SaleAuditModule");

module.exports = {
  SaleStateService,
  SalePaidModule,
  SaleRefundedModule,
  SaleVoidedModule,
  SaleInventoryModule,
  SaleLoyaltyModule,
  SalePaymentModule,
  SaleNotificationModule,
  SaleStatusModule,
  SaleAuditModule,
};