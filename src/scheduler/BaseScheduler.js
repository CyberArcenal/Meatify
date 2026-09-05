// src/scheduler/BaseScheduler.js
//@ts-check

const { logger } = require("../utils/logger");
const { AppDataSource } = require("../main/db/data-source");
const notificationService = require("../services/Notification");

class BaseScheduler {
  constructor(options = {}) {
    this.name = options.name || this.constructor.name;
    this.checkInterval = options.checkInterval || 3600000;
    this.intervalId = null;
    this.startupTimeoutId = null;
    this.startupDelay = options.startupDelay || 30000;
    this.isEnabled = options.enabled !== false;
    this.cooldownHours = options.cooldownHours || 6; // ✅ Look back N hours
    this._isRunning = false;
    this._firstRunDone = false;
  }

  _isDatabaseReady() {
    return AppDataSource && AppDataSource.isInitialized === true;
  }

  async _waitForDatabase(timeoutMs = 30000) {
    const startTime = Date.now();
    const checkInterval = 500;
    while (Date.now() - startTime < timeoutMs) {
      if (this._isDatabaseReady()) return true;
      await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }
    return false;
  }

  /**
   * ✅ Check if notification with same title exists within cooldown period
   * @param {string} title - Notification title to check
   * @param {number} hours - Hours to look back (default: cooldownHours)
   * @returns {Promise<boolean>}
   */
  async _hasRecentNotification(title, hours = null) {
    try {
      const Notification = require("../entities/Notification");
      const repo = AppDataSource.getRepository(Notification);

      const lookbackHours = hours || this.cooldownHours || 24;
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - lookbackHours);

      const count = await repo
        .createQueryBuilder("notification")
        .where("notification.title = :title", { title })
        .andWhere("notification.createdAt > :cutoffDate", { cutoffDate })
        .andWhere("notification.deletedAt IS NULL")
        .getCount();

      if (count > 0) {
        logger.debug(
          `[${this.name}] Found ${count} existing notification(s) with title "${title}" in last ${lookbackHours}h, skipping...`,
        );
      }
      return count > 0;
    } catch (error) {
      logger.warn(
        `[${this.name}] Failed to check recent notification:`,
        error.message,
      );
      return false; // Fail-open: allow notification if DB check fails
    }
  }

  /**
   * ✅ Send notification with deduplication via database check
   */
  async _sendNotification(data) {
    const { title, message, type = "info", metadata = {}, hours } = data;

    // ✅ Check if similar notification exists in database
    const hasRecent = await this._hasRecentNotification(title, hours);
    if (hasRecent) {
      logger.debug(`[${this.name}] Skipping duplicate: "${title}"`);
      return false;
    }

    // Send notification
    const result = await notificationService.create(
      { userId: 1, title, message, type, metadata },
      "system",
    );

    if (result) {
      logger.debug(`[${this.name}] ✅ Notification sent: "${title}"`);
      return true;
    }
    return false;
  }

  async start() {
    if (!this.isEnabled) {
      logger.info(`⏸️ ${this.name} is disabled`);
      return this;
    }

    logger.info(`🚀 Starting ${this.name}...`);

    if (!this._isDatabaseReady()) {
      logger.info(`⏳ ${this.name} waiting for database...`);
      const ready = await this._waitForDatabase(30000);
      if (!ready) {
        logger.warn(`⚠️ ${this.name} database not ready after 30s`);
        return this;
      }
    }

    this.startupTimeoutId = setTimeout(async () => {
      if (!this._firstRunDone) {
        await this.execute();
        this._firstRunDone = true;
      }
      if (!this.intervalId) {
        this.intervalId = setInterval(async () => {
          await this.execute();
        }, this.checkInterval);
        logger.info(
          `✅ ${this.name} interval started (every ${this.checkInterval / 60000} min)`,
        );
      }
    }, this.startupDelay);

    this._isRunning = true;
    return this;
  }

  async stop() {
    if (this.startupTimeoutId) {
      clearTimeout(this.startupTimeoutId);
      this.startupTimeoutId = null;
    }
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this._isRunning = false;
    logger.info(`🛑 ${this.name} stopped`);
  }

  async execute() {
    // Override in child class
  }

  getStatus() {
    return {
      name: this.name,
      isEnabled: this.isEnabled,
      isRunning: this._isRunning,
      firstRunDone: this._firstRunDone,
      checkInterval: this.checkInterval,
      cooldownHours: this.cooldownHours,
    };
  }
}

module.exports = { BaseScheduler };
