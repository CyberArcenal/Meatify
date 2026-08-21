// src/renderer/pages/Dashboard/components/SalesChart.tsx
import React from "react";
import type { SalesChartPoint } from "../../../../api/analytics/dashboard";

interface Props {
  data: SalesChartPoint[];
  period: "7d" | "30d" | "90d";
  onPeriodChange: (period: "7d" | "30d" | "90d") => void;
  isLoading?: boolean;
}

const SalesChart: React.FC<Props> = ({
  data,
  period,
  onPeriodChange,
  isLoading,
}) => {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)] h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Sales Trend
        </h3>
        <div className="flex gap-2">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                period === p
                  ? "bg-[var(--accent-gold)] text-[var(--btn-primary-text)]"
                  : "bg-[var(--card-secondary-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-pulse text-[var(--text-tertiary)]">
              Loading chart...
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[var(--text-tertiary)]">
            No sales data available
          </div>
        ) : (
          <div className="h-48 flex items-end gap-1">
            {data.map((point, idx) => (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center group"
              >
                <div className="w-full bg-[var(--accent-gold)]/20 rounded-t relative transition-all duration-300 hover:bg-[var(--accent-gold)]/30">
                  <div
                    className="bg-[var(--accent-gold)] rounded-t transition-all duration-500"
                    style={{
                      height: `${(point.revenue / maxRevenue) * 150}px`,
                    }}
                  />
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs shadow-lg whitespace-nowrap">
                      <div className="text-[var(--text-primary)] font-medium">
                        {point.date}
                      </div>
                      <div className="text-[var(--accent-gold)] font-bold">
                        ₱{point.revenue.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-[var(--text-tertiary)] mt-2 rotate-45 origin-left">
                  {point.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesChart;