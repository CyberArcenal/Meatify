// src/stateServices/common/NotificationSender.js
//@ts-check
const { logger } = require("../../utils/logger");
const system = require("../../utils/system");
const notificationLogService = require("../../services/NotificationLog");
const notificationService = require("../../services/Notification");


/**
 * NotificationSender - Centralized notification dispatcher.
 * All methods are static; no instantiation needed.
 *
 * Handles:
 *   - Email (via NotificationLogService, queued)
 *   - SMS (via NotificationLogService, queued)
 *   - In‑app notifications (via NotificationService, real‑time)
 *
 * Each method respects the corresponding system settings (email_enabled,
 * sms_enabled, in_app_notifications_enabled) and gracefully fails if
 * the recipient is missing or the service is disabled.
 */
class NotificationSender {
  /**
   * Send an email (queued via NotificationLogService).
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} body - Plain‑text email body
   * @param {string} user - User performing the action (for audit)
   * @param {import("typeorm").QueryRunner | null} queryRunner - Optional transaction runner
   * @returns {Promise<boolean>} - True if the email was queued, false otherwise
   */
  static async sendEmail(to, subject, body, user = "system", queryRunner = null) {
    try {
      const emailEnabled = await system.emailEnabled();
      if (!emailEnabled) {
        logger.debug(`[NotificationSender] Email disabled, skipping send to ${to}`);
        return false;
      }
      if (!to || typeof to !== "string" || !to.trim()) {
        logger.debug(`[NotificationSender] No valid email address provided`);
        return false;
      }

      await notificationLogService.create(
        {
          to: to.trim(),
          subject: subject,
          payload: body.trim(),
          channel: "email",
        },
        user,
        queryRunner
      );
      logger.info(`[NotificationSender] Email queued for ${to}`);
      return true;
    } catch (err) {
      logger.error(`[NotificationSender] Failed to queue email for ${to}:`, err);
      return false;
      
    }
  }

  /**
   * Send an SMS (queued via NotificationLogService).
   * @param {string} to - Recipient phone number
   * @param {string} message - SMS message content
   * @param {string} user - User performing the action (for audit)
   * @param {import("typeorm").QueryRunner | null} queryRunner - Optional transaction runner
   * @returns {Promise<boolean>} - True if the SMS was queued, false otherwise
   */
  static async sendSms(to, message, user = "system", queryRunner = null) {
    try {
      const smsEnabled = await system.smsEnabled();
      if (!smsEnabled) {
        logger.debug(`[NotificationSender] SMS disabled, skipping send to ${to}`);
        return false;
      }
      if (!to || typeof to !== "string" || !to.trim()) {
        logger.debug(`[NotificationSender] No valid phone number provided`);
        return false;
      }

      await notificationLogService.create(
        {
          to: to.trim(),
          subject: "SMS Message",
          payload: message.trim(),
          channel: "sms",
        },
        user,
        queryRunner
      );
      logger.info(`[NotificationSender] SMS queued for ${to}`);
      return true;
    } catch (err) {
      logger.error(`[NotificationSender] Failed to queue SMS for ${to}:`, err);
      return false;
    }
  }

  /**
   * Send an in‑app notification to the admin user (userId = 1).
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {string} type - 'info', 'success', 'warning', 'error', 'purchase', 'sale'
   * @param {Object} metadata - Additional JSON data (will be stored)
   * @param {string} user - User performing the action (for audit)
   * @param {import("typeorm").QueryRunner | null} queryRunner - Optional transaction runner
   * @returns {Promise<boolean>} - True if the notification was created, false otherwise
   */
  static async sendInApp(title, message, type = "info", metadata = {}, user = "system", queryRunner = null) {
    try {
      const inAppEnabled = await system.inAppNotificationsEnabled();
      if (!inAppEnabled) {
        logger.debug(`[NotificationSender] In‑app notifications disabled, skipping "${title}"`);
        return false;
      }

      await notificationService.create(
        {
          userId: 1, // Admin user
          title: title,
          message: message,
          type: type,
          metadata: metadata,
        },
        user,
        queryRunner
      );
      logger.info(`[NotificationSender] In‑app notification sent: "${title}"`);
      return true;
    } catch (err) {
      logger.error(`[NotificationSender] Failed to send in‑app notification:`, err);
      return false;
    }
  }
}

module.exports = NotificationSender;