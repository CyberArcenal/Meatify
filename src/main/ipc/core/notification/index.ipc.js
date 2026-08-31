// src/main/ipc/core/notification/index.ipc.js - Notification Management Handler (Offline Only)

const { ipcMain } = require("electron");
const { logger } = require("../../../../utils/logger");
const { AppDataSource } = require("../../../db/data-source");
const { withErrorHandling } = require("../../../../middlewares/errorHandler");

class NotificationHandler {
  constructor() {
    this.initializeHandlers();
  }

  initializeHandlers() {
    // 📋 READ-ONLY HANDLERS
    this.getAllNotifications = this.importHandler("./get/all.ipc");
    this.getNotificationById = this.importHandler("./get/by_id.ipc");
    this.getNotificationsByUser = this.importHandler("./get/by_user.ipc");
    this.getUnreadNotifications = this.importHandler("./get/unread.ipc");
    this.getNotificationStatistics = this.importHandler("./get/statistics.ipc");
    this.searchNotifications = this.importHandler("./search.ipc");

    // ✏️ WRITE OPERATION HANDLERS
    this.createNotification = this.importHandler("./create.ipc");
    this.updateNotification = this.importHandler("./update.ipc");
    this.deleteNotification = this.importHandler("./delete.ipc");
    this.restoreNotification = this.importHandler("./restore.ipc");
    this.permanentlyDeleteNotification = this.importHandler("./permanent_delete.ipc");

    // 🔄 STATE TRANSITION HANDLERS (via StateService)
    this.markAsRead = this.importHandler("./mark_as_read.ipc");
    this.markAsUnread = this.importHandler("./mark_as_unread.ipc");
    this.markAllAsRead = this.importHandler("./mark_all_as_read.ipc");
    this.markAllAsUnread = this.importHandler("./mark_all_as_unread.ipc");
    this.deleteAllRead = this.importHandler("./delete_all_read.ipc");

    // 🔄 BATCH OPERATIONS
    this.bulkCreateNotifications = this.importHandler("./bulk_create.ipc");
    this.importNotificationsCSV = this.importHandler("./import_csv.ipc");
    this.exportNotifications = this.importHandler("./export.ipc");
  }

  importHandler(path) {
    try {
      const fullPath = require.resolve(`./${path}`, { paths: [__dirname] });
      return require(fullPath);
    } catch (error) {
      console.warn(`[NotificationHandler] Failed to load handler: ${path}`, error.message);
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
        logger.info(`NotificationHandler: ${method}`, { params });
      }

      switch (method) {
        // 📋 READ-ONLY OPERATIONS
        case "getAllNotifications":
          return await this.getAllNotifications(params);
        case "getNotificationById":
          return await this.getNotificationById(params);
        case "getNotificationsByUser":
          return await this.getNotificationsByUser(params);
        case "getUnreadNotifications":
          return await this.getUnreadNotifications(params);
        case "getNotificationStatistics":
          return await this.getNotificationStatistics(params);
        case "searchNotifications":
          return await this.searchNotifications(params);

        // ✏️ WRITE OPERATIONS (with transaction)
        case "createNotification":
          return await this.handleWithTransaction(this.createNotification, params);
        case "updateNotification":
          return await this.handleWithTransaction(this.updateNotification, params);
        case "deleteNotification":
          return await this.handleWithTransaction(this.deleteNotification, params);
        case "restoreNotification":
          return await this.handleWithTransaction(this.restoreNotification, params);
        case "permanentlyDeleteNotification":
          return await this.handleWithTransaction(this.permanentlyDeleteNotification, params);

        // 🔄 STATE TRANSITIONS (with transaction)
        case "markAsRead":
          return await this.handleWithTransaction(this.markAsRead, params);
        case "markAsUnread":
          return await this.handleWithTransaction(this.markAsUnread, params);
        case "markAllAsRead":
          return await this.handleWithTransaction(this.markAllAsRead, params);
        case "markAllAsUnread":
          return await this.handleWithTransaction(this.markAllAsUnread, params);
        case "deleteAllRead":
          return await this.handleWithTransaction(this.deleteAllRead, params);

        // 🔄 BATCH OPERATIONS (with transaction)
        case "bulkCreateNotifications":
          return await this.handleWithTransaction(this.bulkCreateNotifications, params);
        case "importNotificationsCSV":
          return await this.handleWithTransaction(this.importNotificationsCSV, params);

        // 📄 EXPORT (read-only)
        case "exportNotifications":
          return await this.exportNotifications(params);

        default:
          return {
            status: false,
            message: `Unknown method: ${method}`,
            data: null,
          };
      }
    } catch (error) {
      console.error("NotificationHandler error:", error);
      if (logger) {
        logger.error("NotificationHandler error:", error);
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
const notificationHandler = new NotificationHandler();

ipcMain.handle(
  "notification",
  withErrorHandling(
    notificationHandler.handleRequest.bind(notificationHandler),
    "IPC:notification"
  )
);

module.exports = { NotificationHandler, notificationHandler };