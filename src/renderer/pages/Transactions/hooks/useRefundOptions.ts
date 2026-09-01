// src/renderer/hooks/useRefundOptions.ts
import { useState, useCallback } from "react";

export interface RefundOptions {
  restock: boolean;
  reason: string;
  restockItems: Array<{ itemIndex: number; restock: boolean }>;
}

export interface RefundItem {
  name: string;
  weight: number;
  price: number;
}

export const useRefundOptions = (items: RefundItem[]) => {
  const [restockAll, setRestockAll] = useState(true);
  const [itemStates, setItemStates] = useState<boolean[]>(items.map(() => true));
  const [reason, setReason] = useState("");

  const toggleRestockAll = useCallback(() => {
    const newValue = !restockAll;
    setRestockAll(newValue);
    setItemStates(items.map(() => newValue));
  }, [restockAll, items]);

  const toggleItem = useCallback((index: number) => {
    setItemStates((prev) => {
      const newStates = [...prev];
      newStates[index] = !newStates[index];
      const allRestocked = newStates.every((s) => s);
      setRestockAll(allRestocked);
      return newStates;
    });
  }, []);

  const reset = useCallback(() => {
    setRestockAll(true);
    setItemStates(items.map(() => true));
    setReason("");
  }, [items]);

  const getOptions = useCallback((): RefundOptions => {
    return {
      restock: restockAll,
      reason: reason.trim() || "Customer refund",
      restockItems: items.map((_, index) => ({
        itemIndex: index,
        restock: itemStates[index],
      })),
    };
  }, [restockAll, reason, items, itemStates]);

  return {
    restockAll,
    itemStates,
    reason,
    setReason,
    toggleRestockAll,
    toggleItem,
    reset,
    getOptions,
  };
};