// src/renderer/pages/Analytics/FinancialReports/components/ExportButton.tsx
import React, { useState } from 'react';
import { Download } from 'lucide-react';
import financialReportsAPI from '../../../../api/analytics/financialReports';

interface Props {
  startDate: string;
  endDate: string;
}

const ExportButton: React.FC<Props> = ({ startDate, endDate }) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await financialReportsAPI.getData(params);
      if (res.status) {
        const jsonStr = JSON.stringify(res.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial_report_${new Date().toISOString().slice(0, 10)}.json`;
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
      {exporting ? 'Exporting...' : 'Export JSON'}
    </button>
  );
};

export default ExportButton;