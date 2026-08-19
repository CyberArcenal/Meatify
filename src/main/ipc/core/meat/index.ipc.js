// src/main/ipc/core/meat/index.ipc.js - Meat Management Handler (Offline Only)

const { ipcMain } = require("electron");
const { logger } = require("../../../utils/logger");
const { AppDataSource } = require("../../db/data-source");
const { withErrorHandling } = require("../../../middlewares/errorHandler");

class MeatHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ-ONLY HANDLERS
    this.getAllMeats = this.importHandler("./get/all.ipc");
    this.getMeatById = this.importHandler("./get/by_id.ipc");
    this.getActiveMeats = this.importHandler("./get/active.ipc");
    this.getMeatBySku = this.importHandler("./get/by_sku.ipc");
    this.getMeatByBarcode = this.importHandler("./get/by_barcode.ipc");
    this.getMeatStatistics = this.importHandler("./get/statistics.ipc");
    this.searchMeats = this.importHandler("./search.ipc");

    // ✏️ WRITE OPERATION HANDLERS
    this.createMeat = this.importHandler("./create.ipc");
    this.updateMeat = this.importHandler("./update.ipc");
    this.deleteMeat = this.importHandler("./delete.ipc");
    this.restoreMeat = this.importHandler("./restore.ipc");
    this.permanentlyDeleteMeat = this.importHandler("./permanent_delete.ipc");

    // 🔄 STATE TRANSITION HANDLERS (via StateService)
    this.activateMeat = this.importHandler("./activate_meat.ipc");
    this.deactivateMeat = this.importHandler("./deactivate_meat.ipc");
    this.updateMeatPrice = this.importHandler("./update_price.ipc");

    // 🔄 BATCH OPERATIONS
    this.bulkCreateMeats = this.importHandler("./bulk_create.ipc");
    this.bulkUpdateMeats = this.importHandler("./bulk_update.ipc");
    this.importMeatsCSV = this.importHandler("./import_csv.ipc");
    this.exportMeats = this.importHandler("./export.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[MeatHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`MeatHandler: ${method}`, { params });
      }

      switch (method) {
        // 📋 READ-ONLY OPERATIONS
        case "getAllMeats":
          return await this.getAllMeats(params);
        case "getMeatById":
          return await this.getMeatById(params);
        case "getActiveMeats":
          return await this.getActiveMeats(params);
        case "getMeatBySku":
          return await this.getMeatBySku(params);
        case "getMeatByBarcode":
          return await this.getMeatByBarcode(params);
        case "getMeatStatistics":
          return await this.getMeatStatistics(params);
        case "searchMeats":
          return await this.searchMeats(params);

        // ✏️ WRITE OPERATIONS (with transaction)
        case "createMeat":
          return await this.handleWithTransaction(this.createMeat, params);
        case "updateMeat":
          return await this.handleWithTransaction(this.updateMeat, params);
        case "deleteMeat":
          return await this.handleWithTransaction(this.deleteMeat, params);
        case "restoreMeat":
          return await this.handleWithTransaction(this.restoreMeat, params);
        case "permanentlyDeleteMeat":
          return await this.handleWithTransaction(this.permanentlyDeleteMeat, params);

        // 🔄 STATE TRANSITIONS (with transaction)
        case "activateMeat":
          return await this.handleWithTransaction(this.activateMeat, params);
        case "deactivateMeat":
          return await this.handleWithTransaction(this.deactivateMeat, params);
        case "updateMeatPrice":
          return await this.handleWithTransaction(this.updateMeatPrice, params);

        // 🔄 BATCH OPERATIONS (with transaction)
        case "bulkCreateMeats":
          return await this.handleWithTransaction(this.bulkCreateMeats, params);
        case "bulkUpdateMeats":
          return await this.handleWithTransaction(this.bulkUpdateMeats, params);
        case "importMeatsCSV":
          return await this.handleWithTransaction(this.importMeatsCSV, params);

        // 📄 EXPORT (read-only)
        case "exportMeats":
          return await this.exportMeats(params);

        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("MeatHandler error:", error);
      if (logger) {
        logger.error("MeatHandler error:", error);
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
const meatHandler = new MeatHandler();

ipcMain.handle(
  "meat",
  withErrorHandling(
    meatHandler.handleRequest.bind(meatHandler),
    "IPC:meat"
  )
);

module.exports = { MeatHandler, meatHandler };