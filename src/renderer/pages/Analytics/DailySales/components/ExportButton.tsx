// src/renderer/pages/Analytics/DailySales/components/ExportButton.tsx
import React, { useState } from 'react';
import { Download } from 'lucide-react';
import dailySalesAPI from '../../../../api/analytics/dailySales';
import type { DailySale } from '../../../../api/analytics/dailySales';

interface Props {
  startDate: string;
  endDate: string;
  paymentMethod: string;
  status: string;
}

const ExportButton: React.FC<Props> = ({
  startDate,
  endDate,
  paymentMethod,
  status,
}) => {
  const [exporting, setExporting] = useState(false);

  const aggregateByDate = (sales: DailySale[]) => {
    const map = new Map<string, { count: number; total: number; paidCount: number }>();
    sales.forEach(sale => {
      const date = sale.timestamp.split('T')[0];
      const current = map.get(date) || { count: 0, total: 0, paidCount: 0 };
      current.count += 1;
      current.total += sale.totalAmount;
      if (sale.status === 'paid') current.paidCount += 1;
      map.set(date, current);
    });
    return Array.from(map.entries()).map(([date, agg]) => ({
      date,
      count: agg.count,
      total: agg.total,
      average: agg.count > 0 ? agg.total / agg.count : 0,
      paidCount: agg.paidCount,
    })).sort((a, b) => a.date.localeCompare(b.date));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: any = { limit: 10000 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (paymentMethod) params.paymentMethod = paymentMethod;
      if (status) params.status = status;

      const res = await dailySalesAPI.getData(params);
      if (res.status) {
        const daily = aggregateByDate(res.data.sales);
        const headers = ['Date', 'Transactions', 'Total Amount', 'Average', 'Paid Transactions'];
        const csvRows = daily.map(d => [
          d.date,
          d.count,
          d.total,
          d.average.toFixed(2),
          d.paidCount,
        ].join(','));
        const csv = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `daily_sales_${startDate || 'all'}_${endDate || 'all'}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert('No data to export');
      }
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors disabled:opacity-50 font-medium shadow-sm"
    >
      <Download className="w-4 h-4" />
      {exporting ? 'Exporting...' : 'Export CSV'}
    </button>
  );
};

export default ExportButton;