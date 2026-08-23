import React, { useState, useEffect } from 'react';
import SummaryCards from './components/SummaryCards';
import TopSpendersTable from './components/TopSpendersTable';
import TopLoyaltyTable from './components/TopLoyaltyTable';
import SegmentationPieChart from './components/SegmentationPieChart';
import CustomerTable from './components/CustomerTable';
import customerInsightsAPI from '../../../api/analytics/customerInsights';
import type {
  CustomerInsightsSummaryData,
  CustomerInsight,
} from '../../../api/analytics/customerInsights';

// Local type aliases based on the API response
type CustomerSummary = {
  totalCustomers: number;
  activeCustomers: number;
  averageLoyaltyPoints: number;
  newCustomersThisMonth: number;
};

type TopCustomerSpending = {
  customerId: number;
  customerName: string;
  purchaseCount: number;
  totalSpent: number;
};

type TopCustomerLoyalty = {
  customerId: number;
  customerName: string;
  points: number;
};

type CustomerSegmentation = {
  highValue: number;
  mediumValue: number;
  lowValue: number;
  inactive: number;
};

const CustomerInsights: React.FC = () => {
  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [topSpenders, setTopSpenders] = useState<TopCustomerSpending[]>([]);
  const [topLoyalty, setTopLoyalty] = useState<TopCustomerLoyalty[]>([]);
  const [segmentation, setSegmentation] = useState<CustomerSegmentation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);

        // Fetch summary data
        const sumRes = await customerInsightsAPI.getSummary();
        if (sumRes.status) {
          const data = sumRes.data; // CustomerInsightsSummaryData
          setSummary({
            totalCustomers: data.totalCustomers,
            activeCustomers: data.activeCount,
            averageLoyaltyPoints: data.pointsSummary.average,
            newCustomersThisMonth: data.totalCustomers - data.inactiveCount, // or any appropriate field
          });

          // Derive segmentation
          setSegmentation({
            highValue: data.byStatus.elite,
            mediumValue: data.byStatus.vip,
            lowValue: data.byStatus.regular,
            inactive: data.inactiveCount,
          });
        }

        // Fetch top spenders (using getData with sort)
        const spendRes = await customerInsightsAPI.getData({
          sortBy: 'totalSpent',
          sortOrder: 'DESC',
          limit: 5,
        });
        if (spendRes.status) {
          const topSpendersList = spendRes.data.customers.slice(0, 5).map((c) => ({
            customerId: c.id,
            customerName: c.name,
            purchaseCount: c.purchaseCount,
            totalSpent: c.totalSpent,
          }));
          setTopSpenders(topSpendersList);
        }

        // Fetch top loyalty (using getData with sort)
        const loyaltyRes = await customerInsightsAPI.getData({
          sortBy: 'loyaltyPointsBalance',
          sortOrder: 'DESC',
          limit: 5,
        });
        if (loyaltyRes.status) {
          const topLoyaltyList = loyaltyRes.data.customers.slice(0, 5).map((c) => ({
            customerId: c.id,
            customerName: c.name,
            points: c.loyaltyPointsBalance,
          }));
          setTopLoyalty(topLoyaltyList);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--border-color)]">
          Loading customer insights...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-[var(--card-bg)] rounded-xl p-5 border border-[var(--danger-color)]/30 text-[var(--danger-color)]">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-[var(--background-color)] min-h-screen">
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Customer Insights</h1>

      {summary && <SummaryCards summary={summary} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TopSpendersTable data={topSpenders} />
          <TopLoyaltyTable data={topLoyalty} />
        </div>
        <div>
          {segmentation && <SegmentationPieChart segmentation={segmentation} />}
        </div>
      </div>

      <CustomerTable />
    </div>
  );
};

export default CustomerInsights;