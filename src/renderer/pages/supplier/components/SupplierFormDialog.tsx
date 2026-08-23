// src/renderer/pages/inventory/suppliers/components/SupplierFormDialog.tsx
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { X, Loader2 } from "lucide-react";
import supplierAPI, { type Supplier } from "../../../api/core/supplier";
import { dialogs } from "../../../utils/dialogs";
import type { FormMode } from "../hooks/useSupplierForm";

interface SupplierFormDialogProps {
  isOpen: boolean;
  mode: FormMode;
  supplierId?: number;
  initialData?: Partial<Supplier>;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
}

export const SupplierFormDialog: React.FC<SupplierFormDialogProps> = ({
  isOpen,
  mode,
  supplierId,
  initialData,
  onClose,
  onSuccess,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (isOpen && initialData) {
      reset(initialData);
    } else if (isOpen) {
      reset({ name: "", email: "", phone: "", address: "", isActive: true });
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = async (data: FormData) => {
    try {
      let response;
      if (mode === "add") {
        response = await supplierAPI.create(data);
      } else {
        if (!supplierId) return;
        response = await supplierAPI.update(supplierId, data);
      }

      if (response.status) {
        dialogs.alert({
          title: "Success",
          message: `Supplier ${mode === "add" ? "created" : "updated"} successfully.`,
        });
        onSuccess();
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      dialogs.alert({ title: "Error", message: error.message });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-md">
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              {mode === "add" ? "Add Supplier" : "Edit Supplier"}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors"
            >
              <X className="w-5 h-5 text-[var(--text-tertiary)]" />
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                Name <span className="text-[var(--accent-red)]">*</span>
              </label>
              <input
                {...register("name", { required: "Name is required" })}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-[var(--accent-red)]">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                Email
              </label>
              <input
                type="email"
                {...register("email")}
                placeholder="email@example.com"
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                Phone
              </label>
              <input
                {...register("phone")}
                placeholder="+63 XXX XXX XXXX"
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                Address
              </label>
              <textarea
                {...register("address")}
                rows={2}
                className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent resize-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                {...register("isActive")}
                id="isActive"
                className="w-4 h-4 rounded border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
              />
              <label htmlFor="isActive" className="text-sm text-[var(--text-primary)]">
                Active
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
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