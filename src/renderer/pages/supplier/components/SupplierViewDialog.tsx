// src/renderer/pages/inventory/suppliers/components/SupplierViewDialog.tsx
import React, { useState } from "react";
import { X, Beef, ShoppingCart, Info, Loader2 } from "lucide-react";
import type { Supplier } from "../../../api/core/supplier";
import type { Meat } from "../../../api/core/meat";
import type { Purchase } from "../../../api/core/purchase";
import Decimal from "decimal.js";

interface SupplierViewDialogProps {
  supplier: Supplier | null;
  meats: Meat[];
  purchases: Purchase[];
  metrics: {
    totalSpent: number;
    purchaseCount: number;
    averageOrderValue: number;
  };
  loading: boolean;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "info" | "meats" | "purchases";

export const SupplierViewDialog: React.FC<SupplierViewDialogProps> = ({
  supplier,
  meats,
  purchases,
  metrics,
  loading,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("info");

  if (!isOpen || !supplier) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Supplier: {supplier.name}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-tertiary)]" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[var(--border-color)] px-6">
            <button
              onClick={() => setActiveTab("info")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "info"
                  ? "text-[var(--accent-gold)] border-b-2 border-[var(--accent-gold)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Info className="w-4 h-4 inline mr-1" />
              Basic Info
            </button>
            <button
              onClick={() => setActiveTab("meats")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "meats"
                  ? "text-[var(--accent-gold)] border-b-2 border-[var(--accent-gold)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Beef className="w-4 h-4 inline mr-1" />
              Meats ({meats.length})
            </button>
            <button
              onClick={() => setActiveTab("purchases")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === "purchases"
                  ? "text-[var(--accent-gold)] border-b-2 border-[var(--accent-gold)]"
                  : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              }`}
            >
              <ShoppingCart className="w-4 h-4 inline mr-1" />
              Purchases ({purchases.length})
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
              </div>
            ) : (
              <>
                {activeTab === "info" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[var(--card-secondary-bg)] p-4 rounded-lg border border-[var(--border-color)]">
                        <p className="text-sm text-[var(--text-tertiary)]">Name</p>
                        <p className="text-lg font-semibold text-[var(--text-primary)]">
                          {supplier.name}
                        </p>
                      </div>
                      <div className="bg-[var(--card-secondary-bg)] p-4 rounded-lg border border-[var(--border-color)]">
                        <p className="text-sm text-[var(--text-tertiary)]">Status</p>
                        <p
                          className={`text-lg font-semibold ${
                            supplier.isActive
                              ? "text-[var(--status-completed)]"
                              : "text-[var(--status-cancelled)]"
                          }`}
                        >
                          {supplier.isActive ? "Active" : "Inactive"}
                        </p>
                      </div>
                      <div className="bg-[var(--card-secondary-bg)] p-4 rounded-lg border border-[var(--border-color)]">
                        <p className="text-sm text-[var(--text-tertiary)]">Email</p>
                        <p className="text-[var(--text-primary)]">
                          {supplier.email || "—"}
                        </p>
                      </div>
                      <div className="bg-[var(--card-secondary-bg)] p-4 rounded-lg border border-[var(--border-color)]">
                        <p className="text-sm text-[var(--text-tertiary)]">Phone</p>
                        <p className="text-[var(--text-primary)]">
                          {supplier.phone || "—"}
                        </p>
                      </div>
                      <div className="bg-[var(--card-secondary-bg)] p-4 rounded-lg border border-[var(--border-color)] col-span-2">
                        <p className="text-sm text-[var(--text-tertiary)]">Address</p>
                        <p className="text-[var(--text-primary)]">
                          {supplier.address || "—"}
                        </p>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      <div className="bg-[var(--card-secondary-bg)] p-4 rounded-lg border border-[var(--border-color)] text-center">
                        <p className="text-sm text-[var(--text-tertiary)]">Total Spent</p>
                        <p className="text-2xl font-bold text-[var(--accent-gold)]">
                          ₱{new Decimal(metrics.totalSpent).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-[var(--card-secondary-bg)] p-4 rounded-lg border border-[var(--border-color)] text-center">
                        <p className="text-sm text-[var(--text-tertiary)]">Completed Orders</p>
                        <p className="text-2xl font-bold text-[var(--accent-blue)]">
                          {metrics.purchaseCount}
                        </p>
                      </div>
                      <div className="bg-[var(--card-secondary-bg)] p-4 rounded-lg border border-[var(--border-color)] text-center">
                        <p className="text-sm text-[var(--text-tertiary)]">Avg. Order Value</p>
                        <p className="text-2xl font-bold text-[var(--accent-purple)]">
                          ₱{new Decimal(metrics.averageOrderValue).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "meats" && (
                  <div>
                    {meats.length === 0 ? (
                      <p className="text-center text-[var(--text-tertiary)] py-8">
                        No meats linked to this supplier.
                      </p>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[var(--border-color)]">
                            <th className="text-left py-2 text-xs font-medium text-[var(--text-tertiary)]">
                              SKU
                            </th>
                            <th className="text-left py-2 text-xs font-medium text-[var(--text-tertiary)]">
                              Name
                            </th>
                            <th className="text-right py-2 text-xs font-medium text-[var(--text-tertiary)]">
                              Price / kg
                            </th>
                            <th className="text-center py-2 text-xs font-medium text-[var(--text-tertiary)]">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                          {meats.map((meat) => (
                            <tr key={meat.id}>
                              <td className="py-2 text-sm font-mono text-[var(--text-primary)]">
                                {meat.sku}
                              </td>
                              <td className="py-2 text-sm text-[var(--text-secondary)]">
                                {meat.name}
                              </td>
                              <td className="py-2 text-right text-sm text-[var(--accent-gold)] font-semibold">
                                ₱{new Decimal(meat.pricePerKg).toFixed(2)}
                              </td>
                              <td className="py-2 text-center">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    meat.isActive
                                      ? "bg-[var(--status-completed-bg)] text-[var(--status-completed)]"
                                      : "bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]"
                                  }`}
                                >
                                  {meat.isActive ? "Active" : "Inactive"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {activeTab === "purchases" && (
                  <div>
                    {purchases.length === 0 ? (
                      <p className="text-center text-[var(--text-tertiary)] py-8">
                        No purchase history for this supplier.
                      </p>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[var(--border-color)]">
                            <th className="text-left py-2 text-xs font-medium text-[var(--text-tertiary)]">
                              Ref #
                            </th>
                            <th className="text-left py-2 text-xs font-medium text-[var(--text-tertiary)]">
                              Date
                            </th>
                            <th className="text-left py-2 text-xs font-medium text-[var(--text-tertiary)]">
                              Status
                            </th>
                            <th className="text-right py-2 text-xs font-medium text-[var(--text-tertiary)]">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                          {purchases.map((purchase) => (
                            <tr key={purchase.id}>
                              <td className="py-2 text-sm font-mono text-[var(--text-primary)]">
                                {purchase.referenceNo || "—"}
                              </td>
                              <td className="py-2 text-sm text-[var(--text-secondary)]">
                                {new Date(purchase.orderDate).toLocaleDateString()}
                              </td>
                              <td className="py-2 text-sm">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium
                                  ${
                                    purchase.status === "completed"
                                      ? "bg-[var(--status-completed-bg)] text-[var(--status-completed)]"
                                      : purchase.status === "pending"
                                      ? "bg-[var(--status-pending-bg)] text-[var(--status-pending)]"
                                      : purchase.status === "approved"
                                      ? "bg-[var(--status-processing-bg)] text-[var(--status-processing)]"
                                      : "bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]"
                                  }`}
                                >
                                  {purchase.status}
                                </span>
                              </td>
                              <td className="py-2 text-right text-sm text-[var(--accent-gold)] font-semibold">
                                ₱{new Decimal(purchase.totalAmount).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};