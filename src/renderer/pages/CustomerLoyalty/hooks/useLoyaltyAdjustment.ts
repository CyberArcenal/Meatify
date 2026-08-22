// src/renderer/pages/Loyalty/hooks/useLoyaltyAdjustment.ts
import { useState } from "react";

export const useLoyaltyAdjustment = () => {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  return { isOpen, open, close };
};