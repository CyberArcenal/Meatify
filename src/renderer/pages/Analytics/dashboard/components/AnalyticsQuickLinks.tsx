// src/renderer/pages/Dashboard/components/AnalyticsQuickLinks.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  BarChart3,
  Users,
  DollarSign,
  Package2,
  RefreshCw,
} from 'lucide-react';

interface LinkItem {
  title: string;
  description: string;
  path: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
}

const links: LinkItem[] = [
  {
    title: 'Daily Sales',
    description: 'View sales by day and payment method',
    path: '/sales/daily',
    icon: Calendar,
    color: 'text-[var(--accent-blue)]',
    gradient: 'from-[var(--accent-blue)]/20 to-transparent',
  },
  {
    title: 'Sales Reports',
    description: 'Detailed sales analytics and stats',
    path: '/sales/reports',
    icon: BarChart3,
    color: 'text-[var(--success-color)]',
    gradient: 'from-[var(--success-color)]/20 to-transparent',
  },
  {
    title: 'Customer Insights',
    description: 'Loyalty, spending & segmentation',
    path: '/reports/customer',
    icon: Users,
    color: 'text-[var(--accent-purple)]',
    gradient: 'from-[var(--accent-purple)]/20 to-transparent',
  },
  {
    title: 'Financial Reports',
    description: 'Revenue, profit & loss',
    path: '/reports/financial',
    icon: DollarSign,
    color: 'text-[var(--accent-amber)]',
    gradient: 'from-[var(--accent-amber)]/20 to-transparent',
  },
  {
    title: 'Inventory Reports',
    description: 'Stock levels & movements',
    path: '/reports/inventory',
    icon: Package2,
    color: 'text-[var(--accent-cyan)]',
    gradient: 'from-[var(--accent-cyan)]/20 to-transparent',
  },
  {
    title: 'Returns & Refunds',
    description: 'Return trends and analysis',
    path: '/sales/returns',
    icon: RefreshCw,
    color: 'text-[var(--danger-color)]',
    gradient: 'from-[var(--danger-color)]/20 to-transparent',
  },
];

const AnalyticsQuickLinks: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {links.map((link) => (
        <button
          key={link.path}
          onClick={() => navigate(link.path)}
          className="group relative bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-4 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:border-[var(--accent-gold)] hover:-translate-y-0.5 overflow-hidden"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${link.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-gold-light)] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
              <link.icon className={`w-5 h-5 ${link.color} group-hover:text-[var(--accent-gold-hover)]`} />
            </div>
            <h4 className="text-[var(--text-primary)] font-semibold text-sm mb-0.5">
              {link.title}
            </h4>
            <p className="text-[var(--text-tertiary)] text-xs leading-relaxed">
              {link.description}
            </p>
          </div>
          <div className="absolute bottom-2.5 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs font-medium text-[var(--accent-gold)]">↗</span>
          </div>
        </button>
      ))}
    </div>
  );
};

export default AnalyticsQuickLinks;