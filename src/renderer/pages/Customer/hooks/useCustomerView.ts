// src/renderer/pages/customer/hooks/useCustomerView.ts
import { useState, useCallback } from "react";
import customerAPI, { type Customer } from "../../../api/core/customer";
import saleAPI, { type Sale } from "../../../api/core/sale";
import loyaltyAPI, {
  type LoyaltyTransaction,
} from "../../../api/core/loyaltyTransaction";

export const useCustomerView = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<
    LoyaltyTransaction[]
  >([]);
  const [loading, setLoading] = useState(false);

  const open = useCallback(async (customer: Customer) => {
    setIsOpen(true);
    setCustomer(customer);
    setLoading(true);

    try {
      // ✅ Fetch customer's sales – correct: customerId first, then params object
      const salesResponse = await saleAPI.getByCustomer(customer.id, {
        limit: 50,
        status: "paid", // optional: only show paid sales
      });
      if (salesResponse.status) {
        // salesResponse.data is PaginatedSales with items array
        setSales(salesResponse.data.items || []);
      }

      // ✅ Fetch loyalty transactions – correct: customerId first, then params object
      const loyaltyResponse = await loyaltyAPI.getByCustomer(customer.id, {
        limit: 50,
      });
      if (loyaltyResponse.status) {
        // loyaltyResponse.data is PaginatedTransactions with items array
        setLoyaltyTransactions(loyaltyResponse.data.items || []);
      }
    } catch (error) {
      console.error("Failed to load customer details", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setCustomer(null);
    setSales([]);
    setLoyaltyTransactions([]);
  }, []);

  return {
    isOpen,
    customer,
    sales,
    loyaltyTransactions,
    loading,
    open,
    close,
  };
};