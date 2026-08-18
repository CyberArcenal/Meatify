// src/preload.js - idagdag ang batch

contextBridge.exposeInMainWorld("backendAPI", {
  // ... existing APIs ...

  // 🆕 BATCH API
  batch: (payload) => ipcRenderer.invoke("batch", payload),
  category: (payload) => ipcRenderer.invoke("category", payload),

  // ... rest of existing APIs ...
});