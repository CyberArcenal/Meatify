import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import type {
  SalesReportSummaryData,
  SalesReportData,
  SalesReportItem,
  CustomerReportItem,
  DailyTrend,
} from '../../../api/analytics/salesReport';
import salesReportAPI from '../../../api/analytics/salesReport';
import ExportButton from './components/ExportButton';
import FilterBar from './components/FilterBar';
import SummaryCards from './components/SummaryCards';
import StatsCards from './components/StatsCards';
import SalesTable from './components/SalesTable';

// Local type for the sales entries we want to display
type SaleEntry = {
  id: number;
  timestamp: string;
  customer?: { name: string } | null;
  paymentMethod: string;
  totalAmount: number;
  status: string;
  notes?: string | null;
  saleItems?: Array<{
    id: number;
    productId: number;
    product?: { name: string } | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
};

const SalesReportsPage: React.FC = () => {
  // Filters
  const [customerId, setCustomerId] = useState<number | undefined>();
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [minAmount, setMinAmount] = useState<number | undefined>();
  const [maxAmount, setMaxAmount] = useState<number | undefined>();

  // Data states
  const [summary, setSummary] = useState<SalesReportSummaryData | null>(null);
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [productBreakdown, setProductBreakdown] = useState<SalesReportItem[]>([]);
  const [customerBreakdown, setCustomerBreakdown] = useState<CustomerReportItem[]>([]);
  const [dailyTrend, setDailyTrend] = useState<DailyTrend[]>([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Loading states
  const [loading, setLoading] = useState({
    summary: false,
    sales: false,
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch summary
  const fetchSummary = useCallback(async () => {
    setLoading(prev => ({ ...prev, summary: true }));
    try {
      const res = await salesReportAPI.getSummary({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      if (res.status) setSummary(res.data);
      else throw new Error(res.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, summary: false }));
    }
  }, [startDate, endDate]);

  // Fetch sales + breakdowns
  const fetchSales = useCallback(async () => {
    setLoading(prev => ({ ...prev, sales: true }));
    try {
      const res = await salesReportAPI.getData({
        customerId,
        status: status || undefined,
        paymentMethod: paymentMethod || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        minAmount,
        maxAmount,
        search: searchTerm || undefined, // API supports 'search' parameter
        page,
        limit,
        includeProductBreakdown: true,
        includeCustomerBreakdown: true,
      });
      if (res.status) {
        const data = res.data;
        setSales(data.sales as SaleEntry[]);
        setProductBreakdown(data.productBreakdown || []);
        setCustomerBreakdown(data.customerBreakdown || []);
        setDailyTrend(data.dailyTrend || []);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      } else throw new Error(res.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(prev => ({ ...prev, sales: false }));
    }
  }, [
    customerId,
    status,
    paymentMethod,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    searchTerm,
    page,
    limit,
  ]);

  useEffect(() => {
    fetchSummary();
    fetchSales();
  }, [fetchSummary, fetchSales]);

  const handleFilterChange = (filters: any) => {
    setCustomerId(filters.customerId ? Number(filters.customerId) : undefined);
    setStatus(filters.status);
    setPaymentMethod(filters.paymentMethod);
    setStartDate(filters.startDate);
    setEndDate(filters.endDate);
    setSearchTerm(filters.searchTerm);
    setMinAmount(filters.minAmount ? Number(filters.minAmount) : undefined);
    setMaxAmount(filters.maxAmount ? Number(filters.maxAmount) : undefined);
    setPage(1);
  };

  const handleRefresh = () => {
    setError(null);
    fetchSummary();
    fetchSales();
  };

  const anyLoading = Object.values(loading).some(v => v);

  return (
    <div className="p-6 space-y-6 bg-[var(--background-color)] min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Sales Report</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={anyLoading}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--card-secondary-bg)] text-[var(--text-secondary)] rounded-lg hover:bg-[var(--card-hover-bg)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${anyLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <ExportButton
            customerId={customerId}
            status={status}
            paymentMethod={paymentMethod}
            startDate={startDate}
            endDate={endDate}
            minAmount={minAmount}
            maxAmount={maxAmount}
            searchTerm={searchTerm}
          />
        </div>
      </div>

      <FilterBar
        customerId={customerId}
        status={status}
        paymentMethod={paymentMethod}
        startDate={startDate}
        endDate={endDate}
        searchTerm={searchTerm}
        minAmount={minAmount}
        maxAmount={maxAmount}
        onFilterChange={handleFilterChange}
      />

      {error && (
        <div className="bg-[var(--danger-bg)] text-[var(--danger-color)] p-4 rounded-lg border border-[var(--danger-border)]">
          Error: {error}
        </div>
      )}

      <SummaryCards summary={summary} loading={loading.summary} />

      <StatsCards
        topProducts={productBreakdown.slice(0, 5)}
        topCustomers={customerBreakdown.slice(0, 5)}
        hourlyData={dailyTrend.slice(0, 12)}
        loading={loading.sales}
      />

      <SalesTable
        data={sales}
        loading={loading.sales}
        page={page}
        totalPages={totalPages}
        total={total}
        onPageChange={setPage}
      />
    </div>
  );
};

export default SalesReportsPage;