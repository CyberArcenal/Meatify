// src/services/NotificationLog.js
//@ts-check
const auditLogger = require("../utils/auditLogger");
const { paginateQueryBuilder } = require("../utils/dbUtils/pagination");
const { logger } = require("../utils/logger");
const system = require("../utils/system");
const { SettingType } = require("../entities/systemSettings");

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
   * @param {import("typeorm").QueryRunner | null} qr
   * @param {Function} entityClass
   * @returns {import("typeorm").Repository<any>}
   */
  _getRepo(qr, entityClass) {
    const hasManager = qr && typeof qr === "object" && !!qr.manager;
    if (hasManager && typeof qr.manager.getRepository === "function") {
      return qr.manager.getRepository(entityClass);
    }
    const { AppDataSource } = require("../main/db/data-source");
    return AppDataSource.getRepository(entityClass);
  }

  /**
   * Check if audit logging is enabled
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<boolean>}
   */
  async _isAuditEnabled(qr = null) {
    try {
      return await system.auditLogEnabled();
    } catch (error) {
      logger.warn(
        `[NotificationLog] Failed to check audit enabled status: ${error.message}, defaulting to true`,
      );
      return true;
    }
  }

  /**
   * Get allowed channels from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<string[]>}
   */
  async _getAllowedChannels(qr = null) {
    try {
      return await system.getArray(
        "allowed_notification_channels",
        SettingType.NOTIFICATIONS,
        ["email", "sms"],
      );
    } catch (error) {
      logger.warn(
        `[NotificationLog] Failed to get allowed channels: ${error.message}, using defaults`,
      );
      return ["email", "sms"];
    }
  }

  /**
   * Get default channel from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<string>}
   */
  async _getDefaultChannel(qr = null) {
    try {
      const defaultChannel = await system.getValue(
        "default_notification_channel",
        SettingType.NOTIFICATIONS,
        "email",
      );
      const allowedChannels = await this._getAllowedChannels(qr);
      if (!allowedChannels.includes(defaultChannel)) {
        logger.warn(
          `[NotificationLog] Invalid default channel "${defaultChannel}", defaulting to "email"`,
        );
        return "email";
      }
      return defaultChannel;
    } catch (error) {
      logger.warn(
        `[NotificationLog] Failed to get default channel: ${error.message}, defaulting to "email"`,
      );
      return "email";
    }
  }

  /**
   * Get max retry attempts from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxRetryAttempts(qr = null) {
    try {
      return await system.getInt(
        "max_retry_attempts",
        SettingType.NOTIFICATIONS,
        3,
      );
    } catch (error) {
      logger.warn(
        `[NotificationLog] Failed to get max retry attempts: ${error.message}, defaulting to 3`,
      );
      return 3;
    }
  }

  /**
   * Get max payload length from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxPayloadLength(qr = null) {
    try {
      return await system.getInt(
        "max_notification_payload_length",
        SettingType.NOTIFICATIONS,
        10000,
      );
    } catch (error) {
      logger.warn(
        `[NotificationLog] Failed to get max payload length: ${error.message}, defaulting to 10000`,
      );
      return 10000;
    }
  }

  /**
   * Get log retention days from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getLogRetentionDays(qr = null) {
    try {
      return await system.getInt(
        "notification_log_retention_days",
        SettingType.NOTIFICATIONS,
        30,
      );
    } catch (error) {
      logger.warn(
        `[NotificationLog] Failed to get log retention days: ${error.message}, defaulting to 30`,
      );
      return 30;
    }
  }

  /**
   * Get max subject length from settings
   * @param {import("typeorm").QueryRunner | null} qr
   * @returns {Promise<number>}
   */
  async _getMaxSubjectLength(qr = null) {
    try {
      return await system.getInt(
        "max_notification_subject_length",
        SettingType.NOTIFICATIONS,
        255,
      );
    } catch (error) {
      logger.warn(
        `[NotificationLog] Failed to get max subject length: ${error.message}, defaulting to 255`,
      );
      return 255;
    }
  }

  // ============================================================
  // 🔍 READ-ONLY METHODS
  // ============================================================

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
    await logger.debug("NotificationLog", id, "system");
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

    // Apply retention days filter automatically if not specified
    if (!options.startDate && !options.endDate && !options.ignoreRetention) {
      const retentionDays = await this._getLogRetentionDays(qr);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      qb.andWhere("log.created_at >= :cutoffDate", { cutoffDate });
    }

    if (options.status) {
      const statuses = Array.isArray(options.status)
        ? options.status
        : [options.status];
      const validStatuses = Object.values(LOG_STATUS);
      const invalidStatuses = statuses.filter(
        (s) => !validStatuses.includes(s),
      );
      if (invalidStatuses.length > 0) {
        logger.warn(
          `[NotificationLog] Invalid statuses: ${invalidStatuses.join(", ")}. Allowed: ${validStatuses.join(", ")}`,
        );
      }
      qb.andWhere("log.status IN (:...statuses)", { statuses });
    }
    if (options.recipient_email) {
      qb.andWhere("log.recipient_email = :email", {
        email: options.recipient_email,
      });
    }
    if (options.channel) {
      const channels = Array.isArray(options.channel)
        ? options.channel
        : [options.channel];
      const allowedChannels = await this._getAllowedChannels(qr);
      const invalidChannels = channels.filter(
        (c) => !allowedChannels.includes(c),
      );
      if (invalidChannels.length > 0) {
        logger.warn(
          `[NotificationLog] Invalid channels: ${invalidChannels.join(", ")}. Allowed: ${allowedChannels.join(", ")}`,
        );
      }
      qb.andWhere("log.channel IN (:...channels)", { channels });
    }
    if (options.startDate) {
      qb.andWhere("log.created_at >= :startDate", {
        startDate: new Date(options.startDate),
      });
    }
    if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      qb.andWhere("log.created_at <= :endDate", { endDate: end });
    }
    if (options.search) {
      qb.andWhere(
        "(log.recipient_email LIKE :search OR log.subject LIKE :search OR log.payload LIKE :search)",
        { search: `%${options.search}%` },
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
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getStatistics(qr = null) {
    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    const retentionDays = await this._getLogRetentionDays(qr);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const qb = repo
      .createQueryBuilder("log")
      .where("log.created_at >= :cutoffDate", { cutoffDate });

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

    const failed = await qb.clone().where("log.status = 'failed'").getCount();

    const maxRetryAttempts = await this._getMaxRetryAttempts(qr);
    const allowedChannels = await this._getAllowedChannels(qr);
    const maxPayloadLength = await this._getMaxPayloadLength(qr);

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
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      maxRetryAttempts,
      allowedChannels,
      maxPayloadLength,
    };
  }

  /**
   * Get logs by recipient with summary
   * @param {string} recipientEmail
   * @param {Object} options
   * @param {number} [options.limit] - Max number of logs to return
   * @param {string} [options.status] - Filter by status
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getByRecipient(recipientEmail, options = {}, qr = null) {
    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    const { limit = 50, status = null } = options;

    const queryBuilder = repo
      .createQueryBuilder("log")
      .where("log.recipient_email = :email", { email: recipientEmail })
      .orderBy("log.created_at", "DESC")
      .limit(limit);

    if (status) {
      const validStatuses = Object.values(LOG_STATUS);
      if (!validStatuses.includes(status)) {
        throw new Error(
          `Invalid status: "${status}". Allowed: ${validStatuses.join(", ")}`,
        );
      }
      queryBuilder.andWhere("log.status = :status", { status });
    }

    const logs = await queryBuilder.getMany();

    const totalCount = await repo.count({
      where: { recipient_email: recipientEmail },
    });

    const sentCount = await repo.count({
      where: { recipient_email: recipientEmail, status: LOG_STATUS.SENT },
    });

    const failedCount = await repo.count({
      where: { recipient_email: recipientEmail, status: LOG_STATUS.FAILED },
    });

    const queuedCount = await repo.count({
      where: { recipient_email: recipientEmail, status: LOG_STATUS.QUEUED },
    });

    return {
      logs,
      summary: {
        recipient: recipientEmail,
        total: totalCount,
        sent: sentCount,
        failed: failedCount,
        queued: queuedCount,
        successRate:
          totalCount > 0 ? Math.round((sentCount / totalCount) * 100) : 0,
      },
    };
  }

  /**
   * Get summary by channel
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getChannelSummary(qr = null) {
    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    const byChannel = await repo
      .createQueryBuilder("log")
      .select("log.channel", "channel")
      .addSelect("COUNT(*)", "count")
      .addSelect("SUM(CASE WHEN log.status = 'sent' THEN 1 ELSE 0 END)", "sent")
      .addSelect(
        "SUM(CASE WHEN log.status = 'failed' THEN 1 ELSE 0 END)",
        "failed",
      )
      .addSelect(
        "SUM(CASE WHEN log.status = 'queued' THEN 1 ELSE 0 END)",
        "queued",
      )
      .groupBy("log.channel")
      .getRawMany();

    const total = await repo.count();

    return {
      total,
      channels: byChannel.map((row) => ({
        channel: row.channel,
        total: parseInt(row.count, 10),
        sent: parseInt(row.sent, 10),
        failed: parseInt(row.failed, 10),
        queued: parseInt(row.queued, 10),
        successRate:
          parseInt(row.count, 10) > 0
            ? Math.round(
                (parseInt(row.sent, 10) / parseInt(row.count, 10)) * 100,
              )
            : 0,
      })),
    };
  }

  /**
   * Export logs to CSV or JSON
   * @param {string} format - 'csv' or 'json'
   * @param {Object} filters
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async exportLogs(format = "json", filters = {}, user = "system", qr = null) {
    try {
      const result = await this.findAll(
        {
          ...filters,
          limit: undefined,
          page: undefined,
          ignoreRetention: true,
        },
        qr,
      );
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

      const auditEnabled = await this._isAuditEnabled(qr);
      if (auditEnabled) {
        await auditLogger.debugExport("NotificationLog", format, filters, user);
      }

      logger.debug(
        `Exported ${logs.length} notification logs in ${format} format`,
      );
      return exportData;
    } catch (error) {
      console.error("Failed to export notification logs:", error);
      throw error;
    }
  }

  // ============================================================
  // ✏️ WRITE OPERATIONS (CRUD)
  // ============================================================

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

    if (!data.to) throw new Error("Recipient (to) is required");
    if (!data.subject) throw new Error("Subject is required");
    if (!data.payload) throw new Error("Payload is required");

    const maxSubjectLength = await this._getMaxSubjectLength(qr);
    if (data.subject.length > maxSubjectLength) {
      throw new Error(`Subject cannot exceed ${maxSubjectLength} characters`);
    }

    const maxPayloadLength = await this._getMaxPayloadLength(qr);
    if (data.payload.length > maxPayloadLength) {
      throw new Error(`Payload cannot exceed ${maxPayloadLength} characters`);
    }

    const allowedChannels = await this._getAllowedChannels(qr);
    let channel = data.channel || (await this._getDefaultChannel(qr));
    if (!allowedChannels.includes(channel)) {
      logger.warn(
        `[NotificationLog] Invalid channel "${channel}", defaulting to "email"`,
      );
      channel = "email";
    }

    const log = repo.create({
      recipient_email: data.to,
      subject: data.subject,
      payload: data.payload,
      channel: channel,
      status: LOG_STATUS.QUEUED,
      retry_count: 0,
      resend_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const saved = await saveDb(repo, log, { queryRunner: qr });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logCreate("NotificationLog", saved.id, saved, user);
    }

    logger.debug(`NotificationLog created: #${saved.id} - ${saved.subject}`);
    return saved;
  }

  /**
   * Update an existing notification log
   * @param {number} id
   * @param {Object} data - Fields to update (status, channel, error_message, etc.)
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
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

    // Prevent updating immutable fields
    if (data.recipient_email !== undefined) {
      throw new Error("Cannot update recipient_email");
    }
    if (data.subject !== undefined) {
      throw new Error("Cannot update subject");
    }
    if (data.payload !== undefined) {
      throw new Error("Cannot update payload");
    }

    // Validate channel if provided
    if (data.channel !== undefined) {
      const allowedChannels = await this._getAllowedChannels(qr);
      if (!allowedChannels.includes(data.channel)) {
        throw new Error(
          `Invalid channel: "${data.channel}". Allowed: ${allowedChannels.join(", ")}`,
        );
      }
    }

    // Validate status if provided
    if (data.status !== undefined) {
      const validStatuses = Object.values(LOG_STATUS);
      if (!validStatuses.includes(data.status)) {
        throw new Error(
          `Invalid status: "${data.status}". Allowed: ${validStatuses.join(", ")}`,
        );
      }
    }

    Object.assign(existing, data);
    existing.updated_at = new Date();

    const saved = await updateDb(repo, existing, { queryRunner: qr });

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logUpdate("NotificationLog", id, oldData, saved, user);
    }

    logger.debug(`NotificationLog updated: #${id}`);
    return saved;
  }

  /**
   * Permanently delete a notification log
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

    const auditEnabled = await this._isAuditEnabled(qr);
    if (auditEnabled) {
      await auditLogger.logCreate("NotificationLog", id, log, user);
    }

    logger.debug(`NotificationLog #${id} permanently deleted`);
  }

  // ============================================================
  // 🔄 BUSINESS LOGIC METHODS
  // ============================================================

  /**
   * Create a reminder/notification log
   * Alias for create() with field conversion
   * @param {Object} data - { to, subject, html, text, channel? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async createReminder(data, user = "system", qr = null) {
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
   * @param {Object} params - { id, status, errorMessage? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async updateReminderStatus(
    { id, status, errorMessage = null },
    user = "system",
    qr = null,
  ) {
    const validStatuses = Object.values(LOG_STATUS);
    if (!validStatuses.includes(status)) {
      throw new Error(
        `Invalid status: "${status}". Allowed: ${validStatuses.join(", ")}`,
      );
    }

    const updateData = { status };
    if (errorMessage !== undefined) {
      updateData.error_message = errorMessage;
    }
    if (status === "sent") {
      updateData.sent_at = new Date();
    }
    if (status === "failed") {
      updateData.last_error_at = new Date();
      const existing = await this.findById(id, qr);
      updateData.retry_count = (existing.retry_count || 0) + 1;
    }
    return this.update(id, updateData, user, qr);
  }

  /**
   * Delete a reminder (hard delete)
   * @param {Object} params - { id }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async deleteReminder({ id }, user = "system", qr = null) {
    return this.permanentlyDelete(id, user, qr);
  }

  /**
   * Retry a failed reminder
   * @param {Object} params - { id }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async retryReminder({ id }, user = "system", qr = null) {
    const existing = await this.findById(id, qr);
    if (existing.status !== "failed" && existing.status !== "resend") {
      throw new Error(`Cannot retry a log with status "${existing.status}"`);
    }

    const MAX_RETRIES = await this._getMaxRetryAttempts(qr);
    if ((existing.retry_count || 0) >= MAX_RETRIES) {
      throw new Error(`Log #${id} has reached max retries (${MAX_RETRIES})`);
    }

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
   * @param {Object} options - { filters? }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async retryAllFailedReminders({ filters = {} }, user = "system", qr = null) {
    const maxRetries = await this._getMaxRetryAttempts(qr);

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
        if ((log.retry_count || 0) >= maxRetries) {
          failCount++;
          results.push({
            id: log.id,
            success: false,
            error: `Max retries (${maxRetries}) reached`,
          });
          continue;
        }
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
   * @param {Object} params - { id }
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async resendReminder({ id }, user = "system", qr = null) {
    const existing = await this.findById(id, qr);
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
   * @param {Object} params - { id }
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getReminderById({ id }, qr = null) {
    return this.findById(id, qr);
  }

  /**
   * Get all reminders with filters
   * @param {Object} options
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getAllReminders(options = {}, qr = null) {
    return this.findAll(options, qr);
  }

  /**
   * Search reminders by keyword
   * @param {Object} params - { keyword, page, limit }
   * @param {import("typeorm").QueryRunner | null} qr
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
   * @param {Object} params - { startDate?, endDate? }
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getReminderStats({ startDate, endDate } = {}, qr = null) {
    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;
    return this.getStatistics(qr);
  }

  // ============================================================
  // 📤 BULK & IMPORT OPERATIONS
  // ============================================================

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

  // ============================================================
  // 🧹 CLEANUP & RETENTION
  // ============================================================

  /**
   * Clean up old logs (hard delete)
   * @param {number} daysOld - Delete logs older than this (overrides settings)
   * @param {string} user
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async cleanOldLogs(daysOld = null, user = "system", qr = null) {
    const { removeDb } = require("../utils/dbUtils/dbActions");
    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    if (daysOld === null) {
      daysOld = await this._getLogRetentionDays(qr);
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const oldLogs = await repo
      .createQueryBuilder("log")
      .where("log.created_at < :cutoffDate", { cutoffDate })
      .andWhere("log.status IN (:...statuses)", {
        statuses: [LOG_STATUS.SENT, LOG_STATUS.FAILED],
      })
      .getMany();

    if (oldLogs.length === 0) {
      logger.info(
        `[NotificationLog] No old logs to clean up (threshold: ${daysOld} days)`,
      );
      return { count: 0 };
    }

    let deletedCount = 0;
    for (const log of oldLogs) {
      try {
        await removeDb(repo, log, { queryRunner: qr, skipSignal: true });

        const auditEnabled = await this._isAuditEnabled(qr);
        if (auditEnabled) {
          await auditLogger.logCreate("NotificationLog", log.id, log, user);
        }

        deletedCount++;
        logger.debug(
          `[NotificationLog] Deleted log #${log.id} (older than ${daysOld} days)`,
        );
      } catch (err) {
        logger.error(`[NotificationLog] Failed to delete log #${log.id}:`, err);
      }
    }

    logger.info(
      `[NotificationLog] Cleaned up ${deletedCount} old logs (older than ${daysOld} days)`,
    );
    return { count: deletedCount };
  }

  /**
   * Get log retention info
   * @param {import("typeorm").QueryRunner | null} qr
   */
  async getRetentionInfo(qr = null) {
    const retentionDays = await this._getLogRetentionDays(qr);
    const maxRetryAttempts = await this._getMaxRetryAttempts(qr);
    const allowedChannels = await this._getAllowedChannels(qr);
    const maxPayloadLength = await this._getMaxPayloadLength(qr);
    const auditEnabled = await this._isAuditEnabled(qr);

    const NotificationLog = require("../entities/NotificationLog");
    const repo = this._getRepo(qr, NotificationLog);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const totalLogs = await repo.count();
    const oldLogs = await repo
      .createQueryBuilder("log")
      .where("log.created_at < :cutoffDate", { cutoffDate })
      .andWhere("log.status IN (:...statuses)", {
        statuses: [LOG_STATUS.SENT, LOG_STATUS.FAILED],
      })
      .getCount();

    const byStatus = await repo
      .createQueryBuilder("log")
      .select("log.status", "status")
      .addSelect("COUNT(*)", "count")
      .groupBy("log.status")
      .getRawMany();

    return {
      retentionDays,
      cutoffDate: cutoffDate.toISOString(),
      totalLogs,
      logsToDelete: oldLogs,
      maxRetryAttempts,
      allowedChannels,
      maxPayloadLength,
      auditEnabled,
      byStatus: byStatus.reduce((acc, row) => {
        acc[row.status] = parseInt(row.count, 10);
        return acc;
      }, {}),
    };
  }

  // Sa src/services/NotificationLog.js, idagdag ang method na ito:

  /**
   * Import notification logs from CSV file
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
          to: record.recipient_email || record.to,
          subject: record.subject,
          payload: record.payload || record.html || record.text,
          channel: record.channel || "email",
        };
        if (!data.to || !data.subject || !data.payload) {
          throw new Error("recipient, subject, and content are required");
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

// Export singleton instance
const notificationLogService = new NotificationLogService();
module.exports = notificationLogService;
module.exports.NotificationLogService = NotificationLogService;
module.exports.LOG_STATUS = LOG_STATUS;
