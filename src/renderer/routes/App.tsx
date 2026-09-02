// src/App.tsx
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "../layouts/Layout";
import { Help } from "../pages/help";
import { useEffect, useState } from "react";
import DashboardPage from "../pages/Analytics/dashboard";
import AuditTrailPage from "../pages/AuditTrail";
import CategoryPage from "../pages/category";
import CustomerPage from "../pages/Customer";
import CustomerLoyaltyPage from "../pages/CustomerLoyalty";
import MovementPage from "../pages/Movement";
import NotificationLogPage from "../pages/NotificationLog";
import MeatPage from "../pages/Meat";
import PurchasePage from "../pages/purchase";
import ReorderPage from "../pages/reorder";
import SupplierPage from "../pages/supplier";
import StockLevelsPage from "../pages/stock";
import ReturnRefundReportsPage from "../pages/Analytics/ReturnRefundReports";
import Transactions from "../pages/Transactions";
import SalesReportsPage from "../pages/Analytics/SalesReports";
import DailySalesPage from "../pages/Analytics/DailySales";
import FinancialReportsPage from "../pages/Analytics/FinancialReports";
import InventoryReportsPage from "../pages/Analytics/InventoryReports";
import CustomerInsights from "../pages/Analytics/Customer";
import Cashier from "../pages/CashierSale";
import BatchesPage from "../pages/batches";
import MeatifySettingsPage from "../pages/system/settings";
import LicenseModal from "../components/UI/LicenseModal";

const PageNotFound = () => <div> Page Not Found</div>;

function App() {
  const [licenseAccepted, setLicenseAccepted] = useState<boolean | null>(null);

  useEffect(() => {
    if (window.backendAPI?.notifyAppReady) {
      window.backendAPI.notifyAppReady();
      console.log("Notified main process: renderer is ready");
    }

    // Check if license was already accepted
    const accepted = localStorage.getItem('meatify_license_accepted');
    if (accepted === 'true') {
      setLicenseAccepted(true);
    } else {
      setLicenseAccepted(false);
    }
  }, []);

  const handleAcceptLicense = () => {
    localStorage.setItem('meatify_license_accepted', 'true');
    setLicenseAccepted(true);
  };

  const handleCommercialRequest = () => {
    if ((window as any).backendAPI?.openExternal) {
      (window as any).backendAPI.openExternal(
        "mailto:cyberarcenal1@gmail.com?subject=Meatify%20Commercial%20License%20Inquiry"
      );
    } else {
      window.open(
        "mailto:cyberarcenal1@gmail.com?subject=Meatify%20Commercial%20License%20Inquiry",
        "_blank"
      );
    }
  };

  // Show license modal while loading or if not accepted
  if (licenseAccepted === null) {
    return (
      <div className="min-h-screen bg-[var(--background-color)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-gold)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* License Modal - always on top when not accepted */}
      {!licenseAccepted && (
        <LicenseModal
          isOpen={true}
          onAccept={handleAcceptLicense}
          onCommercialRequest={handleCommercialRequest}
        />
      )}

      {/* Main App - only renders when license is accepted */}
      {licenseAccepted && (
        <Routes>
          <Route path="/help" element={<Help />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/pos/cashier" replace />} />

            {/* Core POS */}
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="pos/cashier" element={<Cashier />} />
            <Route path="pos/transactions" element={<Transactions />} />
            <Route path="inventory/products" element={<MeatPage />} />
            <Route path="inventory/batches" element={<BatchesPage />} />

            {/* Customers */}
            <Route path="customers/list" element={<CustomerPage />} />
            <Route path="customers/loyalty" element={<CustomerLoyaltyPage />} />

            {/* Sales */}
            <Route path="sales/daily" element={<DailySalesPage />} />
            <Route path="sales/reports" element={<SalesReportsPage />} />
            <Route path="sales/returns" element={<ReturnRefundReportsPage />} />

            {/* Inventory */}
            <Route path="inventory/stock" element={<StockLevelsPage />} />
            <Route path="inventory/movements" element={<MovementPage />} />
            <Route path="inventory/reorder" element={<ReorderPage />} />
            <Route path="inventory/purchases" element={<PurchasePage />} />
            <Route path="inventory/suppliers" element={<SupplierPage />} />
            <Route path="inventory/categories" element={<CategoryPage />} />

            {/* Reports */}
            <Route path="reports/financial" element={<FinancialReportsPage />} />
            <Route path="reports/inventory" element={<InventoryReportsPage />} />
            <Route path="reports/customer" element={<CustomerInsights />} />

            {/* System */}
            <Route path="system/audit" element={<AuditTrailPage />} />
            <Route path="notification-logs" element={<NotificationLogPage />} />
            <Route path="system/settings" element={<MeatifySettingsPage />} />

            {/* 404 Page */}
            <Route path="*" element={<PageNotFound />} />
          </Route>
        </Routes>
      )}
    </>
  );
}

export default App;