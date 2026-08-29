// src/renderer/pages/customer/components/CustomerViewDialog.tsx
import React from "react";
import {
  Loader2,
  Calendar,
  Mail,
  Phone,
  Award,
  ShoppingBag,
  Star,
  MapPin,
  User,
} from "lucide-react";
import Modal from "../../../components/UI/Modal";
import Decimal from "decimal.js";
import { type Customer } from "../../../api/core/customer";
import { type Sale } from "../../../api/core/sale";
import { type LoyaltyTransaction } from "../../../api/core/loyaltyTransaction";

interface CustomerViewDialogProps {
  customer: Customer | null;
  sales: Sale[];
  loyaltyTransactions: LoyaltyTransaction[];
  loading: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    vip: {
      label: "VIP",
      color: "var(--customer-vip)",
      bg: "rgba(212, 175, 55, 0.15)",
    },
    elite: {
      label: "Elite",
      color: "var(--customer-loyal)",
      bg: "rgba(243, 156, 18, 0.15)",
    },
    regular: {
      label: "Regular",
      color: "var(--customer-regular)",
      bg: "rgba(52, 152, 219, 0.15)",
    },
  };
  const config = configs[status] || configs.regular;
  return (
    <span
      className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      {config.label}
    </span>
  );
};

export const CustomerViewDialog: React.FC<CustomerViewDialogProps> = ({
  customer,
  sales,
  loyaltyTransactions,
  loading,
  isOpen,
  onClose,
}) => {
  if (!customer) return null;

  const totalSpent = sales.reduce((sum, s) => {
    const amount = typeof s.totalAmount === "string" ? parseFloat(s.totalAmount) : s.totalAmount;
    return sum + (amount || 0);
  }, 0);

  const totalPointsEarned = loyaltyTransactions
    .filter((tx) => tx.pointsChange > 0)
    .reduce((sum, tx) => sum + tx.pointsChange, 0);

  const totalPointsRedeemed = loyaltyTransactions
    .filter((tx) => tx.pointsChange < 0)
    .reduce((sum, tx) => sum + Math.abs(tx.pointsChange), 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-[var(--accent-gold)]" />
          Customer Details
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
          {/* Profile Summary */}
          <div className="bg-[var(--card-secondary-bg)] rounded-lg p-4 border border-[var(--border-color)]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  {customer.name}
                  {!customer.isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]">
                      Inactive
                    </span>
                  )}
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
                  {customer.address && (
                    <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                      <MapPin className="w-4 h-4" />
                      <span>{customer.address}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {new Date(customer.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <StatusBadge status={customer.status} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-[var(--border-color)]">
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Loyalty Points</p>
                <p className="text-xl font-bold text-[var(--accent-purple)]">
                  {customer.loyaltyPointsBalance}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Total Spent</p>
                <p className="text-xl font-bold text-[var(--accent-gold)]">
                  ₱{totalSpent.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Points Earned</p>
                <p className="text-xl font-bold text-[var(--success-color)]">
                  +{totalPointsEarned}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Points Redeemed</p>
                <p className="text-xl font-bold text-[var(--danger-color)]">
                  -{totalPointsRedeemed}
                </p>
              </div>
            </div>

            {customer.notes && (
              <div className="mt-3 pt-3 border-t border-[var(--border-color)]">
                <p className="text-xs text-[var(--text-tertiary)] uppercase">Notes</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{customer.notes}</p>
              </div>
            )}
          </div>

          {/* Recent Sales */}
          <div>
            <h4 className="text-md font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Recent Sales ({sales.length})
            </h4>
            {sales.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)]">No sales yet.</p>
            ) : (
              <div className="border border-[var(--border-color)] rounded-lg overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--table-header-bg)] sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                        Payment
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {sales.slice(0, 10).map((sale) => (
                      <tr key={sale.id}>
                        <td className="px-4 py-2 text-[var(--text-secondary)]">
                          {new Date(sale.timestamp).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-[var(--accent-gold)]">
                          ₱{new Decimal(sale.totalAmount).toFixed(2)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              sale.status === "paid"
                                ? "bg-[var(--status-completed-bg)] text-[var(--status-completed)]"
                                : sale.status === "initiated"
                                ? "bg-[var(--status-pending-bg)] text-[var(--status-pending)]"
                                : sale.status === "refunded"
                                ? "bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]"
                                : "bg-[var(--status-processing-bg)] text-[var(--status-processing)]"
                            }`}
                          >
                            {sale.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 capitalize text-[var(--text-secondary)]">
                          {sale.paymentMethod}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Loyalty History */}
          <div>
            <h4 className="text-md font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Loyalty History ({loyaltyTransactions.length})
            </h4>
            {loyaltyTransactions.length === 0 ? (
              <p className="text-sm text-[var(--text-tertiary)]">No loyalty transactions.</p>
            ) : (
              <div className="border border-[var(--border-color)] rounded-lg overflow-hidden max-h-48 overflow-y-auto custom-scrollbar">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--table-header-bg)] sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                        Points
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-color)]">
                    {loyaltyTransactions.slice(0, 10).map((tx) => (
                      <tr key={tx.id}>
                        <td className="px-4 py-2 text-[var(--text-secondary)]">
                          {new Date(tx.timestamp).toLocaleDateString()}
                        </td>
                        <td
                          className={`px-4 py-2 text-right font-medium ${
                            tx.pointsChange > 0
                              ? "text-[var(--success-color)]"
                              : "text-[var(--danger-color)]"
                          }`}
                        >
                          {tx.pointsChange > 0 ? "+" : ""}
                          {tx.pointsChange}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              tx.transactionType === "earn"
                                ? "bg-[var(--status-completed-bg)] text-[var(--status-completed)]"
                                : tx.transactionType === "redeem"
                                ? "bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]"
                                : tx.transactionType === "adjustment"
                                ? "bg-[var(--status-pending-bg)] text-[var(--status-pending)]"
                                : "bg-[var(--status-processing-bg)] text-[var(--status-processing)]"
                            }`}
                          >
                            {tx.transactionType}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-[var(--text-secondary)] truncate max-w-[100px]">
                          {tx.notes || "—"}
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