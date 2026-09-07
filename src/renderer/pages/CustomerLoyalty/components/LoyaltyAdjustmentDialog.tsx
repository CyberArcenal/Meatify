// src/renderer/pages/Loyalty/components/LoyaltyAdjustmentDialog.tsx
import React, { useState, useEffect } from "react";
import { Loader2, Award, Plus, Minus } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import loyaltyAPI from "../../../api/core/loyaltyTransaction";
import customerAPI, { type Customer } from "../../../api/core/customer";
import CustomerSelect from "../../../components/Selects/Customer";
import ToggleSegmented from "../../../components/UI/ToggleSegmented";
import { dialogs } from "../../../utils/dialogs";

interface LoyaltyAdjustmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const LoyaltyAdjustmentDialog: React.FC<LoyaltyAdjustmentDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [action, setAction] = useState<"earn" | "redeem">("earn");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  // ─── Reset form when dialog closes ──────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      setCustomerId(null);
      setSelectedCustomer(null);
      setPoints(0);
      setAction("earn");
      setReason("");
    }
  }, [isOpen]);

  // ─── Handle customer selection ──────────────────────────────────
  const handleCustomerChange = (id: number | null, customer?: Customer) => {
    setCustomerId(id);
    setSelectedCustomer(customer || null);
  };

  // ─── Submit adjustment ──────────────────────────────────────────
  const handleSubmit = async () => {
    if (!customerId) {
      dialogs.error("Please select a customer.");
      return;
    }
    if (points <= 0) {
      dialogs.error("Points must be greater than 0.");
      return;
    }
    if (!reason.trim()) {
      dialogs.error("Please provide a reason.");
      return;
    }

    setLoading(true);
    try {
      const pointsChange = action === "earn" ? points : -points;
      const response = await loyaltyAPI.create({
        customerId,
        pointsChange,
        transactionType: "adjustment",
        notes: reason,
      });

      if (response.status) {
        dialogs.success(`Points ${action === "earn" ? "added" : "deducted"} successfully.`);
        onSuccess();
        onClose();
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      dialogs.error(err.message || "Failed to adjust points.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Toggle options ──────────────────────────────────────────────
  const toggleOptions = [
    {
      value: "earn",
      label: "Add Points",
      icon: <Plus className="w-3.5 h-3.5" />,
      color: "var(--success-color)",
    },
    {
      value: "redeem",
      label: "Deduct Points",
      icon: <Minus className="w-3.5 h-3.5" />,
      color: "var(--danger-color)",
    },
  ] as const;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Loyalty Points"
      size="sm"
      closeOnClickOutside={!loading}
      closeOnEsc={!loading}
    >
      <div className="space-y-5">
        {/* Customer Selection */}
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
            Customer <span className="text-[var(--accent-red)]">*</span>
          </label>
          <CustomerSelect
            value={customerId}
            onChange={handleCustomerChange}
            placeholder="Search for a customer..."
            activeOnly={true}
            statusFilter="all"
          />
        </div>

        {/* Selected Customer Info */}
        {selectedCustomer && (
          <div className="bg-[var(--card-secondary-bg)] p-3 rounded-lg border border-[var(--border-color)] -mt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Selected</p>
                <p className="font-medium text-[var(--text-primary)]">{selectedCustomer.name}</p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {selectedCustomer.email || selectedCustomer.phone || "No contact"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Current Points</p>
                <p className="font-semibold text-[var(--accent-gold)]">
                  {selectedCustomer.loyaltyPointsBalance}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ✅ NEW: ToggleSegmented instead of radio buttons */}
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
            Action
          </label>
          <ToggleSegmented
            options={toggleOptions}
            value={action}
            onChange={(val) => setAction(val as "earn" | "redeem")}
            disabled={!selectedCustomer || loading}
            size="md"
          />
        </div>

        {/* Points */}
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
            Points {action === "earn" ? "to Add" : "to Deduct"} <span className="text-[var(--accent-red)]">*</span>
          </label>
          <input
            type="number"
            min="1"
            value={points || ""}
            onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
            placeholder="Enter number of points"
            disabled={!selectedCustomer || loading}
          />
          {action === "redeem" && selectedCustomer && points > selectedCustomer.loyaltyPointsBalance && (
            <p className="text-xs text-[var(--danger-color)] mt-1">
              ⚠️ This exceeds the customer's current balance of {selectedCustomer.loyaltyPointsBalance} points
            </p>
          )}
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
            Reason <span className="text-[var(--accent-red)]">*</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Manual adjustment, Promo, Correction"
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
            disabled={!selectedCustomer || loading}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-[var(--border-color)] rounded-lg text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedCustomer}
            className="px-6 py-2.5 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors disabled:opacity-50 flex items-center gap-2 font-semibold shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Submit Adjustment"
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};