// src/main/ipc/core/loyaltyTransaction/index.ipc.js - Loyalty Transaction Management Handler (Offline Only)

const { ipcMain } = require("electron");
const { logger } = require("../../../../utils/logger");
const { AppDataSource } = require("../../../db/data-source");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");

class LoyaltyTransactionHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ-ONLY HANDLERS
    this.getAllTransactions = this.importHandler("./get/all.ipc");
    this.getTransactionById = this.importHandler("./get/by_id.ipc");
    this.getTransactionsByCustomer = this.importHandler("./get/by_customer.ipc");
    this.getTransactionsBySale = this.importHandler("./get/by_sale.ipc");
    this.getTransactionStatistics = this.importHandler("./get/statistics.ipc");
    this.searchTransactions = this.importHandler("./search.ipc");

    // ✏️ WRITE OPERATION HANDLERS
    this.createTransaction = this.importHandler("./create.ipc");
    this.updateTransaction = this.importHandler("./update.ipc");
    this.deleteTransaction = this.importHandler("./delete.ipc");
    this.restoreTransaction = this.importHandler("./restore.ipc");
    this.permanentlyDeleteTransaction = this.importHandler("./permanent_delete.ipc");

    // 🔄 LOYALTY TRANSITION HANDLERS (via StateService)
    this.earnPoints = this.importHandler("./earn_points.ipc");
    this.redeemPoints = this.importHandler("./redeem_points.ipc");
    this.adjustPoints = this.importHandler("./adjust_points.ipc");
    this.reverseTransaction = this.importHandler("./reverse_transaction.ipc");
    this.getCustomerSummary = this.importHandler("./get_customer_summary.ipc");

    // 🔄 BATCH OPERATIONS
    this.bulkCreateTransactions = this.importHandler("./bulk_create.ipc");
    this.bulkUpdateTransactions = this.importHandler("./bulk_update.ipc");
    this.importTransactionsCSV = this.importHandler("./import_csv.ipc");
    this.exportTransactions = this.importHandler("./export.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[LoyaltyTransactionHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`LoyaltyTransactionHandler: ${method}`, { params });
      }

      switch (method) {
        // 📋 READ-ONLY OPERATIONS
        case "getAllTransactions":
          return await this.getAllTransactions(params);
        case "getTransactionById":
          return await this.getTransactionById(params);
        case "getTransactionsByCustomer":
          return await this.getTransactionsByCustomer(params);
        case "getTransactionsBySale":
          return await this.getTransactionsBySale(params);
        case "getTransactionStatistics":
          return await this.getTransactionStatistics(params);
        case "searchTransactions":
          return await this.searchTransactions(params);

        // ✏️ WRITE OPERATIONS (with transaction)
        case "createTransaction":
          return await this.handleWithTransaction(this.createTransaction, params);
        case "updateTransaction":
          return await this.handleWithTransaction(this.updateTransaction, params);
        case "deleteTransaction":
          return await this.handleWithTransaction(this.deleteTransaction, params);
        case "restoreTransaction":
          return await this.handleWithTransaction(this.restoreTransaction, params);
        case "permanentlyDeleteTransaction":
          return await this.handleWithTransaction(this.permanentlyDeleteTransaction, params);

        // 🔄 LOYALTY TRANSITIONS (with transaction)
        case "earnPoints":
          return await this.handleWithTransaction(this.earnPoints, params);
        case "redeemPoints":
          return await this.handleWithTransaction(this.redeemPoints, params);
        case "adjustPoints":
          return await this.handleWithTransaction(this.adjustPoints, params);
        case "reverseTransaction":
          return await this.handleWithTransaction(this.reverseTransaction, params);
        case "getCustomerSummary":
          return await this.getCustomerSummary(params);

        // 🔄 BATCH OPERATIONS (with transaction)
        case "bulkCreateTransactions":
          return await this.handleWithTransaction(this.bulkCreateTransactions, params);
        case "bulkUpdateTransactions":
          return await this.handleWithTransaction(this.bulkUpdateTransactions, params);
        case "importTransactionsCSV":
          return await this.handleWithTransaction(this.importTransactionsCSV, params);

        // 📄 EXPORT (read-only)
        case "exportTransactions":
          return await this.exportTransactions(params);

        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("LoyaltyTransactionHandler error:", error);
      if (logger) {
        logger.error("LoyaltyTransactionHandler error:", error);
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
const loyaltyTransactionHandler = new LoyaltyTransactionHandler();

ipcMain.handle(
  "loyaltyTransaction",
  withErrorHandling(
    loyaltyTransactionHandler.handleRequest.bind(loyaltyTransactionHandler),
    "IPC:loyaltyTransaction"
  )
);

module.exports = { LoyaltyTransactionHandler, loyaltyTransactionHandler };