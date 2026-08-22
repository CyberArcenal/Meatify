// src/renderer/pages/inventory/movements/hooks/useMovementView.ts
import { useState, useCallback } from "react";
import type { InventoryMovement } from "../../../api/core/inventoryMovement";

export const useMovementView = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [movement, setMovement] = useState<InventoryMovement | null>(null);
  const [loading, setLoading] = useState(false);

  const open = useCallback(async (movement: InventoryMovement) => {
    setIsOpen(true);
    setLoading(true);
    try {
      setMovement(movement);
    } catch (error) {
      console.error("Failed to load movement details", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setMovement(null);
  }, []);

  return { isOpen, movement, loading, open, close };
};