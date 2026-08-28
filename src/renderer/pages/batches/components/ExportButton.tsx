import React, { useState } from 'react';
import { Download } from 'lucide-react';
import batchAPI from '../../../api/core/batch';

interface Props {
  filters: any;
}

const ExportButton: React.FC<Props> = ({ filters }) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await batchAPI.export({ format: 'csv', filters });
      if (res.status) {
        const data = res.data.data;
        // If data is a string (CSV), download directly; if it's array, convert to CSV
        if (typeof data === 'string') {
          const blob = new Blob([data], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = res.data.filename || `batches_${new Date().toISOString().slice(0, 10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        } else {
          // Array of Batch objects - convert to CSV
          const batches = data as any[];
          if (batches.length === 0) {
            alert('No data to export');
            return;
          }
          const headers = Object.keys(batches[0]).join(',');
          const rows = batches.map(b => Object.values(b).join(','));
          const csv = [headers, ...rows].join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = res.data.filename || `batches_${new Date().toISOString().slice(0, 10)}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }
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