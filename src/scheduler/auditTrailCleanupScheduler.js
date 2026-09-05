// src/scheduler/auditTrailCleanupScheduler.js
//@ts-check

const { logger } = require("../utils/logger");
const { auditLogEnabled, logRetentionDays } = require("../utils/system");
const { BrowserWindow } = require("electron");
const { AuditLog } = require("../entities/AuditLog");
const { AppDataSource } = require("../main/db/data-source");
const { BaseScheduler } = require("./BaseScheduler");

class AuditTrailCleanupScheduler extends BaseScheduler {
  constructor() {
    super({
      name: 'AuditTrailCleanupScheduler',
      checkInterval: 24 * 60 * 60 * 1000, // 24 hours
      startupDelay: 10000, // 10 seconds
      cooldownMinutes: 24 * 60, // 24 hours cooldown
    });
  }

  /**
   * Send event to all renderer windows
   */
  _sendToRenderers(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, data);
      }
    });
  }

  async execute() {
    try {
      const enabled = await auditLogEnabled();
      if (!enabled) {
        logger.debug("[AUDIT CLEANUP] Audit log disabled, skipping cleanup");
        return;
      }

      const retentionDays = await logRetentionDays();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      logger.info(`[AUDIT CLEANUP] Cleaning up audit trails older than ${retentionDays} days`);

      this._sendToRenderers("audit:cleanup", {
        status: "started",
        retentionDays,
        cutoffDate: cutoffDate.toISOString(),
        timestamp: new Date().toISOString(),
      });

      const auditLogRepo = AppDataSource.getRepository(AuditLog);

      const count = await auditLogRepo
        .createQueryBuilder("audit_logs")
        .where("audit_logs.timestamp < :cutoffDate", { cutoffDate })
        .getCount();

      if (count === 0) {
        logger.debug("[AUDIT CLEANUP] No old audit trail records to delete");
        this._sendToRenderers("audit:cleanup", {
          status: "completed",
          deletedCount: 0,
          retentionDays,
          message: "No old records to delete",
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const result = await auditLogRepo
        .createQueryBuilder("audit_logs")
        .where("audit_logs.timestamp < :cutoffDate", { cutoffDate })
        .delete()
        .execute();

      const deletedCount = result.affected || 0;
      logger.info(`✅ Deleted ${deletedCount} audit trail records older than ${retentionDays} days`);

      // ✅ Use deduplicated notification
      await this._sendNotification({
        title: "Audit Log Cleanup",
        message: `${deletedCount} old audit record(s) older than ${retentionDays} days have been deleted.`,
        type: "info",
        notificationType: "audit_cleanup",
        metadata: { deletedCount, retentionDays, cutoffDate: cutoffDate.toISOString() },
        cooldownMinutes: 24 * 60, // Only notify once per day
      });

      this._sendToRenderers("audit:cleanup", {
        status: "completed",
        deletedCount,
        retentionDays,
        cutoffDate: cutoffDate.toISOString(),
        timestamp: new Date().toISOString(),
      });

      await this._logCleanupAction(retentionDays, deletedCount);
    } catch (error) {
      logger.error("❌ Error during audit trail cleanup:", error);
      this._sendToRenderers("audit:cleanup", {
        status: "failed",
        error: error.message,
        timestamp: new Date().toISOString(),
      });

      // ✅ Use deduplicated notification for failure
      await this._sendNotification({
        title: "Audit Log Cleanup Failed",
        message: `Failed to clean up old audit logs: ${error.message}`,
        type: "error",
        notificationType: "audit_cleanup_failed",
        metadata: { error: error.message },
        cooldownMinutes: 60,
      });
    }
  }

  async _logCleanupAction(retentionDays, deletedCount) {
    try {
      const auditLogRepo = AppDataSource.getRepository(AuditLog);
      const auditEntry = auditLogRepo.create({
        action: "AUDIT_CLEANUP",
        entity: "AuditTrail",
        entityId: null,
        oldData: null,
        newData: JSON.stringify({
          retention_days: retentionDays,
          deleted_count: deletedCount,
          cutoff_date: new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString(),
        }),
        user: "system",
        timestamp: new Date(),
      });
      await auditLogRepo.save(auditEntry);
    } catch (error) {
      logger.warn("Could not log audit cleanup action:", error);
    }
  }

  async forceCleanup() {
    logger.info("🔄 Force audit trail cleanup triggered");
    await this.execute();
  }

  async updateConfig() {
    this.isEnabled = await auditLogEnabled();
    logger.info("🔄 Updated audit cleanup configuration from system settings");
  }

  async getCleanupStats() {
    try {
      const auditLogRepo = AppDataSource.getRepository(AuditLog);
      const retentionDays = await logRetentionDays();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const oldRecordsCount = await auditLogRepo
        .createQueryBuilder("audit_logs")
        .where("audit_logs.timestamp < :cutoffDate", { cutoffDate })
        .getCount();

      const totalCount = await auditLogRepo.count();

      const oldestRecord = await auditLogRepo
        .createQueryBuilder("audit_logs")
        .select("MIN(audit_logs.timestamp)", "oldest")
        .getRawOne();

      return {
        total_records: totalCount,
        old_records_to_delete: oldRecordsCount,
        retention_days: retentionDays,
        cutoff_date: cutoffDate.toISOString(),
        oldest_record_date: oldestRecord?.oldest || null,
        cleanup_enabled: this.isEnabled,
      };
    } catch (error) {
      logger.error("Error getting cleanup stats:", error);
      return null;
    }
  }
}

module.exports = AuditTrailCleanupScheduler;