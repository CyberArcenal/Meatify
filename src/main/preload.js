// src/preload.js - FIXED
const { contextBridge, ipcRenderer } = require("electron");

// ✅ Store app ready state
let appReady = false;
let appReadyCallbacks = [];

// ✅ Listen for app-ready event from main
ipcRenderer.on("app:ready", (event, data) => {
  appReady = true;
  console.log("[Preload] App is ready:", data);
  appReadyCallbacks.forEach((cb) => cb(data));
  appReadyCallbacks = [];
});

contextBridge.exposeInMainWorld("backendAPI", {
  // Analytics
  dashboard: (payload) => ipcRenderer.invoke("dashboard", payload),
  customerInsights: (payload) =>
    ipcRenderer.invoke("customerInsights", payload),
  dailySales: (payload) => ipcRenderer.invoke("dailySales", payload),
  financialReports: (payload) =>
    ipcRenderer.invoke("financialReports", payload),
  inventoryReports: (payload) =>
    ipcRenderer.invoke("inventoryReports", payload),
  salesReport: (payload) => ipcRenderer.invoke("salesReport", payload),
  returnRefundReports: (payload) =>
    ipcRenderer.invoke("returnRefundReports", payload),

  // Core APIs
  auditLog: (payload) => ipcRenderer.invoke("auditLog", payload),
  batch: (payload) => ipcRenderer.invoke("batch", payload),
  category: (payload) => ipcRenderer.invoke("category", payload),
  meat: (payload) => ipcRenderer.invoke("meat", payload),
  supplier: (payload) => ipcRenderer.invoke("supplier", payload),
  customer: (payload) => ipcRenderer.invoke("customer", payload),
  inventoryMovement: (payload) =>
    ipcRenderer.invoke("inventoryMovement", payload),
  loyaltyTransaction: (payload) =>
    ipcRenderer.invoke("loyaltyTransaction", payload),
  notification: (payload) => ipcRenderer.invoke("notification", payload),
  notificationLog: (payload) => ipcRenderer.invoke("notificationLog", payload),
  purchase: (payload) => ipcRenderer.invoke("purchase", payload),
  sale: (payload) => ipcRenderer.invoke("sale", payload),
  saleItem: (payload) => ipcRenderer.invoke("saleItem", payload),
  returnRefund: (payload) => ipcRenderer.invoke("returnRefund", payload),
  returnRefundItem: (payload) =>
    ipcRenderer.invoke("returnRefundItem", payload),
  purchaseItem: (payload) => ipcRenderer.invoke("purchaseItem", payload),
  printer: (payload) => ipcRenderer.invoke("printer", payload),
  printerGetStatus: () =>
    ipcRenderer.invoke("printer", { method: "getStatus" }),
  printerIsAvailable: () =>
    ipcRenderer.invoke("printer", { method: "isAvailable" }),
  "window-control": (payload) => ipcRenderer.invoke("window-control", payload),
  updater: (payload) => ipcRenderer.invoke("updater", payload),
  systemConfig: (payload) => ipcRenderer.invoke("systemConfig", payload),

  // ========== LOGGING ==========
  log: {
    info: (message, data) => console.log("[Renderer]", message, data),
    error: (message, error) => console.error("[Renderer]", message, error),
    warn: (message, warning) => console.warn("[Renderer]", message, warning),
  },

  // ========== EVENT LISTENERS ==========
  onAppReady: (callback) => {
    ipcRenderer.on("app-ready", callback);
    return () => ipcRenderer.removeListener("app-ready", callback);
  },
  on: (event, callback) => {
    ipcRenderer.on(event, callback);
    return () => ipcRenderer.removeListener(event, callback);
  },
  off: (channel, callback) => ipcRenderer.removeListener(channel, callback),

  // ✅ ADD THIS - Notify main process that renderer is ready
  notifyAppReady: () => ipcRenderer.send("app:renderer-ready"),

  // ========== APP READY ==========
  /**
   * Wait for app to be ready before making data-fetching calls
   * @returns {Promise<{timestamp: string, databaseReady: boolean, version: string}>}
   */
  waitForAppReady: () => {
    return new Promise((resolve) => {
      if (appReady) {
        // Already ready, resolve immediately
        resolve({
          timestamp: new Date().toISOString(),
          databaseReady: true,
          version: "1.0.9",
        });
      } else {
        // Wait for ready event
        appReadyCallbacks.push(resolve);
      }
    });
  },

  /**
   * Check if app is ready (non-blocking)
   * @returns {boolean}
   */
  isAppReady: () => appReady,

  // ========== EVENT LISTENERS ==========
  onAppReady: (callback) => {
    if (appReady) {
      // If already ready, call immediately
      setTimeout(
        () =>
          callback({
            timestamp: new Date().toISOString(),
            databaseReady: true,
            version: "1.0.9",
          }),
        0,
      );
      return () => {};
    }
    ipcRenderer.on("app-ready", callback);
    return () => ipcRenderer.removeListener("app-ready", callback);
  },
});
