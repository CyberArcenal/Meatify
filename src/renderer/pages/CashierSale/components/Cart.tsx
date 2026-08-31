// src/renderer/pages/Cashier/components/Cart.tsx
import React, {
  useEffect,
  useRef,
  useMemo,
  useCallback,
  useState,
} from "react";
import { ShoppingCart, Trash2, ArrowRight } from "lucide-react";
import Decimal from "decimal.js";
import type {
  CartItem as CartItemType,
  Customer,
  PaymentMethod,
} from "../types";
import CartItem from "./CartItem";
import LoyaltyRedemption from "./LoyaltyRedemption";
import PaymentMethodSelector from "./PaymentMethodSelector";
import TotalsDisplay from "./TotalsDisplay";
import CheckoutButton from "./CheckoutButton";
import {
  calculateSubtotal,
  calculateCartTotal,
  calculateMaxRedeemable,
} from "../utils";
import CustomerSelect from "../../../components/Selects/Customer";
import {
  useDiscountEnabled,
  useLoyaltyPointsEnabled,
  useMaxDiscountPercent,
} from "../../../utils/posUtils";
import { useDebounce } from "../hooks/useDebounce";
import { dialogs } from "../../../utils/dialogs";

interface CartProps {
  cart: CartItemType[];
  globalDiscount: number;
  globalTax: number;
  notes: string;
  onUpdateWeight: (id: number, weightKg: number) => void;
  onRemove: (id: number) => void;
  onUpdateDiscount: (id: number, discount: number) => void;
  onUpdateTax: (id: number, tax: number) => void;
  onUpdateBatch: (
    id: number,
    batchId: number | null,
    batchCode: string | null,
    batchExpiryDate: string | null
  ) => void;
  onGlobalDiscountChange: (value: number) => void;
  onGlobalTaxChange: (value: number) => void;
  onNotesChange: (value: string) => void;
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
  loyaltyPointsAvailable: number;
  loyaltyPointsToRedeem: number;
  useLoyalty: boolean;
  onUseLoyaltyChange: (checked: boolean) => void;
  onLoyaltyPointsChange: (points: number) => void;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  isProcessing: boolean;
  onCheckout: () => void;
  onClearCart: () => void;
}

const Cart: React.FC<CartProps> = ({
  cart,
  globalDiscount,
  globalTax,
  notes,
  onUpdateWeight,
  onRemove,
  onUpdateDiscount,
  onUpdateTax,
  onUpdateBatch,
  onGlobalDiscountChange,
  onGlobalTaxChange,
  onNotesChange,
  selectedCustomer,
  onCustomerSelect,
  loyaltyPointsAvailable,
  loyaltyPointsToRedeem,
  useLoyalty,
  onUseLoyaltyChange,
  onLoyaltyPointsChange,
  paymentMethod,
  onPaymentMethodChange,
  isProcessing,
  onCheckout,
  onClearCart,
}) => {
  const cartContainerRef = useRef<HTMLDivElement | null>(null);
  const prevCartLengthRef = useRef(cart.length);

  const discountEnabled = useDiscountEnabled();
  const isPointEnabled = useLoyaltyPointsEnabled();
  const maxDiscount = useMaxDiscountPercent();

  const [localDiscount, setLocalDiscount] = useState(globalDiscount);
  const [localTax, setLocalTax] = useState(globalTax);
  const debouncedDiscount = useDebounce(localDiscount, 300);
  const debouncedTax = useDebounce(localTax, 300);

  useEffect(() => {
    onGlobalDiscountChange(debouncedDiscount);
  }, [debouncedDiscount, onGlobalDiscountChange]);

  useEffect(() => {
    onGlobalTaxChange(debouncedTax);
  }, [debouncedTax, onGlobalTaxChange]);

  const subtotal = useMemo(() => calculateSubtotal(cart), [cart]);
  const loyaltyDeduction = useMemo(
    () => (useLoyalty ? new Decimal(loyaltyPointsToRedeem) : new Decimal(0)),
    [useLoyalty, loyaltyPointsToRedeem],
  );
  const total = useMemo(
    () => calculateCartTotal(cart, globalDiscount, globalTax, loyaltyDeduction),
    [cart, globalDiscount, globalTax, loyaltyDeduction],
  );
  const maxRedeemable = useMemo(
    () =>
      calculateMaxRedeemable(
        loyaltyPointsAvailable,
        cart,
        globalDiscount,
        globalTax,
      ),
    [loyaltyPointsAvailable, cart, globalDiscount, globalTax],
  );

  const handleClearCart = async () => {
    const confirmed = await dialogs.confirm({
      title: "Clear Cart",
      message: "Are you sure you want to remove all items from the cart?",
    });
    if (confirmed) {
      onClearCart();
    }
  };

  useEffect(() => {
    const currentLength = cart.length;
    if (currentLength > prevCartLengthRef.current) {
      if (cartContainerRef.current) {
        cartContainerRef.current.scrollTo({
          top: cartContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }
    prevCartLengthRef.current = currentLength;
  }, [cart]);

  const handleCustomerSelect = useCallback(
    (id: number | null, customer: Customer | null) => {
      onCustomerSelect(customer ? customer : null);
    },
    [onCustomerSelect],
  );

  return (
    <div className="flex flex-col h-full bg-[var(--card-bg)] border-l border-[var(--border-color)]">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-[var(--border-color)] bg-[var(--card-secondary-bg)] flex justify-between items-center">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-[var(--accent-gold)]" />
          Current Sale
          {cart.length > 0 && (
            <span className="text-xs font-medium text-[var(--text-secondary)] bg-[var(--card-bg)] px-2 py-0.5 rounded-full">
              {cart.length}
            </span>
          )}
        </h2>
        <button
          onClick={handleClearCart}
          disabled={cart.length === 0}
          className="p-1.5 rounded-md text-[var(--text-tertiary)] hover:bg-[var(--status-cancelled-bg)] hover:text-[var(--danger-color)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Clear cart"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Cart Items */}
      <div
        ref={cartContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar"
      >
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)]">
            <div className="w-16 h-16 rounded-full bg-[var(--card-secondary-bg)] flex items-center justify-center mb-3 border border-[var(--border-color)]">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <p className="font-medium text-[var(--text-secondary)]">
              Cart is empty
            </p>
            <p className="text-sm">Click products to add</p>
          </div>
        ) : (
          cart.map((item) => (
            <CartItem
              key={item.id}
              item={item}
              onUpdateWeight={onUpdateWeight}
              onRemove={onRemove}
              onUpdateDiscount={onUpdateDiscount}
              onUpdateTax={onUpdateTax}
              onUpdateBatch={onUpdateBatch}
              maxDiscount={maxDiscount}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-[var(--border-color)] bg-[var(--card-secondary-bg)] space-y-3">
        <CustomerSelect
          value={selectedCustomer?.id || null}
          onChange={(customerId, customer) => {
            handleCustomerSelect(
              customerId,
              customer === undefined ? null : customer,
            );
          }}
          placeholder="Select customer (optional)"
          className="w-full"
        />

        {selectedCustomer && isPointEnabled && (
          <div className="flex items-center justify-between text-xs px-1">
            <span className="text-[var(--text-tertiary)]">
              Loyalty points available:
            </span>
            <span className="font-semibold text-[var(--accent-purple)]">
              {loyaltyPointsAvailable}
            </span>
          </div>
        )}

        {isPointEnabled && (
          <LoyaltyRedemption
            selectedCustomer={!!selectedCustomer}
            loyaltyPointsAvailable={loyaltyPointsAvailable}
            useLoyalty={useLoyalty}
            loyaltyPointsToRedeem={loyaltyPointsToRedeem}
            maxRedeemable={maxRedeemable}
            onUseLoyaltyChange={onUseLoyaltyChange}
            onPointsChange={onLoyaltyPointsChange}
          />
        )}

        <PaymentMethodSelector
          paymentMethod={paymentMethod}
          onChange={onPaymentMethodChange}
        />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">
              Discount % {discountEnabled ? "" : "(Disabled)"}
            </label>
            <input
              type="number"
              min="0"
              max={maxDiscount}
              disabled={!discountEnabled}
              value={localDiscount}
              onChange={(e) =>
                setLocalDiscount(
                  Math.min(maxDiscount, parseFloat(e.target.value) || 0),
                )
              }
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-gold)] disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1">
              Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Optional notes"
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-gold)]"
            />
          </div>
        </div>

        <TotalsDisplay
          subtotal={subtotal}
          globalDiscount={globalDiscount}
          globalTax={globalTax}
          useLoyalty={useLoyalty}
          loyaltyPointsToRedeem={loyaltyPointsToRedeem}
          total={total}
        />

        <CheckoutButton
          isProcessing={isProcessing}
          disabled={cart.length === 0}
          total={total}
          onClick={onCheckout}
        />
      </div>
    </div>
  );
};

export default React.memo(Cart);
