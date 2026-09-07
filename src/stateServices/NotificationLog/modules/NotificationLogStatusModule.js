// src/stateServices/notificationLog/modules/NotificationLogStatusModule.js
const { logger } = require("../../../utils/logger");
const { LOG_STATUS } = require("../../../services/NotificationLog");

/**
 * NotificationLogStatusModule - Handles status validation for notification logs.
 * 
 * FUTURE USE CASES:
 * - Validate if a log can be retried (only failed or resend)
 * - Validate if a log can be deleted
 * - Check if channel is valid
 */
class NotificationLogStatusModule {
  /**
   * Validate if a log can be retried
   * @param {Object} log - The log entity
   * @param {Object} context - Additional context (maxRetries, etc.)
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateRetry(log, context = {}) {
    logger.debug(`[NotificationLogStatus] Validating retry for log #${log.id}`);

    const { maxRetries = 3 } = context;

    if (log.status !== LOG_STATUS.FAILED && log.status !== LOG_STATUS.RESEND) {
      return { valid: false, reason: `Cannot retry a log with status "${log.status}"` };
    }

    if ((log.retry_count || 0) >= maxRetries) {
      return { valid: false, reason: `Max retries (${maxRetries}) reached` };
    }

    return { valid: true };
  }

  /**
   * Validate if a log can be deleted
   * @param {Object} log - The log entity
   * @param {Object} context - Additional context
   * @returns {{ valid: boolean; reason?: string }}
   */
  validateDelete(log, context = {}) {
    logger.debug(`[NotificationLogStatus] Validating deletion for log #${log.id}`);
    // Currently no restrictions on deletion
    return { valid: true };
  }

  /**
   * Check if channel is valid
   * @param {string} channel - The channel name
   * @returns {boolean}
   */
  isValidChannel(channel) {
    return channel === "email" || channel === "sms";
  }

  /**
   * Get valid statuses
   * @returns {string[]}
   */
  getValidStatuses() {
    return Object.values(LOG_STATUS);
  }

  /**
   * Get status summary
   * @param {Object} log - The log entity
   * @returns {{ status: string; channel: string; isFinal: boolean }}
   */
  getStatusSummary(log) {
    return {
      status: log.status,
      channel: log.channel || "email",
      isFinal: log.status === LOG_STATUS.SENT || log.status === LOG_STATUS.FAILED,
    };
  }
}

module.exports = NotificationLogStatusModule;