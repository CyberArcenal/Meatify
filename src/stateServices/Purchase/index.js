// src/stateServices/purchase/index.js
const { PurchaseStateService } = require("./PurchaseStateService");
const PurchaseCreatedModule = require("./modules/status/PurchaseCreatedModule");
const PurchaseApprovedModule = require("./modules/status/PurchaseApprovedModule");
const PurchaseCompletedModule = require("./modules/status/PurchaseCompletedModule");
const PurchaseCancelledModule = require("./modules/status/PurchaseCancelledModule");
const PurchaseUpdatedModule = require("./modules/status/PurchaseUpdatedModule");
const PurchaseDeletedModule = require("./modules/status/PurchaseDeletedModule");
const PurchaseNotificationModule = require("./modules/PurchaseNotificationModule");
const PurchaseStatusModule = require("./modules/PurchaseStatusModule");
const PurchaseAuditModule = require("./modules/PurchaseAuditModule");

module.exports = {
  PurchaseStateService,
  PurchaseCreatedModule,
  PurchaseApprovedModule,
  PurchaseCompletedModule,
  PurchaseCancelledModule,
  PurchaseUpdatedModule,
  PurchaseDeletedModule,
  PurchaseNotificationModule,
  PurchaseStatusModule,
  PurchaseAuditModule,
};