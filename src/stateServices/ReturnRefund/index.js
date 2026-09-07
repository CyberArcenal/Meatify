// src/stateServices/returnRefund/index.js
const { ReturnRefundStateService } = require("./ReturnRefundStateService");
const ReturnRefundCreatedModule = require("./modules/status/ReturnRefundCreatedModule");
const ReturnRefundProcessedModule = require("./modules/status/ReturnRefundProcessedModule");
const ReturnRefundCancelledModule = require("./modules/status/ReturnRefundCancelledModule");
const ReturnRefundUpdatedModule = require("./modules/status/ReturnRefundUpdatedModule");
const ReturnRefundDeletedModule = require("./modules/status/ReturnRefundDeletedModule");
const ReturnRefundRestoredModule = require("./modules/status/ReturnRefundRestoredModule");
const ReturnRefundNotificationModule = require("./modules/ReturnRefundNotificationModule");
const ReturnRefundStatusModule = require("./modules/ReturnRefundStatusModule");
const ReturnRefundAuditModule = require("./modules/ReturnRefundAuditModule");

module.exports = {
  ReturnRefundStateService,
  ReturnRefundCreatedModule,
  ReturnRefundProcessedModule,
  ReturnRefundCancelledModule,
  ReturnRefundUpdatedModule,
  ReturnRefundDeletedModule,
  ReturnRefundRestoredModule,
  ReturnRefundNotificationModule,
  ReturnRefundStatusModule,
  ReturnRefundAuditModule,
};