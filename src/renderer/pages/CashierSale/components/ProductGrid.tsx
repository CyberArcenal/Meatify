// src/renderer/pages/Cashier/components/ProductGrid.tsx
import React, { useMemo } from "react";
import type { Product } from "../types";
import ProductCard from "./ProductCard";
import { Package, Search } from "lucide-react";

interface ProductGridProps {
  products: Product[];
  onAddToCart: (product: Product, batchId: number | null, batchCode: string | null) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onAddToCart,
}) => {
  const visibleProducts = useMemo(() => products.slice(0, 100), [products]);

  if (visibleProducts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)] p-8">
        <div className="w-20 h-20 rounded-full bg-[var(--card-secondary-bg)] flex items-center justify-center mb-4 border border-[var(--border-color)]">
          <Search className="w-10 h-10" />
        </div>
        <p className="text-lg font-medium text-[var(--text-primary)]">No products found</p>
        <p className="text-sm mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4">
      {visibleProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAdd={onAddToCart}
        />
      ))}
      {products.length > 100 && (
        <div className="col-span-full text-center text-sm text-[var(--text-tertiary)] py-4 border-t border-[var(--border-color)] mt-2">
          Showing first 100 products. Use search to find more.
        </div>
      )}
    </div>
  );
};

export default React.memo(ProductGrid);