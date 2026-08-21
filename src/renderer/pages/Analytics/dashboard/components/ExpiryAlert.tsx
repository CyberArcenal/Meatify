// src/renderer/pages/Dashboard/components/ExpiryAlert.tsx
import React from 'react';
import { AlertTriangle, Clock } from 'lucide-react';
import type { ExpiringBatch } from '../../../../api/analytics/dashboard';

interface Props {
  batches: ExpiringBatch[];
  isLoading: boolean;
}

const ExpiryAlert: React.FC<Props> = ({ batches, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--border-color)] animate-pulse">
        <div className="h-6 w-48 bg-[var(--card-secondary-bg)] rounded" />
        <div className="mt-2 h-4 w-64 bg-[var(--card-secondary-bg)] rounded" />
      </div>
    );
  }

  if (batches.length === 0) {
    return null;
  }

  const urgent = batches.filter(b => b.daysUntilExpiry <= 3);
  const warning = batches.filter(b => b.daysUntilExpiry > 3 && b.daysUntilExpiry <= 7);

  return (
    <div className={`rounded-xl p-4 border ${
      urgent.length > 0 
        ? 'bg-[var(--accent-red-light)] border-[var(--accent-red)]/30' 
        : 'bg-[var(--accent-amber-light)] border-[var(--accent-amber)]/30'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${
          urgent.length > 0 
            ? 'bg-[var(--accent-red)]/20 text-[var(--accent-red)]' 
            : 'bg-[var(--accent-amber)]/20 text-[var(--accent-amber)]'
        }`}>
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-[var(--text-primary)]">
            {urgent.length > 0 ? '⚠️ Urgent: Expiring Soon!' : '📋 Expiring This Week'}
          </h4>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {batches.length} batch{batches.length > 1 ? 'es' : ''} expiring within 7 days
            {urgent.length > 0 && ` (${urgent.length} urgent)`}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {batches.slice(0, 5).map((batch) => (
              <span
                key={batch.id}
                className={`px-2 py-1 text-xs rounded-full ${
                  batch.daysUntilExpiry <= 3
                    ? 'bg-[var(--accent-red)]/20 text-[var(--accent-red)]'
                    : 'bg-[var(--accent-amber)]/20 text-[var(--accent-amber)]'
                }`}
              >
                {batch.batchCode}: {batch.daysUntilExpiry}d
              </span>
            ))}
            {batches.length > 5 && (
              <span className="px-2 py-1 text-xs rounded-full bg-[var(--card-secondary-bg)] text-[var(--text-tertiary)]">
                +{batches.length - 5} more
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-[var(--text-tertiary)]">
          <Clock className="w-3 h-3" />
          {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default ExpiryAlert;