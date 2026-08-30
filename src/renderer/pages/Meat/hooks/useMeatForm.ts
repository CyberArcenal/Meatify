// src/renderer/pages/inventory/meat/hooks/useMeatForm.ts
import { useState } from "react";
import { type Meat } from "../../../api/core/meat";

export interface MeatFormData {
  sku?: string;
  name: string;
  barcode?: string;
  description?: string;
  pricePerKg: number;
  isActive: boolean;
  categoryId?: number;
  supplierId?: number;
  image?: string | null;
}

export const useMeatForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "edit">("add");
  const [meatId, setMeatId] = useState<number | undefined>();
  const [initialData, setInitialData] = useState<MeatFormData>({
    sku: "",
    name: "",
    barcode: "",
    description: "",
    pricePerKg: 0,
    isActive: true,
    categoryId: undefined,
    supplierId: undefined,
    image: null,
  });

  const openAdd = () => {
    setMode("add");
    setMeatId(undefined);
    setInitialData({
      sku: "",
      name: "",
      barcode: "",
      description: "",
      pricePerKg: 0,
      isActive: true,
      categoryId: undefined,
      supplierId: undefined,
      image: null,
    });
    setIsOpen(true);
  };

  const openEdit = (meat: Meat) => {
    setMode("edit");
    setMeatId(meat.id);
    setInitialData({
      sku: meat.sku || "",
      name: meat.name,
      barcode: meat.barcode || "",
      description: meat.description || "",
      pricePerKg: meat.pricePerKg,
      isActive: meat.isActive,
      // ✅ Gamitin ang nested object kung walang direct na ID
      categoryId: meat.categoryId ?? meat.category?.id ?? undefined,
      supplierId: meat.supplierId ?? meat.supplier?.id ?? undefined,
      image: meat.image || null,
    });
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setMeatId(undefined);
  };

  return {
    isOpen,
    mode,
    meatId,
    initialData,
    openAdd,
    openEdit,
    close,
  };
};