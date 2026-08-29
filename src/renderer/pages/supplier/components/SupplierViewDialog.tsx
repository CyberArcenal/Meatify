// src/renderer/pages/inventory/suppliers/components/SupplierViewDialog.tsx
import React, { useState } from "react";
import { Beef, ShoppingCart, Info, Loader2, Building2 } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import Decimal from "decimal.js";
import type { Supplier } from "../../../api/core/supplier";
import type { Meat } from "../../../api/core/meat";
import type { Purchase } from "../../../api/core/purchase";

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

  if (!supplier) return null;

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; text: string }> = {
      completed: { bg: "bg-[var(--status-completed-bg)]", text: "text-[var(--status-completed)]" },
      pending: { bg: "bg-[var(--status-pending-bg)]", text: "text-[var(--status-pending)]" },
      approved: { bg: "bg-[var(--status-processing-bg)]", text: "text-[var(--status-processing)]" },
      cancelled: { bg: "bg-[var(--status-cancelled-bg)]", text: "text-[var(--status-cancelled)]" },
    };
    const config = configs[status] || configs.pending;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {status}
      </span>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Supplier: ${supplier.name}`}
      size="lg"
    >
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-gold)]" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex border-b border-[var(--border-color)]">
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
          {activeTab === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--card-secondary-bg)] p-4 rounded-lg border border-[var(--border-color)]">
                  <p className="text-xs text-[var(--text-tertiary)] uppercase">Name</p>
                  <p className="text-lg font-semibold text-[var(--text-primary)]">
                    {supplier.name}
                  </p>
                </div>
                <div className="bg-[var(--card-secondary-bg)] p-4 rounded-lg border border-[var(--border-color)]">
                  <p className="text-xs text-[var(--text-tertiary)] uppercase">Status</p>
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
                  <p className="text-xs text-[var(--text-tertiary)] uppercase">Email</p>
                  <p className="text-[var(--text-primary)]">
                    {supplier.email || "—"}
                  </p>
                </div>
                <div className="bg-[var(--card-secondary-bg)] p-4 rounded-lg border border-[var(--border-color)]">
                  <p className="text-xs text-[var(--text-tertiary)] uppercase">Phone</p>
                  <p className="text-[var(--text-primary)]">
                    {supplier.phone || "—"}
                  </p>
                </div>
                <div className="bg-[var(--card-secondary-bg)] p-4 rounded-lg border border-[var(--border-color)] col-span-2">
                  <p className="text-xs text-[var(--text-tertiary)] uppercase">Address</p>
                  <p className="text-[var(--text-primary)]">
                    {supplier.address || "—"}
                  </p>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[var(--card-secondary-bg)] p-4 rounded-lg border border-[var(--border-color)] text-center">
                  <p className="text-xs text-[var(--text-tertiary)] uppercase">Total Spent</p>
                  <p className="text-xl font-bold text-[var(--accent-gold)]">
                    ₱{new Decimal(metrics.totalSpent).toFixed(2)}
                  </p>
                </div>
                <div className="bg-[var(--card-secondary-bg)] p-4 rounded-lg border border-[var(--border-color)] text-center">
                  <p className="text-xs text-[var(--text-tertiary)] uppercase">Completed Orders</p>
                  <p className="text-xl font-bold text-[var(--accent-blue)]">
                    {metrics.purchaseCount}
                  </p>
                </div>
                <div className="bg-[var(--card-secondary-bg)] p-4 rounded-lg border border-[var(--border-color)] text-center">
                  <p className="text-xs text-[var(--text-tertiary)] uppercase">Avg. Order Value</p>
                  <p className="text-xl font-bold text-[var(--accent-purple)]">
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
                <div className="border border-[var(--border-color)] rounded-lg overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--table-header-bg)] sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                          Price / kg
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {meats.map((meat) => (
                        <tr key={meat.id}>
                          <td className="px-4 py-2 text-sm font-mono text-[var(--text-primary)]">
                            {meat.sku}
                          </td>
                          <td className="px-4 py-2 text-sm text-[var(--text-secondary)]">
                            {meat.name}
                          </td>
                          <td className="px-4 py-2 text-right text-sm font-semibold text-[var(--accent-gold)]">
                            ₱{new Decimal(meat.pricePerKg).toFixed(2)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
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
                </div>
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
                <div className="border border-[var(--border-color)] rounded-lg overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--table-header-bg)] sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                          Ref #
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-color)]">
                      {purchases.slice(0, 50).map((purchase) => (
                        <tr key={purchase.id}>
                          <td className="px-4 py-2 text-sm font-mono text-[var(--text-primary)]">
                            {purchase.referenceNo || "—"}
                          </td>
                          <td className="px-4 py-2 text-sm text-[var(--text-secondary)]">
                            {new Date(purchase.orderDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {getStatusBadge(purchase.status)}
                          </td>
                          <td className="px-4 py-2 text-right text-sm font-semibold text-[var(--accent-gold)]">
                            ₱{new Decimal(purchase.totalAmount).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};