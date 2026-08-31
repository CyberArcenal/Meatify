// src/services/Notification.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");
const { logger } = require("../utils/logger");
const system = require("../utils/system");
const { SettingType } = require("../entities/systemSettings");

/**
 * Allowed columns for sorting (prevents SQL injection)
 */
const ALLOWED_SORT_COLUMNS = new Set([
  "id",
  "userId",
  "title",
  "message",
  "type",
  "isRead",
  "createdAt",
  "updatedAt",
]);

class NotificationService {
  constructor() {
    this.notificationRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const Notification = require("../entities/Notification");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.notificationRepository = AppDataSource.getRepository(Notification);
    logger.debug("NotificationService initialized");
  }

  async getRepository() {
    if (!this.notificationRepository) {
      await this.initialize();
    }
    return this.notificationRepository;
  }

  /**
   * Helper: get a repository (transactional if queryRunner provided)
   */
  _getRepo(qr, entityClass) {
    const qrType = qr === null ? "null" : qr === undefined ? "undefined" : typeof qr;
    const hasManager = qr && typeof qr === "object" && !!qr.manager;
    logger.debug(`[Notification._getRepo] qr type: ${qrType}, has manager: ${hasManager}`);

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    logger.debug(`[Notification._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  // ============================================================
  // 🔍 READ-ONLY METHODS
  // ============================================================

  async findById(id, includeDeleted = false, qr = null) {
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    const queryBuilder = repo
      .createQueryBuilder("notification")
      .where("notification.id = :id", { id });

    if (!includeDeleted) {
      queryBuilder.andWhere("notification.deletedAt IS NULL");
    }

    const notification = await queryBuilder.getOne();
    if (!notification) {
      throw new Error(`Notification with ID ${id} not found`);
    }
    return notification;
  }

  async findAll(options = {}, qr = null) {
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    const qb = repo.createQueryBuilder("notification");

    if (!options.includeDeleted) {
      qb.andWhere("notification.deletedAt IS NULL");
    }

    if (!options.startDate && !options.endDate && !options.ignoreRetention) {
      const retentionDays = await this._getNotificationRetentionDays(qr);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      qb.andWhere("notification.createdAt >= :cutoffDate", { cutoffDate });
    }

    if (options.userId) {
      qb.andWhere("notification.userId = :userId", { userId: options.userId });
    }
    if (options.isRead !== undefined) {
      qb.andWhere("notification.isRead = :isRead", { isRead: options.isRead });
    }
    if (options.type) {
      const types = Array.isArray(options.type) ? options.type : [options.type];
      const allowedTypes = await this._getAllowedNotificationTypes(qr);
      const invalidTypes = types.filter(t => !allowedTypes.includes(t));
      if (invalidTypes.length > 0) {
        logger.warn(`[Notification] Invalid types: ${invalidTypes.join(", ")}. Allowed: ${allowedTypes.join(", ")}`);
      }
      qb.andWhere("notification.type IN (:...types)", { types });
    }
    if (options.startDate) {
      qb.andWhere("notification.createdAt >= :startDate", { startDate: new Date(options.startDate) });
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere("notification.createdAt <= :endDate", { endDate: end });
    }
    if (options.search) {
      qb.andWhere(
        "(notification.title LIKE :search OR notification.message LIKE :search OR notification.type LIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    let sortBy = options.sortBy || "createdAt";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      sortBy = "createdAt";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`notification.${sortBy}`, sortOrder);

    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    return result;
  }

  async getStatistics(qr = null) {
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    const retentionDays = await this._getNotificationRetentionDays(qr);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const qb = repo
      .createQueryBuilder("notification")
      .where("notification.deletedAt IS NULL")
      .andWhere("notification.createdAt >= :cutoffDate", { cutoffDate });

    const byType = await qb
      .clone()
      .select("notification.type", "type")
      .addSelect("COUNT(*)", "count")
      .groupBy("notification.type")
      .getRawMany();

    const readCount = await qb.clone().where("notification.isRead = true").getCount();
    const unreadCount = await qb.clone().where("notification.isRead = false").getCount();
    const total = await qb.clone().getCount();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7Days = await qb
      .clone()
      .where("notification.createdAt >= :sevenDaysAgo", { sevenDaysAgo })
      .getCount();

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const last24Hours = await qb
      .clone()
      .where("notification.createdAt >= :oneDayAgo", { oneDayAgo })
      .getCount();

    const byUser = await qb
      .clone()
      .select("notification.userId", "userId")
      .addSelect("COUNT(*)", "count")
      .groupBy("notification.userId")
      .orderBy("count", "DESC")
      .limit(5)
      .getRawMany();

    const allowedTypes = await this._getAllowedNotificationTypes(qr);
    const maxTitleLength = await this._getMaxTitleLength(qr);
    const maxMessageLength = await this._getMaxMessageLength(qr);

    return {
      total,
      read: readCount,
      unread: unreadCount,
      byType: byType.reduce((acc, row) => {
        acc[row.type] = parseInt(row.count, 10);
        return acc;
      }, {}),
      last7Days,
      last24Hours,
      topUsers: byUser,
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      allowedTypes,
      maxTitleLength,
      maxMessageLength,
    };
  }

  async getByUser(userId, options = {}, qr = null) {
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    const { limit = 50, includeRead = false } = options;

    const queryBuilder = repo
      .createQueryBuilder("notification")
      .where("notification.userId = :userId", { userId })
      .andWhere("notification.deletedAt IS NULL")
      .orderBy("notification.createdAt", "DESC")
      .limit(limit);

    if (!includeRead) {
      queryBuilder.andWhere("notification.isRead = false");
    }

    const notifications = await queryBuilder.getMany();

    const totalCount = await repo.count({
      where: { userId, deletedAt: null },
    });

    const unreadCount = await repo.count({
      where: { userId, isRead: false, deletedAt: null },
    });

    return {
      notifications,
      summary: {
        total: totalCount,
        unread: unreadCount,
        read: totalCount - unreadCount,
      },
    };
  }

  async getRetentionInfo(qr = null) {
    const retentionDays = await this._getNotificationRetentionDays(qr);
    const inAppEnabled = await this._isInAppNotificationsEnabled(qr);
    const auditEnabled = await this._isAuditEnabled(qr);

    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const totalNotifications = await repo.count({ where: { deletedAt: null } });
    const oldNotifications = await repo
      .createQueryBuilder("notification")
      .where("notification.createdAt < :cutoffDate", { cutoffDate })
      .andWhere("notification.isRead = true")
      .andWhere("notification.deletedAt IS NULL")
      .getCount();

    const allowedTypes = await this._getAllowedNotificationTypes(qr);
    const maxTitleLength = await this._getMaxTitleLength(qr);
    const maxMessageLength = await this._getMaxMessageLength(qr);

    return {
      inAppEnabled,
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      totalNotifications,
      notificationsToDelete: oldNotifications,
      allowedTypes,
      maxTitleLength,
      maxMessageLength,
      auditEnabled,
    };
  }

  // ============================================================
  // ✏️ WRITE OPERATIONS (CRUD)
  // ============================================================

  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    try {
      const inAppEnabled = await this._isInAppNotificationsEnabled(qr);
      if (!inAppEnabled) {
        logger.debug("[Notification] In-app notifications are disabled, skipping creation");
        return null;
      }

      if (!data.title) throw new Error("title is required");
      if (!data.message) throw new Error("message is required");
      if (!data.userId) throw new Error("userId is required");

      const maxTitleLength = await this._getMaxTitleLength(qr);
      if (data.title.length > maxTitleLength) {
        throw new Error(`Title cannot exceed ${maxTitleLength} characters`);
      }

      const maxMessageLength = await this._getMaxMessageLength(qr);
      if (data.message.length > maxMessageLength) {
        throw new Error(`Message cannot exceed ${maxMessageLength} characters`);
      }

      const allowedTypes = await this._getAllowedNotificationTypes(qr);
      let notificationType = data.type || await this._getDefaultNotificationType(qr);
      if (!allowedTypes.includes(notificationType)) {
        logger.warn(`[Notification] Invalid type "${notificationType}", defaulting to "info"`);
        notificationType = "info";
      }

      let metadata = data.metadata || null;
      if (metadata && typeof metadata === "object") {
        try {
          metadata = JSON.stringify(metadata);
        } catch {
          logger.warn("[Notification] Failed to stringify metadata, using null");
          metadata = null;
        }
      }

      const notification = repo.create({
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: notificationType,
        isRead: false,
        metadata: metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await saveDb(repo, notification, { queryRunner: qr });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logCreate("Notification", saved.id, saved, user);
      }

      logger.debug(`Notification created: #${saved.id} - ${saved.title}`);
      return saved;
    } catch (error) {
      console.error("Failed to create notification:", error.message);
      throw error;
    }
  }

  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    try {
      const existing = await repo.findOne({ where: { id } });
      if (!existing) {
        throw new Error(`Notification with ID ${id} not found`);
      }

      const oldData = { ...existing };

      if (data.isRead !== undefined) {
        throw new Error("Use markAsRead/markAsUnread to update isRead status");
      }
      if (data.userId !== undefined) {
        throw new Error("Cannot update userId");
      }

      if (data.title) {
        const maxTitleLength = await this._getMaxTitleLength(qr);
        if (data.title.length > maxTitleLength) {
          throw new Error(`Title cannot exceed ${maxTitleLength} characters`);
        }
      }

      if (data.message) {
        const maxMessageLength = await this._getMaxMessageLength(qr);
        if (data.message.length > maxMessageLength) {
          throw new Error(`Message cannot exceed ${maxMessageLength} characters`);
        }
      }

      if (data.type) {
        const allowedTypes = await this._getAllowedNotificationTypes(qr);
        if (!allowedTypes.includes(data.type)) {
          throw new Error(
            `Invalid notification type: "${data.type}". Allowed: ${allowedTypes.join(", ")}`
          );
        }
      }

      if (data.metadata !== undefined) {
        if (data.metadata && typeof data.metadata === "object") {
          try {
            data.metadata = JSON.stringify(data.metadata);
          } catch {
            logger.warn("[Notification] Failed to stringify metadata, setting to null");
            data.metadata = null;
          }
        }
      }

      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing, { queryRunner: qr });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate("Notification", id, oldData, saved, user);
      }

      logger.debug(`Notification updated: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to update notification:", error.message);
      throw error;
    }
  }

  async delete(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    try {
      const notification = await repo.findOne({ where: { id } });
      if (!notification) {
        throw new Error(`Notification with ID ${id} not found`);
      }

      if (notification.deletedAt) {
        throw new Error(`Notification #${id} is already deleted`);
      }

      const oldData = { ...notification };
      notification.deletedAt = new Date();
      notification.updatedAt = new Date();

      const saved = await updateDb(repo, notification, { queryRunner: qr });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logCreate("Notification", id, oldData, user);
      }

      logger.debug(`Notification soft deleted: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to delete notification:", error.message);
      throw error;
    }
  }

  async restore(id, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    try {
      const notification = await repo.findOne({ where: { id }, withDeleted: true });
      if (!notification) {
        throw new Error(`Notification with ID ${id} not found`);
      }

      if (!notification.deletedAt) {
        throw new Error(`Notification #${id} is not deleted`);
      }

      const oldData = { ...notification };
      notification.deletedAt = null;
      notification.updatedAt = new Date();

      const saved = await updateDb(repo, notification, { queryRunner: qr });

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate("Notification", id, oldData, saved, user);
      }

      logger.debug(`Notification restored: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to restore notification:", error.message);
      throw error;
    }
  }

  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    const notification = await repo.findOne({ where: { id }, withDeleted: true });
    if (!notification) {
      throw new Error(`Notification with ID ${id} not found`);
    }

    await removeDb(repo, notification, { queryRunner: qr });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logCreate("Notification", id, notification, user);
    }

    logger.debug(`Notification #${id} permanently deleted`);
  }

  // ============================================================
  // 📤 EXPORT & BULK OPERATIONS
  // ============================================================

  async exportNotifications(format = "json", filters = {}, user = "system", qr = null) {
    try {
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined, ignoreRetention: true }, qr);
      const notifications = result.data;

      let exportData;
      if (format === "csv") {
        const headers = [
          "ID", "User ID", "Title", "Message", "Type",
          "Is Read", "Metadata", "Created At", "Updated At",
        ];
        const rows = notifications.map((n) => [
          n.id, n.userId, n.title, n.message, n.type,
          n.isRead ? "Yes" : "No",
          n.metadata ? JSON.stringify(n.metadata) : "",
          new Date(n.createdAt).toLocaleString(),
          n.updatedAt ? new Date(n.updatedAt).toLocaleString() : "",
        ]);
        exportData = {
          format: "csv",
          data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
          filename: `notifications_export_${new Date().toISOString().split("T")[0]}.csv`,
        };
      } else {
        exportData = {
          format: "json",
          data: notifications,
          filename: `notifications_export_${new Date().toISOString().split("T")[0]}.json`,
        };
      }

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.debugExport("Notification", format, filters, user);
      }

      logger.debug(`Exported ${notifications.length} notifications in ${format} format`);
      return exportData;
    } catch (error) {
      console.error("Failed to export notifications:", error);
      throw error;
    }
  }

  async bulkCreate(notificationsArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of notificationsArray) {
      try {
        const saved = await this.create(data, user, qr);
        if (saved) {
          results.created.push(saved);
        }
      } catch (err) {
        results.errors.push({ notification: data, error: err.message });
      }
    }
    return results;
  }

  async importFromCSV(filePath, user = "system", qr = null) {
    const fs = require("fs").promises;
    const csv = require("csv-parse/sync");
    const fileContent = await fs.readFile(filePath, "utf-8");
    const records = csv.parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const results = { imported: [], errors: [] };
    for (const record of records) {
      try {
        const data = {
          userId: parseInt(record.userId, 10),
          title: record.title,
          message: record.message,
          type: record.type || "info",
          metadata: record.metadata ? JSON.parse(record.metadata) : null,
        };
        if (!data.userId || !data.title || !data.message) {
          throw new Error("userId, title, and message are required");
        }
        const saved = await this.create(data, user, qr);
        if (saved) {
          results.imported.push(saved);
        }
      } catch (err) {
        results.errors.push({ row: record, error: err.message });
      }
    }
    return results;
  }

  // ============================================================
  // 🧹 CLEANUP
  // ============================================================

  async cleanOldNotifications(daysOld = null, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    if (daysOld === null) {
      daysOld = await this._getNotificationRetentionDays(qr);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const oldNotifications = await repo
      .createQueryBuilder("notification")
      .where("notification.createdAt < :cutoffDate", { cutoffDate })
      .andWhere("notification.isRead = true")
      .andWhere("notification.deletedAt IS NULL")
      .getMany();

    if (oldNotifications.length === 0) {
      logger.info(`[Notification] No old notifications to clean up (threshold: ${daysOld} days)`);
      return { count: 0 };
    }

    let updatedCount = 0;
    for (const notification of oldNotifications) {
      try {
        const oldData = { ...notification };
        notification.deletedAt = new Date();
        notification.updatedAt = new Date();
        await updateDb(repo, notification, { queryRunner: qr, skipSignal: true });

        const auditEnabled = await this._isAuditEnabled(qr);
        if (auditEnabled) {
          await auditLogger.logCreate("Notification", notification.id, oldData, user);
        }

        updatedCount++;
        logger.debug(`[Notification] Soft deleted notification #${notification.id} (older than ${daysOld} days)`);
      } catch (err) {
        logger.error(`[Notification] Failed to clean notification #${notification.id}:`, err);
      }
    }

    logger.info(`[Notification] Cleaned up ${updatedCount} old notifications (older than ${daysOld} days)`);
    return { count: updatedCount };
  }

  // ============================================================
  // ✏️ SETTER METHODS (update isRead)
  // ✅ These update the entity → dbActions triggers subscriber → subscriber calls state service
  // ============================================================

  async markAsRead(notificationId, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    const notification = await repo.findOne({ where: { id: notificationId } });
    if (!notification) {
      throw new Error(`Notification with ID ${notificationId} not found`);
    }

    if (notification.isRead) {
      logger.warn(`[Notification] Notification #${notificationId} is already read`);
      return notification;
    }

    notification.isRead = true;
    notification.updatedAt = new Date();

    const updated = await updateDb(repo, notification, { queryRunner: qr, skipSignal: false });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logUpdate(
        "Notification",
        notificationId,
        { isRead: false },
        { isRead: true },
        user
      );
    }

    logger.debug(`[Notification] Notification #${notificationId} marked as read (subscriber will trigger side effects)`);
    return updated;
  }

  async markAsUnread(notificationId, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    const notification = await repo.findOne({ where: { id: notificationId } });
    if (!notification) {
      throw new Error(`Notification with ID ${notificationId} not found`);
    }

    if (!notification.isRead) {
      logger.warn(`[Notification] Notification #${notificationId} is already unread`);
      return notification;
    }

    notification.isRead = false;
    notification.updatedAt = new Date();

    const updated = await updateDb(repo, notification, { queryRunner: qr, skipSignal: false });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logUpdate(
        "Notification",
        notificationId,
        { isRead: true },
        { isRead: false },
        user
      );
    }

    logger.debug(`[Notification] Notification #${notificationId} marked as unread (subscriber will trigger side effects)`);
    return updated;
  }

  async markAllAsRead(userId, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    const unreadNotifications = await repo
      .createQueryBuilder("notification")
      .where("notification.userId = :userId", { userId })
      .andWhere("notification.isRead = false")
      .andWhere("notification.deletedAt IS NULL")
      .getMany();

    if (unreadNotifications.length === 0) {
      logger.info(`[Notification] No unread notifications for user #${userId}`);
      return { count: 0, notifications: [] };
    }

    const updatedNotifications = [];
    for (const notification of unreadNotifications) {
      notification.isRead = true;
      notification.updatedAt = new Date();
      const updated = await updateDb(repo, notification, { queryRunner: qr, skipSignal: false });
      updatedNotifications.push(updated);

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate(
          "Notification",
          notification.id,
          { isRead: false },
          { isRead: true },
          user
        );
      }
    }

    logger.debug(`[Notification] Marked ${updatedNotifications.length} notifications as read for user #${userId} (subscriber will trigger side effects)`);
    return { count: updatedNotifications.length, notifications: updatedNotifications };
  }

  async markAllAsUnread(userId, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    const readNotifications = await repo
      .createQueryBuilder("notification")
      .where("notification.userId = :userId", { userId })
      .andWhere("notification.isRead = true")
      .andWhere("notification.deletedAt IS NULL")
      .getMany();

    if (readNotifications.length === 0) {
      logger.info(`[Notification] No read notifications for user #${userId}`);
      return { count: 0, notifications: [] };
    }

    const updatedNotifications = [];
    for (const notification of readNotifications) {
      notification.isRead = false;
      notification.updatedAt = new Date();
      const updated = await updateDb(repo, notification, { queryRunner: qr, skipSignal: false });
      updatedNotifications.push(updated);

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logUpdate(
          "Notification",
          notification.id,
          { isRead: true },
          { isRead: false },
          user
        );
      }
    }

    logger.debug(`[Notification] Marked ${updatedNotifications.length} notifications as unread for user #${userId} (subscriber will trigger side effects)`);
    return { count: updatedNotifications.length, notifications: updatedNotifications };
  }

  async deleteAllRead(userId, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    const readNotifications = await repo
      .createQueryBuilder("notification")
      .where("notification.userId = :userId", { userId })
      .andWhere("notification.isRead = true")
      .andWhere("notification.deletedAt IS NULL")
      .getMany();

    if (readNotifications.length === 0) {
      logger.info(`[Notification] No read notifications to delete for user #${userId}`);
      return { count: 0 };
    }

    const deletedIds = [];
    for (const notification of readNotifications) {
      const oldData = { ...notification };
      notification.deletedAt = new Date();
      notification.updatedAt = new Date();
      await updateDb(repo, notification, { queryRunner: qr, skipSignal: false });
      deletedIds.push(notification.id);

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.logCreate("Notification", notification.id, oldData, user);
      }
    }

    logger.debug(`[Notification] Deleted ${deletedIds.length} read notifications for user #${userId} (subscriber will trigger side effects)`);
    return { count: readNotifications.length };
  }

  // ============================================================
  // ✅ METHOD: Send an in-app notification (uses create)
  // ============================================================

  async sendInApp(data, user = "system", qr = null) {
    const enabled = await system.inAppNotificationsEnabled();
    if (!enabled) {
      logger.info(`[Notification] In-app notifications disabled, skipping`);
      return null;
    }
    return this.create(data, user, qr);
  }

  // ============================================================
  // 🔒 PRIVATE HELPER METHODS
  // ============================================================

  async _isAuditEnabled(qr = null) {
    try {
      return await system.auditLogEnabled();
    } catch (error) {
      logger.warn(`[Notification] Failed to check audit enabled status: ${error.message}, defaulting to true`);
      return true;
    }
  }

  async _isInAppNotificationsEnabled(qr = null) {
    try {
      return await system.inAppNotificationsEnabled();
    } catch (error) {
      logger.warn(`[Notification] Failed to check in-app notifications enabled: ${error.message}, defaulting to true`);
      return true;
    }
  }

  async _getAllowedNotificationTypes(qr = null) {
    try {
      return await system.getArray("allowed_notification_types", SettingType.NOTIFICATIONS, [
        "info", "success", "warning", "error", "purchase", "sale"
      ]);
    } catch (error) {
      logger.warn(`[Notification] Failed to get allowed notification types: ${error.message}, using defaults`);
      return ["info", "success", "warning", "error", "purchase", "sale"];
    }
  }

  async _getDefaultNotificationType(qr = null) {
    try {
      const defaultType = await system.getValue("default_notification_type", SettingType.NOTIFICATIONS, "info");
      const allowedTypes = await this._getAllowedNotificationTypes(qr);
      if (!allowedTypes.includes(defaultType)) {
        logger.warn(`[Notification] Invalid default type "${defaultType}", defaulting to "info"`);
        return "info";
      }
      return defaultType;
    } catch (error) {
      logger.warn(`[Notification] Failed to get default notification type: ${error.message}, defaulting to "info"`);
      return "info";
    }
  }

  async _getMaxTitleLength(qr = null) {
    try {
      return await system.getInt("max_notification_title_length", SettingType.NOTIFICATIONS, 255);
    } catch (error) {
      logger.warn(`[Notification] Failed to get max title length: ${error.message}, defaulting to 255`);
      return 255;
    }
  }

  async _getMaxMessageLength(qr = null) {
    try {
      return await system.getInt("max_notification_message_length", SettingType.NOTIFICATIONS, 1000);
    } catch (error) {
      logger.warn(`[Notification] Failed to get max message length: ${error.message}, defaulting to 1000`);
      return 1000;
    }
  }

  async _getNotificationRetentionDays(qr = null) {
    try {
      return await system.getInt("notification_retention_days", SettingType.NOTIFICATIONS, 90);
    } catch (error) {
      logger.warn(`[Notification] Failed to get notification retention days: ${error.message}, defaulting to 90`);
      return 90;
    }
  }
}

// Singleton instance
const notificationService = new NotificationService();
module.exports = notificationService;