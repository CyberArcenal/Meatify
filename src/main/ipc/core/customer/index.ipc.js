// src/main/ipc/core/customer/index.ipc.js - Customer Management Handler (Offline Only)
//@ts-check

const { ipcMain } = require("electron");
const { logger } = require("../../../../utils/logger");
const { AppDataSource } = require("../../../db/data-source");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");

class CustomerHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ-ONLY HANDLERS
    this.getAllCustomers = this.importHandler("./get/all.ipc");
    this.getCustomerById = this.importHandler("./get/by_id.ipc");
    this.getActiveCustomers = this.importHandler("./get/active.ipc");
    this.getCustomerStatistics = this.importHandler("./get/statistics.ipc");
    this.searchCustomers = this.importHandler("./search.ipc");

    // ✏️ WRITE OPERATION HANDLERS
    this.createCustomer = this.importHandler("./create.ipc");
    this.updateCustomer = this.importHandler("./update.ipc");
    this.deleteCustomer = this.importHandler("./delete.ipc");
    this.restoreCustomer = this.importHandler("./restore.ipc");
    this.permanentlyDeleteCustomer = this.importHandler("./permanent_delete.ipc");

    // 🔄 LOYALTY TRANSITION HANDLERS (via StateService)
    this.earnPoints = this.importHandler("./earn_points.ipc");
    this.redeemPoints = this.importHandler("./redeem_points.ipc");
    this.adjustPoints = this.importHandler("./adjust_points.ipc");
    this.reverseTransaction = this.importHandler("./reverse_transaction.ipc");
    this.getLoyaltySummary = this.importHandler("./get_loyalty_summary.ipc");

    // 🔄 BATCH OPERATIONS
    this.bulkCreateCustomers = this.importHandler("./bulk_create.ipc");
    this.bulkUpdateCustomers = this.importHandler("./bulk_update.ipc");
    this.importCustomersCSV = this.importHandler("./import_csv.ipc");
    this.exportCustomers = this.importHandler("./export.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[CustomerHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`CustomerHandler: ${method}`, { params });
      }

      switch (method) {
        // 📋 READ-ONLY OPERATIONS
        case "getAllCustomers":
          return await this.getAllCustomers(params);
        case "getCustomerById":
          return await this.getCustomerById(params);
        case "getActiveCustomers":
          return await this.getActiveCustomers(params);
        case "getCustomerStatistics":
          return await this.getCustomerStatistics(params);
        case "searchCustomers":
          return await this.searchCustomers(params);

        // ✏️ WRITE OPERATIONS (with transaction)
        case "createCustomer":
          return await this.handleWithTransaction(this.createCustomer, params);
        case "updateCustomer":
          return await this.handleWithTransaction(this.updateCustomer, params);
        case "deleteCustomer":
          return await this.handleWithTransaction(this.deleteCustomer, params);
        case "restoreCustomer":
          return await this.handleWithTransaction(this.restoreCustomer, params);
        case "permanentlyDeleteCustomer":
          return await this.handleWithTransaction(this.permanentlyDeleteCustomer, params);

        // 🔄 LOYALTY TRANSITIONS (with transaction)
        case "earnPoints":
          return await this.handleWithTransaction(this.earnPoints, params);
        case "redeemPoints":
          return await this.handleWithTransaction(this.redeemPoints, params);
        case "adjustPoints":
          return await this.handleWithTransaction(this.adjustPoints, params);
        case "reverseTransaction":
          return await this.handleWithTransaction(this.reverseTransaction, params);
        case "getLoyaltySummary":
          return await this.getLoyaltySummary(params);

        // 🔄 BATCH OPERATIONS (with transaction)
        case "bulkCreateCustomers":
          return await this.handleWithTransaction(this.bulkCreateCustomers, params);
        case "bulkUpdateCustomers":
          return await this.handleWithTransaction(this.bulkUpdateCustomers, params);
        case "importCustomersCSV":
          return await this.handleWithTransaction(this.importCustomersCSV, params);

        // 📄 EXPORT (read-only)
        case "exportCustomers":
          return await this.exportCustomers(params);

        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("CustomerHandler error:", error);
      if (logger) {
        logger.error("CustomerHandler error:", error);
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
const customerHandler = new CustomerHandler();

ipcMain.handle(
  "customer",
  withErrorHandling(
    customerHandler.handleRequest.bind(customerHandler),
    "IPC:customer"
  )
);

module.exports = { CustomerHandler, customerHandler };