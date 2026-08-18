// src/types/global.d.ts - idagdag ang category

declare global {
  interface Window {
    backendAPI: {
      // ... existing APIs ...

      // 🆕 CATEGORY API
      category: (payload: any) => Promise<any>;

      // ... rest of existing APIs ...
    };
  }
}