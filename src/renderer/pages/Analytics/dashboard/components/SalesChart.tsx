// src/renderer/pages/Dashboard/components/SalesChart.tsx
import React from "react";
import { TrendingUp } from "lucide-react";
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
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
    }).format(val);

  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 shadow-sm hover:border-[var(--accent-gold)] transition-colors h-full flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[var(--accent-gold)]" />
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            Sales Trend
          </h3>
        </div>
        <div className="flex gap-1.5">
          {(["7d", "30d", "90d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => onPeriodChange(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                period === p
                  ? "bg-[var(--accent-gold)] text-[var(--btn-primary-text)] shadow-sm"
                  : "bg-[var(--card-secondary-bg)] text-[var(--text-secondary)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--text-primary)]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="animate-pulse text-[var(--text-tertiary)]">
              Loading chart...
            </div>
          </div>
        ) : data.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-[var(--text-tertiary)]">
            No sales data available
          </div>
        ) : (
          <div className="h-48 flex items-end gap-1">
            {data.map((point, idx) => {
              const height = Math.max((point.revenue / maxRevenue) * 150, 4);
              const isToday = idx === data.length - 1;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative">
                  <div className="w-full relative">
                    <div
                      className={`rounded-t transition-all duration-500 ${
                        isToday ? "bg-[var(--accent-gold)]" : "bg-[var(--accent-gold)]/40"
                      }`}
                      style={{ height: `${height}px` }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs shadow-xl whitespace-nowrap">
                        <div className="text-[var(--text-primary)] font-medium">
                          {point.date}
                        </div>
                        <div className="text-[var(--accent-gold)] font-bold">
                          {formatCurrency(point.revenue)}
                        </div>
                        <div className="text-[var(--text-tertiary)] text-[10px]">
                          {point.count} sale{point.count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                  <span className={`text-[10px] mt-1.5 ${
                    isToday ? 'text-[var(--accent-gold)] font-medium' : 'text-[var(--text-tertiary)]'
                  }`}>
                    {point.date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesChart;