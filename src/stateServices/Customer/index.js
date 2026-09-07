// src/stateServices/customer/index.js
const { CustomerStateService } = require("./CustomerStateService");
const CustomerCreatedModule = require("./modules/status/CustomerCreatedModule");
const CustomerStatusChangeModule = require("./modules/status/CustomerStatusChangeModule");
const CustomerPointsChangeModule = require("./modules/status/CustomerPointsChangeModule");
const CustomerDeletedModule = require("./modules/status/CustomerDeletedModule");
const CustomerRestoredModule = require("./modules/status/CustomerRestoredModule");
const CustomerAuditModule = require("./modules/CustomerAuditModule");
const CustomerPointsModule = require("./modules/CustomerPointsModule");

module.exports = {
  CustomerStateService,
  CustomerCreatedModule,
  CustomerStatusChangeModule,
  CustomerPointsChangeModule,
  CustomerDeletedModule,
  CustomerRestoredModule,
  CustomerAuditModule,
  CustomerPointsModule,
};