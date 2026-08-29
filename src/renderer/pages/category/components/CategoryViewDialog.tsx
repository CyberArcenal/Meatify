// src/renderer/pages/category/components/CategoryViewDialog.tsx
import React from "react";
import { Package, Loader2, Beef } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import Decimal from "decimal.js";
import type { Category } from "../../../api/core/category";
import type { Meat } from "../../../api/core/meat";

interface CategoryViewDialogProps {
  category: Category | null;
  products: Meat[];
  loading: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryViewDialog: React.FC<CategoryViewDialogProps> = ({
  category,
  products,
  loading,
  isOpen,
  onClose,
}) => {
  if (!category) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-[var(--accent-gold)]" />
          Category Details: {category.name}
        </div>
      }
      size="lg"
    >
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[var(--card-secondary-bg)] rounded-lg p-4 border border-[var(--border-color)]">
            <p className="text-xs text-[var(--text-tertiary)] uppercase">Name</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{category.name}</p>
          </div>
          <div className="bg-[var(--card-secondary-bg)] rounded-lg p-4 border border-[var(--border-color)]">
            <p className="text-xs text-[var(--text-tertiary)] uppercase">Status</p>
            <p
              className={`text-lg font-semibold ${
                category.isActive ? "text-[var(--status-completed)]" : "text-[var(--status-cancelled)]"
              }`}
            >
              {category.isActive ? "Active" : "Inactive"}
            </p>
          </div>
          {category.description && (
            <div className="col-span-2 bg-[var(--card-secondary-bg)] rounded-lg p-4 border border-[var(--border-color)]">
              <p className="text-xs text-[var(--text-tertiary)] uppercase">Description</p>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{category.description}</p>
            </div>
          )}
        </div>

        {/* Products List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Beef className="w-4 h-4 text-[var(--accent-gold)]" />
              Meats in this Category ({products.length})
            </h3>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-gold)]" />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-[var(--text-tertiary)] border border-dashed border-[var(--border-color)] rounded-lg">
              <Beef className="w-10 h-10 mx-auto mb-2 text-[var(--text-tertiary)]" />
              No meats in this category.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-60 overflow-y-auto custom-scrollbar">
              <table className="w-full text-sm">
                <thead className="bg-[var(--card-secondary-bg)] sticky top-0">
                  <tr className="border-b border-[var(--border-color)]">
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                      Name
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                      Price / kg
                    </th>
                    <th className="text-right py-2 px-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {products.map((meat) => (
                    <tr key={meat.id} className="hover:bg-[var(--card-hover-bg)] transition-colors">
                      <td className="py-2 px-3 text-sm font-mono text-[var(--text-primary)]">
                        {meat.sku}
                      </td>
                      <td className="py-2 px-3 text-sm text-[var(--text-secondary)]">
                        {meat.name}
                      </td>
                      <td className="py-2 px-3 text-right text-sm font-semibold text-[var(--accent-gold)]">
                        ₱{new Decimal(meat.pricePerKg).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
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

        {/* Metadata */}
        <div className="pt-4 border-t border-[var(--border-color)] flex justify-between text-xs text-[var(--text-tertiary)]">
          <span>Created: {new Date(category.createdAt).toLocaleString()}</span>
          {category.updatedAt && (
            <span>Updated: {new Date(category.updatedAt).toLocaleString()}</span>
          )}
        </div>
      </div>
    </Modal>
  );
};