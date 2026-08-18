// src/services/Notification.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");

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
    console.log("NotificationService initialized");
  }

  async getRepository() {
    if (!this.notificationRepository) {
      await this.initialize();
    }
    return this.notificationRepository;
  }

  /**
   * Helper: get a repository (transactional if queryRunner provided)
   * @param {import("typeorm").QueryRunner | null} qr
   * @param {Function} entityClass
   * @returns {import("typeorm").Repository<any>}
   */
  _getRepo(qr, entityClass) {
    const qrType =
      qr === null ? "null" : qr === undefined ? "undefined" : typeof qr;
    const hasManager = qr && typeof qr === "object" && !!qr.manager;
    console.log(
      `[Notification._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    console.log(`[Notification._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * Create a new notification
   * @param {Object} data - { userId, title, message, type?, metadata? }
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} qr - Optional transaction query runner
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    try {
      // Validate required fields
      if (!data.title) throw new Error("title is required");
      if (!data.message) throw new Error("message is required");
      if (!data.userId) throw new Error("userId is required");

      const notification = repo.create({
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type || "info",
        isRead: false,
        metadata: data.metadata || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saved = await saveDb(repo, notification, { queryRunner: qr });
      await auditLogger.logCreate("Notification", saved.id, saved, user);
      console.log(`Notification created: #${saved.id} - ${saved.title}`);
      return saved;
    } catch (error) {
      console.error("Failed to create notification:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing notification (only notes, type allowed)
   * @param {number} id
   * @param {Object} data - { title?, message?, type?, metadata? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
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

      // Prevent updating isRead through this method
      if (data.isRead !== undefined) {
        throw new Error("Use NotificationStateService to update isRead status");
      }

      // Prevent updating userId
      if (data.userId !== undefined) {
        throw new Error("Cannot update userId");
      }

      Object.assign(existing, data);
      existing.updatedAt = new Date();

      const saved = await updateDb(repo, existing, { queryRunner: qr });
      await auditLogger.logUpdate("Notification", id, oldData, saved, user);
      console.log(`Notification updated: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to update notification:", error.message);
      throw error;
    }
  }

  /**
   * Soft delete a notification
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
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
      await auditLogger.logDelete("Notification", id, oldData, user);
      console.log(`Notification soft deleted: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to delete notification:", error.message);
      throw error;
    }
  }

  /**
   * Restore a soft-deleted notification
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
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
      await auditLogger.logUpdate("Notification", id, oldData, saved, user);
      console.log(`Notification restored: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to restore notification:", error.message);
      throw error;
    }
  }

  /**
   * Permanently delete a notification (hard delete)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    const notification = await repo.findOne({ where: { id }, withDeleted: true });
    if (!notification) {
      throw new Error(`Notification with ID ${id} not found`);
    }

    await removeDb(repo, notification, { queryRunner: qr });
    await auditLogger.logDelete("Notification", id, notification, user);
    console.log(`Notification #${id} permanently deleted`);
  }

  /**
   * Find notification by ID
   * @param {number} id
   * @param {boolean} includeDeleted
   * @param {import("typeorm").QueryRunner | null} qr
   */
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
    await auditLogger.logView("Notification", id, "system");
    return notification;
  }

  /**
   * Find all notifications with filters, pagination, sorting
   * @param {Object} options
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findAll(options = {}, qr = null) {
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    const qb = repo.createQueryBuilder("notification");

    // Exclude soft-deleted by default
    if (!options.includeDeleted) {
      qb.andWhere("notification.deletedAt IS NULL");
    }

    // Filters
    if (options.userId) {
      qb.andWhere("notification.userId = :userId", { userId: options.userId });
    }
    if (options.isRead !== undefined) {
      qb.andWhere("notification.isRead = :isRead", { isRead: options.isRead });
    }
    if (options.type) {
      const types = Array.isArray(options.type) ? options.type : [options.type];
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

    // Sorting
    let sortBy = options.sortBy || "createdAt";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      console.warn(`[Notification] Invalid sortBy: ${sortBy}, falling back to createdAt`);
      sortBy = "createdAt";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`notification.${sortBy}`, sortOrder);

    // Pagination
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await auditLogger.logView("Notification", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get notification statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const Notification = require("../entities/Notification");
    const repo = this._getRepo(qr, Notification);

    const qb = repo
      .createQueryBuilder("notification")
      .where("notification.deletedAt IS NULL");

    // By type
    const byType = await qb
      .clone()
      .select("notification.type", "type")
      .addSelect("COUNT(*)", "count")
      .groupBy("notification.type")
      .getRawMany();

    // By read status
    const readCount = await qb
      .clone()
      .where("notification.isRead = true")
      .getCount();
    const unreadCount = await qb
      .clone()
      .where("notification.isRead = false")
      .getCount();

    // Total
    const total = await qb.clone().getCount();

    // Last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7Days = await qb
      .clone()
      .where("notification.createdAt >= :sevenDaysAgo", { sevenDaysAgo })
      .getCount();

    // Last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const last24Hours = await qb
      .clone()
      .where("notification.createdAt >= :oneDayAgo", { oneDayAgo })
      .getCount();

    // By userId (top users)
    const byUser = await qb
      .clone()
      .select("notification.userId", "userId")
      .addSelect("COUNT(*)", "count")
      .groupBy("notification.userId")
      .orderBy("count", "DESC")
      .limit(5)
      .getRawMany();

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
    };
  }

  /**
   * Export notifications to CSV or JSON
   * @param {string} format
   * @param {Object} filters
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async exportNotifications(format = "json", filters = {}, user = "system", qr = null) {
    try {
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined }, qr);
      const notifications = result.data;

      let exportData;
      if (format === "csv") {
        const headers = [
          "ID",
          "User ID",
          "Title",
          "Message",
          "Type",
          "Is Read",
          "Metadata",
          "Created At",
          "Updated At",
        ];
        const rows = notifications.map((n) => [
          n.id,
          n.userId,
          n.title,
          n.message,
          n.type,
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

      await auditLogger.logExport("Notification", format, filters, user);
      console.log(`Exported ${notifications.length} notifications in ${format} format`);
      return exportData;
    } catch (error) {
      console.error("Failed to export notifications:", error);
      throw error;
    }
  }

  /**
   * Bulk create notifications
   * @param {Array<Object>} notificationsArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async bulkCreate(notificationsArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of notificationsArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ notification: data, error: err.message });
      }
    }
    return results;
  }

  /**
   * Import notifications from CSV file
   * @param {string} filePath
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
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
        results.imported.push(saved);
      } catch (err) {
        results.errors.push({ row: record, error: err.message });
      }
    }
    return results;
  }
}

// Singleton instance
const notificationService = new NotificationService();
module.exports = notificationService;