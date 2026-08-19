// src/preload.js - idagdag ang batch
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("backendAPI", {
  // ... existing APIs ...

  // 🆕 BATCH API
  auditLog: (payload) => ipcRenderer.invoke("auditLog", payload),
  batch: (payload) => ipcRenderer.invoke("batch", payload),
  category: (payload) => ipcRenderer.invoke("category", payload),
  meat: (payload) => ipcRenderer.invoke("meat", payload),
  supplier: (payload) => ipcRenderer.invoke("supplier", payload),
  customer: (payload) => ipcRenderer.invoke("customer", payload),
  inventoryMovement: (payload) => ipcRenderer.invoke("inventoryMovement", payload),
  loyaltyTransaction: (payload) => ipcRenderer.invoke("loyaltyTransaction", payload),
  notification: (payload) => ipcRenderer.invoke("notification", payload),
  notificationLog: (payload) => ipcRenderer.invoke("notificationLog", payload),
  purchase: (payload) => ipcRenderer.invoke("purchase", payload),
   sale: (payload) => ipcRenderer.invoke("sale", payload),
   saleItem: (payload) => ipcRenderer.invoke("saleItem", payload),
returnRefund: (payload) => ipcRenderer.invoke("returnRefund", payload),

  // ... rest of existing APIs ...
});