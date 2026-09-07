// src/stateServices/notificationLog/NotificationLogStateService.js
//@ts-check
const { logger } = require("../../utils/logger");
const NotificationLog = require("../../entities/NotificationLog");
const LogCreatedModule = require("./modules/status/LogCreatedModule");
const LogUpdatedModule = require("./modules/status/LogUpdatedModule");
const LogDeletedModule = require("./modules/status/LogDeletedModule");
const NotificationLogSenderModule = require("./modules/NotificationLogSenderModule");
const NotificationLogStatusModule = require("./modules/NotificationLogStatusModule");
const NotificationLogAuditModule = require("./modules/NotificationLogAuditModule");

/**
 * NotificationLogStateService - Orchestrates side effects for notification log events.
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

    // ─── Initialize modules ──────────────────────────────────────
    this.senderModule = new NotificationLogSenderModule(dataSource);
    this.statusModule = new NotificationLogStatusModule();
    this.auditModule = new NotificationLogAuditModule();

    // ─── Status modules with dependencies ───────────────────────
    this.createdModule = new LogCreatedModule(
      this.senderModule,
      this.auditModule,
    );
    this.updatedModule = new LogUpdatedModule();
    this.deletedModule = new LogDeletedModule();
  }

  /**
   * Helper: get repository (transactional if queryRunner provided)
   */
  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
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
   * @returns {Promise<Object>} The updated log entity
   */
  async onLogCreated(log, user = "system", queryRunner = null) {
    logger.info(
      `[NotificationLogState] ✅ Processing log #${log.id} (${log.channel || "email"}) → ${log.recipient_email}`,
    );

    // 1. Validate creation (placeholder)
    // No specific validation needed for creation

    // 2. Handle creation (send and update status)
    const updatedLog = await this.createdModule.handle(log, user, queryRunner);

    // 3. Audit log for status change (after send)
    if (updatedLog) {
      await this.auditModule.logStatusChange(
        updatedLog.id,
        { status: log.status },
        { status: updatedLog.status },
        user,
      );
    }

    return updatedLog;
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
    logger.info(
      `[NotificationLogState] ✅ Log #${logId} updated (fields: ${Object.keys(changes).join(", ")}) by ${user}`,
    );

    // 1. Handle update side effects (UI broadcast)
    await this.updatedModule.handle(logId, log, changes, user);

    // 2. Audit log
    await this.auditModule.logUpdated(logId, changes, log, user);
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
    logger.info(
      `[NotificationLogState] ✅ Log #${logId} soft-deleted by ${user}`,
    );

    // 1. Handle deletion side effects (UI broadcast)
    await this.deletedModule.handle(logId, log, user);

    // 2. Audit log
    await this.auditModule.logDeleted(logId, log, user);
  }
}

module.exports = { NotificationLogStateService };
