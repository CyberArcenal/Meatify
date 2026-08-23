// src/services/NotificationLog.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");
const { logger } = require("../utils/logger");
const LOG_STATUS = {
  QUEUED: "queued",
  SENT: "sent",
  FAILED: "failed",
  RESEND: "resend",
};

/**
 * Allowed columns for sorting (prevents SQL injection)
 */
const ALLOWED_SORT_COLUMNS = new Set([
  "id",
  "recipient_email",
  "subject",
  "status",
  "retry_count",
  "resend_count",
  "sent_at",
  "last_error_at",
  "created_at",
  "updated_at",
]);

class NotificationLogService {
  constructor() {
    this.logRepository = null;
  }

  async initialize() {
    const { AppDataSource } = require("../main/db/data-source");
    const NotificationLog = require("../entities/NotificationLog");

    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
    }
    this.logRepository = AppDataSource.getRepository(NotificationLog);
    logger.debug("NotificationLogService initialized");
  }

  async getRepository() {
    if (!this.logRepository) {
      await this.initialize();
    }
    return this.logRepository;
  }

  /**
   * Helper: get a repository (transactional if queryRunner provided)
   */
  _getRepo(qr, entityClass) {
    const hasManager = qr && typeof qr === "object" && !!qr.manager;
    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    return AppDataSource.getRepository(entityClass);
  }

  // ============================================================
  // 📌 CORE CRUD METHODS (used internally)
  // ============================================================

  /**
   * Create a new notification log entry (queued status)
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    if (!data.to) throw new Error("Recipient (to) is required");
    if (!data.subject) throw new Error("Subject is required");
    if (!data.payload) throw new Error("Payload is required");

    const log = repo.create({
      recipient_email: data.to,
      subject: data.subject,
      payload: data.payload,
      channel: data.channel || "email",
      status: LOG_STATUS.QUEUED,
      retry_count: 0,
      resend_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const saved = await saveDb(repo, log, { queryRunner: qr });
    await auditLogger.logCreate("NotificationLog", saved.id, saved, user);
    logger.debug(`NotificationLog created: #${saved.id} - ${saved.subject}`);
    return saved;
  }

  /**
   * Update an existing notification log
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    const existing = await repo.findOne({ where: { id } });
    if (!existing) {
      throw new Error(`NotificationLog with ID ${id} not found`);
    }

    const oldData = { ...existing };

    // Prevent updating recipient_email, subject, payload
    if (data.recipient_email !== undefined) {
      throw new Error("Cannot update recipient_email");
    }
    if (data.subject !== undefined) {
      throw new Error("Cannot update subject");
    }
    if (data.payload !== undefined) {
      throw new Error("Cannot update payload");
    }

    Object.assign(existing, data);
    existing.updated_at = new Date();

    const saved = await updateDb(repo, existing, { queryRunner: qr });
    await auditLogger.logUpdate("NotificationLog", id, oldData, saved, user);
    logger.debug(`NotificationLog updated: #${id}`);
    return saved;
  }

  /**
   * Permanently delete a notification log
   */
  async permanentlyDelete(id, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    const log = await repo.findOne({ where: { id } });
    if (!log) {
      throw new Error(`NotificationLog with ID ${id} not found`);
    }

    await removeDb(repo, log, { queryRunner: qr });
    await auditLogger.debugDelete("NotificationLog", id, log, user);
    logger.debug(`NotificationLog #${id} permanently deleted`);
  }

  /**
   * Find log by ID
   */
  async findById(id, qr = null) {
    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    const log = await repo.findOne({ where: { id } });
    if (!log) {
      throw new Error(`NotificationLog with ID ${id} not found`);
    }
    await logger.debug("NotificationLog", id, "system");
    return log;
  }

  /**
   * Find all logs with filters, pagination, sorting
   */
  async findAll(options = {}, qr = null) {
    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    const qb = repo.createQueryBuilder("log");

    if (options.status) {
      const statuses = Array.isArray(options.status) ? options.status : [options.status];
      qb.andWhere("log.status IN (:...statuses)", { statuses });
    }
    if (options.recipient_email) {
      qb.andWhere("log.recipient_email = :email", { email: options.recipient_email });
    }
    if (options.channel) {
      qb.andWhere("log.channel = :channel", { channel: options.channel });
    }
    if (options.startDate) {
      qb.andWhere("log.created_at >= :startDate", { startDate: new Date(options.startDate) });
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere("log.created_at <= :endDate", { endDate: end });
    }
    if (options.search) {
      qb.andWhere(
        "(log.recipient_email LIKE :search OR log.subject LIKE :search OR log.payload LIKE :search)",
        { search: `%${options.search}%` }
      );
    }

    let sortBy = options.sortBy || "created_at";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      sortBy = "created_at";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`log.${sortBy}`, sortOrder);

    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await logger.debug("NotificationLog", null, "system");
    return result;
  }

  /**
   * Get log statistics
   */
  async getStatistics(qr = null) {
    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    const qb = repo.createQueryBuilder("log");

    const byStatus = await qb
      .clone()
      .select("log.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("log.status")
      .getRawMany();

    const byChannel = await qb
      .clone()
      .select("log.channel", "channel")
      .addSelect("COUNT(*)", "count")
      .groupBy("log.channel")
      .getRawMany();

    const total = await qb.clone().getCount();

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const last24h = await qb
      .clone()
      .where("log.created_at >= :oneDayAgo", { oneDayAgo })
      .getCount();

    const failed = await qb
      .clone()
      .where("log.status = 'failed'")
      .getCount();

    return {
      total,
      last24h,
      failed,
      byStatus: byStatus.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count, 10);
        return acc;
      }, {}),
      byChannel: byChannel.reduce((acc, row) => {
        acc[row.channel] = parseInt(row.count, 10);
        return acc;
      }, {}),
    };
  }

  /**
   * Export logs to CSV or JSON
   */
  async exportLogs(format = "json", filters = {}, user = "system", qr = null) {
    try {
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined }, qr);
      const logs = result.data;

      let exportData;
      if (format === "csv") {
        const headers = [
          "ID", "Recipient", "Subject", "Channel", "Status",
          "Retry Count", "Resend Count", "Sent At", "Last Error At",
          "Error Message", "Created At", "Updated At",
        ];
        const rows = logs.map((l) => [
          l.id,
          l.recipient_email,
          l.subject ?? "",
          l.channel ?? "email",
          l.status,
          l.retry_count,
          l.resend_count,
          l.sent_at ? new Date(l.sent_at).toLocaleString() : "",
          l.last_error_at ? new Date(l.last_error_at).toLocaleString() : "",
          l.error_message ?? "",
          new Date(l.created_at).toLocaleString(),
          l.updated_at ? new Date(l.updated_at).toLocaleString() : "",
        ]);
        exportData = {
          format: "csv",
          data: [headers, ...rows].map((row) => row.join(",")).join("\n"),
          filename: `notification_logs_export_${new Date().toISOString().split("T")[0]}.csv`,
        };
      } else {
        exportData = {
          format: "json",
          data: logs,
          filename: `notification_logs_export_${new Date().toISOString().split("T")[0]}.json`,
        };
      }

      await auditLogger.debugExport("NotificationLog", format, filters, user);
      logger.debug(`Exported ${logs.length} notification logs in ${format} format`);
      return exportData;
    } catch (error) {
      console.error("Failed to export notification logs:", error);
      throw error;
    }
  }

  /**
   * Bulk create logs
   */
  async bulkCreate(logsArray, user = "system", qr = null) {
    const results = { created: [], errors: [] };
    for (const data of logsArray) {
      try {
        const saved = await this.create(data, user, qr);
        results.created.push(saved);
      } catch (err) {
        results.errors.push({ log: data, error: err.message });
      }
    }
    return results;
  }

  // ============================================================
  // 📌 PUBLIC API METHODS (called by IPC handlers)
  // ============================================================

  /**
   * Create a reminder/notification log
   * Alias for create() with validation
   */
  async createReminder(data, user = "system", qr = null) {
    // Convert field names if needed
    const payload = {
      to: data.to || data.recipient_email,
      subject: data.subject,
      payload: data.html || data.text || data.payload,
      channel: data.channel || "email",
    };
    return this.create(payload, user, qr);
  }

  /**
   * Update reminder status
   */
  async updateReminderStatus({ id, status, errorMessage = null }, user = "system", qr = null) {
    const updateData = { status };
    if (errorMessage !== undefined) {
      updateData.error_message = errorMessage;
    }
    if (status === "sent") {
      updateData.sent_at = new Date();
    }
    if (status === "failed") {
      updateData.last_error_at = new Date();
      // Increment retry_count if it's a failure
      const existing = await this.findById(id, qr);
      updateData.retry_count = (existing.retry_count || 0) + 1;
    }
    return this.update(id, updateData, user, qr);
  }

  /**
   * Delete a reminder (hard delete)
   */
  async deleteReminder({ id }, user = "system", qr = null) {
    return this.permanentlyDelete(id, user, qr);
  }

  /**
   * Retry a failed reminder
   */
  async retryReminder({ id }, user = "system", qr = null) {
    const existing = await this.findById(id, qr);
    if (existing.status !== "failed" && existing.status !== "resend") {
      throw new Error(`Cannot retry a log with status "${existing.status}"`);
    }
    // Reset status to queued and increment retry count
    const updateData = {
      status: LOG_STATUS.QUEUED,
      retry_count: (existing.retry_count || 0) + 1,
      last_error_at: null,
      error_message: null,
    };
    return this.update(id, updateData, user, qr);
  }

  /**
   * Retry all failed reminders
   */
  async retryAllFailedReminders({ filters = {} }, user = "system", qr = null) {
    const options = {
      status: ["failed", "resend"],
      limit: 1000,
      ...filters,
    };
    const result = await this.findAll(options, qr);
    const logs = result.data;

    let successCount = 0;
    let failCount = 0;
    const results = [];

    for (const log of logs) {
      try {
        await this.retryReminder({ id: log.id }, user, qr);
        successCount++;
        results.push({ id: log.id, success: true });
      } catch (err) {
        failCount++;
        results.push({ id: log.id, success: false, error: err.message });
      }
    }

    return { successCount, failCount, results };
  }

  /**
   * Resend a reminder (manual resend, regardless of status)
   */
  async resendReminder({ id }, user = "system", qr = null) {
    const existing = await this.findById(id, qr);
    // Increment resend count
    const updateData = {
      status: LOG_STATUS.QUEUED,
      resend_count: (existing.resend_count || 0) + 1,
      sent_at: null,
      last_error_at: null,
      error_message: null,
    };
    return this.update(id, updateData, user, qr);
  }

  /**
   * Get reminder by ID (alias)
   */
  async getReminderById({ id }, qr = null) {
    return this.findById(id, qr);
  }

  /**
   * Get all reminders with filters
   */
  async getAllReminders(options = {}, qr = null) {
    return this.findAll(options, qr);
  }

  /**
   * Search reminders by keyword
   */
  async searchReminders({ keyword, page, limit }, qr = null) {
    const options = {
      search: keyword,
      page,
      limit,
      sortBy: "created_at",
      sortOrder: "DESC",
    };
    return this.findAll(options, qr);
  }

  /**
   * Get reminder statistics
   */
  async getReminderStats({ startDate, endDate } = {}, qr = null) {
    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    return this.getStatistics(qr);
  }
}

// Export singleton instance
const notificationLogService = new NotificationLogService();
module.exports = notificationLogService;
module.exports.NotificationLogService = NotificationLogService;
module.exports.LOG_STATUS = LOG_STATUS;