import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Loader2, RefreshCw, XCircle } from "lucide-react";
import Decimal from "decimal.js";
import { useProducts } from "./hooks/useProducts";
import { useCustomers } from "./hooks/useCustomers";
import { useCart } from "./hooks/useCart";
import { useLoyalty as useLoyaltyMethod } from "./hooks/useLoyalty";
import { useCheckout } from "./hooks/useCheckout";
import ProductGrid from "./components/ProductGrid";
import Cart from "./components/Cart";
import CheckoutDialog from "./components/CheckoutDialog";
import type { CartItem } from "./types";
import PaymentSuccessDialog from "./components/PaymentSuccessDialog";
import CashierHeader from "./components/CashierHeader";
import { useSettings } from "../../contexts/SettingsContext";
import { useBarcodeEnabled } from "../../utils/posUtils";
import { calculateCartTotal } from "./utils";

const Cashier: React.FC = () => {
  const {
    filteredProducts,
    searchTerm,
    setSearchTerm,
    categoryId,
    setCategoryId,
    loadingProducts,
    loadProducts,
    clearFilters,
  } = useProducts();

  const { selectedCustomer, selectCustomer, setSelectedCustomer } = useCustomers();

  const {
    cart,
    globalDiscount,
    globalTax,
    notes,
    setGlobalDiscount,
    setGlobalTax,
    setNotes,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    updateLineDiscount,
    updateLineTax,
    clearCart,
  } = useCart();

  const {
    loyaltyPointsAvailable,
    loyaltyPointsToRedeem,
    useLoyalty,
    setLoyaltyPointsToRedeem,
    setUseLoyalty,
  } = useLoyaltyMethod(selectedCustomer?.id);

  const { isProcessing, processCheckout } = useCheckout();
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "wallet">("cash");
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successData, setSuccessData] = useState<{
    sale: any;
    paidAmount?: number;
    change?: Decimal;
    paymentMethod: string;
    total: Decimal;
    cartItems: CartItem[];
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const isBarcodeEnabled = useBarcodeEnabled();

  // ========== OPTIMIZATION: useMemo for heavy calculations ==========
  const loyaltyDeduction = useMemo(
    () => (useLoyalty ? new Decimal(loyaltyPointsToRedeem) : new Decimal(0)),
    [useLoyalty, loyaltyPointsToRedeem]
  );

  const finalTotal = useMemo(
    () => calculateCartTotal(cart, globalDiscount, globalTax, loyaltyDeduction),
    [cart, globalDiscount, globalTax, loyaltyDeduction]
  );

  const itemCount = useMemo(
    () => cart.reduce((acc, item) => acc + item.cartQuantity, 0),
    [cart]
  );

  // ========== Handlers with useCallback ==========
  const handleCheckoutClick = useCallback(() => {
    if (cart.length === 0) {
      alert("Please add items to the cart.");
      return;
    }
    setShowCheckoutDialog(true);
  }, [cart.length]);

  const handleConfirmCheckout = useCallback(
    async (paidAmount?: number) => {
      setShowCheckoutDialog(false);
      await processCheckout(
        cart,
        selectedCustomer,
        paymentMethod,
        notes,
        useLoyalty ? loyaltyPointsToRedeem : 0,
        (sale) => {
          const change =
            paymentMethod === "cash" && paidAmount !== undefined
              ? new Decimal(paidAmount).minus(finalTotal)
              : undefined;

          setSuccessData({
            sale,
            paidAmount,
            change,
            paymentMethod,
            total: finalTotal,
            cartItems: cart,
          });
          setShowSuccessDialog(true);
        }
      );
    },
    [cart, selectedCustomer, paymentMethod, notes, useLoyalty, loyaltyPointsToRedeem, finalTotal, processCheckout]
  );

  const handleSuccessDialogClose = useCallback(() => {
    setShowSuccessDialog(false);
    setSuccessData(null);
    clearCart();
    setSelectedCustomer(null);
    setPaymentMethod("cash");
    setUseLoyalty(false);
    setLoyaltyPointsToRedeem(0);
    loadProducts();
  }, [clearCart, setSelectedCustomer, setUseLoyalty, setLoyaltyPointsToRedeem, loadProducts]);

  const handleClearCart = useCallback(() => {
    clearCart();
    setUseLoyalty(false);
    setLoyaltyPointsToRedeem(0);
  }, [clearCart, setUseLoyalty, setLoyaltyPointsToRedeem]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.ctrlKey && e.key === "d") {
        e.preventDefault();
        const discountStr = window.prompt("Enter global discount percentage:", String(globalDiscount));
        if (discountStr !== null) {
          const discount = parseFloat(discountStr);
          if (!isNaN(discount) && discount >= 0 && discount <= 100) {
            setGlobalDiscount(discount);
          } else {
            alert("Invalid discount. Must be 0–100.");
          }
        }
      }
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        handleCheckoutClick();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [globalDiscount, setGlobalDiscount, handleCheckoutClick]);

  // Initial load
  useEffect(() => {
    loadProducts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full flex flex-col bg-[var(--background-color)]">
      <CashierHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchInputRef={searchInputRef}
        itemCount={itemCount}
        total={finalTotal}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        loadingProducts={loadingProducts}
        onRefresh={loadProducts}
        onClearFilters={clearFilters}
        showClearFilters={!!(searchTerm || categoryId)}
        printerReady={true}
        drawerOpen={false}
        online={true}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          {loadingProducts ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-blue)]" />
            </div>
          ) : (
            <ProductGrid products={filteredProducts} onAddToCart={addToCart} />
          )}
        </div>

        <div className="w-96 flex-shrink-0 overflow-y-auto">
          <Cart
            cart={cart}
            globalDiscount={globalDiscount}
            globalTax={globalTax}
            notes={notes}
            onUpdateQuantity={updateCartQuantity}
            onRemove={removeFromCart}
            onUpdateDiscount={updateLineDiscount}
            onUpdateTax={updateLineTax}
            onGlobalDiscountChange={setGlobalDiscount}
            onGlobalTaxChange={setGlobalTax}
            onNotesChange={setNotes}
            selectedCustomer={selectedCustomer}
            onCustomerSelect={selectCustomer}
            loyaltyPointsAvailable={loyaltyPointsAvailable}
            loyaltyPointsToRedeem={loyaltyPointsToRedeem}
            useLoyalty={useLoyalty}
            onUseLoyaltyChange={setUseLoyalty}
            onLoyaltyPointsChange={setLoyaltyPointsToRedeem}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            isProcessing={isProcessing}
            onCheckout={handleCheckoutClick}
            onClearCart={handleClearCart}
          />
        </div>
      </div>

      <CheckoutDialog
        isOpen={showCheckoutDialog}
        onClose={() => setShowCheckoutDialog(false)}
        onConfirm={handleConfirmCheckout}
        total={finalTotal}
        cartItems={cart}
        paymentMethod={paymentMethod}
        isProcessing={isProcessing}
      />

      {successData && (
        <PaymentSuccessDialog
          isOpen={showSuccessDialog}
          onClose={handleSuccessDialogClose}
          saleId={successData.sale.id}
          total={successData.total}
          paidAmount={successData.paidAmount}
          change={successData.change}
          paymentMethod={successData.paymentMethod}
          items={successData.cartItems}
        />
      )}
    </div>
  );
};

export default React.memo(Cashier);