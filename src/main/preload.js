// src/preload.js - idagdag ang batch
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("backendAPI", {

  // 🆕 BATCH API
  dashboard: (payload) => ipcRenderer.invoke("dashboard", payload),
  customerInsights: (payload) => ipcRenderer.invoke("customerInsights", payload),
  dailySales: (payload) => ipcRenderer.invoke("dailySales", payload),
  financialReports: (payload) => ipcRenderer.invoke("financialReports", payload),
  inventoryReports: (payload) => ipcRenderer.invoke("inventoryReports", payload),
  salesReport: (payload) => ipcRenderer.invoke("salesReport", payload),
  returnRefundReports: (payload) => ipcRenderer.invoke("returnRefundReports", payload),
  

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
});
