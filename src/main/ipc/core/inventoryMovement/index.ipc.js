// src/main/ipc/core/inventoryMovement/index.ipc.js - Inventory Movement Management Handler (Offline Only)
//@ts-check
const { ipcMain } = require("electron");
const { logger } = require("../../../../utils/logger");
const { AppDataSource } = require("../../../db/data-source");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");

class InventoryMovementHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ-ONLY HANDLERS
    this.getAllMovements = this.importHandler("./get/all.ipc");
    this.getMovementById = this.importHandler("./get/by_id.ipc");
    this.getMovementsByMeat = this.importHandler("./get/by_meat.ipc");
    this.getMovementsByBatch = this.importHandler("./get/by_batch.ipc");
    this.getMovementsBySale = this.importHandler("./get/by_sale.ipc");
    this.getMovementStatistics = this.importHandler("./get/statistics.ipc");
    this.searchMovements = this.importHandler("./search.ipc");

    // ✏️ WRITE OPERATION HANDLERS
    this.createMovement = this.importHandler("./create.ipc");
    this.updateMovement = this.importHandler("./update.ipc");
    this.deleteMovement = this.importHandler("./delete.ipc");
    this.permanentlyDeleteMovement = this.importHandler("./permanent_delete.ipc");

    // 🔄 STATE TRANSITION HANDLERS (via StateService)
    this.recalcBatchRemaining = this.importHandler("./recalc_batch.ipc");

    // 🔄 BATCH OPERATIONS
    this.bulkCreateMovements = this.importHandler("./bulk_create.ipc");
    this.bulkUpdateMovements = this.importHandler("./bulk_update.ipc");
    this.importMovementsCSV = this.importHandler("./import_csv.ipc");
    this.exportMovements = this.importHandler("./export.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[InventoryMovementHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`InventoryMovementHandler: ${method}`, { params });
      }

      switch (method) {
        // 📋 READ-ONLY OPERATIONS
        case "getAllMovements":
          return await this.getAllMovements(params);
        case "getMovementById":
          return await this.getMovementById(params);
        case "getMovementsByMeat":
          return await this.getMovementsByMeat(params);
        case "getMovementsByBatch":
          return await this.getMovementsByBatch(params);
        case "getMovementsBySale":
          return await this.getMovementsBySale(params);
        case "getMovementStatistics":
          return await this.getMovementStatistics(params);
        case "searchMovements":
          return await this.searchMovements(params);

        // ✏️ WRITE OPERATIONS (with transaction)
        case "createMovement":
          return await this.handleWithTransaction(this.createMovement, params);
        case "updateMovement":
          return await this.handleWithTransaction(this.updateMovement, params);
        case "deleteMovement":
          return await this.handleWithTransaction(this.deleteMovement, params);
        case "permanentlyDeleteMovement":
          return await this.handleWithTransaction(this.permanentlyDeleteMovement, params);

        // 🔄 STATE TRANSITIONS (with transaction)
        case "recalcBatchRemaining":
          return await this.handleWithTransaction(this.recalcBatchRemaining, params);

        // 🔄 BATCH OPERATIONS (with transaction)
        case "bulkCreateMovements":
          return await this.handleWithTransaction(this.bulkCreateMovements, params);
        case "bulkUpdateMovements":
          return await this.handleWithTransaction(this.bulkUpdateMovements, params);
        case "importMovementsCSV":
          return await this.handleWithTransaction(this.importMovementsCSV, params);

        // 📄 EXPORT (read-only)
        case "exportMovements":
          return await this.exportMovements(params);

        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("InventoryMovementHandler error:", error);
      if (logger) {
        logger.error("InventoryMovementHandler error:", error);
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
const inventoryMovementHandler = new InventoryMovementHandler();

ipcMain.handle(
  "inventoryMovement",
  withErrorHandling(
    inventoryMovementHandler.handleRequest.bind(inventoryMovementHandler),
    "IPC:inventoryMovement"
  )
);

module.exports = { InventoryMovementHandler, inventoryMovementHandler };