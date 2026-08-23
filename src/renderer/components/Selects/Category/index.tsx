// src/renderer/components/Selects/Category/index.tsx
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, Layers, X } from "lucide-react";
import type { Category } from "../../../api/core/category";
import categoryAPI from "../../../api/core/category";

interface CategorySelectProps {
  value: number | null;
  onChange: (categoryId: number | null, category?: Category) => void;
  disabled?: boolean;
  placeholder?: string;
  activeOnly?: boolean;
  className?: string;
}

const CategorySelect: React.FC<CategorySelectProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = "Select category...",
  activeOnly = true,
  className = "w-full max-w-md",
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      try {
        const params: any = {
          limit: 1000,
          sortBy: "name",
          sortOrder: "ASC",
        };
        if (activeOnly) params.isActive = true;

        const response = await categoryAPI.getAll(params);
        if (response.status && response.data) {
          const list = response.data.items || [];
          setCategories(list);
          setFilteredCategories(list);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
  }, [activeOnly]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCategories(categories);
      return;
    }
    const lower = searchTerm.toLowerCase();
    setFilteredCategories(
      categories.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          (c.description && c.description.toLowerCase().includes(lower))
      )
    );
  }, [searchTerm, categories]);

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

  const handleSelect = (category: Category) => {
    onChange(category.id, category);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const selectedCategory = categories.find((c) => c.id === value);

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
        <Layers className="w-4 h-4 flex-shrink-0" style={{ color: "var(--accent-gold)" }} />
        <div className="flex-1 min-w-0">
          {selectedCategory ? (
            <span className="font-medium truncate">{selectedCategory.name}</span>
          ) : (
            <span className="truncate" style={{ color: "var(--text-secondary)" }}>
              {placeholder}
            </span>
          )}
        </div>
        {selectedCategory && !disabled && (
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
                  placeholder="Search categories..."
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
              {loading && categories.length === 0 ? (
                <div className="p-3 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  Loading...
                </div>
              ) : filteredCategories.length === 0 ? (
                <div className="p-3 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  No categories found
                </div>
              ) : (
                filteredCategories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleSelect(category)}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 transition-colors text-sm cursor-pointer hover:bg-[var(--card-hover-bg)] ${
                      category.id === value ? "bg-[var(--accent-gold-light)]" : ""
                    }`}
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {category.name}
                      </div>
                      {category.description && (
                        <div className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
                          {category.description}
                        </div>
                      )}
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: category.isActive ? "var(--status-completed-bg)" : "var(--status-cancelled-bg)",
                        color: category.isActive ? "var(--status-completed)" : "var(--status-cancelled)",
                      }}
                    >
                      {category.isActive ? "Active" : "Inactive"}
                    </span>
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

export default CategorySelect;