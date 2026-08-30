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
  className = "",
}) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filteredBatches, setFilteredBatches] = useState<Batch[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 250,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load batches
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

        const response = await batchAPI.getAll(params);
        if (response.status && response.data) {
          const list = response.data.items || [];
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

  // Filter batches based on search
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

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Calculate dropdown position and max height
  const updateDropdownPosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom - 10;
    const spaceAbove = rect.top - 10;

    let maxHeight = Math.min(300, Math.max(150, Math.floor(spaceBelow - 10)));
    let top: number;

    if (spaceBelow < 200 && spaceAbove > 150) {
      top = rect.top + window.scrollY - Math.min(spaceAbove - 10, 300);
      maxHeight = Math.min(300, Math.max(150, Math.floor(spaceAbove - 10)));
    } else {
      top = rect.bottom + window.scrollY + 4;
      maxHeight = Math.min(300, Math.max(150, Math.floor(spaceBelow - 10)));
    }

    setDropdownStyle({
      top,
      left: rect.left + window.scrollX,
      width: rect.width,
      maxHeight,
    });
  };

  // Update position when dropdown opens or window resizes/scrolls
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

  // Close on outside click
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

  return (
    <div className={`relative min-w-0 ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full px-2 py-1 rounded-lg text-left flex items-center gap-1 transition-colors duration-200 overflow-hidden"
        style={{
          backgroundColor: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          color: "var(--text-primary)",
          minHeight: "32px",
        }}
      >
        <Package className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--accent-gold)" }} />
        
        <div className="flex-1 min-w-0 flex items-center gap-1 overflow-hidden">
          {selectedBatch ? (
            <>
              <span 
                className="text-xs font-medium truncate flex-1 min-w-0" 
                style={{ color: "var(--text-primary)" }}
                title={selectedBatch.batchCode}
              >
                {selectedBatch.batchCode}
              </span>
              <span 
                className="text-[10px] flex-shrink-0 font-medium" 
                style={{ color: getStatusColor(selectedBatch.status) }}
              >
                {selectedBatch.remainingQuantity}kg
              </span>
            </>
          ) : (
            <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
              {placeholder}
            </span>
          )}
        </div>

        {selectedBatch && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 rounded-full hover:bg-[var(--card-hover-bg)] transition-colors flex-shrink-0"
            style={{ color: "var(--text-secondary)" }}
            title="Remove selected"
          >
            <X className="w-3 h-3" />
          </button>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
          style={{ color: "var(--text-secondary)" }}
        />
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] rounded-lg shadow-xl overflow-hidden border border-[var(--border-color)] bg-[var(--card-bg)]"
            style={{
              top: dropdownStyle.top,
              left: dropdownStyle.left,
              width: dropdownStyle.width,
              maxHeight: dropdownStyle.maxHeight + 60,
            }}
          >
            {/* Search input */}
            <div className="p-2 border-b border-[var(--border-color)] bg-[var(--card-secondary-bg)]">
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
                    backgroundColor: "var(--input-bg)",
                    border: "1px solid var(--input-border)",
                    color: "var(--text-primary)",
                    outline: "none",
                  }}
                />
              </div>
            </div>

            {/* Options list */}
            <div
              className="overflow-y-auto custom-scrollbar"
              style={{ maxHeight: dropdownStyle.maxHeight }}
            >
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
                    <Package
                      className="w-3.5 h-3.5 flex-shrink-0"
                      style={{ color: "var(--accent-gold)" }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-medium truncate"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {batch.batchCode}
                        </span>
                        <span className="text-xs flex-shrink-0" style={{ color: getStatusColor(batch.status) }}>
                          {batch.status}
                        </span>
                      </div>
                      <div
                        className="flex items-center gap-3 text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {batch.meat && <span className="truncate">{batch.meat.name}</span>}
                        <span className="flex-shrink-0">{batch.remainingQuantity.toFixed(2)}kg</span>
                        <span className="flex items-center gap-1 flex-shrink-0">
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