// src/stateServices/Notification.js
//@ts-check
const { logger } = require("../utils/logger");
const auditLogger = require("../utils/auditLogger");
const Notification = require("../entities/Notification");
const NotificationLog = require("../entities/NotificationLog");
const notificationService = require("../services/Notification");
const system = require("../utils/system"); // ✅ ADDED - for flexible settings

// ❌ REMOVED hardcoded functions:
// const emailEnabled = async () => true;
// const smsEnabled = async () => true;
// const inAppNotificationsEnabled = async () => true;
// const companyName = async () => "Meatify Shop";

/**
 * NotificationStateService handles state transitions and side effects for notifications.
 * It does NOT contain CRUD operations – those belong to NotificationService.
 * All methods here manage marking as read/unread and sending notifications via email/SMS.
 */
class NotificationStateService {
  /**
   * @param {import("typeorm").DataSource} dataSource
   */
  constructor(dataSource) {
    this.dataSource = dataSource;
    this.notificationRepo = dataSource.getRepository(Notification);
    this.notificationLogRepo = dataSource.getRepository(NotificationLog);
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
   * Mark a notification as read
   * @param {number} notificationId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async markAsRead(notificationId, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const repo = this._getRepo(queryRunner, Notification);

    const notification = await repo.findOne({ where: { id: notificationId } });
    if (!notification) {
      throw new Error(`Notification with ID ${notificationId} not found`);
    }

    if (notification.isRead) {
      logger.warn(`[NotificationState] Notification #${notificationId} is already read`);
      return notification;
    }

    const oldStatus = notification.isRead;
    notification.isRead = true;
    notification.updatedAt = new Date();

    const updated = await updateDb(repo, notification, { queryRunner, skipSignal: false });

    await auditLogger.logUpdate(
      "Notification",
      notificationId,
      { isRead: oldStatus },
      { isRead: true },
      user
    );

    logger.info(`[NotificationState] Notification #${notificationId} marked as read`);
    return updated;
  }

  /**
   * Mark a notification as unread
   * @param {number} notificationId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async markAsUnread(notificationId, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const repo = this._getRepo(queryRunner, Notification);

    const notification = await repo.findOne({ where: { id: notificationId } });
    if (!notification) {
      throw new Error(`Notification with ID ${notificationId} not found`);
    }

    if (!notification.isRead) {
      logger.warn(`[NotificationState] Notification #${notificationId} is already unread`);
      return notification;
    }

    const oldStatus = notification.isRead;
    notification.isRead = false;
    notification.updatedAt = new Date();

    const updated = await updateDb(repo, notification, { queryRunner, skipSignal: false });

    await auditLogger.logUpdate(
      "Notification",
      notificationId,
      { isRead: oldStatus },
      { isRead: false },
      user
    );

    logger.info(`[NotificationState] Notification #${notificationId} marked as unread`);
    return updated;
  }

  /**
   * Mark all notifications for a user as read
   * @param {number} userId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async markAllAsRead(userId, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const repo = this._getRepo(queryRunner, Notification);

    const unreadNotifications = await repo
      .createQueryBuilder("notification")
      .where("notification.userId = :userId", { userId })
      .andWhere("notification.isRead = false")
      .andWhere("notification.deletedAt IS NULL")
      .getMany();

    if (unreadNotifications.length === 0) {
      logger.info(`[NotificationState] No unread notifications for user #${userId}`);
      return { count: 0, notifications: [] };
    }

    const updatedNotifications = [];
    for (const notification of unreadNotifications) {
      const oldStatus = notification.isRead;
      notification.isRead = true;
      notification.updatedAt = new Date();
      const updated = await updateDb(repo, notification, { queryRunner, skipSignal: false });
      updatedNotifications.push(updated);

      await auditLogger.logUpdate(
        "Notification",
        notification.id,
        { isRead: oldStatus },
        { isRead: true },
        user
      );
    }

    logger.info(`[NotificationState] Marked ${updatedNotifications.length} notifications as read for user #${userId}`);
    return { count: updatedNotifications.length, notifications: updatedNotifications };
  }

  /**
   * Mark all notifications for a user as unread
   * @param {number} userId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async markAllAsUnread(userId, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const repo = this._getRepo(queryRunner, Notification);

    const readNotifications = await repo
      .createQueryBuilder("notification")
      .where("notification.userId = :userId", { userId })
      .andWhere("notification.isRead = true")
      .andWhere("notification.deletedAt IS NULL")
      .getMany();

    if (readNotifications.length === 0) {
      logger.info(`[NotificationState] No read notifications for user #${userId}`);
      return { count: 0, notifications: [] };
    }

    const updatedNotifications = [];
    for (const notification of readNotifications) {
      const oldStatus = notification.isRead;
      notification.isRead = false;
      notification.updatedAt = new Date();
      const updated = await updateDb(repo, notification, { queryRunner, skipSignal: false });
      updatedNotifications.push(updated);

      await auditLogger.logUpdate(
        "Notification",
        notification.id,
        { isRead: oldStatus },
        { isRead: false },
        user
      );
    }

    logger.info(`[NotificationState] Marked ${updatedNotifications.length} notifications as unread for user #${userId}`);
    return { count: updatedNotifications.length, notifications: updatedNotifications };
  }

  /**
   * Delete all read notifications for a user (soft delete)
   * @param {number} userId
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async deleteAllRead(userId, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const repo = this._getRepo(queryRunner, Notification);

    const readNotifications = await repo
      .createQueryBuilder("notification")
      .where("notification.userId = :userId", { userId })
      .andWhere("notification.isRead = true")
      .andWhere("notification.deletedAt IS NULL")
      .getMany();

    if (readNotifications.length === 0) {
      logger.info(`[NotificationState] No read notifications to delete for user #${userId}`);
      return { count: 0 };
    }

    for (const notification of readNotifications) {
      const oldData = { ...notification };
      notification.deletedAt = new Date();
      notification.updatedAt = new Date();
      await updateDb(repo, notification, { queryRunner, skipSignal: false });

      await auditLogger.debugDelete("Notification", notification.id, oldData, user);
    }

    logger.info(`[NotificationState] Deleted ${readNotifications.length} read notifications for user #${userId}`);
    return { count: readNotifications.length };
  }

  /**
   * Send an in-app notification
   * @param {Object} data - { userId, title, message, type?, metadata? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async sendInApp(data, user = "system", queryRunner = null) {
    // ✅ Use system setting instead of hardcoded value
    const enabled = await system.inAppNotificationsEnabled();
    if (!enabled) {
      logger.info(`[NotificationState] In-app notifications disabled, skipping`);
      return null;
    }

    return await notificationService.create(data, user, queryRunner);
  }

  /**
   * Send an email notification (queued via NotificationLog)
   * @param {Object} data - { to, subject, html, text, metadata? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async sendEmail(data, user = "system", queryRunner = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    // ✅ Use system setting instead of hardcoded value
    const enabled = await system.emailEnabled();
    if (!enabled) {
      logger.info(`[NotificationState] Email notifications disabled, skipping`);
      return null;
    }

    if (!data.to) throw new Error("Email recipient (to) is required");
    if (!data.subject) throw new Error("Email subject is required");
    if (!data.html && !data.text) throw new Error("Email body (html or text) is required");

    const repo = this._getRepo(queryRunner, NotificationLog);

    const log = repo.create({
      recipient_email: data.to,
      subject: data.subject,
      payload: data.html || data.text || "",
      status: "queued",
      retry_count: 0,
      resend_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const saved = await saveDb(repo, log, { queryRunner });
    await auditLogger.logCreate("NotificationLog", saved.id, saved, user);

    logger.info(`[NotificationState] Email queued for ${data.to}: ${data.subject}`);

    // Note: Actual sending will be handled by a cron job or queue worker
    // For now, we just queue it

    return saved;
  }

  /**
   * Send an SMS notification (queued via NotificationLog)
   * @param {Object} data - { to, message, metadata? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async sendSms(data, user = "system", queryRunner = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    // ✅ Use system setting instead of hardcoded value
    const enabled = await system.smsEnabled();
    if (!enabled) {
      logger.info(`[NotificationState] SMS notifications disabled, skipping`);
      return null;
    }

    if (!data.to) throw new Error("SMS recipient (to) is required");
    if (!data.message) throw new Error("SMS message is required");

    const repo = this._getRepo(queryRunner, NotificationLog);

    const log = repo.create({
      recipient_email: data.to, // Using email field for phone number
      subject: "SMS Notification",
      payload: data.message,
      status: "queued",
      retry_count: 0,
      resend_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const saved = await saveDb(repo, log, { queryRunner });
    await auditLogger.logCreate("NotificationLog", saved.id, saved, user);

    logger.info(`[NotificationState] SMS queued for ${data.to}: ${data.message}`);

    // Note: Actual sending will be handled by a cron job or queue worker
    // For now, we just queue it

    return saved;
  }

  /**
   * Send a combined notification (in-app + email + SMS) based on settings
   * @param {Object} data - { userId, title, message, type?, metadata?, email?, sms? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async sendNotification(data, user = "system", queryRunner = null) {
    const results = {
      inApp: null,
      email: null,
      sms: null,
    };

    // Send in-app notification
    if (data.userId) {
      results.inApp = await this.sendInApp(
        {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          metadata: data.metadata,
        },
        user,
        queryRunner
      );
    }

    // Send email if requested - ✅ Uses system setting via sendEmail()
    if (data.email) {
      // ✅ Use system for company name
      const company = await system.companyName();
      results.email = await this.sendEmail(
        {
          to: data.email,
          subject: data.title,
          html: data.message,
          text: data.message,
          metadata: data.metadata,
        },
        user,
        queryRunner
      );
    }

    // Send SMS if requested - ✅ Uses system setting via sendSms()
    if (data.sms) {
      results.sms = await this.sendSms(
        {
          to: data.sms,
          message: data.message,
          metadata: data.metadata,
        },
        user,
        queryRunner
      );
    }

    return results;
  }

  /**
   * Bulk send notifications to multiple recipients
   * @param {Array<Object>} notificationsArray - Array of { userId, title, message, type?, metadata?, email?, sms? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async bulkSendNotifications(notificationsArray, user = "system", queryRunner = null) {
    const results = { sent: [], errors: [] };

    for (const data of notificationsArray) {
      try {
        const result = await this.sendNotification(data, user, queryRunner);
        results.sent.push({ data, result });
      } catch (err) {
        results.errors.push({ data, error: err.message });
      }
    }

    return results;
  }

  /**
   * Retry failed email logs (called by cron job)
   * @param {number} limit - Max number to retry
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async retryFailedEmails(limit = 100, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const repo = this._getRepo(queryRunner, NotificationLog);

    const failedLogs = await repo
      .createQueryBuilder("log")
      .where("log.status = 'failed'")
      .andWhere("log.retry_count < 3")
      .orderBy("log.created_at", "ASC")
      .limit(limit)
      .getMany();

    const results = { retried: [], failed: [] };

    for (const log of failedLogs) {
      try {
        // Simulate sending email
        // In real implementation, this would call emailSender.send()
        const success = true; // Simulate success

        const oldStatus = log.status;
        if (success) {
          log.status = "sent";
          log.sent_at = new Date();
          log.error_message = null;
          log.last_error_at = null;
        } else {
          log.status = "failed";
          log.last_error_at = new Date();
          log.error_message = "Retry failed";
        }
        log.retry_count += 1;
        log.updated_at = new Date();

        await updateDb(repo, log, { queryRunner, skipSignal: false });

        await auditLogger.logUpdate(
          "NotificationLog",
          log.id,
          { status: oldStatus },
          { status: log.status },
          user
        );

        if (success) {
          results.retried.push(log);
          logger.info(`[NotificationState] Email #${log.id} retried successfully`);
        } else {
          results.failed.push(log);
          logger.warn(`[NotificationState] Email #${log.id} retry failed`);
        }
      } catch (err) {
        results.failed.push(log);
        logger.error(`[NotificationState] Error retrying email #${log.id}:`, err);
      }
    }

    return results;
  }

  /**
   * Clean up old notifications (soft delete)
   * @param {number} daysOld - Delete notifications older than this
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} queryRunner
   */
  async cleanOldNotifications(daysOld = 90, user = "system", queryRunner = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const repo = this._getRepo(queryRunner, Notification);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const oldNotifications = await repo
      .createQueryBuilder("notification")
      .where("notification.createdAt < :cutoffDate", { cutoffDate })
      .andWhere("notification.isRead = true")
      .andWhere("notification.deletedAt IS NULL")
      .getMany();

    if (oldNotifications.length === 0) {
      logger.info(`[NotificationState] No old notifications to clean up`);
      return { count: 0 };
    }

    for (const notification of oldNotifications) {
      const oldData = { ...notification };
      notification.deletedAt = new Date();
      notification.updatedAt = new Date();
      await updateDb(repo, notification, { queryRunner, skipSignal: false });

      await auditLogger.debugDelete("Notification", notification.id, oldData, user);
    }

    logger.info(`[NotificationState] Cleaned up ${oldNotifications.length} old notifications`);
    return { count: oldNotifications.length };
  }
}

module.exports = { NotificationStateService };