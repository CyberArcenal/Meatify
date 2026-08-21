// src/main/ipc/core/purchase/index.ipc.js - Purchase Management Handler (Offline Only)

const { ipcMain } = require("electron");
const { logger } = require("../../../../utils/logger");
const { AppDataSource } = require("../../../db/data-source");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");

class PurchaseHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ-ONLY HANDLERS
    this.getAllPurchases = this.importHandler("./get/all.ipc");
    this.getPurchaseById = this.importHandler("./get/by_id.ipc");
    this.getPurchasesBySupplier = this.importHandler("./get/by_supplier.ipc");
    this.getPurchasesByStatus = this.importHandler("./get/by_status.ipc");
    this.getPurchaseStatistics = this.importHandler("./get/statistics.ipc");
    this.searchPurchases = this.importHandler("./search.ipc");

    // ✏️ WRITE OPERATION HANDLERS
    this.createPurchase = this.importHandler("./create.ipc");
    this.updatePurchase = this.importHandler("./update.ipc");
    this.deletePurchase = this.importHandler("./delete.ipc");
    this.restorePurchase = this.importHandler("./restore.ipc");
    this.permanentlyDeletePurchase = this.importHandler("./permanent_delete.ipc");

    // 🔄 STATE TRANSITION HANDLERS (via StateService)
    this.approvePurchase = this.importHandler("./approve_purchase.ipc");
    this.completePurchase = this.importHandler("./complete_purchase.ipc");
    this.cancelPurchase = this.importHandler("./cancel_purchase.ipc");

    // 🔄 BATCH OPERATIONS
    this.bulkCreatePurchases = this.importHandler("./bulk_create.ipc");
    this.bulkUpdatePurchases = this.importHandler("./bulk_update.ipc");
    this.importPurchasesCSV = this.importHandler("./import_csv.ipc");
    this.exportPurchases = this.importHandler("./export.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[PurchaseHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`PurchaseHandler: ${method}`, { params });
      }

      switch (method) {
        // 📋 READ-ONLY OPERATIONS
        case "getAllPurchases":
          return await this.getAllPurchases(params);
        case "getPurchaseById":
          return await this.getPurchaseById(params);
        case "getPurchasesBySupplier":
          return await this.getPurchasesBySupplier(params);
        case "getPurchasesByStatus":
          return await this.getPurchasesByStatus(params);
        case "getPurchaseStatistics":
          return await this.getPurchaseStatistics(params);
        case "searchPurchases":
          return await this.searchPurchases(params);

        // ✏️ WRITE OPERATIONS (with transaction)
        case "createPurchase":
          return await this.handleWithTransaction(this.createPurchase, params);
        case "updatePurchase":
          return await this.handleWithTransaction(this.updatePurchase, params);
        case "deletePurchase":
          return await this.handleWithTransaction(this.deletePurchase, params);
        case "restorePurchase":
          return await this.handleWithTransaction(this.restorePurchase, params);
        case "permanentlyDeletePurchase":
          return await this.handleWithTransaction(this.permanentlyDeletePurchase, params);

        // 🔄 STATE TRANSITIONS (with transaction)
        case "approvePurchase":
          return await this.handleWithTransaction(this.approvePurchase, params);
        case "completePurchase":
          return await this.handleWithTransaction(this.completePurchase, params);
        case "cancelPurchase":
          return await this.handleWithTransaction(this.cancelPurchase, params);

        // 🔄 BATCH OPERATIONS (with transaction)
        case "bulkCreatePurchases":
          return await this.handleWithTransaction(this.bulkCreatePurchases, params);
        case "bulkUpdatePurchases":
          return await this.handleWithTransaction(this.bulkUpdatePurchases, params);
        case "importPurchasesCSV":
          return await this.handleWithTransaction(this.importPurchasesCSV, params);

        // 📄 EXPORT (read-only)
        case "exportPurchases":
          return await this.exportPurchases(params);

        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("PurchaseHandler error:", error);
      if (logger) {
        logger.error("PurchaseHandler error:", error);
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
const purchaseHandler = new PurchaseHandler();

ipcMain.handle(
  "purchase",
  withErrorHandling(
    purchaseHandler.handleRequest.bind(purchaseHandler),
    "IPC:purchase"
  )
);

module.exports = { PurchaseHandler, purchaseHandler };