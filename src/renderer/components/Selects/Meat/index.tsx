// src/renderer/components/Selects/Meat/index.tsx
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, Beef, X } from "lucide-react";
import type { Meat } from "../../../api/core/meat";
import meatAPI from "../../../api/core/meat";

interface MeatSelectProps {
  value: number | null;
  onChange: (meatId: number | null, meat?: Meat) => void;
  disabled?: boolean;
  placeholder?: string;
  activeOnly?: boolean;
  categoryId?: number;
  className?: string;
}

const MeatSelect: React.FC<MeatSelectProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = "Select meat...",
  activeOnly = true,
  categoryId,
  className = "w-full max-w-md",
}) => {
  const [meats, setMeats] = useState<Meat[]>([]);
  const [filteredMeats, setFilteredMeats] = useState<Meat[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadMeats = async () => {
      setLoading(true);
      try {
        const params: any = {
          limit: 1000,
          sortBy: "name",
          sortOrder: "ASC",
        };
        if (activeOnly) params.isActive = true;
        if (categoryId) params.categoryId = categoryId;

        const response = await meatAPI.getAll(params);
        if (response.status && response.data) {
          const list = response.data.items || [];
          setMeats(list);
          setFilteredMeats(list);
        }
      } catch (error) {
        console.error("Failed to load meats:", error);
      } finally {
        setLoading(false);
      }
    };
    loadMeats();
  }, [activeOnly, categoryId]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredMeats(meats);
      return;
    }
    const lower = searchTerm.toLowerCase();
    setFilteredMeats(
      meats.filter(
        (m) =>
          m.name.toLowerCase().includes(lower) ||
          m.sku.toLowerCase().includes(lower) ||
          (m.barcode && m.barcode.toLowerCase().includes(lower))
      )
    );
  }, [searchTerm, meats]);

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

  const handleSelect = (meat: Meat) => {
    onChange(meat.id, meat);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const selectedMeat = meats.find((m) => m.id === value);

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
        <Beef className="w-4 h-4 flex-shrink-0" style={{ color: "var(--accent-gold)" }} />
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {selectedMeat ? (
            <>
              <span className="font-medium truncate">{selectedMeat.name}</span>
              <span className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                ({selectedMeat.sku})
              </span>
              <span className="text-xs font-mono" style={{ color: "var(--accent-gold)" }}>
                ₱{selectedMeat.pricePerKg.toFixed(2)}/kg
              </span>
            </>
          ) : (
            <span className="truncate" style={{ color: "var(--text-secondary)" }}>
              {placeholder}
            </span>
          )}
        </div>
        {selectedMeat && !disabled && (
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
                  placeholder="Search by name, SKU, or barcode..."
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
              {loading && meats.length === 0 ? (
                <div className="p-3 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  Loading...
                </div>
              ) : filteredMeats.length === 0 ? (
                <div className="p-3 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  No meats found
                </div>
              ) : (
                filteredMeats.map((meat) => (
                  <button
                    key={meat.id}
                    type="button"
                    onClick={() => handleSelect(meat)}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 transition-colors text-sm cursor-pointer hover:bg-[var(--card-hover-bg)] ${
                      meat.id === value ? "bg-[var(--accent-gold-light)]" : ""
                    }`}
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                  >
                    <Beef className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--accent-gold)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {meat.name}
                        </span>
                        <span className="text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
                          {meat.sku}
                        </span>
                      </div>
                      <div className="text-xs truncate" style={{ color: "var(--text-secondary)" }}>
                        ₱{meat.pricePerKg.toFixed(2)}/kg
                        {meat.category?.name && ` • ${meat.category.name}`}
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

export default MeatSelect;