// components/UI/Button.tsx
import type { LucideIcon } from "lucide-react";
import React from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "purple"
  | "emerald"
  | "outline"
  | "ghost";

export type ButtonSize = "xs" | "sm" | "md" | "lg";

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  href?: string;
  target?: string;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  iconOnly?: boolean;
  className?: string;
  title?: string;
  loading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "sm",
  children,
  onClick,
  disabled = false,
  type = "button",
  href,
  target,
  icon: Icon,
  iconPosition = "left",
  iconOnly = false,
  className = "",
  title,
  loading = false,
}) => {
  // ─── Size Classes ────────────────────────────────────────────────
  const sizeClasses = {
    xs: "px-2.5 py-1.5 text-xs gap-1",
    sm: "px-3 py-2 text-sm gap-1.5",
    md: "px-4 py-2.5 text-sm gap-2",
    lg: "px-5 py-3 text-base gap-2.5",
  };

  // ─── Variant Classes ─────────────────────────────────────────────
  const variantClasses = {
    primary:
      "bg-[var(--accent-gold)] text-[var(--btn-primary-text)] hover:bg-[var(--accent-gold-hover)] focus:ring-[var(--accent-gold)]/50",
    secondary:
      "bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--card-hover-bg)] hover:border-[var(--border-dark)]",
    success:
      "bg-[var(--accent-green)] text-white hover:bg-[var(--accent-green-hover)] focus:ring-[var(--accent-green)]/50",
    warning:
      "bg-[var(--accent-amber)] text-[var(--btn-primary-text)] hover:bg-[var(--accent-amber-hover)] focus:ring-[var(--accent-amber)]/50",
    danger:
      "bg-[var(--accent-red)] text-white hover:bg-[var(--accent-red-hover)] focus:ring-[var(--accent-red)]/50",
    purple:
      "bg-[var(--accent-purple)] text-white hover:bg-[var(--accent-purple-hover)] focus:ring-[var(--accent-purple)]/50",
    emerald:
      "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500/50",
    outline:
      "bg-transparent text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--card-hover-bg)] hover:border-[var(--border-dark)]",
    ghost:
      "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)]",
  };

  // ─── Icon Size ────────────────────────────────────────────────────
  const iconSizeMap = {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
  };

  const getIconSize = (btnSize: ButtonSize): number => iconSizeMap[btnSize];

  const baseClasses = `
    inline-flex items-center justify-center
    font-medium rounded-lg
    transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--background-color)]
    disabled:opacity-50 disabled:cursor-not-allowed
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${iconOnly ? "!px-2.5" : ""}
    ${loading ? "opacity-70 cursor-wait" : ""}
    ${className}
  `;

  const content = (
    <>
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
      ) : (
        Icon &&
        iconPosition === "left" && (
          <Icon
            className="flex-shrink-0"
            size={getIconSize(size)}
          />
        )
      )}

      {!iconOnly && children}

      {Icon &&
        iconPosition === "right" &&
        !loading && (
          <Icon
            className="flex-shrink-0"
            size={getIconSize(size)}
          />
        )}
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        target={target}
        className={baseClasses}
        title={title}
        onClick={onClick as any}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={baseClasses}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
    >
      {content}
    </button>
  );
};

export default Button;