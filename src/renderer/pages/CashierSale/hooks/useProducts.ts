import { useState, useEffect, useCallback } from "react";
import inventoryReportsAPI from "../../../api/analytics/inventoryReports";
import type { Product } from "../types";
import { dialogs } from "../../../utils/dialogs";

export const useProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    
    // ✅ Wait for app to be ready (with fallback)
    try {
      if (window.backendAPI?.waitForAppReady) {
        const readyInfo = await window.backendAPI.waitForAppReady();
        console.log('[Cashier] App is ready:', readyInfo);
      } else {
        console.log('[Cashier] waitForAppReady not available, proceeding...');
      }
    } catch (error) {
      console.warn('[Cashier] Error waiting for app ready:', error);
      // Continue anyway - fallback
    }

    try {
      const params: any = { limit: 1000 };
      if (categoryId) params.categoryId = categoryId;
      if (searchTerm.trim()) params.search = searchTerm;

      const response = await inventoryReportsAPI.getData(params);
      if (response.status && response.data) {
        const mappedProducts: Product[] = response.data.meats.map((m) => ({
          ...m,
          stockQty: m.inventory.totalActiveStock,
        }));
        setProducts(mappedProducts);
        setFilteredProducts(mappedProducts.slice(0, 50));
      } else {
        setProducts([]);
        setFilteredProducts([]);
      }
    } catch (error) {
      console.error("Failed to load products", error);
    } finally {
      setLoadingProducts(false);
    }
  }, [categoryId, searchTerm]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      loadProducts();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, categoryId, loadProducts]);

  // Initial load
  useEffect(() => {
    loadProducts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryId(null);
  };

  return {
    products,
    filteredProducts,
    searchTerm,
    setSearchTerm,
    categoryId,
    setCategoryId,
    loadingProducts,
    loadProducts,
    clearFilters,
  };
};