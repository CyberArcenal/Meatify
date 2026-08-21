// src/renderer/components/Shared/LoadingSpinner.tsx
import React from "react";
import { Sprout } from "lucide-react";

interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  text?: string;
  overlay?: boolean;
  showIcon?: boolean; // optional leaf icon inside spinner
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "medium",
  text = "Loading...",
  overlay = false,
  showIcon = false,
}) => {
  const sizeClasses = {
    small: {
      container: "w-8 h-8",
      border: "border-2",
      icon: "w-3 h-3",
      text: "text-xs",
    },
    medium: {
      container: "w-12 h-12",
      border: "border-3",
      icon: "w-4 h-4",
      text: "text-sm",
    },
    large: {
      container: "w-16 h-16",
      border: "border-4",
      icon: "w-6 h-6",
      text: "text-base",
    },
  };

  const current = sizeClasses[size];

  const spinnerContent = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative">
        {/* Outer spinning ring */}
        <div
          className={`
            ${current.container} ${current.border}
            rounded-full border-t-transparent
            border-[var(--primary-color)]
            animate-[spin_0.8s_linear_infinite]
          `}
          style={{
            boxShadow: "0 0 6px var(--primary-color-light)",
          }}
        />
        {/* Inner pulse ring */}
        <div
          className={`
            absolute inset-0 rounded-full
            border-2 border-[var(--primary-color)]/30
            animate-[pulse-ring_1.5s_ease-in-out_infinite]
          `}
        />
        {/* Optional leaf icon in center */}
        {showIcon && (
          <div
            className={`
              absolute inset-0 flex items-center justify-center
              text-[var(--primary-color)]
            `}
          >
            <Sprout className={`${current.icon} animate-[gentle-bounce_2s_ease-in-out_infinite]`} />
          </div>
        )}
      </div>
      {text && (
        <p
          className={`${current.text} font-medium text-[var(--text-secondary)] tracking-wide animate-pulse`}
          style={{ animation: "pulse-text 1.5s ease-in-out infinite" }}
        >
          {text}
        </p>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse-ring {
          0%, 100% {
            opacity: 0.4;
            transform: scale(1);
          }
          50% {
            opacity: 0.1;
            transform: scale(1.2);
          }
        }
        @keyframes gentle-bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-2px);
          }
        }
        @keyframes pulse-text {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );

  if (overlay) {
    return (
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
      >
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};

export default LoadingSpinner;