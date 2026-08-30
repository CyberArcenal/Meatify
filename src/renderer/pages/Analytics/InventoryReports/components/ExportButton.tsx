// src/renderer/pages/Analytics/InventoryReports/components/ExportButton.tsx
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
      const params: any = { limit: 10000 };
      if (categoryId !== undefined && categoryId !== null) params.categoryId = categoryId;
      if (supplierId !== undefined && supplierId !== null) params.supplierId = supplierId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await inventoryReportsAPI.getData(params);
      if (res.status) {
        const meats = res.data.meats;
        const headers = ['ID', 'Name', 'SKU', 'Price/kg', 'Total Stock', 'Total Value'];
        const rows = meats.map((m: any) => [
          m.id,
          m.name,
          m.sku,
          m.pricePerKg,
          m.inventory.totalStock,
          m.inventory.totalValue,
        ]);
        const csv = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
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
      className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-gold)] text-[var(--btn-primary-text)] rounded-lg hover:bg-[var(--accent-gold-hover)] transition-colors disabled:opacity-50 font-medium shadow-sm"
    >
      <Download className="w-4 h-4" />
      {exporting ? 'Exporting...' : 'Export CSV'}
    </button>
  );
};

export default ExportButton;