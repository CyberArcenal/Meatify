// src/main/ipc/core/category/index.ipc.js - Category Management Handler (Offline Only)
//@ts-check
const { ipcMain } = require("electron");
const { logger } = require("../../../../utils/logger");
const { AppDataSource } = require("../../../db/data-source");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");

class CategoryHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ-ONLY HANDLERS
    this.getAllCategories = this.importHandler("./get/all.ipc");
    this.getCategoryById = this.importHandler("./get/by_id.ipc");
    this.getActiveCategories = this.importHandler("./get/active.ipc");
    this.getCategoryStatistics = this.importHandler("./get/statistics.ipc");
    this.searchCategories = this.importHandler("./search.ipc");

    // ✏️ WRITE OPERATION HANDLERS
    this.createCategory = this.importHandler("./create.ipc");
    this.updateCategory = this.importHandler("./update.ipc");
    this.deleteCategory = this.importHandler("./delete.ipc");
    this.restoreCategory = this.importHandler("./restore.ipc");
    this.permanentlyDeleteCategory = this.importHandler("./permanent_delete.ipc");

    // 🔄 STATE TRANSITION HANDLERS (via StateService)
    this.activateCategory = this.importHandler("./activate_category.ipc");
    this.deactivateCategory = this.importHandler("./deactivate_category.ipc");
    this.mergeCategories = this.importHandler("./merge_categories.ipc");

    // 🔄 BATCH OPERATIONS
    this.bulkCreateCategories = this.importHandler("./bulk_create.ipc");
    this.bulkUpdateCategories = this.importHandler("./bulk_update.ipc");
    this.importCategoriesCSV = this.importHandler("./import_csv.ipc");
    this.exportCategories = this.importHandler("./export.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[CategoryHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`CategoryHandler: ${method}`, { params });
      }

      switch (method) {
        // 📋 READ-ONLY OPERATIONS
        case "getAllCategories":
          return await this.getAllCategories(params);
        case "getCategoryById":
          return await this.getCategoryById(params);
        case "getActiveCategories":
          return await this.getActiveCategories(params);
        case "getCategoryStatistics":
          return await this.getCategoryStatistics(params);
        case "searchCategories":
          return await this.searchCategories(params);

        // ✏️ WRITE OPERATIONS (with transaction)
        case "createCategory":
          return await this.handleWithTransaction(this.createCategory, params);
        case "updateCategory":
          return await this.handleWithTransaction(this.updateCategory, params);
        case "deleteCategory":
          return await this.handleWithTransaction(this.deleteCategory, params);
        case "restoreCategory":
          return await this.handleWithTransaction(this.restoreCategory, params);
        case "permanentlyDeleteCategory":
          return await this.handleWithTransaction(this.permanentlyDeleteCategory, params);

        // 🔄 STATE TRANSITIONS (with transaction)
        case "activateCategory":
          return await this.handleWithTransaction(this.activateCategory, params);
        case "deactivateCategory":
          return await this.handleWithTransaction(this.deactivateCategory, params);
        case "mergeCategories":
          return await this.handleWithTransaction(this.mergeCategories, params);

        // 🔄 BATCH OPERATIONS (with transaction)
        case "bulkCreateCategories":
          return await this.handleWithTransaction(this.bulkCreateCategories, params);
        case "bulkUpdateCategories":
          return await this.handleWithTransaction(this.bulkUpdateCategories, params);
        case "importCategoriesCSV":
          return await this.handleWithTransaction(this.importCategoriesCSV, params);

        // 📄 EXPORT (read-only)
        case "exportCategories":
          return await this.exportCategories(params);

        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("CategoryHandler error:", error);
      if (logger) {
        logger.error("CategoryHandler error:", error);
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
const categoryHandler = new CategoryHandler();

ipcMain.handle(
  "category",
  withErrorHandling(
    categoryHandler.handleRequest.bind(categoryHandler),
    "IPC:category"
  )
);

module.exports = { CategoryHandler, categoryHandler };