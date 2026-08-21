// src/main/ipc/core/returnRefund/index.ipc.js - Return Refund Management Handler (Offline Only)

const { ipcMain } = require("electron");
const { logger } = require("../../../../utils/logger");
const { AppDataSource } = require("../../../db/data-source");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");

class ReturnRefundHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ-ONLY HANDLERS
    this.getAllReturns = this.importHandler("./get/all.ipc");
    this.getReturnById = this.importHandler("./get/by_id.ipc");
    this.getReturnsBySale = this.importHandler("./get/by_sale.ipc");
    this.getReturnsByCustomer = this.importHandler("./get/by_customer.ipc");
    this.getReturnsByStatus = this.importHandler("./get/by_status.ipc");
    this.getReturnStatistics = this.importHandler("./get/statistics.ipc");
    this.searchReturns = this.importHandler("./search.ipc");

    // ✏️ WRITE OPERATION HANDLERS
    this.createReturn = this.importHandler("./create.ipc");
    this.updateReturn = this.importHandler("./update.ipc");
    this.deleteReturn = this.importHandler("./delete.ipc");
    this.restoreReturn = this.importHandler("./restore.ipc");
    this.permanentlyDeleteReturn = this.importHandler("./permanent_delete.ipc");

    // 🔄 STATE TRANSITION HANDLERS (via StateService)
    this.processReturn = this.importHandler("./process_return.ipc");
    this.cancelReturn = this.importHandler("./cancel_return.ipc");

    // 🔄 BATCH OPERATIONS
    this.bulkCreateReturns = this.importHandler("./bulk_create.ipc");
    this.bulkUpdateReturns = this.importHandler("./bulk_update.ipc");
    this.importReturnsCSV = this.importHandler("./import_csv.ipc");
    this.exportReturns = this.importHandler("./export.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[ReturnRefundHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`ReturnRefundHandler: ${method}`, { params });
      }

      switch (method) {
        // 📋 READ-ONLY OPERATIONS
        case "getAllReturns":
          return await this.getAllReturns(params);
        case "getReturnById":
          return await this.getReturnById(params);
        case "getReturnsBySale":
          return await this.getReturnsBySale(params);
        case "getReturnsByCustomer":
          return await this.getReturnsByCustomer(params);
        case "getReturnsByStatus":
          return await this.getReturnsByStatus(params);
        case "getReturnStatistics":
          return await this.getReturnStatistics(params);
        case "searchReturns":
          return await this.searchReturns(params);

        // ✏️ WRITE OPERATIONS (with transaction)
        case "createReturn":
          return await this.handleWithTransaction(this.createReturn, params);
        case "updateReturn":
          return await this.handleWithTransaction(this.updateReturn, params);
        case "deleteReturn":
          return await this.handleWithTransaction(this.deleteReturn, params);
        case "restoreReturn":
          return await this.handleWithTransaction(this.restoreReturn, params);
        case "permanentlyDeleteReturn":
          return await this.handleWithTransaction(this.permanentlyDeleteReturn, params);

        // 🔄 STATE TRANSITIONS (with transaction)
        case "processReturn":
          return await this.handleWithTransaction(this.processReturn, params);
        case "cancelReturn":
          return await this.handleWithTransaction(this.cancelReturn, params);

        // 🔄 BATCH OPERATIONS (with transaction)
        case "bulkCreateReturns":
          return await this.handleWithTransaction(this.bulkCreateReturns, params);
        case "bulkUpdateReturns":
          return await this.handleWithTransaction(this.bulkUpdateReturns, params);
        case "importReturnsCSV":
          return await this.handleWithTransaction(this.importReturnsCSV, params);

        // 📄 EXPORT (read-only)
        case "exportReturns":
          return await this.exportReturns(params);

        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("ReturnRefundHandler error:", error);
      if (logger) {
        logger.error("ReturnRefundHandler error:", error);
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
const returnRefundHandler = new ReturnRefundHandler();

ipcMain.handle(
  "returnRefund",
  withErrorHandling(
    returnRefundHandler.handleRequest.bind(returnRefundHandler),
    "IPC:returnRefund"
  )
);

module.exports = { ReturnRefundHandler, returnRefundHandler };