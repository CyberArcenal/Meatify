// src/renderer/pages/Dashboard/components/TopProductsTable.tsx
import React from "react";
import { TrendingUp, Beef } from "lucide-react";
import type { TopProduct } from "../../../../api/analytics/dashboard";

interface Props {
  products: TopProduct[];
  isLoading: boolean;
}

const TopProductsTable: React.FC<Props> = ({ products, isLoading }) => {
  const formatNumber = (val: number) => val?.toLocaleString() || "0";
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(val || 0);

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 shadow-sm hover:border-[var(--accent-gold)] transition-colors h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-[var(--accent-gold)]" />
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Top Products
        </h3>
        {!isLoading && products.length > 0 && (
          <span className="ml-auto text-sm text-[var(--text-tertiary)]">
            by revenue
          </span>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-[var(--card-secondary-bg)] animate-pulse rounded" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-8">
            <Beef className="w-8 h-8 mx-auto mb-2 text-[var(--text-tertiary)] opacity-50" />
            <div className="text-[var(--text-tertiary)]">No sales data</div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--card-bg)]">
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-2 px-2 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                  Product
                </th>
                <th className="text-right py-2 px-2 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                  Qty Sold
                </th>
                <th className="text-right py-2 px-2 text-xs font-medium uppercase tracking-wider text-[var(--text-tertiary)]">
                  Revenue
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, idx) => (
                <tr
                  key={product.productId}
                  className="border-b border-[var(--border-light)] hover:bg-[var(--table-row-hover)] transition-colors"
                >
                  <td className="py-2 px-2 text-[var(--text-primary)]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-[var(--text-tertiary)] text-xs font-medium">
                        #{idx + 1}
                      </span>
                      {product.productName}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right text-[var(--text-primary)]">
                    {formatNumber(product.totalQuantity)}
                  </td>
                  <td className="py-2 px-2 text-right font-medium text-[var(--accent-gold)]">
                    {formatCurrency(product.totalRevenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default TopProductsTable;