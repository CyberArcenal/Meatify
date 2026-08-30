// src/renderer/pages/analytics/returns/components/ExportButton.tsx
import React, { useState } from "react";
import { Download } from "lucide-react";
import returnRefundReportsAPI from "../../../../api/analytics/returnRefundReports";

interface Props {
  customerId?: number;
  status?: string;
  refundMethod?: string;
  startDate: string;
  endDate: string;
  searchTerm?: string;
}

const ExportButton: React.FC<Props> = ({
  customerId,
  status,
  refundMethod,
  startDate,
  endDate,
  searchTerm,
}) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params: any = {
        limit: 10000,
      };

      if (customerId !== undefined && customerId !== null) params.customerId = customerId;
      if (status) params.status = status;
      if (refundMethod) params.refundMethod = refundMethod;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await returnRefundReportsAPI.getData(params);
      if (res.status) {
        const rows = res.data.returns.map((item: any) => ({
          ID: item.id,
          Reference: item.referenceNo || item.id,
          Date: item.createdAt,
          Customer: item.customer?.name || item.customerName || "",
          Method: item.refundMethod,
          Status: item.status,
          TotalAmount: item.totalAmount,
          Reason: item.reason || "",
          ItemsCount: item.items?.length || 0,
        }));
        const headers = Object.keys(rows[0]).join(",");
        const csv = rows.map((row: any) => Object.values(row).join(",")).join("\n");
        const blob = new Blob([headers + "\n" + csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `returns_refunds_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert("No data to export");
      }
    } catch (err: any) {
      alert("Export failed: " + err.message);
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
      {exporting ? "Exporting..." : "Export CSV"}
    </button>
  );
};

export default ExportButton;