// src/renderer/pages/category/hooks/useCategoryView.ts
import { useState } from "react";
import type { Category } from "../../../api/core/category";
import meatAPI, { type Meat } from "../../../api/core/meat";

export const useCategoryView = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Meat[]>([]);
  const [loading, setLoading] = useState(false);

  const open = async (category: Category) => {
    setCategory(category);
    setIsOpen(true);
    setLoading(true);

    try {
      const response = await meatAPI.getAll({
        categoryId: category.id,
        isActive: true,
        limit: 100,
      });
      if (response.status) {
        setProducts(response.data?.items || []);
      }
    } catch (error) {
      console.error("Error loading category products:", error);
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    setIsOpen(false);
    setCategory(null);
    setProducts([]);
  };

  return {
    isOpen,
    category,
    products,
    loading,
    open,
    close,
  };
};