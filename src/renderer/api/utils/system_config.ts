// src/renderer/api/core/system_config.ts
// Meatify POS System Configuration

// ============================================================
// 📦 SETTING TYPES (Matches backend system.js)
// ============================================================

export const SettingType = {
  GENERAL: "general",
  INVENTORY: "inventory",
  SALES: "sales",
  CASHIER: "cashier",
  NOTIFICATIONS: "notifications",
  DATA_REPORTS: "data_reports",
  INTEGRATIONS: "integrations",
  AUDIT_SECURITY: "audit_security",
} as const;

export type SettingType = (typeof SettingType)[keyof typeof SettingType];

// ============================================================
// 🏢 GENERAL SETTINGS
// ============================================================

export interface GeneralSettings {
  company_name?: string;
  branch_location?: string;
  default_timezone?: string;
  language?: string;
  currency?: string;
  decimal_places?: number;
  auto_logout_minutes?: number;
  date_format?: string;
  sync_mode?: "offline" | "online";
  server_url?: string;
}

// ============================================================
// 📦 INVENTORY SETTINGS
// ============================================================

export interface InventorySettings {
  low_stock_threshold?: number;
  enable_auto_reorder?: boolean;
  auto_reorder_quantity?: number;
  allow_negative_stock?: boolean;
  fifo_enabled?: boolean;
  inventory_sync_enabled?: boolean;
}

// ============================================================
// 💰 SALES & PRICING SETTINGS
// ============================================================

export interface SalesSettings {
  tax_rate?: number;
  default_discount_rate?: number;
  max_discount_percent?: number;
  enable_discounts?: boolean;
  default_payment_method?: "cash" | "card" | "wallet";
  enable_cash_payment?: boolean;
  enable_card_payment?: boolean;
  enable_wallet_payment?: boolean;
  price_rounding?: "nearest" | "up" | "down";
  // Loyalty
  enable_loyalty_points?: boolean;
  loyalty_point_rate?: number;
  loyalty_vip_threshold?: number;
  loyalty_elite_threshold?: number;
  // Refunds
  enable_refunds?: boolean;
  refund_window_days?: number;
  require_receipt_for_refund?: boolean;
  refund_restock_enabled?: boolean;
}

// ============================================================
// 🖨️ HARDWARE / CASHIER SETTINGS
// ============================================================

export interface CashierSettings {
  enable_receipt_printing?: boolean;
  receipt_printer_type?: "thermal" | "dot_matrix" | "laser";
  receipt_header_message?: string;
  receipt_footer_message?: string;
  receipt_show_logo?: boolean;
  receipt_show_tax?: boolean;
  receipt_show_discount?: boolean;
  receipt_show_loyalty?: boolean;
  enable_cash_drawer?: boolean;
  drawer_open_code?: string;
  cash_drawer_connection_type?: "printer" | "usb";
}

// ============================================================
// 🔔 NOTIFICATION SETTINGS
// ============================================================

export interface NotificationsSettings {
  email_enabled?: boolean;
  sms_enabled?: boolean;
  in_app_notifications_enabled?: boolean;
  notify_low_stock?: boolean;
  notify_expiring_batches?: boolean;
  notify_refund_processed?: boolean;
  notify_purchase_completed?: boolean;
  sms_provider?: string;
  // SMTP
  email_smtp_host?: string;
  email_smtp_port?: number;
  email_smtp_username?: string;
  email_smtp_password?: string;
  email_from_address?: string;
  email_from_name?: string;
  // Twilio
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_phone_number?: string;
  twilio_messaging_service_sid?: string;
}

// ============================================================
// 📊 REPORTS SETTINGS
// ============================================================

export interface ReportsSettings {
  export_formats?: string[];
  default_export_format?: string;
  auto_backup_enabled?: boolean;
  backup_schedule?: string;
  backup_location?: string;
  data_retention_days?: number;
  include_audit_in_backup?: boolean;
}

// ============================================================
// 🔗 INTEGRATIONS SETTINGS
// ============================================================

export interface IntegrationsSettings {
  webhooks_enabled?: boolean;
  webhooks?: Array<{
    url: string;
    events: string[];
    enabled: boolean;
    secret?: string;
  }>;
}

// ============================================================
// 🔒 AUDIT & SECURITY SETTINGS
// ============================================================

export interface AuditSecuritySettings {
  audit_log_enabled?: boolean;
  log_retention_days?: number;
  log_events?: string[];
  force_https?: boolean;
  session_encryption_enabled?: boolean;
  gdpr_compliance_enabled?: boolean;
  require_mfa_for_admin?: boolean;
}

// ============================================================
// 📦 COMBINED SETTINGS
// ============================================================

export interface MeatifySettings {
  general: GeneralSettings;
  inventory: InventorySettings;
  sales: SalesSettings;
  cashier: CashierSettings;
  notifications: NotificationsSettings;
  reports: ReportsSettings;
  integrations: IntegrationsSettings;
  audit_security: AuditSecuritySettings;
}

// ============================================================
// 📨 API RESPONSES
// ============================================================

export interface GroupedSettingsData {
  general: GeneralSettings;
  inventory: InventorySettings;
  sales: SalesSettings;
  cashier: CashierSettings;
  notifications: NotificationsSettings;
  reports: ReportsSettings;
  integrations: IntegrationsSettings;
  audit_security: AuditSecuritySettings;
}

export interface SystemConfigResponse {
  status: boolean;
  message: string;
  data: {
    grouped_settings: GroupedSettingsData;
    system_info: {
      version: string;
      name: string;
      environment: string;
      debug_mode: boolean;
      timezone: string;
      current_time: string;
      setting_types: string[];
    };
  } | null;
}




// ============================================================
// 📦 Interfaces per Category (matching system.js functions)
// ============================================================

// 1. GENERAL SETTINGS
export interface GeneralSettings {
  company_name?: string;
  branch_location?: string;
  default_timezone?: string;
  language?: string;
  currency?: string;
  decimal_places?: number;
  auto_logout_minutes?: number;
  date_format?: string;
}

// 2. INVENTORY SETTINGS
export interface InventorySettings {
  low_stock_threshold?: number;
  enable_auto_reorder?: boolean;
  auto_reorder_quantity?: number;
  allow_negative_stock?: boolean;
  fifo_enabled?: boolean;
  inventory_sync_enabled?: boolean;
}

// 3. SALES & PRICING SETTINGS
export interface SalesSettings {
  tax_rate?: number;
  default_discount_rate?: number;
  max_discount_percent?: number;
  enable_discounts?: boolean;
  default_payment_method?: "cash" | "card" | "wallet";
  enable_cash_payment?: boolean;
  enable_card_payment?: boolean;
  enable_wallet_payment?: boolean;
  price_rounding?: "nearest" | "up" | "down";

  // Loyalty (nested under sales)
  enable_loyalty_points?: boolean;
  loyalty_point_rate?: number;
  loyalty_vip_threshold?: number;
  loyalty_elite_threshold?: number;

  // Refunds (nested under sales)
  enable_refunds?: boolean;
  refund_window_days?: number;
  require_receipt_for_refund?: boolean;
  refund_restock_enabled?: boolean;
}


// 5. NOTIFICATIONS SETTINGS
export interface NotificationsSettings {
  email_enabled?: boolean;
  sms_enabled?: boolean;
  in_app_notifications_enabled?: boolean;
  notify_low_stock?: boolean;
  notify_expiring_batches?: boolean;
  notify_refund_processed?: boolean;
  notify_purchase_completed?: boolean;
  sms_provider?: string; // e.g., "twilio"
  email_smtp_host?: string;
  email_smtp_port?: number;
  email_smtp_username?: string;
  email_smtp_password?: string;
  email_from_address?: string;
  email_from_name?: string;
  twilio_account_sid?: string;
  twilio_auth_token?: string;
  twilio_phone_number?: string;
  twilio_messaging_service_sid?: string;
}

// 6. REPORTS & BACKUP SETTINGS
export interface ReportsSettings {
  export_formats?: string[]; // CSV, Excel, PDF
  default_export_format?: string;
  auto_backup_enabled?: boolean;
  backup_schedule?: string; // cron expression or string
  backup_location?: string;
  data_retention_days?: number;
  include_audit_in_backup?: boolean;
}

// 7. INTEGRATIONS SETTINGS
export interface IntegrationsSettings {
  webhooks_enabled?: boolean;
  webhooks?: WebhookSetting[];
}

export interface WebhookSetting {
  url: string;
  events: string[];
  enabled: boolean;
  secret?: string;
}

// 8. AUDIT & SECURITY SETTINGS
export interface AuditSecuritySettings {
  audit_log_enabled?: boolean;
  log_retention_days?: number;
  log_events?: string[]; // e.g., "CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"
  force_https?: boolean;
  session_encryption_enabled?: boolean;
  gdpr_compliance_enabled?: boolean;
  require_mfa_for_admin?: boolean;
}

// ============================================================
// 📦 System Configuration Aggregated
// ============================================================

export interface GroupedSettingsData {
  general: GeneralSettings;
  inventory: InventorySettings;
  sales: SalesSettings;
  cashier: CashierSettings;
  notifications: NotificationsSettings;
  data_reports: ReportsSettings;
  integrations: IntegrationsSettings;
  audit_security: AuditSecuritySettings;
  settings: SystemSettingData[];
  grouped_settings: {
    general: GeneralSettings;
    inventory: InventorySettings;
    sales: SalesSettings;
    cashier: CashierSettings;
    notifications: NotificationsSettings;
    data_reports: ReportsSettings;
    integrations: IntegrationsSettings;
    audit_security: AuditSecuritySettings;
  };
  system_info: SystemInfoData;
}

// ============================================================
// 🔧 Base Types
// ============================================================

export interface SystemSettingData {
  id: number;
  key: string;
  value: any;
  setting_type: SettingType;
  description?: string;
  is_public: boolean;
  is_deleted: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SystemInfoData {
  version: string;
  name: string;
  environment: string;
  debug_mode: boolean;
  timezone: string;
  current_time: string;
  setting_types: string[];
}

// ============================================================
// 📨 API Response Types
// ============================================================


export interface SystemInfoResponse {
  status: boolean;
  message: string;
  data: SystemInfoData | null;
}

export interface SettingsListResponse {
  status: boolean;
  message: string;
  data: SystemSettingData[];
}

export interface SettingResponse {
  status: boolean;
  message: string;
  data: SystemSettingData | null;
}

export interface OperationResponse {
  status: boolean;
  message: string;
  data: {
    id?: number;
    key?: string;
    count?: number;
    [key: string]: any;
  } | null;
}

export interface SettingsStatsResponse {
  status: boolean;
  message: string;
  data: {
    total: number;
    by_type: Record<string, number>;
    public_count: number;
    private_count: number;
    timestamp: string;
  };
}

export interface BulkOperationResponse {
  status: boolean;
  message: string;
  data: Array<{
    success: boolean;
    id?: number;
    key?: string;
    error?: string;
    action?: string;
  }>;
}

// ============================================================
// 📨 Request Payloads
// ============================================================

export interface CreateSettingData {
  key: string;
  value: any;
  setting_type: SettingType;
  description?: string;
  is_public?: boolean;
}

export interface UpdateSettingData {
  id: number;
  key?: string;
  value?: any;
  setting_type?: SettingType;
  description?: string;
  is_public?: boolean;
}

export interface SetValueByKeyData {
  key: string;
  value: any;
  setting_type?: SettingType;
  description?: string;
  is_public?: boolean;
}

export interface BulkUpdateData {
  settingsData: Array<{
    id?: number;
    key: string;
    value: any;
    setting_type: SettingType;
    description?: string;
    is_public?: boolean;
  }>;
}

export interface UpdateCategorySettingsData {
  [category: string]: Record<string, any>;
}

// ============================================================
// 🧠 API Class
// ============================================================

class SystemConfigAPI {
  // --------------------------------------------------------------------
  // GET CONFIGURATION
  // --------------------------------------------------------------------

  async getGroupedConfig(): Promise<SystemConfigResponse> {
    if (!window.backendAPI?.systemConfig)
      throw new Error("Electron API (systemConfig) not available");
    const response = await window.backendAPI.systemConfig({
      method: "getGroupedConfig",
      params: {},
    });
    if (response.status) return response;
    throw new Error(response.message || "Failed to fetch system configuration");
  }

  async updateGroupedConfig(
    configData: UpdateCategorySettingsData
  ): Promise<SystemConfigResponse> {
    if (!window.backendAPI?.systemConfig)
      throw new Error("Electron API (systemConfig) not available");
    const response = await window.backendAPI.systemConfig({
      method: "updateGroupedConfig",
      params: { configData },
    });
    if (response.status) return response;
    throw new Error(
      response.message || "Failed to update system configuration"
    );
  }

  async getSystemInfo(): Promise<SystemInfoResponse> {
    if (!window.backendAPI?.systemConfig)
      throw new Error("Electron API (systemConfig) not available");
    const response = await window.backendAPI.systemConfig({
      method: "getSystemInfo",
      params: {},
    });
    if (response.status) return response;
    throw new Error(response.message || "Failed to fetch system information");
  }

  // --------------------------------------------------------------------
  // SETTINGS CRUD
  // --------------------------------------------------------------------

  async getAllSettings(): Promise<SettingsListResponse> {
    if (!window.backendAPI?.systemConfig)
      throw new Error("Electron API (systemConfig) not available");
    const response = await window.backendAPI.systemConfig({
      method: "getAllSettings",
      params: {},
    });
    if (response.status) return response;
    throw new Error(response.message || "Failed to fetch all settings");
  }

  async getPublicSettings(): Promise<SettingsListResponse> {
    if (!window.backendAPI?.systemConfig)
      throw new Error("Electron API (systemConfig) not available");
    const response = await window.backendAPI.systemConfig({
      method: "getPublicSettings",
      params: {},
    });
    if (response.status) return response;
    throw new Error(response.message || "Failed to fetch public settings");
  }

  async getSettingByKey(
    key: string,
    settingType?: SettingType
  ): Promise<SettingResponse> {
    if (!window.backendAPI?.systemConfig)
      throw new Error("Electron API (systemConfig) not available");
    const response = await window.backendAPI.systemConfig({
      method: "getSettingByKey",
      params: { key, settingType },
    });
    if (response.status) return response;
    throw new Error(response.message || "Failed to fetch setting");
  }

  async createSetting(
    settingData: CreateSettingData
  ): Promise<SettingResponse> {
    if (!window.backendAPI?.systemConfig)
      throw new Error("Electron API (systemConfig) not available");
    const response = await window.backendAPI.systemConfig({
      method: "createSetting",
      params: { settingData },
    });
    if (response.status) return response;
    throw new Error(response.message || "Failed to create setting");
  }

  async updateSetting(
    id: number,
    settingData: UpdateSettingData
  ): Promise<SettingResponse> {
    if (!window.backendAPI?.systemConfig)
      throw new Error("Electron API (systemConfig) not available");
    const response = await window.backendAPI.systemConfig({
      method: "updateSetting",
      params: { id, settingData },
    });
    if (response.status) return response;
    throw new Error(response.message || "Failed to update setting");
  }

  async deleteSetting(id: number): Promise<OperationResponse> {
    if (!window.backendAPI?.systemConfig)
      throw new Error("Electron API (systemConfig) not available");
    const response = await window.backendAPI.systemConfig({
      method: "deleteSetting",
      params: { id },
    });
    if (response.status) return response;
    throw new Error(response.message || "Failed to delete setting");
  }

  async getByType(settingType: SettingType): Promise<SettingsListResponse> {
    if (!window.backendAPI?.systemConfig)
      throw new Error("Electron API (systemConfig) not available");
    const response = await window.backendAPI.systemConfig({
      method: "getByType",
      params: { settingType },
    });
    if (response.status) return response;
    throw new Error(response.message || "Failed to fetch settings by type");
  }

  async getValueByKey(
    key: string,
    defaultValue?: any
  ): Promise<SettingResponse> {
    if (!window.backendAPI?.systemConfig)
      throw new Error("Electron API (systemConfig) not available");
    const response = await window.backendAPI.systemConfig({
      method: "getValueByKey",
      params: { key, defaultValue },
    });
    if (response.status) return response;
    throw new Error(response.message || "Failed to get value by key");
  }

  async setValueByKey(
    key: string,
    value: any,
    options?: Partial<SetValueByKeyData>
  ): Promise<SettingResponse> {
    if (!window.backendAPI?.systemConfig)
      throw new Error("Electron API (systemConfig) not available");
    const response = await window.backendAPI.systemConfig({
      method: "setValueByKey",
      params: { key, value, options },
    });
    if (response.status) return response;
    throw new Error(response.message || "Failed to set value by key");
  }

  // --------------------------------------------------------------------
  // BULK OPERATIONS
  // --------------------------------------------------------------------

  async bulkUpdate(
    settingsData: BulkUpdateData["settingsData"]
  ): Promise<BulkOperationResponse> {
    if (!window.backendAPI?.systemConfig)
      throw new Error("Electron API (systemConfig) not available");
    const response = await window.backendAPI.systemConfig({
      method: "bulkUpdate",
      params: { settingsData },
    });
    if (response.status) return response;
    throw new Error(response.message || "Failed to bulk update settings");
  }

  async bulkDelete(ids: number[]): Promise<BulkOperationResponse> {
    if (!window.backendAPI?.systemConfig)
      throw new Error("Electron API (systemConfig) not available");
    const response = await window.backendAPI.systemConfig({
      method: "bulkDelete",
      params: { ids },
    });
    if (response.status) return response;
    throw new Error(response.message || "Failed to bulk delete settings");
  }

  async getSettingsStats(): Promise<SettingsStatsResponse> {
    if (!window.backendAPI?.systemConfig)
      throw new Error("Electron API (systemConfig) not available");
    const response = await window.backendAPI.systemConfig({
      method: "getSettingsStats",
      params: {},
    });
    if (response.status) return response;
    throw new Error(response.message || "Failed to get settings statistics");
  }

  // --------------------------------------------------------------------
  // CATEGORY-SPECIFIC CONVENIENCE METHODS
  // --------------------------------------------------------------------

  async getGeneralSettings(): Promise<GeneralSettings> {
    try {
      const config = await this.getGroupedConfig();
      return config.data?.grouped_settings?.general || {};
    } catch {
      return {};
    }
  }

  async getInventorySettings(): Promise<InventorySettings> {
    try {
      const config = await this.getGroupedConfig();
      return config.data?.grouped_settings?.inventory || {};
    } catch {
      return {};
    }
  }

  async getSalesSettings(): Promise<SalesSettings> {
    try {
      const config = await this.getGroupedConfig();
      return config.data?.grouped_settings?.sales || {};
    } catch {
      return {};
    }
  }

  async getCashierSettings(): Promise<CashierSettings> {
    try {
      const config = await this.getGroupedConfig();
      return config.data?.grouped_settings?.cashier || {};
    } catch {
      return {};
    }
  }

  async getNotificationsSettings(): Promise<NotificationsSettings> {
    try {
      const config = await this.getGroupedConfig();
      return config.data?.grouped_settings?.notifications || {};
    } catch {
      return {};
    }
  }

  async getReportsSettings(): Promise<ReportsSettings> {
    try {
      const config = await this.getGroupedConfig();
      return config.data?.grouped_settings?.data_reports || {};
    } catch {
      return {};
    }
  }

  async getIntegrationsSettings(): Promise<IntegrationsSettings> {
    try {
      const config = await this.getGroupedConfig();
      return config.data?.grouped_settings?.integrations || {};
    } catch {
      return {};
    }
  }

  async getAuditSecuritySettings(): Promise<AuditSecuritySettings> {
    try {
      const config = await this.getGroupedConfig();
      return config.data?.grouped_settings?.audit_security || {};
    } catch {
      return {};
    }
  }

  // Update category settings
  async updateGeneralSettings(
    settings: Partial<GeneralSettings>
  ): Promise<SystemConfigResponse> {
    return this.updateCategorySettings("general", settings);
  }

  async updateInventorySettings(
    settings: Partial<InventorySettings>
  ): Promise<SystemConfigResponse> {
    return this.updateCategorySettings("inventory", settings);
  }

  async updateSalesSettings(
    settings: Partial<SalesSettings>
  ): Promise<SystemConfigResponse> {
    return this.updateCategorySettings("sales", settings);
  }

  async updateCashierSettings(
    settings: Partial<CashierSettings>
  ): Promise<SystemConfigResponse> {
    return this.updateCategorySettings("cashier", settings);
  }

  async updateNotificationsSettings(
    settings: Partial<NotificationsSettings>
  ): Promise<SystemConfigResponse> {
    return this.updateCategorySettings("notifications", settings);
  }

  async updateReportsSettings(
    settings: Partial<ReportsSettings>
  ): Promise<SystemConfigResponse> {
    return this.updateCategorySettings("data_reports", settings);
  }

  async updateIntegrationsSettings(
    settings: Partial<IntegrationsSettings>
  ): Promise<SystemConfigResponse> {
    return this.updateCategorySettings("integrations", settings);
  }

  async updateAuditSecuritySettings(
    settings: Partial<AuditSecuritySettings>
  ): Promise<SystemConfigResponse> {
    return this.updateCategorySettings("audit_security", settings);
  }

  async updateCategorySettings(
    category: string,
    settings: Record<string, any>
  ): Promise<SystemConfigResponse> {
    return this.updateGroupedConfig({ [category]: settings });
  }

  // --------------------------------------------------------------------
  // UTILITY METHODS
  // --------------------------------------------------------------------

  async getAllSettingsAsObject(): Promise<Record<string, any>> {
    try {
      const response = await this.getAllSettings();
      const result: Record<string, any> = {};
      if (response.data) {
        response.data.forEach((setting) => {
          result[`${setting.setting_type}.${setting.key}`] = setting.value;
        });
      }
      return result;
    } catch {
      return {};
    }
  }

  async getSetting(
    category: string,
    key: string,
    defaultValue?: any
  ): Promise<any> {
    try {
      const fullKey = `${category}.${key}`;
      const settings = await this.getAllSettingsAsObject();
      return settings[fullKey] ?? defaultValue;
    } catch {
      return defaultValue;
    }
  }

  async setSetting(
    category: string,
    key: string,
    value: any,
    description?: string
  ): Promise<SettingResponse> {
    return this.setValueByKey(key, value, {
      setting_type: category as SettingType,
      description: description || `Setting for ${category}.${key}`,
      is_public: false,
    });
  }

  async settingExists(
    key: string,
    settingType?: SettingType
  ): Promise<boolean> {
    try {
      const response = await this.getSettingByKey(key, settingType);
      return response.status && response.data !== null;
    } catch {
      return false;
    }
  }

  async getBooleanSetting(
    category: string,
    key: string,
    defaultValue = false
  ): Promise<boolean> {
    const value = await this.getSetting(category, key, defaultValue);
    if (typeof value === "boolean") return value;
    if (typeof value === "string")
      return value.toLowerCase() === "true" || value === "1";
    if (typeof value === "number") return value === 1;
    return defaultValue;
  }

  async getNumberSetting(
    category: string,
    key: string,
    defaultValue = 0
  ): Promise<number> {
    const value = await this.getSetting(category, key, defaultValue);
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  }

  async getStringSetting(
    category: string,
    key: string,
    defaultValue = ""
  ): Promise<string> {
    const value = await this.getSetting(category, key, defaultValue);
    return String(value);
  }

  async getArraySetting(
    category: string,
    key: string,
    defaultValue: any[] = []
  ): Promise<any[]> {
    const value = await this.getSetting(category, key, defaultValue);
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return defaultValue;
      }
    }
    return defaultValue;
  }

  async getObjectSetting(
    category: string,
    key: string,
    defaultValue: object = {}
  ): Promise<object> {
    const value = await this.getSetting(category, key, defaultValue);
    if (typeof value === "object" && value !== null && !Array.isArray(value))
      return value;
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (
          typeof parsed === "object" &&
          parsed !== null &&
          !Array.isArray(parsed)
        )
          return parsed;
      } catch {}
    }
    return defaultValue;
  }

  // --------------------------------------------------------------------
  // INITIALIZATION & DEFAULTS
  // --------------------------------------------------------------------

  async initializeDefaultSettings(): Promise<void> {
    const defaults: CreateSettingData[] = [
      // General
      {
        key: "company_name",
        value: "Meatify",
        setting_type: SettingType.GENERAL,
        description: "Company name",
        is_public: false,
      },
      {
        key: "branch_location",
        value: "",
        setting_type: SettingType.GENERAL,
        description: "Branch location",
        is_public: false,
      },
      {
        key: "default_timezone",
        value: "Asia/Manila",
        setting_type: SettingType.GENERAL,
        description: "Default timezone",
        is_public: false,
      },
      {
        key: "currency",
        value: "PHP",
        setting_type: SettingType.GENERAL,
        description: "Currency",
        is_public: true,
      },
      {
        key: "decimal_places",
        value: 2,
        setting_type: SettingType.GENERAL,
        description: "Decimal places for amounts",
        is_public: false,
      },
      {
        key: "auto_logout_minutes",
        value: 30,
        setting_type: SettingType.GENERAL,
        description: "Auto logout after inactivity (minutes)",
        is_public: false,
      },
      {
        key: "date_format",
        value: "YYYY-MM-DD",
        setting_type: SettingType.GENERAL,
        description: "Date format",
        is_public: false,
      },

      // Inventory
      {
        key: "low_stock_threshold",
        value: 5,
        setting_type: SettingType.INVENTORY,
        description: "Low stock threshold in kg",
        is_public: false,
      },
      {
        key: "enable_auto_reorder",
        value: false,
        setting_type: SettingType.INVENTORY,
        description: "Enable auto-reorder",
        is_public: false,
      },
      {
        key: "auto_reorder_quantity",
        value: 10,
        setting_type: SettingType.INVENTORY,
        description: "Auto reorder quantity in kg",
        is_public: false,
      },
      {
        key: "allow_negative_stock",
        value: false,
        setting_type: SettingType.INVENTORY,
        description: "Allow negative stock",
        is_public: false,
      },
      {
        key: "fifo_enabled",
        value: true,
        setting_type: SettingType.INVENTORY,
        description: "Enable FIFO stock deduction",
        is_public: false,
      },
      {
        key: "inventory_sync_enabled",
        value: true,
        setting_type: SettingType.INVENTORY,
        description: "Enable inventory sync",
        is_public: false,
      },

      // Sales
      {
        key: "tax_rate",
        value: 0,
        setting_type: SettingType.SALES,
        description: "Tax rate in percentage",
        is_public: false,
      },
      {
        key: "default_discount_rate",
        value: 0,
        setting_type: SettingType.SALES,
        description: "Default discount rate in percentage",
        is_public: false,
      },
      {
        key: "max_discount_percent",
        value: 20,
        setting_type: SettingType.SALES,
        description: "Maximum discount percentage allowed",
        is_public: false,
      },
      {
        key: "enable_discounts",
        value: true,
        setting_type: SettingType.SALES,
        description: "Enable discounts",
        is_public: false,
      },
      {
        key: "default_payment_method",
        value: "cash",
        setting_type: SettingType.SALES,
        description: "Default payment method",
        is_public: false,
      },
      {
        key: "enable_cash_payment",
        value: true,
        setting_type: SettingType.SALES,
        description: "Enable cash payment",
        is_public: false,
      },
      {
        key: "enable_card_payment",
        value: true,
        setting_type: SettingType.SALES,
        description: "Enable card payment",
        is_public: false,
      },
      {
        key: "enable_wallet_payment",
        value: true,
        setting_type: SettingType.SALES,
        description: "Enable wallet payment",
        is_public: false,
      },
      {
        key: "price_rounding",
        value: "nearest",
        setting_type: SettingType.SALES,
        description: "Price rounding method",
        is_public: false,
      },
      {
        key: "enable_loyalty_points",
        value: true,
        setting_type: SettingType.SALES,
        description: "Enable loyalty points",
        is_public: false,
      },
      {
        key: "loyalty_point_rate",
        value: 100,
        setting_type: SettingType.SALES,
        description: "Loyalty points earned per ₱ spent",
        is_public: false,
      },
      {
        key: "loyalty_vip_threshold",
        value: 1000,
        setting_type: SettingType.SALES,
        description: "Lifetime points to reach VIP status",
        is_public: false,
      },
      {
        key: "loyalty_elite_threshold",
        value: 5000,
        setting_type: SettingType.SALES,
        description: "Lifetime points to reach Elite status",
        is_public: false,
      },
      {
        key: "enable_refunds",
        value: true,
        setting_type: SettingType.SALES,
        description: "Enable refunds",
        is_public: false,
      },
      {
        key: "refund_window_days",
        value: 7,
        setting_type: SettingType.SALES,
        description: "Refund window in days",
        is_public: false,
      },
      {
        key: "require_receipt_for_refund",
        value: true,
        setting_type: SettingType.SALES,
        description: "Require receipt for refund",
        is_public: false,
      },
      {
        key: "refund_restock_enabled",
        value: true,
        setting_type: SettingType.SALES,
        description: "Restock inventory on refund",
        is_public: false,
      },

      // Cashier
      {
        key: "enable_receipt_printing",
        value: true,
        setting_type: SettingType.CASHIER,
        description: "Enable receipt printing",
        is_public: false,
      },
      {
        key: "receipt_printer_type",
        value: "thermal",
        setting_type: SettingType.CASHIER,
        description: "Receipt printer type",
        is_public: false,
      },
      {
        key: "receipt_header_message",
        value: "",
        setting_type: SettingType.CASHIER,
        description: "Receipt header message",
        is_public: false,
      },
      {
        key: "receipt_footer_message",
        value: "Thank you for shopping at Meatify!",
        setting_type: SettingType.CASHIER,
        description: "Receipt footer message",
        is_public: false,
      },
      {
        key: "receipt_show_logo",
        value: true,
        setting_type: SettingType.CASHIER,
        description: "Show logo on receipt",
        is_public: false,
      },
      {
        key: "receipt_show_tax",
        value: true,
        setting_type: SettingType.CASHIER,
        description: "Show tax on receipt",
        is_public: false,
      },
      {
        key: "receipt_show_discount",
        value: true,
        setting_type: SettingType.CASHIER,
        description: "Show discount on receipt",
        is_public: false,
      },
      {
        key: "receipt_show_loyalty",
        value: true,
        setting_type: SettingType.CASHIER,
        description: "Show loyalty on receipt",
        is_public: false,
      },
      {
        key: "enable_cash_drawer",
        value: true,
        setting_type: SettingType.CASHIER,
        description: "Enable cash drawer",
        is_public: false,
      },
      {
        key: "drawer_open_code",
        value: "0",
        setting_type: SettingType.CASHIER,
        description: "Cash drawer open code",
        is_public: false,
      },
      {
        key: "cash_drawer_connection_type",
        value: "printer",
        setting_type: SettingType.CASHIER,
        description: "Cash drawer connection type",
        is_public: false,
      },

      // Notifications
      {
        key: "email_enabled",
        value: false,
        setting_type: SettingType.NOTIFICATIONS,
        description: "Enable email notifications",
        is_public: false,
      },
      {
        key: "sms_enabled",
        value: false,
        setting_type: SettingType.NOTIFICATIONS,
        description: "Enable SMS notifications",
        is_public: false,
      },
      {
        key: "in_app_notifications_enabled",
        value: true,
        setting_type: SettingType.NOTIFICATIONS,
        description: "Enable in-app notifications",
        is_public: false,
      },
      {
        key: "notify_low_stock",
        value: true,
        setting_type: SettingType.NOTIFICATIONS,
        description: "Notify on low stock",
        is_public: false,
      },
      {
        key: "notify_expiring_batches",
        value: true,
        setting_type: SettingType.NOTIFICATIONS,
        description: "Notify on expiring batches",
        is_public: false,
      },
      {
        key: "notify_refund_processed",
        value: true,
        setting_type: SettingType.NOTIFICATIONS,
        description: "Notify on refund processed",
        is_public: false,
      },
      {
        key: "notify_purchase_completed",
        value: true,
        setting_type: SettingType.NOTIFICATIONS,
        description: "Notify on purchase completed",
        is_public: false,
      },
      {
        key: "email_smtp_host",
        value: "",
        setting_type: SettingType.NOTIFICATIONS,
        description: "SMTP host",
        is_public: false,
      },
      {
        key: "email_smtp_port",
        value: 587,
        setting_type: SettingType.NOTIFICATIONS,
        description: "SMTP port",
        is_public: false,
      },
      {
        key: "email_smtp_username",
        value: "",
        setting_type: SettingType.NOTIFICATIONS,
        description: "SMTP username",
        is_public: false,
      },
      {
        key: "email_smtp_password",
        value: "",
        setting_type: SettingType.NOTIFICATIONS,
        description: "SMTP password",
        is_public: false,
      },
      {
        key: "email_from_address",
        value: "",
        setting_type: SettingType.NOTIFICATIONS,
        description: "Email from address",
        is_public: false,
      },
      {
        key: "email_from_name",
        value: "Meatify POS",
        setting_type: SettingType.NOTIFICATIONS,
        description: "Email from name",
        is_public: false,
      },
      {
        key: "sms_provider",
        value: "twilio",
        setting_type: SettingType.NOTIFICATIONS,
        description: "SMS provider",
        is_public: false,
      },
      {
        key: "twilio_account_sid",
        value: "",
        setting_type: SettingType.NOTIFICATIONS,
        description: "Twilio account SID",
        is_public: false,
      },
      {
        key: "twilio_auth_token",
        value: "",
        setting_type: SettingType.NOTIFICATIONS,
        description: "Twilio auth token",
        is_public: false,
      },
      {
        key: "twilio_phone_number",
        value: "",
        setting_type: SettingType.NOTIFICATIONS,
        description: "Twilio phone number",
        is_public: false,
      },
      {
        key: "twilio_messaging_service_sid",
        value: "",
        setting_type: SettingType.NOTIFICATIONS,
        description: "Twilio messaging service SID",
        is_public: false,
      },

      // Reports
      {
        key: "export_formats",
        value: ["CSV", "Excel", "PDF"],
        setting_type: SettingType.DATA_REPORTS,
        description: "Export formats",
        is_public: false,
      },
      {
        key: "default_export_format",
        value: "CSV",
        setting_type: SettingType.DATA_REPORTS,
        description: "Default export format",
        is_public: false,
      },
      {
        key: "auto_backup_enabled",
        value: false,
        setting_type: SettingType.DATA_REPORTS,
        description: "Enable auto backup",
        is_public: false,
      },
      {
        key: "backup_schedule",
        value: "0 2 * * *",
        setting_type: SettingType.DATA_REPORTS,
        description: "Backup schedule (cron)",
        is_public: false,
      },
      {
        key: "backup_location",
        value: "./backups",
        setting_type: SettingType.DATA_REPORTS,
        description: "Backup location",
        is_public: false,
      },
      {
        key: "data_retention_days",
        value: 365,
        setting_type: SettingType.DATA_REPORTS,
        description: "Data retention days",
        is_public: false,
      },
      {
        key: "include_audit_in_backup",
        value: false,
        setting_type: SettingType.DATA_REPORTS,
        description: "Include audit logs in backup",
        is_public: false,
      },

      // Integrations
      {
        key: "webhooks_enabled",
        value: false,
        setting_type: SettingType.INTEGRATIONS,
        description: "Enable webhooks",
        is_public: false,
      },
      {
        key: "webhooks",
        value: [],
        setting_type: SettingType.INTEGRATIONS,
        description: "Webhook configurations",
        is_public: false,
      },

      // Audit Security
      {
        key: "audit_log_enabled",
        value: true,
        setting_type: SettingType.AUDIT_SECURITY,
        description: "Enable audit logging",
        is_public: false,
      },
      {
        key: "log_retention_days",
        value: 30,
        setting_type: SettingType.AUDIT_SECURITY,
        description: "Audit log retention days",
        is_public: false,
      },
      {
        key: "log_events",
        value: ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"],
        setting_type: SettingType.AUDIT_SECURITY,
        description: "Audit events to log",
        is_public: false,
      },
      {
        key: "force_https",
        value: false,
        setting_type: SettingType.AUDIT_SECURITY,
        description: "Force HTTPS",
        is_public: false,
      },
      {
        key: "session_encryption_enabled",
        value: true,
        setting_type: SettingType.AUDIT_SECURITY,
        description: "Enable session encryption",
        is_public: false,
      },
      {
        key: "gdpr_compliance_enabled",
        value: false,
        setting_type: SettingType.AUDIT_SECURITY,
        description: "Enable GDPR compliance",
        is_public: false,
      },
      {
        key: "require_mfa_for_admin",
        value: false,
        setting_type: SettingType.AUDIT_SECURITY,
        description: "Require MFA for admin",
        is_public: false,
      },
    ];

    for (const def of defaults) {
      const exists = await this.settingExists(def.key, def.setting_type);
      if (!exists) await this.createSetting(def);
    }
  }

  async exportSettingsToFile(): Promise<string> {
    const config = await this.getGroupedConfig();
    return JSON.stringify(config.data, null, 2);
  }

  async importSettingsFromFile(jsonData: string): Promise<SystemConfigResponse> {
    const configData = JSON.parse(jsonData);
    return this.updateGroupedConfig(configData);
  }

  async resetToDefaults(): Promise<SystemConfigResponse> {
    const all = await this.getAllSettings();
    const ids = all.data?.map((s) => s.id) || [];
    if (ids.length) await this.bulkDelete(ids);
    await this.initializeDefaultSettings();
    return this.getGroupedConfig();
  }

  async getSystemHealth(): Promise<{
    settings_count: number;
    last_updated: string;
    has_errors: boolean;
    categories: string[];
  }> {
    try {
      const stats = await this.getSettingsStats();
      const config = await this.getGroupedConfig();
      return {
        settings_count: stats.data?.total || 0,
        last_updated:
          config.data?.system_info?.current_time || new Date().toISOString(),
        has_errors: false,
        categories: config.data?.system_info?.setting_types || [],
      };
    } catch {
      return {
        settings_count: 0,
        last_updated: new Date().toISOString(),
        has_errors: true,
        categories: [],
      };
    }
  }

  async validateSettings(): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    try {
      const config = await this.getGroupedConfig();
      if (!config.data) errors.push("No configuration data found");
      const general = config.data?.grouped_settings?.general;
      if (general && !general.company_name)
        warnings.push("Company name not set");
      const emailEnabled = await this.getBooleanSetting(
        "notifications",
        "email_enabled"
      );
      if (emailEnabled) {
        const host = await this.getStringSetting(
          "notifications",
          "email_smtp_host"
        );
        if (!host) warnings.push("Email enabled but SMTP host not configured");
      }
      return { valid: errors.length === 0, errors, warnings };
    } catch (e: any) {
      errors.push(e.message);
      return { valid: false, errors, warnings };
    }
  }

  async getPublicSystemSettings(): Promise<{
    general: { [key: string]: { value: any; description: string } };
    system: { site_name: string; currency: string; cache_timestamp: string };
  }> {
    // Public settings for frontend
    if (!window.backendAPI?.systemConfig)
      throw new Error("Electron API (systemConfig) not available");
    const response = await window.backendAPI.systemConfig({
      method: "getPublicSystemSettings",
      params: {},
    });
    if (response.status) return response.data;
    throw new Error(response.message || "Failed to fetch public settings");
  }

  async getSystemInfoForFrontend(): Promise<{
    system_info: {
      site_name: string;
      logo: string;
      currency: string;
      admin_email: string;
      tax_enabled: boolean;
      tax_rate: number;
      system_version: string;
    };
    public_settings: any;
    cache_timestamp: string;
  }> {
    if (!window.backendAPI?.systemConfig)
      throw new Error("Electron API (systemConfig) not available");
    const response = await window.backendAPI.systemConfig({
      method: "getSystemInfoForFrontend",
      params: {},
    });
    if (response.status) return response.data;
    throw new Error(response.message || "Failed to fetch system info");
  }
}

// ============================================================
// 📤 Export singleton instance
// ============================================================

const systemConfigAPI = new SystemConfigAPI();
export default systemConfigAPI;