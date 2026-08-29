// src/renderer/pages/Loyalty/components/CustomerLoyaltyViewDialog.tsx
import React from "react";
import { Loader2, Calendar, Award, TrendingDown, Mail, Phone, User } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import { type Customer } from "../../../api/core/customer";
import { type LoyaltyTransaction } from "../../../api/core/loyaltyTransaction";

interface CustomerLoyaltyViewDialogProps {
  isOpen: boolean;
  customer: Customer | null;
  transactions: LoyaltyTransaction[];
  loading: boolean;
  onClose: () => void;
}

export const CustomerLoyaltyViewDialog: React.FC<CustomerLoyaltyViewDialogProps> = ({
  isOpen,
  customer,
  transactions,
  loading,
  onClose,
}) => {
  if (!customer) return null;

  const totalEarned = transactions
    .filter((tx) => tx.pointsChange > 0)
    .reduce((sum, tx) => sum + tx.pointsChange, 0);

  const totalRedeemed = transactions
    .filter((tx) => tx.pointsChange < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.pointsChange), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-[var(--accent-gold)]" />
          Customer Loyalty Details
        </div>
      }
      size="lg"
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="bg-[var(--card-secondary-bg)] rounded-lg p-4 border border-[var(--border-color)]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {customer.name}
                </h3>
                <div className="flex flex-col gap-1 mt-2 text-sm">
                  {customer.email && (
                    <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                      <Mail className="w-4 h-4" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {customer.phone && (
                    <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                      <Phone className="w-4 h-4" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {new Date(customer.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  customer.status === "vip"
                    ? "bg-[var(--accent-gold-light)] text-[var(--accent-gold)]"
                    : customer.status === "elite"
                    ? "bg-[var(--accent-purple-light)] text-[var(--accent-purple)]"
                    : "bg-[var(--accent-blue-light)] text-[var(--accent-blue)]"
                }`}
              >
                {customer.status.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-[var(--border-color)]">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Current Balance</p>
                <p className="text-xl font-bold text-[var(--accent-gold)]">
                  {customer.loyaltyPointsBalance}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Total Earned</p>
                <p className="text-xl font-bold text-[var(--success-color)]">
                  +{totalEarned}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Total Redeemed</p>
                <p className="text-xl font-bold text-[var(--danger-color)]">
                  -{totalRedeemed}
                </p>
              </div>
            </div>
          </div>

          {/* Transaction History */}
          <div>
            <h4 className="text-md font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Transaction History ({transactions.length})
            </h4>
            {transactions.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)] text-center py-4">
                No loyalty transactions found.
              </p>
            ) : (
              <div className="border border-[var(--border-color)] rounded-lg overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--table-header-bg)] sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                        Points
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                        Sale
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {transactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="px-4 py-2 text-[var(--text-secondary)]">
                          {new Date(tx.timestamp).toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {tx.pointsChange > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[var(--success-color)]">
                              <Award className="w-4 h-4" />
                              Earn
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[var(--danger-color)]">
                              <TrendingDown className="w-4 h-4" />
                              Redeem
                            </span>
                          )}
                        </td>
                        <td
                          className={`px-4 py-2 text-right font-medium ${
                            tx.pointsChange > 0 ? "text-[var(--success-color)]" : "text-[var(--danger-color)]"
                          }`}
                        >
                          {tx.pointsChange > 0 ? "+" : ""}
                          {tx.pointsChange}
                        </td>
                        <td className="px-4 py-2 text-[var(--text-secondary)]">
                          {tx.notes || "—"}
                        </td>
                        <td className="px-4 py-2 text-center text-[var(--text-secondary)]">
                          {tx.saleId ? `#${tx.saleId}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};