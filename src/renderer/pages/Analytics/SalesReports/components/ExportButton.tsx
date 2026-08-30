// src/renderer/pages/Analytics/SalesReports/components/ExportButton.tsx
import React, { useState } from 'react';
import { Download } from 'lucide-react';
import salesReportAPI from '../../../../api/analytics/salesReport';

interface Props {
  customerId?: number;
  status?: string;
  paymentMethod?: string;
  startDate: string;
  endDate: string;
  minAmount?: number;
  maxAmount?: number;
  searchTerm?: string;
}

const ExportButton: React.FC<Props> = ({
  customerId,
  status,
  paymentMethod,
  startDate,
  endDate,
  minAmount,
  maxAmount,
  searchTerm,
}) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // ✅ BUILD PARAMS CONDITIONALLY - huwag isama ang undefined
      const params: any = {
        limit: 10000,
      };

      if (customerId !== undefined && customerId !== null) {
        params.customerId = customerId;
      }
      if (status) params.status = status;
      if (paymentMethod) params.paymentMethod = paymentMethod;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (minAmount !== undefined && minAmount !== null) params.minAmount = minAmount;
      if (maxAmount !== undefined && maxAmount !== null) params.maxAmount = maxAmount;
      if (searchTerm) params.search = searchTerm;

      const res = await salesReportAPI.getData(params);
      
      if (res.status) {
        const rows = res.data.sales.map((item: any) => ({
          ID: item.id,
          Date: item.timestamp,
          Customer: item.customer?.name || '',
          PaymentMethod: item.paymentMethod,
          TotalAmount: item.totalAmount,
          Status: item.status,
          Notes: item.notes || '',
        }));
        
        const headers = Object.keys(rows[0]).join(',');
        const csv = rows.map((row: any) => Object.values(row).join(',')).join('\n');
        const blob = new Blob([headers + '\n' + csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales_report_${new Date().toISOString().slice(0, 10)}.csv`;
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