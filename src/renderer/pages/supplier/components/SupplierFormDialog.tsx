// src/renderer/pages/inventory/suppliers/components/SupplierFormDialog.tsx
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Save, User, Mail, Phone, MapPin } from "lucide-react";
import Modal from "../../../components/UI/Modal";
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
      reset({
        name: initialData.name || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        address: initialData.address || "",
        isActive: initialData.isActive ?? true,
      });
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
        dialogs.success(`Supplier ${mode === "add" ? "created" : "updated"} successfully.`);
        onSuccess();
      } else {
        throw new Error(response.message);
      }
    } catch (error: any) {
      dialogs.error(error.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "add" ? "Add Supplier" : "Edit Supplier"}
      size="md"
      closeOnClickOutside={!isSubmitting}
      closeOnEsc={!isSubmitting}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
            Name <span className="text-[var(--accent-red)]">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              {...register("name", { required: "Name is required" })}
              className={`w-full bg-[var(--input-bg)] border ${
                errors.name ? "border-[var(--accent-red)]" : "border-[var(--input-border)]"
              } rounded-lg pl-10 pr-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent`}
            />
          </div>
          {errors.name && (
            <p className="mt-1 text-xs text-[var(--accent-red)]">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="email"
              {...register("email")}
              placeholder="email@example.com"
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-10 pr-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
            Phone
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              {...register("phone")}
              placeholder="+63 XXX XXX XXXX"
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-10 pr-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
            Address
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-[var(--text-tertiary)]" />
            <textarea
              {...register("address")}
              rows={2}
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-10 pr-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent resize-none"
              placeholder="Supplier address"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            {...register("isActive")}
            id="isActive"
            className="w-4 h-4 rounded border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
          />
          <label htmlFor="isActive" className="text-sm text-[var(--text-primary)]">
            Active (can be selected in purchases)
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-sm"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {mode === "add" ? "Create Supplier" : "Update Supplier"}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};