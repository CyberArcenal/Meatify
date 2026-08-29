// src/renderer/pages/Cashier/hooks/useCheckout.ts
import { useState } from "react";
import saleAPI from "../../../api/core/sale";
import { dialogs } from "../../../utils/dialogs";
import type { CartItem, Customer, PaymentMethod } from "../types";
import Decimal from "decimal.js";
import { formatCurrency } from "../../../utils/formatters";
import { hideLoading, showLoading } from "../../../utils/notification";

export const useCheckout = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const processCheckout = async (
    cart: CartItem[],
    selectedCustomer: Customer | null,
    paymentMethod: PaymentMethod,
    notes: string,
    loyaltyRedeemed: number,
    onSuccess: (sale: any) => void,
  ) => {
    setIsProcessing(true);
    showLoading("Processing Checkout..");
    try {
  const items = cart.map((item) => {
  console.log("[Checkout] Item:", item.id, "batchId:", item.batchId); // ✅
  return {
    meatId: item.id,
    weightKg: item.weightKg,
    unitPrice: item.pricePerKg,
    discount: item.lineDiscount,
    tax: item.lineTax,
    ...(item.batchId !== null && { batchId: item.batchId }),
  };
});

      const response = await saleAPI.create({
        items,
        customerId: selectedCustomer?.id,
        paymentMethod,
        notes,
        loyaltyRedeemed,
      });

      if (response.status) {
        onSuccess(response.data);
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      console.error("Checkout error", error);
      hideLoading();
      await dialogs.alert({
        title: "Checkout Failed",
        message: error.message || "An unexpected error occurred.",
      });
    } finally {
      hideLoading();
      setIsProcessing(false);
    }
  };

  const handleCheckout = async (
    cart: CartItem[],
    selectedCustomer: Customer | null,
    paymentMethod: PaymentMethod,
    notes: string,
    loyaltyRedeemed: number,
    total: Decimal,
    onSuccess: (sale: any) => void,
  ) => {
    if (cart.length === 0) {
      await dialogs.alert({
        title: "Empty Cart",
        message: "Please add items to the cart before checkout.",
      });
      return;
    }

    const confirm = await dialogs.confirm({
      title: "Complete Sale",
      message: `Total amount: ${formatCurrency(total.toFixed(2))}\nProceed with payment?`,
    });
    if (!confirm) return;

    await processCheckout(
      cart,
      selectedCustomer,
      paymentMethod,
      notes,
      loyaltyRedeemed,
      onSuccess,
    );
  };

  return { isProcessing, handleCheckout, processCheckout };
};