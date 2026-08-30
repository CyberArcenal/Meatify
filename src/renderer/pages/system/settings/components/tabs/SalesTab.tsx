import type { SalesSettings } from "../../../../../api/utils/system_config";
import Switch from "../../../../../components/UI/Switch";

// SalesTab.tsx
export const SalesTab: React.FC<{ settings: SalesSettings; onChange: any }> = ({ settings, onChange }) => {
  const updateField = (field: keyof SalesSettings, value: any) => onChange(field, value);
  return (
    <div className="space-y-8">
      {/* Pricing */}
      <div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Pricing & Tax</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Tax Rate (%)</label>
            <input type="number" step="0.1" min="0" max="100" value={settings.tax_rate || 0} onChange={(e) => updateField("tax_rate", parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Default Discount (%)</label>
            <input type="number" step="0.1" min="0" max="100" value={settings.default_discount_rate || 0} onChange={(e) => updateField("default_discount_rate", parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Max Discount (%)</label>
            <input type="number" step="0.1" min="0" max="100" value={settings.max_discount_percent || 20} onChange={(e) => updateField("max_discount_percent", parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)]" />
          </div>
        </div>
        <div className="mt-3">
          <Switch checked={settings.enable_discounts !== false} onChange={(checked) => updateField("enable_discounts", checked)} />
          <span className="ml-3 text-sm text-[var(--text-secondary)]">Enable Discounts</span>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="border-t border-[var(--border-color)] pt-6">
        <h4 className="text-md font-medium text-[var(--text-primary)] mb-4">Payment Methods</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Default Payment Method</label>
            <select value={settings.default_payment_method || "cash"} onChange={(e) => updateField("default_payment_method", e.target.value)} className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)]">
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="wallet">E-Wallet</option>
            </select>
          </div>
          <div className="space-y-2">
            <Switch checked={settings.enable_cash_payment !== false} onChange={(checked) => updateField("enable_cash_payment", checked)} />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">Cash Payment</span>
            <br />
            <Switch checked={settings.enable_card_payment !== false} onChange={(checked) => updateField("enable_card_payment", checked)} />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">Card Payment</span>
            <br />
            <Switch checked={settings.enable_wallet_payment !== false} onChange={(checked) => updateField("enable_wallet_payment", checked)} />
            <span className="ml-3 text-sm text-[var(--text-secondary)]">E-Wallet Payment</span>
          </div>
        </div>
      </div>

      {/* Loyalty */}
      <div className="border-t border-[var(--border-color)] pt-6">
        <h4 className="text-md font-medium text-[var(--text-primary)] mb-4">Loyalty Program</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Points per ₱</label>
            <input type="number" step="1" min="0" value={settings.loyalty_point_rate || 100} onChange={(e) => updateField("loyalty_point_rate", parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">VIP Threshold (points)</label>
            <input type="number" step="1" min="0" value={settings.loyalty_vip_threshold || 1000} onChange={(e) => updateField("loyalty_vip_threshold", parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Elite Threshold (points)</label>
            <input type="number" step="1" min="0" value={settings.loyalty_elite_threshold || 5000} onChange={(e) => updateField("loyalty_elite_threshold", parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)]" />
          </div>
        </div>
        <div className="mt-3">
          <Switch checked={settings.enable_loyalty_points !== false} onChange={(checked) => updateField("enable_loyalty_points", checked)} />
          <span className="ml-3 text-sm text-[var(--text-secondary)]">Enable Loyalty Points</span>
        </div>
      </div>

      {/* Refunds */}
      <div className="border-t border-[var(--border-color)] pt-6">
        <h4 className="text-md font-medium text-[var(--text-primary)] mb-4">Refund & Returns</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Refund Window (days)</label>
            <input type="number" min="0" value={settings.refund_window_days || 7} onChange={(e) => updateField("refund_window_days", parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border bg-[var(--input-bg)] border-[var(--input-border)] text-[var(--text-primary)] focus:ring-2 focus:ring-[var(--accent-gold)]" />
          </div>
        </div>
        <div className="space-y-2 mt-2">
          <Switch checked={settings.enable_refunds !== false} onChange={(checked) => updateField("enable_refunds", checked)} />
          <span className="ml-3 text-sm text-[var(--text-secondary)]">Enable Refunds</span>
          <br />
          <Switch checked={settings.require_receipt_for_refund !== false} onChange={(checked) => updateField("require_receipt_for_refund", checked)} />
          <span className="ml-3 text-sm text-[var(--text-secondary)]">Require Receipt for Refund</span>
          <br />
          <Switch checked={settings.refund_restock_enabled !== false} onChange={(checked) => updateField("refund_restock_enabled", checked)} />
          <span className="ml-3 text-sm text-[var(--text-secondary)]">Restock on Refund</span>
        </div>
      </div>
    </div>
  );
};