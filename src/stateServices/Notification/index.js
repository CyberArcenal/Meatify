// src/stateServices/notification/index.js
const { NotificationStateService } = require("./NotificationStateService");
const NotificationCreatedModule = require("./modules/status/NotificationCreatedModule");
const NotificationMarkAsReadModule = require("./modules/status/NotificationMarkAsReadModule");
const NotificationMarkAsUnreadModule = require("./modules/status/NotificationMarkAsUnreadModule");
const NotificationUpdatedModule = require("./modules/status/NotificationUpdatedModule");
const NotificationDeletedModule = require("./modules/status/NotificationDeletedModule");
const NotificationRestoredModule = require("./modules/status/NotificationRestoredModule");
const NotificationMarkAllAsReadModule = require("./modules/status/NotificationMarkAllAsReadModule");
const NotificationMarkAllAsUnreadModule = require("./modules/status/NotificationMarkAllAsUnreadModule");
const NotificationDeleteAllReadModule = require("./modules/status/NotificationDeleteAllReadModule");
const NotificationStatusModule = require("./modules/NotificationStatusModule");
const NotificationAuditModule = require("./modules/NotificationAuditModule");

module.exports = {
  NotificationStateService,
  NotificationCreatedModule,
  NotificationMarkAsReadModule,
  NotificationMarkAsUnreadModule,
  NotificationUpdatedModule,
  NotificationDeletedModule,
  NotificationRestoredModule,
  NotificationMarkAllAsReadModule,
  NotificationMarkAllAsUnreadModule,
  NotificationDeleteAllReadModule,
  NotificationStatusModule,
  NotificationAuditModule,
};