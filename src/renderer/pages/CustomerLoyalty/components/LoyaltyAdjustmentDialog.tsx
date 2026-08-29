// src/renderer/pages/Loyalty/components/LoyaltyAdjustmentDialog.tsx
import React, { useState } from "react";
import { Loader2, Search, User, Award } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import loyaltyAPI from "../../../api/core/loyaltyTransaction";
import customerAPI, { type Customer } from "../../../api/core/customer";
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
  const [step, setStep] = useState<"select" | "adjust">("select");
  const [searchTerm, setSearchTerm] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [type, setType] = useState<"earn" | "redeem">("earn");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearchLoading(true);
    try {
      const response = await customerAPI.search({
        searchTerm,
        limit: 10,
      });
      if (response.status) {
        setCustomers(response.data.items || []);
      }
    } catch (err: any) {
      dialogs.error(err.message);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setStep("adjust");
    setCustomers([]);
    setSearchTerm("");
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) return;
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
      const pointsChange = type === "earn" ? points : -points;
      const response = await loyaltyAPI.create({
        customerId: selectedCustomer.id,
        pointsChange,
        transactionType: "adjustment",
        notes: reason,
      });
      if (response.status) {
        dialogs.success("Points adjusted successfully.");
        onSuccess();
        handleReset();
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      dialogs.error(err.message || "Failed to adjust points.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("select");
    setSearchTerm("");
    setCustomers([]);
    setSelectedCustomer(null);
    setPoints(0);
    setType("earn");
    setReason("");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title="Adjust Loyalty Points"
      size="sm"
      closeOnClickOutside={!loading}
      closeOnEsc={!loading}
    >
      {step === "select" ? (
        <div>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={searchLoading}
              className="px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] disabled:opacity-50 flex items-center gap-2 font-medium"
            >
              {searchLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search
            </button>
          </div>

          {customers.length > 0 && (
            <div className="border border-[var(--border-color)] rounded-lg divide-y divide-[var(--border-color)] max-h-60 overflow-y-auto custom-scrollbar">
              {customers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelectCustomer(c)}
                  className="p-3 hover:bg-[var(--card-hover-bg)] cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{c.name}</p>
                      <p className="text-sm text-[var(--text-tertiary)]">
                        {c.email || c.phone || "No contact"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--accent-gold)]">
                        {c.loyaltyPointsBalance} pts
                      </p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          c.status === "vip"
                            ? "bg-[var(--accent-gold-light)] text-[var(--accent-gold)]"
                            : c.status === "elite"
                            ? "bg-[var(--accent-purple-light)] text-[var(--accent-purple)]"
                            : "bg-[var(--accent-blue-light)] text-[var(--accent-blue)]"
                        }`}
                      >
                        {c.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {searchTerm && customers.length === 0 && !searchLoading && (
            <p className="text-center text-[var(--text-tertiary)] py-4">No customers found</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-[var(--card-secondary-bg)] p-3 rounded-lg border border-[var(--border-color)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Selected Customer</p>
                <p className="font-medium text-[var(--text-primary)]">{selectedCustomer?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Current Points</p>
                <p className="font-semibold text-[var(--accent-gold)]">
                  {selectedCustomer?.loyaltyPointsBalance || 0}
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
              Action
            </label>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="earn"
                  checked={type === "earn"}
                  onChange={() => setType("earn")}
                  className="text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                />
                <span className="text-[var(--text-primary)] flex items-center gap-1">
                  <Award className="w-4 h-4 text-[var(--success-color)]" />
                  Add Points
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="redeem"
                  checked={type === "redeem"}
                  onChange={() => setType("redeem")}
                  className="text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                />
                <span className="text-[var(--text-primary)] flex items-center gap-1">
                  <Award className="w-4 h-4 text-[var(--danger-color)]" />
                  Deduct Points
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
              Points {type === "earn" ? "to Add" : "to Deduct"} <span className="text-[var(--accent-red)]">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={points || ""}
              onChange={(e) => setPoints(parseInt(e.target.value) || 0)}
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
              Reason <span className="text-[var(--accent-red)]">*</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Manual adjustment, Promo, Correction"
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={() => setStep("select")}
              className="px-5 py-2.5 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors font-medium"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
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
      )}
    </Modal>
  );
};