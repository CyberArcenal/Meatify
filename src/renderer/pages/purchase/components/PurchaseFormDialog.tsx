// src/renderer/pages/inventory/purchases/components/PurchaseFormDialog.tsx
import React, { useEffect } from "react";
import { X, Loader2, Plus, Trash2 } from "lucide-react";
import { usePurchaseForm } from "../hooks/usePurchaseForm";
import SupplierSelect from "../../../components/Selects/Supplier";
import MeatSelect from "../../../components/Selects/Meat";
import purchaseAPI from "../../../api/core/purchase";
import { dialogs } from "../../../utils/dialogs";

interface PurchaseFormDialogProps {
  isOpen: boolean;
  mode: "add" | "edit";
  purchaseId?: number;
  initialData?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const PurchaseFormDialog: React.FC<PurchaseFormDialogProps> = ({
  isOpen,
  mode,
  purchaseId,
  initialData,
  onClose,
  onSuccess,
}) => {
  const { form, fields, append, remove, totalAmount } = usePurchaseForm();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = form;

  // Reset form when dialog opens or initialData changes
  useEffect(() => {
    if (!isOpen) return;

    if (mode === "edit" && initialData) {
      // Edit mode: map from API structure (purchaseItems)
      reset({
        supplierId: initialData.supplier?.id || initialData.supplierId,
        orderDate: initialData.orderDate
          ? new Date(initialData.orderDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        notes: initialData.notes || "",
        items: initialData.purchaseItems?.map((item: any) => ({
          meatId: item.meat?.id || item.meatId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          expiryDate: item.expiryDate || "",
        })) || [{ meatId: 0, quantity: 1, unitPrice: 0, expiryDate: "" }],
      });
    } else if (mode === "add" && initialData) {
      // Add mode with prefill data (from Reorder page)
      reset({
        supplierId: initialData.supplierId || 0,
        orderDate: new Date().toISOString().split("T")[0],
        notes: initialData.notes || "",
        items: initialData.items?.map((item: any) => ({
          meatId: item.meatId,
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          expiryDate: "",
        })) || [{ meatId: 0, quantity: 1, unitPrice: 0, expiryDate: "" }],
      });
    } else if (mode === "add" && !initialData) {
      reset({
        supplierId: 0,
        orderDate: new Date().toISOString().split("T")[0],
        notes: "",
        items: [{ meatId: 0, quantity: 1, unitPrice: 0, expiryDate: "" }],
      });
    } else {
      // Default add mode (empty form)
      reset({
        supplierId: 0,
        orderDate: new Date().toISOString().split("T")[0],
        notes: "",
        items: [{ meatId: 0, quantity: 1, unitPrice: 0, expiryDate: "" }],
      });
    }
  }, [isOpen, mode, initialData, reset]);

  const onSubmit = async (data: any) => {
    try {
      const items = data.items.map((item: any) => ({
        meatId: item.meatId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        expiryDate: item.expiryDate || new Date().toISOString().split("T")[0],
      }));

      let response;
      if (mode === "add") {
        response = await purchaseAPI.create({
          supplierId: data.supplierId,
          orderDate: new Date(data.orderDate).toISOString(),
          notes: data.notes,
          items,
          status: "pending",
        });
      } else {
        if (!purchaseId) return;
        response = await purchaseAPI.update(purchaseId, {
          supplierId: data.supplierId,
          orderDate: new Date(data.orderDate).toISOString(),
          notes: data.notes,
          items,
        });
      }

      if (response.status) {
        dialogs.alert({
          title: "Success",
          message: `Purchase order ${mode === "add" ? "created" : "updated"} successfully.`,
        });
        onSuccess();
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      dialogs.alert({
        title: "Error",
        message: error.message || "An unexpected error occurred.",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="relative bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-[var(--card-bg)] border-b border-[var(--border-color)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {mode === "add" ? "Create Purchase Order" : "Edit Purchase Order"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-tertiary)]" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                Supplier <span className="text-[var(--accent-red)]">*</span>
              </label>
              <SupplierSelect
                value={watch("supplierId")}
                onChange={(id) =>
                  setValue("supplierId", id as number, { shouldValidate: true })
                }
                disabled={isSubmitting}
                placeholder="Select supplier"
                activeOnly
              />
              {errors.supplierId && (
                <p className="mt-1 text-xs text-[var(--accent-red)]">
                  {errors.supplierId.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                Order Date <span className="text-[var(--accent-red)]">*</span>
              </label>
              <input
                type="date"
                {...register("orderDate", {
                  required: "Order date is required",
                })}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
              />
              {errors.orderDate && (
                <p className="mt-1 text-xs text-[var(--accent-red)]">
                  {errors.orderDate.message}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-[var(--text-primary)]">
                  Items
                </label>
                <button
                  type="button"
                  onClick={() =>
                    append({
                      meatId: 0,
                      quantity: 1,
                      unitPrice: 0,
                      expiryDate: "",
                    })
                  }
                  className="flex items-center gap-1 px-3 py-1 text-xs bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded hover:bg-[var(--accent-gold-hover)] transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add Item
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto border border-[var(--border-color)] rounded-lg p-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <div className="flex-1">
                      <MeatSelect
                        value={watch(`items.${index}.meatId`)}
                        onChange={(id) =>
                          setValue(`items.${index}.meatId`, id as number, {
                            shouldValidate: true,
                          })
                        }
                        disabled={isSubmitting}
                        placeholder="Select meat"
                        activeOnly
                      />
                      {errors.items?.[index]?.meatId && (
                        <p className="mt-1 text-xs text-[var(--accent-red)]">
                          {errors.items[index].meatId?.message}
                        </p>
                      )}
                    </div>

                    <div className="w-20">
                      <input
                        type="number"
                        {...register(`items.${index}.quantity`, {
                          required: "Qty req",
                          min: { value: 1, message: "Min 1" },
                        })}
                        placeholder="Qty"
                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded px-2 py-1 text-sm text-[var(--text-primary)]"
                      />
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        step="0.01"
                        {...register(`items.${index}.unitPrice`, {
                          required: "Price req",
                          min: { value: 0, message: "Min 0" },
                        })}
                        placeholder="Price"
                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded px-2 py-1 text-sm text-[var(--text-primary)]"
                      />
                    </div>

                    <div className="w-32">
                      <input
                        type="date"
                        {...register(`items.${index}.expiryDate`)}
                        className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded px-2 py-1 text-sm text-[var(--text-primary)]"
                      />
                    </div>

                    <span className="text-sm text-[var(--text-secondary)] w-20 text-right">
                      ₱
                      {(
                        (watch(`items.${index}.quantity`) || 0) *
                        (watch(`items.${index}.unitPrice`) || 0)
                      ).toFixed(2)}
                    </span>

                    <button
                      type="button"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      className="p-1 text-[var(--text-tertiary)] hover:text-[var(--accent-red)] disabled:opacity-30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end items-center gap-4 pt-2">
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                Total:
              </span>
              <span className="text-xl font-bold text-[var(--accent-gold)]">
                ₱{totalAmount.toFixed(2)}
              </span>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                Notes
              </label>
              <textarea
                {...register("notes")}
                rows={2}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-sm"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "add" ? "Create" : "Update"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
