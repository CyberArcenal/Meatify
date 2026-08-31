// src/stateServices/NotificationLog.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const NotificationLog = require("../entities/NotificationLog");
const emailSender = require("../channels/email.sender");
const smsSender = require("../channels/sms.sender");
const { LOG_STATUS } = require("../services/NotificationLog");

/**
 * NotificationLogStateService handles SIDE EFFECTS only for notification logs.
 * It does NOT contain CRUD or business logic – those belong to NotificationLogService.
 * All methods here are event handlers (onLogCreated, onLogUpdated, onLogDeleted)
 * and are called by the subscriber after a change is detected.
 *
 * ✅ Every method sends IPC events to the UI for real-time updates.
 * ✅ onLogCreated triggers the actual email/SMS sending as a side effect.
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
   * Send event to all renderer windows (UI)
   * @param {string} channel
   * @param {any} data
   */
  _sendToRenderers(channel, data) {
    try {
      const { BrowserWindow } = require("electron");
      const windows = BrowserWindow.getAllWindows();
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send(channel, data);
        }
      });
    } catch (error) {
      logger.warn(
        "[NotificationLogState] Failed to send IPC event (maybe not in Electron):",
        error.message,
      );
    }
  }

  // ============================================================
  // 🔄 SIDE EFFECTS (called by subscriber)
  // ============================================================

  /**
   * Side effect after a notification log is created
   * Called from NotificationLogSubscriber.afterInsert
   * 
   * This handler:
   * 1. Sends the actual email/SMS (the core side effect)
   * 2. Updates the log status based on send result (data mutation tied to side effect)
   * 3. Broadcasts to UI
   * 4. Writes audit log
   * 
   * @param {Object} log - The notification log entity
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onLogCreated(log, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    logger.info(
      `[NotificationLogState] ✅ Processing log #${log.id} (${log.channel || "email"}) → ${log.recipient_email}`
    );

    const repo = this._getRepo(queryRunner, NotificationLog);

    // Broadcast to UI
    this._sendToRenderers("notificationLog:created", {
      id: log.id,
      recipient: log.recipient_email,
      subject: log.subject,
      channel: log.channel,
      status: log.status,
      createdAt: log.created_at,
    });

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

      // Broadcast status update to UI
      this._sendToRenderers("notificationLog:statusChanged", {
        id: log.id,
        oldStatus,
        newStatus: log.status,
        updatedAt: log.updated_at,
      });

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

      // Broadcast status update to UI
      this._sendToRenderers("notificationLog:statusChanged", {
        id: log.id,
        oldStatus,
        newStatus: LOG_STATUS.FAILED,
        error: error.message,
        updatedAt: log.updated_at,
      });

      // Audit log for status change
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
   * Side effect after a notification log is updated
   * Called from NotificationLogSubscriber.afterUpdate
   * @param {number} logId
   * @param {Object} log
   * @param {Object} changes
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onLogUpdated(logId, log, changes, user = "system", queryRunner = null) {
    logger.info(`[NotificationLogState] ✅ Log #${logId} updated (fields: ${Object.keys(changes).join(", ")})`);

    // Broadcast to UI
    this._sendToRenderers("notificationLog:updated", {
      id: logId,
      changes,
      updatedAt: log.updated_at,
    });

    // Audit log
    await auditLogger.logUpdate(
      "NotificationLog",
      logId,
      changes,
      log,
      user
    );
  }

  /**
   * Side effect after a notification log is soft-deleted
   * Called from NotificationLogSubscriber.afterRemove
   * @param {number} logId
   * @param {Object} log
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onLogDeleted(logId, log, user = "system", queryRunner = null) {
    logger.info(`[NotificationLogState] ✅ Log #${logId} soft-deleted by ${user}`);

    // Broadcast to UI
    this._sendToRenderers("notificationLog:deleted", {
      id: logId,
      recipient: log?.recipient_email,
      subject: log?.subject,
      deletedAt: new Date().toISOString(),
    });

    // Audit log
    await auditLogger.logCreate("NotificationLog", logId, log, user);
  }
}

module.exports = { NotificationLogStateService };