// src/main/ipc/core/notificationLog/index.ipc.js - NotificationLog Management Handler (Offline Only)

const { ipcMain } = require("electron");
const { logger } = require("../../../utils/logger");
const { AppDataSource } = require("../../db/data-source");
const { withErrorHandling } = require("../../../middlewares/errorHandler");

class NotificationLogHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ-ONLY HANDLERS
    this.getAllLogs = this.importHandler("./get/all.ipc");
    this.getLogById = this.importHandler("./get/by_id.ipc");
    this.getLogsByRecipient = this.importHandler("./get/by_recipient.ipc");
    this.getLogsByStatus = this.importHandler("./get/by_status.ipc");
    this.getLogStatistics = this.importHandler("./get/statistics.ipc");
    this.searchLogs = this.importHandler("./search.ipc");

    // ✏️ WRITE OPERATION HANDLERS
    this.createLog = this.importHandler("./create.ipc");
    this.updateLog = this.importHandler("./update.ipc");
    this.deleteLog = this.importHandler("./delete.ipc");
    this.permanentlyDeleteLog = this.importHandler("./permanent_delete.ipc");

    // 🔄 RETRY OPERATIONS (via StateService)
    this.retryLog = this.importHandler("./retry.ipc");
    this.retryAllFailed = this.importHandler("./retry_all.ipc");
    this.resendLog = this.importHandler("./resend.ipc");

    // 🔄 BATCH OPERATIONS
    this.bulkCreateLogs = this.importHandler("./bulk_create.ipc");
    this.bulkUpdateLogs = this.importHandler("./bulk_update.ipc");
    this.importLogsCSV = this.importHandler("./import_csv.ipc");
    this.exportLogs = this.importHandler("./export.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[NotificationLogHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`NotificationLogHandler: ${method}`, { params });
      }

      switch (method) {
        // 📋 READ-ONLY OPERATIONS
        case "getAllLogs":
          return await this.getAllLogs(params);
        case "getLogById":
          return await this.getLogById(params);
        case "getLogsByRecipient":
          return await this.getLogsByRecipient(params);
        case "getLogsByStatus":
          return await this.getLogsByStatus(params);
        case "getLogStatistics":
          return await this.getLogStatistics(params);
        case "searchLogs":
          return await this.searchLogs(params);

        // ✏️ WRITE OPERATIONS (with transaction)
        case "createLog":
          return await this.handleWithTransaction(this.createLog, params);
        case "updateLog":
          return await this.handleWithTransaction(this.updateLog, params);
        case "deleteLog":
          return await this.handleWithTransaction(this.deleteLog, params);
        case "permanentlyDeleteLog":
          return await this.handleWithTransaction(this.permanentlyDeleteLog, params);

        // 🔄 RETRY OPERATIONS (with transaction)
        case "retryLog":
          return await this.handleWithTransaction(this.retryLog, params);
        case "retryAllFailed":
          return await this.handleWithTransaction(this.retryAllFailed, params);
        case "resendLog":
          return await this.handleWithTransaction(this.resendLog, params);

        // 🔄 BATCH OPERATIONS (with transaction)
        case "bulkCreateLogs":
          return await this.handleWithTransaction(this.bulkCreateLogs, params);
        case "bulkUpdateLogs":
          return await this.handleWithTransaction(this.bulkUpdateLogs, params);
        case "importLogsCSV":
          return await this.handleWithTransaction(this.importLogsCSV, params);

        // 📄 EXPORT (read-only)
        case "exportLogs":
          return await this.exportLogs(params);

        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("NotificationLogHandler error:", error);
      if (logger) {
        logger.error("NotificationLogHandler error:", error);
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
const notificationLogHandler = new NotificationLogHandler();

ipcMain.handle(
  "notificationLog",
  withErrorHandling(
    notificationLogHandler.handleRequest.bind(notificationLogHandler),
    "IPC:notificationLog"
  )
);

module.exports = { NotificationLogHandler, notificationLogHandler };