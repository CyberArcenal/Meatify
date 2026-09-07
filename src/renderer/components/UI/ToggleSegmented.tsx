// src/renderer/components/UI/ToggleSegmented.tsx
import React, { useCallback } from "react";

export interface ToggleSegmentedOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}

interface ToggleSegmentedProps {
  // ✅ Accept readonly tuple (matches `as const` arrays)
  options: readonly [ToggleSegmentedOption, ToggleSegmentedOption];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const ToggleSegmented: React.FC<ToggleSegmentedProps> = ({
  options,
  value,
  onChange,
  disabled = false,
  size = "md",
  className = "",
}) => {
  const [leftOption, rightOption] = options;
  const isLeftActive = value === leftOption.value;

  const handleToggle = useCallback(() => {
    if (disabled) return;
    const newValue = isLeftActive ? rightOption.value : leftOption.value;
    onChange(newValue);
  }, [isLeftActive, leftOption.value, rightOption.value, onChange, disabled]);

  const sizeClasses = {
    sm: {
      container: "h-8",
      thumb: "h-6 w-6",
      thumbTranslate: isLeftActive ? "translate-x-0" : "translate-x-[calc(100%-0.25rem)]",
      text: "text-xs",
      padding: "px-1",
    },
    md: {
      container: "h-10",
      thumb: "h-8 w-8",
      thumbTranslate: isLeftActive ? "translate-x-0" : "translate-x-[calc(100%-0.25rem)]",
      text: "text-sm",
      padding: "px-1.5",
    },
    lg: {
      container: "h-12",
      thumb: "h-10 w-10",
      thumbTranslate: isLeftActive ? "translate-x-0" : "translate-x-[calc(100%-0.25rem)]",
      text: "text-base",
      padding: "px-2",
    },
  };

  const currentSize = sizeClasses[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLeftActive}
      onClick={handleToggle}
      disabled={disabled}
      className={`
        relative flex items-center rounded-full transition-all duration-300
        bg-[var(--card-secondary-bg)] border border-[var(--border-color)]
        ${currentSize.container}
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-[var(--border-dark)]"}
        ${className}
      `}
      style={{ width: "100%", maxWidth: "280px" }}
    >
      {/* Sliding background indicator */}
      <div
        className={`
          absolute top-0.5 h-[calc(100%-4px)] rounded-full transition-all duration-300 ease-in-out
          ${isLeftActive ? "left-0.5" : "right-0.5"}
        `}
        style={{
          width: "calc(50% - 4px)",
          backgroundColor: isLeftActive 
            ? leftOption.color || "var(--success-color)" 
            : rightOption.color || "var(--danger-color)",
          opacity: 0.15,
        }}
      />

      {/* Sliding thumb */}
      <div
        className={`
          absolute top-1/2 -translate-y-1/2 rounded-full shadow-md transition-all duration-300 ease-in-out
          bg-[var(--card-bg)] border border-[var(--border-color)]
          ${currentSize.thumb}
          ${currentSize.thumbTranslate}
        `}
        style={{
          left: "2px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        {/* Icon inside thumb */}
        <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">
          {isLeftActive 
            ? leftOption.icon || null
            : rightOption.icon || null
          }
        </div>
      </div>

      {/* Labels */}
      <div className="flex w-full h-full">
        <div
          className={`
            flex-1 flex items-center justify-center rounded-full transition-colors duration-300
            ${currentSize.padding} ${currentSize.text}
            ${isLeftActive 
              ? "text-[var(--text-primary)] font-semibold" 
              : "text-[var(--text-tertiary)] font-medium"
            }
          `}
        >
          <span className="flex items-center gap-1.5">
            {leftOption.icon && !isLeftActive && <span className="opacity-50">{leftOption.icon}</span>}
            {leftOption.label}
          </span>
        </div>

        <div
          className={`
            flex-1 flex items-center justify-center rounded-full transition-colors duration-300
            ${currentSize.padding} ${currentSize.text}
            ${!isLeftActive 
              ? "text-[var(--text-primary)] font-semibold" 
              : "text-[var(--text-tertiary)] font-medium"
            }
          `}
        >
          <span className="flex items-center gap-1.5">
            {rightOption.icon && isLeftActive && <span className="opacity-50">{rightOption.icon}</span>}
            {rightOption.label}
          </span>
        </div>
      </div>
    </button>
  );
};

export default ToggleSegmented;