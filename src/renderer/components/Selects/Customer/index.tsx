// src/renderer/components/Selects/Customer/index.tsx
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, Users, X, Star } from "lucide-react";
import type { Customer } from "../../../api/core/customer";
import customerAPI from "../../../api/core/customer";

interface CustomerSelectProps {
  value: number | null;
  onChange: (customerId: number | null, customer?: Customer) => void;
  disabled?: boolean;
  placeholder?: string;
  activeOnly?: boolean;
  statusFilter?: "regular" | "vip" | "elite" | "all";
  className?: string;
}

const CustomerSelect: React.FC<CustomerSelectProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = "Select customer...",
  activeOnly = true,
  statusFilter = "all",
  className = "w-full max-w-md",
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({ top: 0, left: 0, width: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadCustomers = async () => {
      setLoading(true);
      try {
        const params: any = {
          limit: 1000,
          sortBy: "name",
          sortOrder: "ASC",
        };
        if (activeOnly) params.isActive = true;
        if (statusFilter !== "all") params.status = statusFilter;

        const response = await customerAPI.getAll(params);
        if (response.status && response.data) {
          const list = response.data.items || [];
          setCustomers(list);
          setFilteredCustomers(list);
        }
      } catch (error) {
        console.error("Failed to load customers:", error);
      } finally {
        setLoading(false);
      }
    };
    loadCustomers();
  }, [activeOnly, statusFilter]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
      return;
    }
    const lower = searchTerm.toLowerCase();
    setFilteredCustomers(
      customers.filter(
        (c) =>
          c.name.toLowerCase().includes(lower) ||
          (c.email && c.email.toLowerCase().includes(lower)) ||
          (c.phone && c.phone.toLowerCase().includes(lower))
      )
    );
  }, [searchTerm, customers]);

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

  const handleSelect = (customer: Customer) => {
    onChange(customer.id, customer);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const selectedCustomer = customers.find((c) => c.id === value);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "vip":
        return "var(--accent-gold)";
      case "elite":
        return "var(--accent-purple)";
      case "regular":
        return "var(--accent-blue)";
      default:
        return "var(--text-tertiary)";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "vip":
        return "var(--accent-gold-light)";
      case "elite":
        return "var(--accent-purple-light)";
      case "regular":
        return "var(--accent-blue-light)";
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
        <Users className="w-4 h-4 flex-shrink-0" style={{ color: "var(--accent-gold)" }} />
        <div className="flex-1 min-w-0">
          {selectedCustomer ? (
            <span className="font-medium truncate">{selectedCustomer.name}</span>
          ) : (
            <span className="truncate" style={{ color: "var(--text-secondary)" }}>
              {placeholder}
            </span>
          )}
        </div>
        {selectedCustomer && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: getStatusBg(selectedCustomer.status),
              color: getStatusColor(selectedCustomer.status),
            }}
          >
            {selectedCustomer.status}
          </span>
        )}
        {selectedCustomer && !disabled && (
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
                  placeholder="Search by name, email, or phone..."
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
              {loading && customers.length === 0 ? (
                <div className="p-3 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  Loading...
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-3 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
                  No customers found
                </div>
              ) : (
                filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    onClick={() => handleSelect(customer)}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 transition-colors text-sm cursor-pointer hover:bg-[var(--card-hover-bg)] ${
                      customer.id === value ? "bg-[var(--accent-gold-light)]" : ""
                    }`}
                    style={{ borderBottom: "1px solid var(--border-color)" }}
                  >
                    <Users className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--accent-gold)" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {customer.name}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: getStatusBg(customer.status),
                            color: getStatusColor(customer.status),
                          }}
                        >
                          {customer.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-tertiary)" }}>
                        {customer.email && <span>{customer.email}</span>}
                        {customer.phone && <span>{customer.phone}</span>}
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3" style={{ color: "var(--accent-gold)" }} />
                          {customer.loyaltyPointsBalance}
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

export default CustomerSelect;