// src/renderer/pages/Cashier/components/PaymentMethodSelector.tsx
import React from "react";
import { Banknote, CreditCard, Wallet } from "lucide-react";
import type { PaymentMethod } from "../types";

interface PaymentMethodSelectorProps {
  paymentMethod: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  paymentMethod,
  onChange,
}) => {
  const methods: { value: PaymentMethod; label: string; icon: React.ReactNode; color: string }[] = [
    { value: "cash", label: "Cash", icon: <Banknote className="w-4 h-4" />, color: "var(--payment-cash)" },
    { value: "card", label: "Card", icon: <CreditCard className="w-4 h-4" />, color: "var(--payment-card)" },
    { value: "wallet", label: "Wallet", icon: <Wallet className="w-4 h-4" />, color: "var(--payment-digital)" },
  ];

  return (
    <div>
      <label className="block text-xs font-medium text-[var(--text-tertiary)] mb-1.5">Payment Method</label>
      <div className="grid grid-cols-3 gap-2">
        {methods.map((method) => (
          <button
            key={method.value}
            onClick={() => onChange(method.value)}
            className={`
              flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border transition-all duration-200 text-sm font-medium
              ${
                paymentMethod === method.value
                  ? `border-[${method.color}] bg-[${method.color}]/10 text-[${method.color}] shadow-sm`
                  : "border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:border-[var(--border-dark)]"
              }
            `}
            style={{
              ...(paymentMethod === method.value && {
                borderColor: method.color,
                backgroundColor: method.color + "20",
                color: method.color,
              }),
            }}
          >
            {method.icon}
            <span>{method.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default React.memo(PaymentMethodSelector);