import React, { useEffect, useState, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { dialogs } from "../../utils/dialogs";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  minHeight?: string;
  showCloseButton?: boolean;
  closeOnClickOutside?: boolean;
  closeOnEsc?: boolean;
  preventScroll?: boolean;
  blur?: boolean;
  safetyClose?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  minHeight = "min-h-[200px]",
  showCloseButton = true,
  closeOnClickOutside = true,
  closeOnEsc = true,
  preventScroll = true,
  blur = false,
  safetyClose = false,
}) => {
  const [animationState, setAnimationState] = useState<"closed" | "opening" | "open" | "closing">("closed");
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const animationTimeout = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (animationTimeout.current) clearTimeout(animationTimeout.current);
    };
  }, []);

  // Handle opening/closing based on isOpen prop
  useEffect(() => {
    if (isOpen && animationState === "closed") {
      // Start opening
      setAnimationState("opening");
      // Store previously focused element
      previousActiveElement.current = document.activeElement as HTMLElement;
      // Prevent body scroll if needed
      if (preventScroll) document.body.style.overflow = "hidden";
      // After a short delay, set to open (for CSS transition)
      animationTimeout.current = setTimeout(() => {
        setAnimationState("open");
        // Focus trap setup will happen in next effect
      }, 20);
    } else if (!isOpen && (animationState === "open" || animationState === "opening")) {
      // Start closing
      setAnimationState("closing");
      if (animationTimeout.current) clearTimeout(animationTimeout.current);
      // Wait for CSS transition then close
      animationTimeout.current = setTimeout(() => {
        setAnimationState("closed");
        // Restore body scroll
        if (preventScroll) document.body.style.overflow = "";
        // Restore focus
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
          previousActiveElement.current = null;
        }
        // Call onClose to let parent know it's fully closed (optional)
        // but parent already knows isOpen=false, so we avoid double call
      }, 200);
    }
  }, [isOpen, animationState, preventScroll]);

  // Focus trap when modal is open
  useEffect(() => {
    if (animationState !== "open") return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;
    const firstElement = focusableElements?.[0];
    const lastElement = focusableElements?.[focusableElements.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (!focusableElements?.length) {
        e.preventDefault();
        return;
      }
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Set initial focus to modal container or first focusable element
    if (modalRef.current && !modalRef.current.contains(document.activeElement)) {
      if (firstElement) {
        firstElement.focus();
      } else {
        modalRef.current.focus();
      }
    }

    document.addEventListener("keydown", handleTab);
    return () => document.removeEventListener("keydown", handleTab);
  }, [animationState]);

  // ESC key handler
  useEffect(() => {
    if (!closeOnEsc || animationState !== "open") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [animationState, closeOnEsc]);

  const handleClose = useCallback(async () => {
    if (safetyClose) {
      const confirmed = await dialogs.confirm({
        title: "Close",
        message: "Are you sure you want to close this dialog?",
      });
      if (!confirmed) return;
    }
    onClose();
  }, [safetyClose, onClose]);

  const handleBackdropClick = () => {
    if (closeOnClickOutside) handleClose();
  };

  if (animationState === "closed") return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-full mx-4",
  };

  const backdropClasses = `fixed inset-0 transition-all duration-200 ${
    blur ? "backdrop-blur-sm" : "bg-black/50"
  } ${
    animationState === "opening" ? "opacity-0" : animationState === "closing" ? "opacity-0" : "opacity-100"
  }`;

  const modalClasses = `relative w-full ${sizeClasses[size]} ${minHeight} transform rounded-xl bg-[var(--card-bg)] shadow-2xl transition-all duration-200 ${
    animationState === "opening"
      ? "scale-95 opacity-0"
      : animationState === "closing"
      ? "scale-95 opacity-0"
      : "scale-100 opacity-100"
  }`;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby={title ? "modal-title" : undefined}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div className={backdropClasses} onClick={handleBackdropClick} />

      {/* Modal container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={modalRef}
          tabIndex={-1}
          className={modalClasses}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-6 py-4">
              {title && (
                <h3
                  id="modal-title"
                  className="text-lg font-semibold text-[var(--sidebar-text)]"
                >
                  {title}
                </h3>
              )}
              {showCloseButton && (
                <button
                  onClick={handleClose}
                  className="rounded-md p-1.5 hover:bg-[var(--card-secondary-bg)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent-blue)]"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5 text-[var(--text-secondary)]" />
                </button>
              )}
            </div>
          )}

          {/* Body */}
          <div className="px-6 py-4 text-[var(--sidebar-text)]">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex justify-end gap-3 px-6 py-4 rounded-b-xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;