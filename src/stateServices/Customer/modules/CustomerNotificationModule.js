// src/stateServices/customer/modules/CustomerNotificationModule.js
const { logger } = require("../../../utils/logger");
const NotificationSender = require("../../common/NotificationSender");

/**
 * CustomerNotificationModule - Handles all customer notifications.
 * Currently minimal - most notifications are handled directly by status modules.
 * This can be extended for future notification needs.
 */
class CustomerNotificationModule {
  // Most notification logic is handled in the status modules.
  // This module is kept as a placeholder for future extension.
}

module.exports = CustomerNotificationModule;