// src/stateServices/common/AuditLogger.js
const { logger } = require("../../utils/logger");
const auditLogger = require("../../utils/auditLogger");
const system = require("../../utils/system");

/**
 * AuditLogger - Centralized audit logging wrapper.
 * All methods are static; no instantiation needed.
 *
 * Automatically checks whether audit logging is enabled (audit_log_enabled)
 * and only writes entries if enabled.
 *
 * Usage:
 *   await AuditLogger.logCreate('Customer', 42, customerData, 'admin');
 *   await AuditLogger.logUpdate('Sale', 101, oldData, newData, 'system');
 *   await AuditLogger.logDelete('Batch', 7, batchData, 'system');
 */
class AuditLogger {
  /**
   * Log a creation event.
   * @param {string} entity - Entity name (e.g., 'Customer', 'Sale')
   * @param {number} entityId - ID of the created entity (may be null if unknown)
   * @param {Object} data - The entity data that was created
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner - Optional (for future use, not used directly)
   * @returns {Promise<void>}
   */
  static async logCreate(entity, entityId, data, user = "system", queryRunner = null) {
    try {
      const auditEnabled = await system.auditLogEnabled();
      if (!auditEnabled) return;
      await auditLogger.logCreate(entity, entityId, data, user);
    } catch (err) {
      logger.error(`[AuditLogger] Failed to log CREATE for ${entity}#${entityId}:`, err);
    }
  }

  /**
   * Log an update event.
   * @param {string} entity - Entity name
   * @param {number} entityId - ID of the updated entity
   * @param {Object} oldData - The data before the update
   * @param {Object} newData - The data after the update
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner - Optional (for future use, not used directly)
   * @returns {Promise<void>}
   */
  static async logUpdate(entity, entityId, oldData, newData, user = "system", queryRunner = null) {
    try {
      const auditEnabled = await system.auditLogEnabled();
      if (!auditEnabled) return;
      await auditLogger.logUpdate(entity, entityId, oldData, newData, user);
    } catch (err) {
      logger.error(`[AuditLogger] Failed to log UPDATE for ${entity}#${entityId}:`, err);
    }
  }

  /**
   * Log a deletion event (soft or hard).
   * @param {string} entity - Entity name
   * @param {number} entityId - ID of the deleted entity
   * @param {Object} data - The entity data that was deleted (if available)
   * @param {string} user - User performing the action
   * @param {import("typeorm").QueryRunner | null} queryRunner - Optional (for future use, not used directly)
   * @returns {Promise<void>}
   */
  static async logDelete(entity, entityId, data, user = "system", queryRunner = null) {
    try {
      const auditEnabled = await system.auditLogEnabled();
      if (!auditEnabled) return;
      // Use logCreate with 'DELETE' as action if you want to distinguish,
      // but the original auditLogger.logCreate is used for deletions.
      // We'll pass a special marker inside the data object.
      await auditLogger.logCreate(entity, entityId, { ...data, _action: "DELETE" }, user);
    } catch (err) {
      logger.error(`[AuditLogger] Failed to log DELETE for ${entity}#${entityId}:`, err);
    }
  }
}

module.exports = AuditLogger;