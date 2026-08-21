import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, X, Loader2 } from "lucide-react";

export interface SelectOption {
  value: string | number;
  label: string;
  [key: string]: any;
}

export interface SelectProps {
  value: string | number | null;
  onChange: (value: string | number | null, option?: SelectOption) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  searchable?: boolean;
  clearable?: boolean;
  className?: string;
  menuClassName?: string;
  renderOption?: (option: SelectOption) => React.ReactNode;
  renderValue?: (option: SelectOption | null) => React.ReactNode;
  noOptionsMessage?: string;
  loadingMessage?: string;
  maxHeight?: number;
  autoFocus?: boolean;
}

const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  loading = false,
  searchable = true,
  clearable = true,
  className = "",
  menuClassName = "",
  renderOption,
  renderValue,
  noOptionsMessage = "No options found",
  loadingMessage = "Loading...",
  maxHeight = 250,
  autoFocus = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dropdownStyle, setDropdownStyle] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter options based on search term
  const filteredOptions = React.useMemo(() => {
    if (!searchTerm.trim() || !searchable) return options;
    const lower = searchTerm.toLowerCase();
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(lower)
    );
  }, [options, searchTerm, searchable]);

  // Find selected option
  const selectedOption = options.find((opt) => opt.value === value) || null;

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, searchable]);

  // Update dropdown position
  const updateDropdownPosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, []);

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
  }, [isOpen, updateDropdownPosition]);

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

  // Auto focus
  useEffect(() => {
    if (autoFocus && triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [autoFocus]);

  const handleSelect = (option: SelectOption) => {
    onChange(option.value, option);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const toggleOpen = () => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
      if (!isOpen) setSearchTerm("");
    }
  };

  // Default renderers
  const defaultRenderValue = (opt: SelectOption | null) => (
    <span className="truncate">{opt ? opt.label : placeholder}</span>
  );

  const defaultRenderOption = (opt: SelectOption) => (
    <span className="truncate">{opt.label}</span>
  );

  const renderOptionFn = renderOption || defaultRenderOption;
  const renderValueFn = renderValue || defaultRenderValue;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={toggleOpen}
        disabled={disabled || loading}
        className={`
          w-full px-4 py-2 rounded-lg text-left flex items-center gap-2
          transition-colors duration-200
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-[var(--primary-color)]"}
          ${isOpen ? "border-[var(--primary-color)] ring-2 ring-[var(--primary-color)]/20" : ""}
        `}
        style={{
          backgroundColor: "var(--input-bg)",
          border: "1px solid var(--input-border)",
          color: "var(--input-text)",
          minHeight: "42px",
        }}
      >
        <div className="flex-1 min-w-0 flex items-center">
          {selectedOption ? renderValueFn(selectedOption) : (
            <span className="truncate" style={{ color: "var(--text-tertiary)" }}>
              {placeholder}
            </span>
          )}
        </div>
        {loading && <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-tertiary)" }} />}
        {clearable && selectedOption && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="p-0.5 rounded-full hover:bg-[var(--card-hover-bg)] transition-colors flex-shrink-0"
            style={{ color: "var(--text-secondary)" }}
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? "rotate-180" : ""
          }`}
          style={{ color: "var(--text-secondary)" }}
        />
      </button>

      {/* Dropdown menu */}
      {isOpen &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] rounded-lg shadow-xl overflow-hidden animate-slideDown"
            style={{
              top: dropdownStyle.top,
              left: dropdownStyle.left,
              width: dropdownStyle.width,
              backgroundColor: "var(--card-bg)",
              border: "1px solid var(--border-color)",
              maxHeight: maxHeight + (searchable ? 52 : 0) + 8,
            }}
          >
            {/* Search input */}
            {searchable && (
              <div className="p-2 border-b" style={{ borderColor: "var(--border-color)" }}>
                <div className="relative">
                  <Search
                    className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4"
                    style={{ color: "var(--text-tertiary)" }}
                  />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded text-sm"
                    style={{
                      backgroundColor: "var(--input-bg)",
                      border: "1px solid var(--input-border)",
                      color: "var(--input-text)",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Options list */}
            <div className="overflow-y-auto" style={{ maxHeight }}>
              {loading ? (
                <div className="p-3 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  {loadingMessage}
                </div>
              ) : filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  {noOptionsMessage}
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option)}
                    className={`
                      w-full px-3 py-2 text-left flex items-center gap-2
                      transition-colors text-sm cursor-pointer
                      hover:bg-[var(--card-hover-bg)]
                      ${option.value === value ? "bg-[var(--primary-color)]/10" : ""}
                    `}
                    style={{
                      borderBottom: "1px solid var(--border-color)",
                    }}
                  >
                    {renderOptionFn(option)}
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

export default Select;