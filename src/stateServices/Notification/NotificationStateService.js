// src/stateServices/notification/NotificationStateService.js
//@ts-check
const { logger } = require("../../utils/logger");
const Notification = require("../../entities/Notification");
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

/**
 * NotificationStateService - Orchestrates side effects for notification state changes.
 * It does NOT perform CRUD updates – those belong to NotificationService.
 * All methods here are event handlers and are called by the subscriber after a change is detected.
 *
 * ✅ Every method sends IPC events to the UI for real-time updates (toast popups, etc.)
 */
class NotificationStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.notificationRepo = dataSource.getRepository(Notification);

    // ─── Initialize modules ──────────────────────────────────────
    this.createdModule = new NotificationCreatedModule();
    this.markAsReadModule = new NotificationMarkAsReadModule();
    this.markAsUnreadModule = new NotificationMarkAsUnreadModule();
    this.updatedModule = new NotificationUpdatedModule();
    this.deletedModule = new NotificationDeletedModule();
    this.restoredModule = new NotificationRestoredModule();
    this.markAllAsReadModule = new NotificationMarkAllAsReadModule();
    this.markAllAsUnreadModule = new NotificationMarkAllAsUnreadModule();
    this.deleteAllReadModule = new NotificationDeleteAllReadModule();
    this.statusModule = new NotificationStatusModule();
    this.auditModule = new NotificationAuditModule();
  }

  /**
     * Helper: get repository (transactional if queryRunner provided)
     * @param {{ manager: { getRepository: (arg0: any) => any; }; }} qr
     * @param {import("typeorm").EntityTarget<import("typeorm").ObjectLiteral>} entityClass
     */
  _getRepo(qr, entityClass) {
    if (qr) return qr.manager.getRepository(entityClass);
    return this.dataSource.getRepository(entityClass);
  }

  // ============================================================
  // 🔄 STATE TRANSITION SIDE EFFECTS (on...)
  // ============================================================

  /**
   * Side effect after a notification is created
   * Called from NotificationSubscriber.afterInsert
   * @param {number} notificationId
   * @param {Notification} notification
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onCreate(notificationId, notification, user = "system", queryRunner = null) {
    logger.info(`[NotificationState] ✅ Notification #${notificationId} created by ${user}`);

    // 1. Handle creation side effects (UI broadcast + native notification)
    await this.createdModule.handle(notification, user);

    // 2. Audit log
    await this.auditModule.logCreated(notificationId, notification, user);
  }

  /**
   * Side effect after a notification is marked as read
   * Called from NotificationSubscriber.afterUpdate
   * @param {number} notificationId
   * @param {Notification} updatedNotification
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onMarkAsRead(notificationId, updatedNotification, user = "system", queryRunner = null) {
    logger.info(`[NotificationState] ✅ Notification #${notificationId} marked as read by ${user}`);

    // 1. Validate mark as read (placeholder for future)
    const validation = this.statusModule.validateMarkAsRead(updatedNotification, {});
    if (!validation.valid) {
      logger.warn(`[NotificationState] Mark as read validation: ${validation.reason}`);
    }

    // 2. Handle mark as read side effects (UI broadcast)
    await this.markAsReadModule.handle(updatedNotification, user);

    // 3. Audit log
    await this.auditModule.logMarkAsRead(notificationId, updatedNotification, user);
  }

  /**
   * Side effect after a notification is marked as unread
   * Called from NotificationSubscriber.afterUpdate
   * @param {number} notificationId
   * @param {Notification} updatedNotification
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onMarkAsUnread(notificationId, updatedNotification, user = "system", queryRunner = null) {
    logger.info(`[NotificationState] ✅ Notification #${notificationId} marked as unread by ${user}`);

    // 1. Validate mark as unread (placeholder for future)
    const validation = this.statusModule.validateMarkAsUnread(updatedNotification, {});
    if (!validation.valid) {
      logger.warn(`[NotificationState] Mark as unread validation: ${validation.reason}`);
    }

    // 2. Handle mark as unread side effects (UI broadcast)
    await this.markAsUnreadModule.handle(updatedNotification, user);

    // 3. Audit log
    await this.auditModule.logMarkAsUnread(notificationId, updatedNotification, user);
  }

  /**
   * Side effect after a notification is updated (generic)
   * Called from NotificationSubscriber.afterUpdate for other field changes
   * @param {number} notificationId
   * @param {Notification} updatedNotification
   * @param {Object} changes
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onUpdate(notificationId, updatedNotification, changes, user = "system", queryRunner = null) {
    logger.info(`[NotificationState] ✅ Notification #${notificationId} updated (fields: ${Object.keys(changes).join(", ")}) by ${user}`);

    // 1. Handle update side effects (UI broadcast)
    await this.updatedModule.handle(updatedNotification, changes, user);

    // 2. Audit log
    await this.auditModule.logUpdated(notificationId, changes, updatedNotification, user);
  }

  /**
   * Side effect after a notification is soft-deleted
   * Called from NotificationSubscriber.afterRemove
   * @param {number} notificationId
   * @param {Notification} notification
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onDelete(notificationId, notification, user = "system", queryRunner = null) {
    logger.info(`[NotificationState] ✅ Notification #${notificationId} soft-deleted by ${user}`);

    // 1. Validate deletion (placeholder for future)
    const validation = this.statusModule.validateDelete(notification, {});
    if (!validation.valid) {
      logger.warn(`[NotificationState] Deletion validation: ${validation.reason}`);
    }

    // 2. Handle deletion side effects (UI broadcast)
    await this.deletedModule.handle(notificationId, notification, user);

    // 3. Audit log
    await this.auditModule.logDeleted(notificationId, notification, user);
  }

  /**
   * Side effect after a notification is restored
   * @param {number} notificationId
   * @param {Notification} restoredNotification
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onRestore(notificationId, restoredNotification, user = "system", queryRunner = null) {
    logger.info(`[NotificationState] ✅ Notification #${notificationId} restored by ${user}`);

    // 1. Handle restoration side effects (UI broadcast)
    await this.restoredModule.handle(restoredNotification, user);

    // 2. Audit log
    await this.auditModule.logRestored(notificationId, restoredNotification, user);
  }

  /**
   * Side effect after all notifications for a user are marked as read
   * @param {number} userId
   * @param {Notification[]} updatedNotifications
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onMarkAllAsRead(userId, updatedNotifications, user = "system", queryRunner = null) {
    const count = updatedNotifications.length;
    logger.info(`[NotificationState] ✅ Marked ${count} notifications as read for user #${userId} by ${user}`);

    // 1. Handle mark all as read side effects (UI broadcast)
    await this.markAllAsReadModule.handle(userId, updatedNotifications, user);

    // 2. Audit log
    if (count > 0) {
      await this.auditModule.logMarkAllAsRead(userId, count, user);
    }
  }

  /**
   * Side effect after all notifications for a user are marked as unread
   * @param {number} userId
   * @param {Notification[]} updatedNotifications
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onMarkAllAsUnread(userId, updatedNotifications, user = "system", queryRunner = null) {
    const count = updatedNotifications.length;
    logger.info(`[NotificationState] ✅ Marked ${count} notifications as unread for user #${userId} by ${user}`);

    // 1. Handle mark all as unread side effects (UI broadcast)
    await this.markAllAsUnreadModule.handle(userId, updatedNotifications, user);

    // 2. Audit log
    if (count > 0) {
      await this.auditModule.logMarkAllAsUnread(userId, count, user);
    }
  }

  /**
   * Side effect after all read notifications for a user are soft-deleted
   * @param {number} userId
   * @param {number[]} deletedIds
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async onDeleteAllRead(userId, deletedIds, user = "system", queryRunner = null) {
    const count = deletedIds.length;
    logger.info(`[NotificationState] ✅ Deleted ${count} read notifications for user #${userId} by ${user}`);

    // 1. Handle delete all read side effects (UI broadcast)
    await this.deleteAllReadModule.handle(userId, deletedIds, user);

    // 2. Audit log
    if (count > 0) {
      await this.auditModule.logDeleteAllRead(userId, count, deletedIds, user);
    }
  }
}

module.exports = { NotificationStateService };