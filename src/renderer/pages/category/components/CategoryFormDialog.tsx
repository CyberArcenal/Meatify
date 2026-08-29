// src/renderer/pages/category/components/CategoryFormDialog.tsx
import React, { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { Loader2, Save } from "lucide-react";
import Modal from "../../../components/UI/Modal";
import categoryAPI, { type Category } from "../../../api/core/category";
import { dialogs } from "../../../utils/dialogs";
import { type FormMode } from "../hooks/useCategoryForm";

interface CategoryFormDialogProps {
  isOpen: boolean;
  mode: FormMode;
  categoryId?: number;
  initialData?: Partial<Category>;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  description: string;
  isActive: boolean;
}

export const CategoryFormDialog: React.FC<CategoryFormDialogProps> = ({
  isOpen,
  mode,
  categoryId,
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
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      isActive: initialData?.isActive ?? true,
    },
  });

  useEffect(() => {
    if (isOpen && initialData) {
      reset({
        name: initialData.name ?? "",
        description: initialData.description ?? "",
        isActive: initialData.isActive ?? true,
      });
    } else if (isOpen) {
      reset({ name: "", description: "", isActive: true });
    }
  }, [isOpen, initialData, reset]);

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      if (mode === "add") {
        const response = await categoryAPI.create(data);
        if (response.status) {
          dialogs.alert({
            title: "Success",
            message: "Category created successfully.",
          });
          onSuccess();
        } else {
          throw new Error(response.message);
        }
      } else {
        if (!categoryId) return;
        const response = await categoryAPI.update(categoryId, data);
        if (response.status) {
          dialogs.alert({
            title: "Success",
            message: "Category updated successfully.",
          });
          onSuccess();
        } else {
          throw new Error(response.message);
        }
      }
    } catch (error: any) {
      dialogs.alert({ title: "Error", message: error.message });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "add" ? "Add Category" : "Edit Category"}
      size="sm"
      closeOnClickOutside={!isSubmitting}
      closeOnEsc={!isSubmitting}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
            Name <span className="text-[var(--accent-red)]">*</span>
          </label>
          <input
            {...register("name", { required: "Name is required" })}
            className={`w-full bg-[var(--input-bg)] border ${
              errors.name ? "border-[var(--accent-red)]" : "border-[var(--input-border)]"
            } rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent`}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-[var(--accent-red)]">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
            Description
          </label>
          <textarea
            {...register("description")}
            rows={3}
            className="w-full bg-[var(--input-bg)] border border-[var(--input-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent resize-none"
            placeholder="Optional description for this category..."
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            {...register("isActive")}
            id="isActive"
            className="w-4 h-4 rounded border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
          />
          <label htmlFor="isActive" className="text-sm text-[var(--text-primary)]">
            Active (visible in dropdowns and filters)
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
                {mode === "add" ? "Create Category" : "Update Category"}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};