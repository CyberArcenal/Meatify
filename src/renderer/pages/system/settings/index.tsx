// src/renderer/pages/system/settings/index.tsx
import React, { useState, useEffect } from "react";
import { Save, RotateCcw, Download, Upload, Settings } from "lucide-react";
import { useMeatifySettings } from "./hooks/useMeatifySettings";
import { MeatifySettingsTabs } from "./components/MeatifySettingsTabs";
import { GeneralTab } from "./components/tabs/GeneralTab";
import { InventoryTab } from "./components/tabs/InventoryTab";
import { SalesTab } from "./components/tabs/SalesTab";
import { dialogs } from "../../../utils/dialogs";
import systemConfigAPI from "../../../api/utils/system_config";
import { AuditSecurityTab } from "./components/tabs/AuditSecurityTab";
import { NotificationsTab } from "./components/tabs/NotificationsTab";
import { CashierTab } from "./components/tabs/CashierTab";
import { version } from "../../../../../package.json";

type TabKey =
  | "general"
  | "inventory"
  | "sales"
  | "cashier"
  | "notifications"
  | "audit_security";

const MeatifySettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("general");

  const {
    settings,
    loading,
    saving,
    error,
    successMessage,
    setError,
    setSuccessMessage,
    updateGeneral,
    updateInventory,
    updateSales,
    updateCashier,
    updateNotifications,
    updateAuditSecurity,
    saveSettings,
    resetToDefaults,
    refetch,
    hasChanges,
  } = useMeatifySettings();

  useEffect(() => {
    if (successMessage) {
      dialogs.success(successMessage);
      setSuccessMessage(null);
    }
    if (error) {
      dialogs.error(error);
      setError(null);
    }
  }, [successMessage, error, setSuccessMessage, setError]);

  const handleExport = async () => {
    try {
      const jsonStr = await systemConfigAPI.exportSettingsToFile();
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meatify-settings-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      dialogs.success("Settings exported successfully");
    } catch (err: any) {
      dialogs.error(err.message || "Failed to export settings");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const confirmed = await dialogs.confirm({
      title: "Import Settings",
      message: "Importing settings will overwrite current settings. Continue?",
      confirmText: "Import",
      icon: "warning",
    });
    if (!confirmed) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        await systemConfigAPI.importSettingsFromFile(content);
        dialogs.success("Settings imported successfully");
        await refetch();
      } catch (err: any) {
        dialogs.error(err.message || "Failed to import settings");
      }
    };
    reader.readAsText(file);
  };

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-gold)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      {/* Header with actions */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-[#d4af37] to-[#b8860b] shadow-lg shadow-[#d4af37]/20 border border-[#d4af37]/30">
            <Settings className="w-7 h-7 text-[#1a1a1a]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-3">
              System Settings
              <span className="text-xs font-normal text-[var(--text-tertiary)] bg-[var(--card-secondary-bg)] px-3 py-1 rounded-full border border-[var(--border-color)]">
                {version || "v1.0.0"}
              </span>
            </h1>
            <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent-gold)]" />
              Configure Meatify POS system preferences and modules
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExport}
            className="windows-button windows-button-secondary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <button className="windows-button windows-button-secondary flex items-center gap-2 px-4 py-2 text-sm">
              <Upload className="w-4 h-4" />
              Import
            </button>
          </label>
          <button
            onClick={resetToDefaults}
            disabled={saving}
            className="windows-button windows-button-secondary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
          <button
            onClick={saveSettings}
            disabled={!hasChanges || saving}
            className="windows-button windows-button-primary flex items-center gap-2 px-6 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <MeatifySettingsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] shadow-sm p-6 transition-all">
        {activeTab === "general" && (
          <GeneralTab settings={settings.general} onChange={updateGeneral} />
        )}
        {activeTab === "inventory" && (
          <InventoryTab
            settings={settings.inventory}
            onChange={updateInventory}
          />
        )}
        {activeTab === "sales" && (
          <SalesTab settings={settings.sales} onChange={updateSales} />
        )}
        {activeTab === "cashier" && (
          <CashierTab settings={settings.cashier} onChange={updateCashier} />
        )}
        {activeTab === "notifications" && (
          <NotificationsTab
            settings={settings.notifications}
            onChange={updateNotifications}
          />
        )}
        {activeTab === "audit_security" && (
          <AuditSecurityTab
            settings={settings.audit_security}
            onChange={updateAuditSecurity}
          />
        )}
      </div>
    </div>
  );
};

export default MeatifySettingsPage;
