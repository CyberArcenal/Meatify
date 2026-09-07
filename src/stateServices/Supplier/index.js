// src/stateServices/supplier/index.js
const { SupplierStateService } = require("./SupplierStateService");
const SupplierCreatedModule = require("./modules/status/SupplierCreatedModule");
const SupplierActivatedModule = require("./modules/status/SupplierActivatedModule");
const SupplierDeactivatedModule = require("./modules/status/SupplierDeactivatedModule");
const SupplierMergedModule = require("./modules/status/SupplierMergedModule");
const SupplierUpdatedModule = require("./modules/status/SupplierUpdatedModule");
const SupplierDeletedModule = require("./modules/status/SupplierDeletedModule");
const SupplierRestoredModule = require("./modules/status/SupplierRestoredModule");
const SupplierNotificationModule = require("./modules/SupplierNotificationModule");
const SupplierStatusModule = require("./modules/SupplierStatusModule");
const SupplierAuditModule = require("./modules/SupplierAuditModule");

module.exports = {
  SupplierStateService,
  SupplierCreatedModule,
  SupplierActivatedModule,
  SupplierDeactivatedModule,
  SupplierMergedModule,
  SupplierUpdatedModule,
  SupplierDeletedModule,
  SupplierRestoredModule,
  SupplierNotificationModule,
  SupplierStatusModule,
  SupplierAuditModule,
};