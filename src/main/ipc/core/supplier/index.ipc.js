// src/main/ipc/core/supplier/index.ipc.js - Supplier Management Handler (Offline Only)
//@ts-check
const { ipcMain } = require("electron");
const { logger } = require("../../../../utils/logger");
const { AppDataSource } = require("../../../db/data-source");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");

class SupplierHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ-ONLY HANDLERS
    this.getAllSuppliers = this.importHandler("./get/all.ipc");
    this.getSupplierById = this.importHandler("./get/by_id.ipc");
    this.getActiveSuppliers = this.importHandler("./get/active.ipc");
    this.getSupplierStatistics = this.importHandler("./get/statistics.ipc");
    this.searchSuppliers = this.importHandler("./search.ipc");

    // ✏️ WRITE OPERATION HANDLERS
    this.createSupplier = this.importHandler("./create.ipc");
    this.updateSupplier = this.importHandler("./update.ipc");
    this.deleteSupplier = this.importHandler("./delete.ipc");
    this.restoreSupplier = this.importHandler("./restore.ipc");
    this.permanentlyDeleteSupplier = this.importHandler("./permanent_delete.ipc");

    // 🔄 STATE TRANSITION HANDLERS (via StateService)
    this.activateSupplier = this.importHandler("./activate_supplier.ipc");
    this.deactivateSupplier = this.importHandler("./deactivate_supplier.ipc");
    this.mergeSuppliers = this.importHandler("./merge_suppliers.ipc");
    this.notifySupplier = this.importHandler("./notify_supplier.ipc");

    // 🔄 BATCH OPERATIONS
    this.bulkCreateSuppliers = this.importHandler("./bulk_create.ipc");
    this.bulkUpdateSuppliers = this.importHandler("./bulk_update.ipc");
    this.importSuppliersCSV = this.importHandler("./import_csv.ipc");
    this.exportSuppliers = this.importHandler("./export.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[SupplierHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`SupplierHandler: ${method}`, { params });
      }

      switch (method) {
        // 📋 READ-ONLY OPERATIONS
        case "getAllSuppliers":
          return await this.getAllSuppliers(params);
        case "getSupplierById":
          return await this.getSupplierById(params);
        case "getActiveSuppliers":
          return await this.getActiveSuppliers(params);
        case "getSupplierStatistics":
          return await this.getSupplierStatistics(params);
        case "searchSuppliers":
          return await this.searchSuppliers(params);

        // ✏️ WRITE OPERATIONS (with transaction)
        case "createSupplier":
          return await this.handleWithTransaction(this.createSupplier, params);
        case "updateSupplier":
          return await this.handleWithTransaction(this.updateSupplier, params);
        case "deleteSupplier":
          return await this.handleWithTransaction(this.deleteSupplier, params);
        case "restoreSupplier":
          return await this.handleWithTransaction(this.restoreSupplier, params);
        case "permanentlyDeleteSupplier":
          return await this.handleWithTransaction(this.permanentlyDeleteSupplier, params);

        // 🔄 STATE TRANSITIONS (with transaction)
        case "activateSupplier":
          return await this.handleWithTransaction(this.activateSupplier, params);
        case "deactivateSupplier":
          return await this.handleWithTransaction(this.deactivateSupplier, params);
        case "mergeSuppliers":
          return await this.handleWithTransaction(this.mergeSuppliers, params);
        case "notifySupplier":
          return await this.handleWithTransaction(this.notifySupplier, params);

        // 🔄 BATCH OPERATIONS (with transaction)
        case "bulkCreateSuppliers":
          return await this.handleWithTransaction(this.bulkCreateSuppliers, params);
        case "bulkUpdateSuppliers":
          return await this.handleWithTransaction(this.bulkUpdateSuppliers, params);
        case "importSuppliersCSV":
          return await this.handleWithTransaction(this.importSuppliersCSV, params);

        // 📄 EXPORT (read-only)
        case "exportSuppliers":
          return await this.exportSuppliers(params);

        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("SupplierHandler error:", error);
      if (logger) {
        logger.error("SupplierHandler error:", error);
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
const supplierHandler = new SupplierHandler();

ipcMain.handle(
  "supplier",
  withErrorHandling(
    supplierHandler.handleRequest.bind(supplierHandler),
    "IPC:supplier"
  )
);

module.exports = { SupplierHandler, supplierHandler };