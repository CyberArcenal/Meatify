// src/renderer/pages/customer/components/CustomerFormDialog.tsx
import React, { useState, useEffect } from "react";
import { Loader2, Save, Mail, Phone, User, MapPin } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import customerAPI from "../../../api/core/customer";
import { dialogs } from "../../../utils/dialogs";

interface CustomerFormDialogProps {
  isOpen: boolean;
  mode: "add" | "edit";
  customerId?: number;
  initialData?: Partial<{
    name: string;
    email: string;
    phone: string;
    address: string;
    notes: string;
    isActive: boolean;
  }>;
  onClose: () => void;
  onSuccess: () => void;
}

export const CustomerFormDialog: React.FC<CustomerFormDialogProps> = ({
  isOpen,
  mode,
  customerId,
  initialData,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        address: initialData.address || "",
        notes: initialData.notes || "",
        isActive: initialData.isActive ?? true,
      });
    } else {
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        notes: "",
        isActive: true,
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (formData.email && !/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (formData.phone && !/^[\d\s\+\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = "Invalid phone number";
    }
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      if (mode === "add") {
        await customerAPI.create({
          name: formData.name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          notes: formData.notes || undefined,
          isActive: formData.isActive,
        });
        dialogs.success("Customer created successfully.");
      } else {
        if (!customerId) throw new Error("Customer ID missing for edit");
        await customerAPI.update(customerId, {
          name: formData.name,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          notes: formData.notes || undefined,
          isActive: formData.isActive,
        });
        dialogs.success("Customer updated successfully.");
      }
      onSuccess();
    } catch (err: any) {
      dialogs.error(err.message || "Operation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "add" ? "Add Customer" : "Edit Customer"}
      size="md"
      closeOnClickOutside={!loading}
      closeOnEsc={!loading}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
            Name <span className="text-[var(--accent-red)]">*</span>
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full bg-[var(--input-bg)] border ${
                errors.name ? "border-[var(--accent-red)]" : "border-[var(--input-border)]"
              } rounded-lg pl-10 pr-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent`}
              placeholder="Full name"
            />
          </div>
          {errors.name && <p className="mt-1 text-xs text-[var(--accent-red)]">{errors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full bg-[var(--input-bg)] border ${
                errors.email ? "border-[var(--accent-red)]" : "border-[var(--input-border)]"
              } rounded-lg pl-10 pr-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent`}
              placeholder="customer@example.com"
            />
          </div>
          {errors.email && <p className="mt-1 text-xs text-[var(--accent-red)]">{errors.email}</p>}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
            Phone
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full bg-[var(--input-bg)] border ${
                errors.phone ? "border-[var(--accent-red)]" : "border-[var(--input-border)]"
              } rounded-lg pl-10 pr-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent`}
              placeholder="+63 912 345 6789"
            />
          </div>
          {errors.phone && <p className="mt-1 text-xs text-[var(--accent-red)]">{errors.phone}</p>}
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
            Address
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-[var(--text-tertiary)]" />
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={2}
              className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg pl-10 pr-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent resize-none"
              placeholder="Customer address"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent resize-none"
            placeholder="Additional notes about this customer..."
          />
        </div>

        {/* Active */}
        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
            id="isActive"
            className="w-4 h-4 rounded border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
          />
          <label htmlFor="isActive" className="text-sm text-[var(--text-primary)]">
            Active (can make purchases and earn points)
          </label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {mode === "add" ? "Create Customer" : "Update Customer"}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};