// src/services/NotificationLog.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");

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
    console.log("NotificationLogService initialized");
  }

  async getRepository() {
    if (!this.logRepository) {
      await this.initialize();
    }
    return this.logRepository;
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
      `[NotificationLog._getRepo] qr type: ${qrType}, has manager: ${hasManager}`,
    );

    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    console.log(`[NotificationLog._getRepo] Using global repository (fallback)`);
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * Create a new notification log entry (queued status)
   * @param {Object} data - { to, subject, payload, channel? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async create(data, user = "system", qr = null) {
    const { saveDb } = require("../utils/dbUtils/dbActions");
    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    try {
      // Validate required fields
      if (!data.to) throw new Error("Recipient (to) is required");
      if (!data.subject) throw new Error("Subject is required");
      if (!data.payload) throw new Error("Payload is required");

      const log = repo.create({
        recipient_email: data.to,
        subject: data.subject,
        payload: data.payload,
        channel: data.channel || "email", // email or sms
        status: LOG_STATUS.QUEUED,
        retry_count: 0,
        resend_count: 0,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const saved = await saveDb(repo, log, { queryRunner: qr });
      await auditLogger.logCreate("NotificationLog", saved.id, saved, user);
      console.log(`NotificationLog created: #${saved.id} - ${saved.subject}`);
      return saved;
    } catch (error) {
      console.error("Failed to create notification log:", error.message);
      throw error;
    }
  }

  /**
   * Update an existing notification log
   * @param {number} id
   * @param {Object} data - { status?, error_message?, retry_count?, resend_count?, sent_at?, last_error_at? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async update(id, data, user = "system", qr = null) {
    const { updateDb } = require("../utils/dbUtils/dbActions");
    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    try {
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
      console.log(`NotificationLog updated: #${id}`);
      return saved;
    } catch (error) {
      console.error("Failed to update notification log:", error.message);
      throw error;
    }
  }

  /**
   * Delete a notification log (hard delete)
   * @param {number} id
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
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
    await auditLogger.logDelete("NotificationLog", id, log, user);
    console.log(`NotificationLog #${id} permanently deleted`);
  }

  /**
   * Find log by ID
   * @param {number} id
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findById(id, qr = null) {
    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    const log = await repo.findOne({ where: { id } });
    if (!log) {
      throw new Error(`NotificationLog with ID ${id} not found`);
    }
    await auditLogger.logView("NotificationLog", id, "system");
    return log;
  }

  /**
   * Find all logs with filters, pagination, sorting
   * @param {Object} options
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async findAll(options = {}, qr = null) {
    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    const qb = repo.createQueryBuilder("log");

    // Filters
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

    // Sorting
    let sortBy = options.sortBy || "created_at";
    if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
      console.warn(`[NotificationLog] Invalid sortBy: ${sortBy}, falling back to created_at`);
      sortBy = "created_at";
    }
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";
    qb.orderBy(`log.${sortBy}`, sortOrder);

    // Pagination
    const result = await paginateQueryBuilder(qb, {
      page: options.page,
      limit: options.limit,
    });

    await auditLogger.logView("NotificationLog", null, "system");
    return result; // { data: [], pagination: {} }
  }

  /**
   * Get log statistics
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    const qb = repo.createQueryBuilder("log");

    // By status
    const byStatus = await qb
      .clone()
      .select("log.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("log.status")
      .getRawMany();

    // By channel
    const byChannel = await qb
      .clone()
      .select("log.channel", "channel")
      .addSelect("COUNT(*)", "count")
      .groupBy("log.channel")
      .getRawMany();

    // Total
    const total = await qb.clone().getCount();

    // Last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    const last24h = await qb
      .clone()
      .where("log.created_at >= :oneDayAgo", { oneDayAgo })
      .getCount();

    // Failed count
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
   * @param {string} format
   * @param {Object} filters
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async exportLogs(format = "json", filters = {}, user = "system", qr = null) {
    try {
      const result = await this.findAll({ ...filters, limit: undefined, page: undefined }, qr);
      const logs = result.data;

      let exportData;
      if (format === "csv") {
        const headers = [
          "ID",
          "Recipient",
          "Subject",
          "Channel",
          "Status",
          "Retry Count",
          "Resend Count",
          "Sent At",
          "Last Error At",
          "Error Message",
          "Created At",
          "Updated At",
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

      await auditLogger.logExport("NotificationLog", format, filters, user);
      console.log(`Exported ${logs.length} notification logs in ${format} format`);
      return exportData;
    } catch (error) {
      console.error("Failed to export notification logs:", error);
      throw error;
    }
  }

  /**
   * Bulk create logs
   * @param {Array<Object>} logsArray
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
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
}

// Export constants
module.exports = { NotificationLogService, LOG_STATUS };