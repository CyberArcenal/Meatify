// src/types/global.d.ts - idagdag ang category
export {};


declare global {
  interface Window {
    backendAPI: {
        
      // 🆕 CATEGORY API
      auditLog: (payload: any) => Promise<any>;
      batch: (payload: any) => Promise<any>;
      category: (payload: any) => Promise<any>;
      meat: (payload: any) => Promise<any>;
      supplier: (payload: any) => Promise<any>;
      customer: (payload: any) => Promise<any>;
      inventoryMovement: (payload: any) => Promise<any>;
      loyaltyTransaction: (payload: any) => Promise<any>;
      notification: (payload: any) => Promise<any>;
      notificationLog: (payload: any) => Promise<any>;
      purchase: (payload: any) => Promise<any>;
      sale: (payload: any) => Promise<any>;

    };
  }
}