// src/scheduler/DatabaseBackupScheduler.js
//@ts-check

const { logger } = require("../utils/logger");
const { autoBackupEnabled, backupSchedule } = require("../utils/system");

const notificationService = require("../services/Notification");
const cron = require("node-cron");
const MigrationManager = require("../utils/dbUtils/migrationManager");
const { AppDataSource } = require("../main/db/data-source");

class DatabaseBackupScheduler {
  constructor() {
    this.cronTask = null;
  }

  async start() {
    const enabled = await autoBackupEnabled();
    if (!enabled) {
      logger.info("⏸️ Database Backup Scheduler is disabled");
      return this;
    }

    const schedule = await backupSchedule();
    logger.info(`🚀 Starting Database Backup Scheduler (${schedule})...`);

    this.cronTask = cron.schedule(schedule, async () => {
      await this.runBackup();
    }, {
      timezone: "Asia/Manila",
    });

    logger.info("✅ Database backup scheduled");
    return this;
  }

  async stop() {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
      logger.info("🛑 Database Backup Scheduler Stopped");
    }
  }

  async runBackup() {
    try {
      logger.info("[BACKUP] Starting database backup...");
      const migrationManager = new MigrationManager(AppDataSource);
      const result = await migrationManager.backupDatabase();

      if (result.success) {
        logger.info(`[BACKUP] ✅ Backup created: ${result.path}`);
        await notificationService.create({
          userId: 1,
          title: "Database Backup Successful",
          message: `Backup created at ${result.path}`,
          type: "success",
          metadata: { backupPath: result.path },
        }, "system");
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      logger.error("[BACKUP] Backup failed:", error);
      await notificationService.create({
        userId: 1,
        title: "Database Backup Failed",
        message: `Backup failed: ${error.message}`,
        type: "error",
        metadata: { error: error.message },
      }, "system");
    }
  }

  async forceBackup() {
    logger.info("🔄 Force backup triggered");
    await this.runBackup();
  }
}

module.exports = DatabaseBackupScheduler;