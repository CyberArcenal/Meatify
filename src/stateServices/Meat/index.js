// src/stateServices/meat/index.js
const { MeatStateService } = require("./MeatStateService");
const MeatCreatedModule = require("./modules/status/MeatCreatedModule");
const MeatActivatedModule = require("./modules/status/MeatActivatedModule");
const MeatDeactivatedModule = require("./modules/status/MeatDeactivatedModule");
const MeatPriceChangeModule = require("./modules/status/MeatPriceChangeModule");
const MeatUpdatedModule = require("./modules/status/MeatUpdatedModule");
const MeatDeletedModule = require("./modules/status/MeatDeletedModule");
const MeatRestoredModule = require("./modules/status/MeatRestoredModule");
const MeatStatusModule = require("./modules/MeatStatusModule");
const MeatNotificationModule = require("./modules/MeatNotificationModule");
const MeatAuditModule = require("./modules/MeatAuditModule");

module.exports = {
  MeatStateService,
  MeatCreatedModule,
  MeatActivatedModule,
  MeatDeactivatedModule,
  MeatPriceChangeModule,
  MeatUpdatedModule,
  MeatDeletedModule,
  MeatRestoredModule,
  MeatStatusModule,
  MeatNotificationModule,
  MeatAuditModule,
};