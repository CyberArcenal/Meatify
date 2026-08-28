import { type MeatInventory } from "../../api/analytics/inventoryReports";
import { type Customer as ApiCustomer } from "../../api/core/customer";

export type Product = MeatInventory & {
  stockQty: number;
};

export type Customer = ApiCustomer;

export interface CartItem extends Product {
  weightKg: number; // decimal weight in kg
  lineDiscount: number; // percentage
  lineTax: number; // percentage
}

export type PaymentMethod = "cash" | "card" | "wallet";