// src/renderer/layouts/Layout.tsx
import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './SideBar'; // ← Now points to the modular Sidebar
import { NotificationToastListener } from '../components/Shared/NotificationToastListener';
import { PaginationProvider, usePagination } from '../contexts/PaginationContext';
import Pagination from '../components/UI/Pagination';
import TopBar from './TopBar';

const LayoutContent: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { pagination } = usePagination();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  if (!mounted) return null;

  return (
    <div className="flex h-screen flex-col bg-[var(--background-color)]">
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar with onClose handler */}
        <div className="my-1">
          <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        </div>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-20 md:hidden"
            onClick={closeSidebar}
          />
        )}

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden m-1">
          <div className="flex-1 flex flex-col bg-[var(--card-bg)] rounded-2xl shadow-lg overflow-hidden border border-[var(--border-color)]">
            <TopBar toggleSidebar={toggleSidebar} />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
              <Outlet />
            </main>

            {/* Global Pagination Bar */}
            <div
              className={`
                px-4 py-2 border-t border-[var(--border-color)] bg-[var(--card-bg)]
                overflow-hidden transition-all duration-300 ease-in-out
                ${pagination.visible ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}
              `}
            >
              <Pagination
                variant="compact"
                currentPage={pagination.currentPage}
                totalItems={pagination.totalItems}
                pageSize={pagination.pageSize}
                onPageChange={pagination.onPageChange}
                onPageSizeChange={pagination.onPageSizeChange}
                pageSizeOptions={pagination.pageSizeOptions}
                showPageSize={pagination.showPageSize}
              />
            </div>
          </div>
        </div>
      </div>
      <NotificationToastListener />
    </div>
  );
};

const Layout: React.FC = () => {
  return (
    <PaginationProvider>
      <LayoutContent />
    </PaginationProvider>
  );
};

export default Layout;