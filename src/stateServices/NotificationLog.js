// src/stateServices/NotificationLog.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const NotificationLog = require("../entities/NotificationLog");
const emailSender = require("../channels/email.sender");
const smsSender = require("../channels/sms.sender");
const { LOG_STATUS } = require("../services/NotificationLog");

/**
 * NotificationLogStateService handles state transitions and side effects for notification logs.
 * It does NOT contain CRUD operations – those belong to NotificationLogService.
 * This service triggers actual email/SMS sending when a log is created or retried.
 */
class NotificationLogStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.logRepo = dataSource.getRepository(NotificationLog);
    this.emailSender = emailSender;
    this.smsSender = smsSender;
  }

  /**
   * Helper: get repository (transactional if queryRunner provided)
   * @param {import("typeorm").QueryRunner | null} qr
   * @param {Function} entityClass
   * @returns {import("typeorm").Repository<any>}
   */
  _getRepo(qr, entityClass) {
    if (qr) {
      return qr.manager.getRepository(entityClass);
    }
    return this.dataSource.getRepository(entityClass);
  }

  /**
   * Called after a log is created – sends the actual email/SMS
   * @param {Object} log - The notification log entity
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onLogCreated(log, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    logger.info(
      `[NotificationLogState] Processing log #${log.id} (${log.channel || "email"}) → ${log.recipient_email}`
    );

    const repo = this._getRepo(queryRunner, NotificationLog);

    // Determine channel and send
    const channel = log.channel || "email";
    let sendResult = null;

    try {
      if (channel === "email") {
        sendResult = await this.emailSender.send(
          log.recipient_email,
          log.subject || "No Subject",
          log.payload,
          null, // text fallback
          {},
          true, // asyncMode
          log.id // pass log id for tracking
        );
      } else if (channel === "sms") {
        sendResult = await this.smsSender.send(
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

      // Audit log for status change
      await auditLogger.logUpdate(
        "NotificationLog",
        log.id,
        { status: oldStatus },
        { status: log.status },
        user
      );

      if (log.status === LOG_STATUS.SENT) {
        logger.info(`[NotificationLogState] ✅ ${channel} sent to ${log.recipient_email} (log #${log.id})`);
      } else {
        logger.error(`[NotificationLogState] ❌ ${channel} failed for ${log.recipient_email}: ${log.error_message}`);
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

      await auditLogger.logUpdate(
        "NotificationLog",
        log.id,
        { status: oldStatus },
        { status: LOG_STATUS.FAILED },
        user
      );

      logger.error(`[NotificationLogState] ❌ ${channel} failed for ${log.recipient_email}:`, error);
      throw error;
    }
  }

  /**
   * Retry a failed log
   * @param {number} logId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async retryLog(logId, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const repo = this._getRepo(queryRunner, NotificationLog);

    const log = await repo.findOne({ where: { id: logId } });
    if (!log) {
      throw new Error(`NotificationLog #${logId} not found`);
    }

    if (log.status !== LOG_STATUS.FAILED && log.status !== LOG_STATUS.QUEUED) {
      throw new Error(`Cannot retry log with status: ${log.status}`);
    }

    const MAX_RETRIES = 3;
    if (log.retry_count >= MAX_RETRIES) {
      throw new Error(`Log #${logId} has reached max retries (${MAX_RETRIES})`);
    }

    // Increment retry count and reset status to queued
    const oldStatus = log.status;
    log.retry_count = (log.retry_count || 0) + 1;
    log.status = LOG_STATUS.RESEND;
    log.updated_at = new Date();

    await updateDb(repo, log, { queryRunner, skipSignal: true });

    await auditLogger.logUpdate(
      "NotificationLog",
      logId,
      { status: oldStatus },
      { status: LOG_STATUS.RESEND },
      user
    );

    // Now send the log again
    return await this.onLogCreated(log, user, queryRunner);
  }

  /**
   * Resend a log (manual resend, regardless of status)
   * @param {number} logId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async resendLog(logId, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const repo = this._getRepo(queryRunner, NotificationLog);

    const log = await repo.findOne({ where: { id: logId } });
    if (!log) {
      throw new Error(`NotificationLog #${logId} not found`);
    }

    // Increment resend count
    const oldStatus = log.status;
    log.resend_count = (log.resend_count || 0) + 1;
    log.status = LOG_STATUS.RESEND;
    log.updated_at = new Date();

    await updateDb(repo, log, { queryRunner, skipSignal: true });

    await auditLogger.logUpdate(
      "NotificationLog",
      logId,
      { status: oldStatus },
      { status: LOG_STATUS.RESEND },
      user
    );

    // Now send the log again
    return await this.onLogCreated(log, user, queryRunner);
  }

  /**
   * Retry all failed logs
   * @param {Object} options
   * @param {number} [options.limit] - Max number to retry
   * @param {string} [options.channel] - Filter by channel (email/sms)
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async retryAllFailedLogs(options = {}, user = "system", queryRunner = null) {
    const { limit = 100, channel } = options;
    const repo = this._getRepo(queryRunner, NotificationLog);

    const qb = repo
      .createQueryBuilder("log")
      .where("log.status IN (:...statuses)", { statuses: [LOG_STATUS.FAILED, LOG_STATUS.QUEUED] })
      .andWhere("log.retry_count < 3")
      .orderBy("log.created_at", "ASC")
      .limit(limit);

    if (channel) {
      qb.andWhere("log.channel = :channel", { channel });
    }

    const logs = await qb.getMany();

    const results = { success: [], failed: [] };

    for (const log of logs) {
      try {
        const result = await this.retryLog(log.id, user, queryRunner);
        results.success.push({ id: log.id, result });
      } catch (err) {
        results.failed.push({ id: log.id, error: err.message });
        logger.error(`[NotificationLogState] Failed to retry log #${log.id}:`, err);
      }
    }

    logger.info(
      `[NotificationLogState] Retry all: ${results.success.length} succeeded, ${results.failed.length} failed`
    );
    return results;
  }

  /**
   * Clean up old logs (hard delete)
   * @param {number} daysOld - Delete logs older than this
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async cleanOldLogs(daysOld = 30, user = "system", queryRunner = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const repo = this._getRepo(queryRunner, NotificationLog);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const logs = await repo
      .createQueryBuilder("log")
      .where("log.created_at < :cutoffDate", { cutoffDate })
      .andWhere("log.status IN (:...statuses)", { statuses: [LOG_STATUS.SENT, LOG_STATUS.FAILED] })
      .getMany();

    if (logs.length === 0) {
      logger.info(`[NotificationLogState] No old logs to clean up`);
      return { count: 0 };
    }

    for (const log of logs) {
      await removeDb(repo, log, { queryRunner });
      await auditLogger.debugDelete("NotificationLog", log.id, log, user);
    }

    logger.info(`[NotificationLogState] Cleaned up ${logs.length} old logs`);
    return { count: logs.length };
  }

  /**
   * Get delivery status summary for a recipient
   * @param {string} recipient_email
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async getRecipientStatus(recipient_email, queryRunner = null) {
    const repo = this._getRepo(queryRunner, NotificationLog);

    const logs = await repo
      .createQueryBuilder("log")
      .where("log.recipient_email = :email", { email: recipient_email })
      .orderBy("log.created_at", "DESC")
      .getMany();

    const summary = {
      recipient: recipient_email,
      total: logs.length,
      sent: logs.filter((l) => l.status === LOG_STATUS.SENT).length,
      failed: logs.filter((l) => l.status === LOG_STATUS.FAILED).length,
      queued: logs.filter((l) => l.status === LOG_STATUS.QUEUED).length,
      lastSent: logs.find((l) => l.status === LOG_STATUS.SENT)?.sent_at || null,
      lastFailed: logs.find((l) => l.status === LOG_STATUS.FAILED)?.last_error_at || null,
    };

    return { summary, logs: logs.slice(0, 20) };
  }
}

module.exports = { NotificationLogStateService };