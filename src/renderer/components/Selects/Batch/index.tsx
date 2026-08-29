// src/renderer/components/Selects/Batch/index.tsx
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, Package, X, Calendar } from "lucide-react";
import type { Batch } from "../../../api/core/batch";
import batchAPI from "../../../api/core/batch";
import { format } from "date-fns";

interface BatchSelectProps {
  value: number | null;
  onChange: (batchId: number | null, batch?: Batch) => void;
  disabled?: boolean;
  placeholder?: string;
  meatId?: number;
  statusFilter?: "active" | "depleted" | "expired" | "on_hold" | "all";
  className?: string;
}

const BatchSelect: React.FC<BatchSelectProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = "Select batch...",
  meatId,
  statusFilter = "active",
  className = "w-full max-w-md",
}) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  const loadBatches = async () => {
    setLoading(true);
    try {
      const params: any = {
        limit: 1000,
        sortBy: "expiryDate",
        sortOrder: "ASC",
      };
      if (meatId) params.meatId = meatId;
      if (statusFilter !== "all") params.status = statusFilter;

      console.log("[BatchSelect] Fetching batches with params:", params); // ✅

      const response = await batchAPI.getAll(params);
      console.log("[BatchSelect] Response:", response); // ✅

      if (response.status && response.data) {
        const list = response.data.items || [];
        console.log("[BatchSelect] Batches received:", list.map(b => ({ id: b.id, meatId: b.meatId, code: b.batchCode }))); // ✅
        setBatches(list);
        setFilteredBatches(list);
      }
    } catch (error) {
      console.error("Failed to load batches:", error);
    } finally {
      setLoading(false);
    }
  };
  loadBatches();
}, [meatId, statusFilter]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredBatches(batches);
      return;
    }
    const lower = searchTerm.toLowerCase();
    setFilteredBatches(
      batches.filter(
        (b) =>
          b.batchCode.toLowerCase().includes(lower) ||
          (b.meat?.name && b.meat.name.toLowerCase().includes(lower)) ||
          (b.meat?.sku && b.meat.sku.toLowerCase().includes(lower))
      )
    );
  }, [searchTerm, batches]);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const updateDropdownPosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      window.addEventListener("scroll", updateDropdownPosition, true);
      window.addEventListener("resize", updateDropdownPosition);
    }
    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (batch: Batch) => {
    onChange(batch.id, batch);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const selectedBatch = batches.find((b) => b.id === value);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "var(--status-completed)";
      case "depleted":
        return "var(--stock-outstock)";
      case "expired":
        return "var(--status-cancelled)";
      case "on_hold":
        return "var(--status-pending)";
      default:
        return "var(--text-tertiary)";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "active":
        return "var(--status-completed-bg)";
      case "depleted":
        return "var(--stock-outstock-bg)";
      case "expired":
        return "var(--status-cancelled-bg)";
      case "on_hold":
        return "var(--status-pending-bg)";
      default:
        return "var(--card-secondary-bg)";
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-4 py-2 rounded-lg text-left flex items-center gap-2 transition-colors duration-200"
        style={{
          backgroundColor: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          color: "var(--text-primary)",
          minHeight: "42px",
        }}
      >
        <Package className="w-4 h-4 flex-shrink-0" style={{ color: "var(--accent-gold)" }} />
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {selectedBatch ? (
            <>
              <span className="font-medium truncate">{selectedBatch.batchCode}</span>
              {selectedBatch.meat && (
                <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                  ({selectedBatch.meat.name})
                </span>
              )}
              <span className="text-xs" style={{ color: getStatusColor(selectedBatch.status) }}>
                {selectedBatch.remainingQuantity}kg
              </span>
            </>
          ) : (
            <span className="truncate" style={{ color: "var(--text-secondary)" }}>
              {placeholder}
            </span>
          )}
        </div>
        {selectedBatch && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-full hover:bg-gray-700 transition-colors flex-shrink-0"
            style={{ color: "var(--text-secondary)" }}
            title="Remove selected"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`}
          style={{ color: "var(--text-secondary)" }}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] rounded-lg shadow-lg overflow-hidden"
            style={{
              top: dropdownStyle.top,
              left: dropdownStyle.left,
              width: dropdownStyle.width,
              backgroundColor: "var(--card-bg)",
              border: "1px solid var(--border-color)",
              maxHeight: "350px",
            }}
          >
            <div className="p-2 border-b" style={{ borderColor: "var(--border-color)" }}>
              <div className="relative">
                <Search
                  className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4"
                  style={{ color: "var(--text-secondary)" }}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by batch code or meat name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded text-sm"
                  style={{
                    backgroundColor: "var(--card-secondary-bg)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: "250px" }}>
              {loading && batches.length === 0 ? (
                <div className="p-3 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  Loading...
                </div>
              ) : filteredBatches.length === 0 ? (
                <div className="p-3 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  No batches found
                </div>
              ) : (
                filteredBatches.map((batch) => (
                  <button
                    key={batch.id}
                    type="button"
                    onClick={() => handleSelect(batch)}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 transition-colors text-sm cursor-pointer hover:bg-[var(--card-hover-bg)] ${
                      batch.id === value ? "bg-[var(--accent-gold-light)]" : ""
                    }`}
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                  >
                    <Package className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--accent-gold)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {batch.batchCode}
                        </span>
                        <span className="text-xs" style={{ color: getStatusColor(batch.status) }}>
                          {batch.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {batch.meat && <span>{batch.meat.name}</span>}
                        <span>{batch.remainingQuantity}kg</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(batch.expiryDate), "MMM dd, yyyy")}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default BatchSelect;