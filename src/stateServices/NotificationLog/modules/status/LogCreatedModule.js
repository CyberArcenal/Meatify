// src/stateServices/notificationLog/modules/status/LogCreatedModule.js
//@ts-check
const { logger } = require("../../../../utils/logger");
const UIBroadcaster = require("../../../common/UIBroadcaster");

/**
 * LogCreatedModule - Handles side effects when a notification log is created.
 * Delegates sending to NotificationLogSenderModule and broadcasts status updates.
 */
class LogCreatedModule {
  /**
   * @param {Object} senderModule - NotificationLogSenderModule instance
   * @param {Object} auditModule - NotificationLogAuditModule instance
   */
  constructor(senderModule, auditModule) {
    this.senderModule = senderModule;
    this.auditModule = auditModule;
  }

  /**
   * Handle log creation side effects
   * @param {Object} log - The log entity
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner
   * @returns {Promise<Object>} The updated log entity
   */
  async handle(log, user = "system", queryRunner = null) {
    logger.info(`[LogCreated] Processing log #${log.id} (${log.channel || "email"}) → ${log.recipient_email}`);

    // 1. Broadcast initial creation to UI
    this._broadcastCreated(log);

    // 2. Send email/SMS and update status
    const updatedLog = await this.senderModule.send(log, user, queryRunner);

    // 3. Broadcast status change
    this._broadcastStatusChange(updatedLog);

    // 4. Audit log for status change (handled by orchestrator)

    return updatedLog;
  }

  /**
   * Broadcast log created to UI
   * @private
   */
  _broadcastCreated(log) {
    UIBroadcaster.notificationLog("created", {
      id: log.id,
      recipient: log.recipient_email,
      subject: log.subject,
      channel: log.channel,
      status: log.status,
      createdAt: log.created_at,
    });
  }

  /**
   * Broadcast status change to UI
   * @private
   */
  _broadcastStatusChange(log) {
    UIBroadcaster.notificationLog("statusChanged", {
      id: log.id,
      oldStatus: log.status, // will be updated after send, but we can pass old/new if needed
      newStatus: log.status,
      updatedAt: log.updated_at,
    });
  }
}

module.exports = LogCreatedModule;