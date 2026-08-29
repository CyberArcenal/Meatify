// src/renderer/pages/inventory/purchases/components/StatusUpdateDialog.tsx
import React, { useState, useEffect } from "react";
import Modal from "../../../components/UI/Modal";
import type { Purchase } from "../../../api/core/purchase";
import { allowedNextStatuses } from "../utils/statusTransitions";

interface StatusUpdateDialogProps {
  isOpen: boolean;
  purchase: Purchase | null;
  onClose: () => void;
  onConfirm: (newStatus: string) => void;
}

export const StatusUpdateDialog: React.FC<StatusUpdateDialogProps> = ({
  isOpen,
  purchase,
  onClose,
  onConfirm,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  const allowedStatuses = purchase ? allowedNextStatuses(purchase.status) : [];

  useEffect(() => {
    if (isOpen && allowedStatuses.length > 0) {
      setSelectedStatus(allowedStatuses[0]);
    }
  }, [isOpen, allowedStatuses]);

  if (!purchase) return null;

  const handleConfirm = () => {
    if (selectedStatus) {
      onConfirm(selectedStatus);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Update Status – ${purchase.referenceNo || `#${purchase.id}`}`}
      size="sm"
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          Current status:{" "}
          <span className="font-medium capitalize text-[var(--text-primary)]">{purchase.status}</span>
        </p>

        {allowedStatuses.length === 0 ? (
          <div className="bg-[var(--status-cancelled-bg)] border border-[var(--status-cancelled)]/30 rounded-lg p-3 text-sm text-[var(--status-cancelled)]">
            This purchase is already in a final state and cannot be changed.
          </div>
        ) : (
          <div className="space-y-2">
            {allowedStatuses.map((status) => (
              <label
                key={status}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--card-hover-bg)] cursor-pointer transition-colors"
              >
                <input
                  type="radio"
                  name="status"
                  value={status}
                  checked={selectedStatus === status}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
                />
                <span className="text-sm text-[var(--text-primary)] capitalize">{status}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-[var(--border-color)]">
        <button
          onClick={onClose}
          className="px-5 py-2.5 border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] hover:bg-[var(--card-hover-bg)] transition-colors font-medium"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={allowedStatuses.length === 0 || !selectedStatus}
          className="px-6 py-2.5 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-sm"
        >
          Update Status
        </button>
      </div>
    </Modal>
  );
};