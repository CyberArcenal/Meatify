// src/renderer/pages/Cashier/types.ts
import { type MeatInventory } from "../../api/analytics/inventoryReports";
import { type Customer as ApiCustomer } from "../../api/core/customer";

export type Product = MeatInventory & {
  stockQty: number;
};

export type Customer = ApiCustomer;

export interface CartItem extends Product {
  weightKg: number;
  lineDiscount: number;
  lineTax: number;
  batchId: number | null;        // ✅ Required
  batchCode: string | null;      // ✅ Para display
}

export type PaymentMethod = "cash" | "card" | "wallet";