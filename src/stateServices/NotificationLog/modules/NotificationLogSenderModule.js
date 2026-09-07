// src/stateServices/notificationLog/modules/NotificationLogSenderModule.js
const { logger } = require("../../../utils/logger");
const { updateDb } = require("../../../utils/dbUtils/dbActions");
const { LOG_STATUS } = require("../../../services/NotificationLog");
const emailSender = require("../../../channels/email.sender");
const smsSender = require("../../../channels/sms.sender");

/**
 * NotificationLogSenderModule - Handles the actual sending of email/SMS for notification logs.
 * Updates the log status based on send result.
 */
class NotificationLogSenderModule {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.logRepo = dataSource.getRepository(require("../../../entities/NotificationLog"));
  }

  /**
   * Helper: get repository (transactional)
   */
  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
  }

  /**
   * Send email/SMS for a log and update status
   * @param {Object} log - The log entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<Object>} The updated log entity
   */
  async send(log, user = "system", queryRunner = null) {
    const repo = this._getRepo(queryRunner, this.logRepo.target);
    const channel = log.channel || "email";
    let sendResult = null;

    try {
      if (channel === "email") {
        sendResult = await emailSender.send(
          log.recipient_email,
          log.subject || "No Subject",
          log.payload,
          null, // text fallback
          {},
          true, // asyncMode
          log.id
        );
      } else if (channel === "sms") {
        sendResult = await smsSender.send(
          log.recipient_email, // using email field for phone number
          log.payload,
          {}
        );
      } else {
        throw new Error(`Unsupported channel: ${channel}`);
      }

      // Update log status based on send result
      const oldStatus = log.status;
      if (sendResult?.success) {
        log.status = LOG_STATUS.SENT;
        log.sent_at = new Date();
        log.error_message = null;
        log.last_error_at = null;
      } else {
        log.status = LOG_STATUS.FAILED;
        log.last_error_at = new Date();
        log.error_message = sendResult?.error || "Unknown send error";
      }
      log.updated_at = new Date();

      const saved = await updateDb(repo, log, { queryRunner, skipSignal: true });

      if (log.status === LOG_STATUS.SENT) {
        logger.info(`[NotificationLogSender] ✅ ${channel} sent to ${log.recipient_email} (log #${log.id})`);
      } else {
        logger.error(`[NotificationLogSender] ❌ ${channel} failed for ${log.recipient_email}: ${log.error_message}`);
      }

      return saved;
    } catch (error) {
      // Update log as failed
      const oldStatus = log.status;
      log.status = LOG_STATUS.FAILED;
      log.last_error_at = new Date();
      log.error_message = error.message;
      log.updated_at = new Date();

      const saved = await updateDb(repo, log, { queryRunner, skipSignal: true });

      logger.error(`[NotificationLogSender] ❌ ${channel} failed for ${log.recipient_email}:`, error);
      throw error;
    }
  }
}

module.exports = NotificationLogSenderModule;