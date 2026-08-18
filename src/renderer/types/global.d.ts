// src/types/global.d.ts - idagdag ang category
export {};


declare global {
  interface Window {
    backendAPI: {
        
      // 🆕 CATEGORY API
      batch: (payload: any) => Promise<any>;
      category: (payload: any) => Promise<any>;
    };
  }
}