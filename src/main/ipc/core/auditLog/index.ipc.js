// src/main/ipc/core/auditLog/index.ipc.js - AuditLog Management Handler (Offline Only)

const { ipcMain } = require("electron");
const { logger } = require("../../../../utils/logger");
const { AppDataSource } = require("../../../db/data-source");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");

class AuditLogHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ-ONLY HANDLERS
    this.getAllAuditLogs = this.importHandler("./get/all.ipc");
    this.getAuditLogById = this.importHandler("./get/by_id.ipc");
    this.getAuditLogStatistics = this.importHandler("./get/statistics.ipc");
    this.searchAuditLogs = this.importHandler("./search.ipc");

    // ✏️ WRITE OPERATION HANDLERS
    this.createAuditLog = this.importHandler("./create.ipc");
    this.updateAuditLog = this.importHandler("./update.ipc");
    this.deleteAuditLog = this.importHandler("./delete.ipc");
    this.permanentlyDeleteAuditLog = this.importHandler("./permanent_delete.ipc");

    // 🔄 BATCH OPERATIONS
    this.bulkCreateAuditLogs = this.importHandler("./bulk_create.ipc");
    this.bulkUpdateAuditLogs = this.importHandler("./bulk_update.ipc");
    this.importAuditLogsCSV = this.importHandler("./import_csv.ipc");
    this.exportAuditLogs = this.importHandler("./export.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[AuditLogHandler] Failed to load handler: ${path}`, error.message);
      return async () => ({
        status: false,
        message: `Handler not implemented: ${path}`,
        data: null,
      });
    }
  }

  async handleRequest(event, payload) {
    try {
      const method = payload.method;
      const params = payload.params || {};

      if (logger) {
        logger.info(`AuditLogHandler: ${method}`, { params });
      }

      switch (method) {
        // 📋 READ-ONLY OPERATIONS
        case "getAllAuditLogs":
          return await this.getAllAuditLogs(params);
        case "getAuditLogById":
          return await this.getAuditLogById(params);
        case "getAuditLogStatistics":
          return await this.getAuditLogStatistics(params);
        case "searchAuditLogs":
          return await this.searchAuditLogs(params);

        // ✏️ WRITE OPERATIONS (with transaction)
        case "createAuditLog":
          return await this.handleWithTransaction(this.createAuditLog, params);
        case "updateAuditLog":
          return await this.handleWithTransaction(this.updateAuditLog, params);
        case "deleteAuditLog":
          return await this.handleWithTransaction(this.deleteAuditLog, params);
        case "permanentlyDeleteAuditLog":
          return await this.handleWithTransaction(this.permanentlyDeleteAuditLog, params);

        // 🔄 BATCH OPERATIONS (with transaction)
        case "bulkCreateAuditLogs":
          return await this.handleWithTransaction(this.bulkCreateAuditLogs, params);
        case "bulkUpdateAuditLogs":
          return await this.handleWithTransaction(this.bulkUpdateAuditLogs, params);
        case "importAuditLogsCSV":
          return await this.handleWithTransaction(this.importAuditLogsCSV, params);

        // 📄 EXPORT (read-only)
        case "exportAuditLogs":
          return await this.exportAuditLogs(params);

        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("AuditLogHandler error:", error);
      if (logger) {
        logger.error("AuditLogHandler error:", error);
      }
      return {
        status: false,
        message: error.message || "Internal server error",
        data: null,
      };
    }
  }

  async handleWithTransaction(handler, params) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await handler(params, queryRunner);
      if (result.status) {
        await queryRunner.commitTransaction();
      } else {
        await queryRunner.rollbackTransaction();
      }
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

// Register IPC handler
const auditLogHandler = new AuditLogHandler();

ipcMain.handle(
  "auditLog",
  withErrorHandling(
    auditLogHandler.handleRequest.bind(auditLogHandler),
    "IPC:auditLog"
  )
);

module.exports = { AuditLogHandler, auditLogHandler };