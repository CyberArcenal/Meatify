import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "../layouts/Layout";

import { Help } from "../pages/help";
import { useEffect, useState } from "react";
import DashboardPage from "../pages/Analytics/dashboard";


const PageNotFound = () => <div> Page Not Found</div>;

function App() {
  const [licenseAccepted, setLicenseAccepted] = useState(false);

  useEffect(() => {
    if (window.backendAPI?.notifyAppReady) {
      window.backendAPI.notifyAppReady();
      console.log("Notified main process: renderer is ready");
    }
  }, []);

  const handleAccept = () => {
    setLicenseAccepted(true);
  };

  const handleCommercialRequest = () => {
    // Open email or external page
    if ((window as any).backendAPI?.openExternal) {
      (window as any).backendAPI.openExternal(
        "mailto:cyberarcenal1@gmail.com?subject=Commercial%20License%20Inquiry"
      );
    } else {
      window.open(
        "mailto:cyberarcenal1@gmail.com?subject=Commercial%20License%20Inquiry",
        "_blank"
      );
    }
  };

  return (
    <Routes>
      <Route path="/help" element={<Help />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Core POS */}
        <Route path="dashboard" element={<DashboardPage />} />
        {/* <Route path="pos/cashier" element={<Cashier />} /> */}
        {/* <Route path="pos/transactions" element={<Transactions />} /> */}
        {/* <Route path="pos/products" element={<ProductPage />} /> */}

        {/* Customers */}
        {/* <Route path="customers/list" element={<CustomerPage />} /> */}
        {/* <Route path="customers/loyalty" element={<CustomerLoyaltyPage />} /> */}

        {/* Sales */}
        {/* <Route path="sales/daily" element={<DailySalesPage />} /> */}
        {/* <Route path="sales/reports" element={<SalesReportsPage />} /> */}
        {/* <Route path="sales/returns" element={<ReturnRefundReportsPage />} /> */}

        {/* Inventory */}
        {/* <Route path="inventory/stock" element={<StockLevelsPage />} /> */}
        {/* <Route path="inventory/movements" element={<MovementPage />} /> */}
        {/* <Route path="inventory/reorder" element={<ReorderPage />} /> */}
        {/* <Route path="inventory/purchases" element={<PurchasePage />} /> */}
        {/* <Route path="inventory/suppliers" element={<SupplierPage />} /> */}
        {/* <Route path="inventory/categories" element={<CategoryPage />} /> */}

        {/* Reports */}
        {/* <Route path="reports/financial" element={<FinancialReportsPage />} /> */}
        {/* <Route path="reports/inventory" element={<InventoryReportsPage />} /> */}
        {/* <Route path="reports/customer" element={<CustomerInsights />} /> */}

        {/* System */}
        {/* <Route path="system/audit" element={<AuditTrailPage />} /> */}
        {/* <Route path="notification-logs" element={<NotificationLogPage />} /> */}
        {/* <Route path="system/settings" element={<SettingsPage />} /> */}
        {/* <Route path="/devices" element={<DeviceManagerPage />} /> */}

        {/* 404 Page */}
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
