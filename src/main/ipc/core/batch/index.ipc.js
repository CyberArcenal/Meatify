// src/main/ipc/core/batch/index.ipc.js - Batch Management Handler (Offline Only)

const { ipcMain } = require("electron");
const { logger } = require("../../../../utils/logger");
const { AppDataSource } = require("../../../db/data-source");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");

class BatchHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ-ONLY HANDLERS
    this.getAllBatches = this.importHandler("./get/all.ipc");
    this.getBatchById = this.importHandler("./get/by_id.ipc");
    this.getBatchesByMeat = this.importHandler("./get/by_meat.ipc");
    this.getActiveBatches = this.importHandler("./get/active.ipc");
    this.getExpiringBatches = this.importHandler("./get/expiring.ipc");
    this.getBatchStatistics = this.importHandler("./get/statistics.ipc");
    this.searchBatches = this.importHandler("./search.ipc");

    // ✏️ WRITE OPERATION HANDLERS
    this.createBatch = this.importHandler("./create.ipc");
    this.updateBatch = this.importHandler("./update.ipc");
    this.deleteBatch = this.importHandler("./delete.ipc");
    this.restoreBatch = this.importHandler("./restore.ipc");
    this.permanentlyDeleteBatch = this.importHandler("./permanent_delete.ipc");

    // 🔄 STATE TRANSITION HANDLERS (via StateService)
    this.deductFromBatch = this.importHandler("./deduct_from_batch.ipc");
    this.fifoDeduct = this.importHandler("./fifo_deduct.ipc");
    this.markBatchExpired = this.importHandler("./mark_expired.ipc");

    // 🔄 BATCH OPERATIONS
    this.bulkCreateBatches = this.importHandler("./bulk_create.ipc");
    this.bulkUpdateBatches = this.importHandler("./bulk_update.ipc");
    this.importBatchesCSV = this.importHandler("./import_csv.ipc");
    this.exportBatches = this.importHandler("./export.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[BatchHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`BatchHandler: ${method}`, { params });
      }

      switch (method) {
        // 📋 READ-ONLY OPERATIONS
        case "getAllBatches":
          return await this.getAllBatches(params);
        case "getBatchById":
          return await this.getBatchById(params);
        case "getBatchesByMeat":
          return await this.getBatchesByMeat(params);
        case "getActiveBatches":
          return await this.getActiveBatches(params);
        case "getExpiringBatches":
          return await this.getExpiringBatches(params);
        case "getBatchStatistics":
          return await this.getBatchStatistics(params);
        case "searchBatches":
          return await this.searchBatches(params);

        // ✏️ WRITE OPERATIONS (with transaction)
        case "createBatch":
          return await this.handleWithTransaction(this.createBatch, params);
        case "updateBatch":
          return await this.handleWithTransaction(this.updateBatch, params);
        case "deleteBatch":
          return await this.handleWithTransaction(this.deleteBatch, params);
        case "restoreBatch":
          return await this.handleWithTransaction(this.restoreBatch, params);
        case "permanentlyDeleteBatch":
          return await this.handleWithTransaction(this.permanentlyDeleteBatch, params);

        // 🔄 STATE TRANSITIONS (with transaction)
        case "deductFromBatch":
          return await this.handleWithTransaction(this.deductFromBatch, params);
        case "fifoDeduct":
          return await this.handleWithTransaction(this.fifoDeduct, params);
        case "markBatchExpired":
          return await this.handleWithTransaction(this.markBatchExpired, params);

        // 🔄 BATCH OPERATIONS (with transaction)
        case "bulkCreateBatches":
          return await this.handleWithTransaction(this.bulkCreateBatches, params);
        case "bulkUpdateBatches":
          return await this.handleWithTransaction(this.bulkUpdateBatches, params);
        case "importBatchesCSV":
          return await this.handleWithTransaction(this.importBatchesCSV, params);

        // 📄 EXPORT (read-only)
        case "exportBatches":
          return await this.exportBatches(params);

        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("BatchHandler error:", error);
      if (logger) {
        logger.error("BatchHandler error:", error);
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
const batchHandler = new BatchHandler();

ipcMain.handle(
  "batch",
  withErrorHandling(
    batchHandler.handleRequest.bind(batchHandler),
    "IPC:batch"
  )
);

module.exports = { BatchHandler, batchHandler };