// src/main/ipc/core/sale/index.ipc.js - Sale Management Handler (Offline Only)

const { ipcMain } = require("electron");
const { logger } = require("../../../utils/logger");
const { AppDataSource } = require("../../db/data-source");
const { withErrorHandling } = require("../../../middlewares/errorHandler");

class SaleHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ-ONLY HANDLERS
    this.getAllSales = this.importHandler("./get/all.ipc");
    this.getSaleById = this.importHandler("./get/by_id.ipc");
    this.getSalesByCustomer = this.importHandler("./get/by_customer.ipc");
    this.getSalesByStatus = this.importHandler("./get/by_status.ipc");
    this.getSalesByDateRange = this.importHandler("./get/by_date_range.ipc");
    this.getSaleStatistics = this.importHandler("./get/statistics.ipc");
    this.searchSales = this.importHandler("./search.ipc");

    // ✏️ WRITE OPERATION HANDLERS
    this.createSale = this.importHandler("./create.ipc");
    this.updateSale = this.importHandler("./update.ipc");
    this.deleteSale = this.importHandler("./delete.ipc");
    this.restoreSale = this.importHandler("./restore.ipc");
    this.permanentlyDeleteSale = this.importHandler("./permanent_delete.ipc");

    // 🔄 STATE TRANSITION HANDLERS (via StateService)
    this.markAsPaid = this.importHandler("./mark_as_paid.ipc");
    this.refundSale = this.importHandler("./refund_sale.ipc");
    this.voidSale = this.importHandler("./void_sale.ipc");

    // 🔄 BATCH OPERATIONS
    this.bulkCreateSales = this.importHandler("./bulk_create.ipc");
    this.bulkUpdateSales = this.importHandler("./bulk_update.ipc");
    this.importSalesCSV = this.importHandler("./import_csv.ipc");
    this.exportSales = this.importHandler("./export.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[SaleHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`SaleHandler: ${method}`, { params });
      }

      switch (method) {
        // 📋 READ-ONLY OPERATIONS
        case "getAllSales":
          return await this.getAllSales(params);
        case "getSaleById":
          return await this.getSaleById(params);
        case "getSalesByCustomer":
          return await this.getSalesByCustomer(params);
        case "getSalesByStatus":
          return await this.getSalesByStatus(params);
        case "getSalesByDateRange":
          return await this.getSalesByDateRange(params);
        case "getSaleStatistics":
          return await this.getSaleStatistics(params);
        case "searchSales":
          return await this.searchSales(params);

        // ✏️ WRITE OPERATIONS (with transaction)
        case "createSale":
          return await this.handleWithTransaction(this.createSale, params);
        case "updateSale":
          return await this.handleWithTransaction(this.updateSale, params);
        case "deleteSale":
          return await this.handleWithTransaction(this.deleteSale, params);
        case "restoreSale":
          return await this.handleWithTransaction(this.restoreSale, params);
        case "permanentlyDeleteSale":
          return await this.handleWithTransaction(this.permanentlyDeleteSale, params);

        // 🔄 STATE TRANSITIONS (with transaction)
        case "markAsPaid":
          return await this.handleWithTransaction(this.markAsPaid, params);
        case "refundSale":
          return await this.handleWithTransaction(this.refundSale, params);
        case "voidSale":
          return await this.handleWithTransaction(this.voidSale, params);

        // 🔄 BATCH OPERATIONS (with transaction)
        case "bulkCreateSales":
          return await this.handleWithTransaction(this.bulkCreateSales, params);
        case "bulkUpdateSales":
          return await this.handleWithTransaction(this.bulkUpdateSales, params);
        case "importSalesCSV":
          return await this.handleWithTransaction(this.importSalesCSV, params);

        // 📄 EXPORT (read-only)
        case "exportSales":
          return await this.exportSales(params);

        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("SaleHandler error:", error);
      if (logger) {
        logger.error("SaleHandler error:", error);
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
const saleHandler = new SaleHandler();

ipcMain.handle(
  "sale",
  withErrorHandling(
    saleHandler.handleRequest.bind(saleHandler),
    "IPC:sale"
  )
);

module.exports = { SaleHandler, saleHandler };