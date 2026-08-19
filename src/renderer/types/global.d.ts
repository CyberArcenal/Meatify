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
      saleItem: (payload: any) => Promise<any>;
      returnRefund: (payload: any) => Promise<any>;
      returnRefundItem: (payload: any) => Promise<any>;
      purchaseItem: (payload: any) => Promise<any>;
      "window-control": (payload: any) => Promise<any>;
      printer: (payload: any) => Promise<any>;
      updater: (payload: any) => Promise<any>;
      systemConfig: (payload: any) => Promise<any>;

      // ========== PRINTER CONVENIENCE METHODS ==========
      printerGetStatus: () => Promise<{
        driverLoaded: boolean;
        isReady: boolean;
      }>;
      printerIsAvailable: () => Promise<boolean>;
      printerReload: () => Promise<{ driverLoaded: boolean; isReady: boolean }>;
      printerPrint: (sale: any) => Promise<boolean>;
      printerTestPrint: () => Promise<boolean>;


      // ========== LOGGING ==========
      log: {
        info: (message: string, data?: any) => void;
        error: (message: string, error?: any) => void;
        warn: (message: string, warning?: any) => void;
      };

      // ========== EVENT LISTENERS ==========
      onAppReady: (callback: () => void) => () => void;
      on: (
        channel: string,
        callback: (event: any, ...args: any[]) => void
      ) => () => void;
      off: (channel: string, callback: (...args: any[]) => void) => void;

      // ========== UTILITIES & WINDOW CONTROL ==========
      windowControl: (payload: {
        method: string;
        params?: Record<string, any>;
      }) => Promise<{
        status: boolean;
        message: string;
        data?: any;
      }>;
      openExternal: (url: string) => Promise<void>;
      openAgreementFile: (relativePath: string) => Promise<{
        status: boolean;
        message: string;
      }>;
      notifyAppReady: () => void;
    };
  }
}
