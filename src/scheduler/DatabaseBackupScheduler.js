// src/scheduler/DatabaseBackupScheduler.js
//@ts-check

const { logger } = require("../utils/logger");
const { autoBackupEnabled, backupSchedule } = require("../utils/system");
const cron = require("node-cron");
const MigrationManager = require("../utils/dbUtils/migrationManager");
const { AppDataSource } = require("../main/db/data-source");
const { BaseScheduler } = require("./BaseScheduler");

class DatabaseBackupScheduler extends BaseScheduler {
  constructor() {
    super({
      name: 'DatabaseBackupScheduler',
      checkInterval: 24 * 60 * 60 * 1000, // 24 hours
      startupDelay: 5000,
      cooldownMinutes: 24 * 60,
    });
    this.cronTask = null;
  }

  async start() {
    const enabled = await autoBackupEnabled();
    if (!enabled) {
      logger.info("⏸️ Database Backup Scheduler is disabled");
      return this;
    }

    // Wait for database readiness
    if (!this._isDatabaseReady()) {
      logger.info(`⏳ ${this.name} waiting for database...`);
      const ready = await this._waitForDatabase(30000);
      if (!ready) {
        logger.warn(`⚠️ ${this.name} database not ready after 30s`);
        return this;
      }
    }

    const schedule = await backupSchedule();
    logger.info(`🚀 Starting Database Backup Scheduler (${schedule})...`);

    this.cronTask = cron.schedule(schedule, async () => {
      await this.execute();
    }, {
      timezone: "Asia/Manila",
    });

    logger.info("✅ Database backup scheduled");
    this._isRunning = true;
    return this;
  }

  async stop() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }
    await super.stop();
  }

  async execute() {
    try {
      logger.info("[BACKUP] Starting database backup...");
      
      // Ensure database is ready
      if (!this._isDatabaseReady()) {
        logger.warn("[BACKUP] Database not ready, skipping backup");
        return;
      }

      const migrationManager = new MigrationManager(AppDataSource);
      const result = await migrationManager.backupDatabase();

      if (result.success) {
        logger.info(`[BACKUP] ✅ Backup created: ${result.path}`);
        
        // ✅ Deduplicated notification
        await this._sendNotification({
          title: "Database Backup Successful",
          message: `Backup created at ${result.path}`,
          type: "success",
          notificationType: "db_backup_success",
          metadata: { backupPath: result.path },
          cooldownMinutes: 24 * 60,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error("[BACKUP] Backup failed:", error);
      
      // ✅ Deduplicated notification for failure (shorter cooldown)
      await this._sendNotification({
        title: "Database Backup Failed",
        message: `Backup failed: ${error.message}`,
        type: "error",
        notificationType: "db_backup_failed",
        metadata: { error: error.message },
        cooldownMinutes: 60, // Allow retry notification after 1 hour
      });
    }
  }

  async forceBackup() {
    logger.info("🔄 Force backup triggered");
    await this.execute();
  }
}

module.exports = DatabaseBackupScheduler;