import { useReducer, useCallback } from "react";
import type { CartItem, Product } from "../types";
import { dialogs } from "../../../utils/dialogs";

type CartState = {
  cart: CartItem[];
  globalDiscount: number;
  globalTax: number;
  notes: string;
};

type CartAction =
  | { type: "ADD_TO_CART"; product: Product; weightKg: number }
  | { type: "UPDATE_WEIGHT"; productId: number; weightKg: number }
  | { type: "REMOVE_FROM_CART"; productId: number }
  | { type: "UPDATE_LINE_DISCOUNT"; productId: number; discountPercent: number }
  | { type: "UPDATE_LINE_TAX"; productId: number; taxPercent: number }
  | { type: "SET_GLOBAL_DISCOUNT"; value: number }
  | { type: "SET_GLOBAL_TAX"; value: number }
  | { type: "SET_NOTES"; value: string }
  | { type: "CLEAR_CART" };

// Helper to get total weight for a given meat in cart
const getTotalWeightForMeat = (cart: CartItem[], meatId: number) => {
  return cart
    .filter((item) => item.id === meatId)
    .reduce((sum, item) => sum + item.weightKg, 0);
};

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case "ADD_TO_CART": {
      const { product, weightKg } = action;
      const existing = state.cart.find((item) => item.id === product.id);

      // Check total weight for this meat against stock
      const currentWeight = existing ? getTotalWeightForMeat(state.cart, product.id) : 0;
      const newWeight = currentWeight + weightKg;

      if (newWeight > product.stockQty) {
        dialogs.alert({
          title: "Insufficient Stock",
          message: `Only ${product.stockQty} kg available for ${product.name}.`,
        });
        return state;
      }

      if (existing) {
        return {
          ...state,
          cart: state.cart.map((item) =>
            item.id === product.id
              ? { ...item, weightKg: item.weightKg + weightKg }
              : item
          ),
        };
      } else {
        return {
          ...state,
          cart: [
            ...state.cart,
            {
              ...product,
              weightKg,
              lineDiscount: 0,
              lineTax: 0,
            },
          ],
        };
      }
    }

    case "UPDATE_WEIGHT": {
      const item = state.cart.find((i) => i.id === action.productId);
      if (!item) return state;

      // Check if new weight exceeds stock
      const otherWeight = getTotalWeightForMeat(
        state.cart.filter((i) => i.id !== item.id),
        item.id
      );
      const newTotalWeight = otherWeight + action.weightKg;

      if (newTotalWeight > item.stockQty) {
        dialogs.alert({
          title: "Insufficient Stock",
          message: `Only ${item.stockQty} kg available for ${item.name}.`,
        });
        return state;
      }

      if (action.weightKg <= 0) {
        // Remove if weight is zero or negative
        return {
          ...state,
          cart: state.cart.filter((i) => i.id !== action.productId),
        };
      }

      return {
        ...state,
        cart: state.cart.map((i) =>
          i.id === action.productId ? { ...i, weightKg: action.weightKg } : i
        ),
      };
    }

    case "REMOVE_FROM_CART":
      return {
        ...state,
        cart: state.cart.filter((i) => i.id !== action.productId),
      };

    case "UPDATE_LINE_DISCOUNT":
      return {
        ...state,
        cart: state.cart.map((i) =>
          i.id === action.productId
            ? { ...i, lineDiscount: Math.max(0, Math.min(100, action.discountPercent)) }
            : i
        ),
      };

    case "UPDATE_LINE_TAX":
      return {
        ...state,
        cart: state.cart.map((i) =>
          i.id === action.productId
            ? { ...i, lineTax: Math.max(0, Math.min(100, action.taxPercent)) }
            : i
        ),
      };

    case "SET_GLOBAL_DISCOUNT":
      return { ...state, globalDiscount: Math.max(0, Math.min(100, action.value)) };

    case "SET_GLOBAL_TAX":
      return { ...state, globalTax: Math.max(0, Math.min(100, action.value)) };

    case "SET_NOTES":
      return { ...state, notes: action.value };

    case "CLEAR_CART":
      return { cart: [], globalDiscount: 0, globalTax: 0, notes: "" };

    default:
      return state;
  }
};

export const useCart = () => {
  const [state, dispatch] = useReducer(cartReducer, {
    cart: [],
    globalDiscount: 0,
    globalTax: 0,
    notes: "",
  });

  const addToCart = useCallback((product: Product, weightKg: number = 1) => {
    dispatch({ type: "ADD_TO_CART", product, weightKg });
  }, []);

  const updateWeight = useCallback((productId: number, weightKg: number) => {
    dispatch({ type: "UPDATE_WEIGHT", productId, weightKg });
  }, []);

  const removeFromCart = useCallback((productId: number) => {
    dispatch({ type: "REMOVE_FROM_CART", productId });
  }, []);

  const updateLineDiscount = useCallback((productId: number, discountPercent: number) => {
    dispatch({ type: "UPDATE_LINE_DISCOUNT", productId, discountPercent });
  }, []);

  const updateLineTax = useCallback((productId: number, taxPercent: number) => {
    dispatch({ type: "UPDATE_LINE_TAX", productId, taxPercent });
  }, []);

  const setGlobalDiscount = useCallback((value: number) => {
    dispatch({ type: "SET_GLOBAL_DISCOUNT", value });
  }, []);

  const setGlobalTax = useCallback((value: number) => {
    dispatch({ type: "SET_GLOBAL_TAX", value });
  }, []);

  const setNotes = useCallback((value: string) => {
    dispatch({ type: "SET_NOTES", value });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  return {
    cart: state.cart,
    globalDiscount: state.globalDiscount,
    globalTax: state.globalTax,
    notes: state.notes,
    addToCart,
    updateWeight,
    removeFromCart,
    updateLineDiscount,
    updateLineTax,
    setGlobalDiscount,
    setGlobalTax,
    setNotes,
    clearCart,
  };
};