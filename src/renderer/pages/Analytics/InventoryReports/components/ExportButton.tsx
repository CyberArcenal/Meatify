import React, { useState } from 'react';
import { Download } from 'lucide-react';
import inventoryReportsAPI from '../../../../api/analytics/inventoryReports';

interface Props {
  categoryId?: number;
  supplierId?: number;
  startDate: string;
  endDate: string;
}

const ExportButton: React.FC<Props> = ({ categoryId, supplierId, startDate, endDate }) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch data and generate CSV from meats list
      const res = await inventoryReportsAPI.getData({
        categoryId,
        supplierId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 10000,
      });
      if (res.status) {
        const meats = res.data.meats;
        const headers = ['ID', 'Name', 'SKU', 'Price/kg', 'Total Stock', 'Total Value'];
        const rows = meats.map(m => [
          m.id,
          m.name,
          m.sku,
          m.pricePerKg,
          m.inventory.totalStock,
          m.inventory.totalValue,
        ]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inventory_report_${new Date().toISOString().slice(0, 10)}.csv`;
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
      className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-blue)] text-white rounded-lg hover:bg-[var(--accent-blue-hover)] transition-colors disabled:opacity-50"
    >
      <Download className="w-4 h-4" />
      {exporting ? 'Exporting...' : 'Export CSV'}
    </button>
  );
};

export default ExportButton;