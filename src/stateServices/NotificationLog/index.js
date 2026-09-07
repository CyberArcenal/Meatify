// src/stateServices/notificationLog/index.js
const { NotificationLogStateService } = require("./NotificationLogStateService");
const LogCreatedModule = require("./modules/status/LogCreatedModule");
const LogUpdatedModule = require("./modules/status/LogUpdatedModule");
const LogDeletedModule = require("./modules/status/LogDeletedModule");
const NotificationLogSenderModule = require("./modules/NotificationLogSenderModule");
const NotificationLogStatusModule = require("./modules/NotificationLogStatusModule");
const NotificationLogAuditModule = require("./modules/NotificationLogAuditModule");

module.exports = {
  NotificationLogStateService,
  LogCreatedModule,
  LogUpdatedModule,
  LogDeletedModule,
  NotificationLogSenderModule,
  NotificationLogStatusModule,
  NotificationLogAuditModule,
};