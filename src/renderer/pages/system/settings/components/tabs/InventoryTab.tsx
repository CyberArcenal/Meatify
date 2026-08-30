import type { InventorySettings } from "../../../../../api/utils/system_config";
import Switch from "../../../../../components/UI/Switch";

// InventoryTab.tsx
export const InventoryTab: React.FC<{ settings: InventorySettings; onChange: any }> = ({ settings, onChange }) => {
  const updateField = (field: keyof InventorySettings, value: any) => onChange(field, value);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Low Stock Threshold (kg)</label>
          <input type="number" value={settings.low_stock_threshold || 5} onChange={(e) => updateField("low_stock_threshold", parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Auto Reorder Quantity (kg)</label>
          <input type="number" value={settings.auto_reorder_quantity || 10} onChange={(e) => updateField("auto_reorder_quantity", parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)] focus:outline-none" />
        </div>
      </div>
      <div className="space-y-3">
        <Switch checked={settings.allow_negative_stock || false} onChange={(checked) => updateField("allow_negative_stock", checked)} />
        <span className="ml-3 text-sm text-[var(--text-secondary)]">Allow Negative Stock</span>
        <br />
        <Switch checked={settings.fifo_enabled !== false} onChange={(checked) => updateField("fifo_enabled", checked)} />
        <span className="ml-3 text-sm text-[var(--text-secondary)]">Enable FIFO (First-In, First-Out)</span>
        <br />
        <Switch checked={settings.enable_auto_reorder || false} onChange={(checked) => updateField("enable_auto_reorder", checked)} />
        <span className="ml-3 text-sm text-[var(--text-secondary)]">Enable Auto Reorder</span>
        <br />
        <Switch checked={settings.inventory_sync_enabled !== false} onChange={(checked) => updateField("inventory_sync_enabled", checked)} />
        <span className="ml-3 text-sm text-[var(--text-secondary)]">Enable Inventory Sync</span>
      </div>
    </div>
  );
};