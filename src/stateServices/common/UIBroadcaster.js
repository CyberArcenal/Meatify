// src/stateServices/common/UIBroadcaster.js
const { logger } = require("../../utils/logger");

/**
 * UIBroadcaster - Centralized IPC event broadcaster for all renderer windows.
 * All methods are static; no instantiation needed.
 *
 * Usage:
 *   UIBroadcaster.send('customer:created', { id: 1, name: 'John' });
 *   UIBroadcaster.customer('created', { id: 1, name: 'John' });
 *   UIBroadcaster.sale('paid', { id: 42, total: 1500 });
 */
class UIBroadcaster {
  /**
   * Send a raw IPC event to all renderer windows.
   * @param {string} channel - The IPC channel name (e.g., 'customer:created')
   * @param {any} data - The data payload
   */
  static send(channel, data) {
    try {
      const { BrowserWindow } = require("electron");
      const windows = BrowserWindow.getAllWindows();
      windows.forEach((win) => {
        if (!win.isDestroyed()) {
          win.webContents.send(channel, data);
        }
      });
    } catch (error) {
      // In non‑Electron environments (tests, etc.), just log a warning.
      logger.warn(
        `[UIBroadcaster] Failed to send IPC event on channel "${channel}":`,
        error.message
      );
    }
  }

  // ─── Entity-specific convenience methods ──────────────────────

  /** Broadcast a batch event (channel: batch:action) */
  static batch(action, data) {
    this.send(`batch:${action}`, data);
  }

  /** Broadcast a customer event (channel: customer:action) */
  static customer(action, data) {
    this.send(`customer:${action}`, data);
  }

  /** Broadcast a sale event (channel: sale:action) */
  static sale(action, data) {
    this.send(`sale:${action}`, data);
  }

  /** Broadcast a purchase event (channel: purchase:action) */
  static purchase(action, data) {
    this.send(`purchase:${action}`, data);
  }

  /** Broadcast a return/refund event (channel: returnRefund:action) */
  static returnRefund(action, data) {
    this.send(`returnRefund:${action}`, data);
  }

  /** Broadcast a loyalty transaction event (channel: loyalty:action) */
  static loyalty(action, data) {
    this.send(`loyalty:${action}`, data);
  }

  /** Broadcast a notification event (channel: notification:action) */
  static notification(action, data) {
    this.send(`notification:${action}`, data);
  }

  /** Broadcast a notification log event (channel: notificationLog:action) */
  static notificationLog(action, data) {
    this.send(`notificationLog:${action}`, data);
  }

  /** Broadcast a supplier event (channel: supplier:action) */
  static supplier(action, data) {
    this.send(`supplier:${action}`, data);
  }

  /** Broadcast a category event (channel: category:action) */
  static category(action, data) {
    this.send(`category:${action}`, data);
  }

  /** Broadcast a meat event (channel: meat:action) */
  static meat(action, data) {
    this.send(`meat:${action}`, data);
  }

  /** Broadcast an inventory movement event (channel: inventoryMovement:action) */
  static inventoryMovement(action, data) {
    this.send(`inventoryMovement:${action}`, data);
  }

  /** Broadcast a system setting event (channel: system:action) */
  static system(action, data) {
    this.send(`system:${action}`, data);
  }
}

module.exports = UIBroadcaster;