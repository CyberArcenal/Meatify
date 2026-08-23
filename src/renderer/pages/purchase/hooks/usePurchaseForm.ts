// src/renderer/pages/inventory/purchases/hooks/usePurchaseForm.ts
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { format } from "date-fns";
import type { Purchase } from "../../../api/core/purchase";

export type FormMode = "add" | "edit";

export interface PurchaseFormData {
  supplierId: number;
  orderDate: string;
  notes: string;
  items: {
    meatId: number;
    quantity: number;
    unitPrice: number;
    expiryDate: string;
  }[];
}

export const usePurchaseForm = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<FormMode>("add");
  const [purchaseId, setPurchaseId] = useState<number | undefined>();
  const [initialData, setInitialData] = useState<Purchase | undefined>();

  const defaultValues: PurchaseFormData = {
    supplierId: 0,
    orderDate: new Date().toISOString().split("T")[0],
    notes: "",
    items: [{ meatId: 0, quantity: 1, unitPrice: 0, expiryDate: "" }],
  };

  const form = useForm<PurchaseFormData>({
    defaultValues,
  });

  const { control, watch } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const items = watch("items");
  const totalAmount = items.reduce(
    (sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0),
    0,
  );

  const openAdd = () => {
    setMode("add");
    setPurchaseId(undefined);
    setInitialData(undefined);
    form.reset(defaultValues);
    setIsOpen(true);
  };

  const openAddWithData = (data?: any) => {
    setMode("add");
    setPurchaseId(undefined);
    setInitialData(data);
    if (data) {
      form.reset({
        supplierId: data.supplierId,
        orderDate: new Date().toISOString().split("T")[0],
        notes: "",
        items: data.items?.map((item: any) => ({
          meatId: item.meatId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          expiryDate: "",
        })) || [{ meatId: 0, quantity: 1, unitPrice: 0, expiryDate: "" }],
      });
    } else {
      form.reset(defaultValues);
    }
    setIsOpen(true);
  };

  const openEdit = (purchase: Purchase) => {
    setMode("edit");
    setPurchaseId(purchase.id);
    setInitialData(purchase);
    form.reset({
      supplierId: purchase.supplierId,
      orderDate: purchase.orderDate
        ? format(new Date(purchase.orderDate), "yyyy-MM-dd")
        : "",
      notes: purchase.notes || "",
      items: purchase.purchaseItems?.map((item) => ({
        meatId: item.meatId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        expiryDate: item.expiryDate || "",
      })) || [{ meatId: 0, quantity: 1, unitPrice: 0, expiryDate: "" }],
    });
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setPurchaseId(undefined);
    setInitialData(undefined);
  };

  return {
    isOpen,
    mode,
    purchaseId,
    initialData,
    form,
    fields,
    append,
    remove,
    totalAmount,
    openAdd,
    openAddWithData,
    openEdit,
    close,
  };
};
