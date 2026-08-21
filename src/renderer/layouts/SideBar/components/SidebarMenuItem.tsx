// src/renderer/layouts/Sidebar/components/SidebarMenuItem.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { MenuItem } from '../types';

interface SidebarMenuItemProps {
  item: MenuItem;
  depth?: number;
  isActivePath: (path: string) => boolean;
  isDropdownActive: (items: MenuItem[]) => boolean;
  open?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}

const SidebarMenuItem: React.FC<SidebarMenuItemProps> = ({
  item,
  depth = 0,
  isActivePath,
  isDropdownActive,
  open = false,
  onToggle,
  onNavigate,
}) => {
  const hasChildren = !!item.children?.length;
  const Icon = item.icon;

  // Parent item (has children)
  if (hasChildren) {
    const isActive = isDropdownActive(item.children as MenuItem[]);
    return (
      <li className="mb-1">
        <div
          onClick={onToggle}
          className={`group flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-200 cursor-pointer
            ${
              isActive
                ? 'bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-gold-hover)] text-[var(--btn-primary-text)] shadow-lg'
                : 'text-[var(--sidebar-text)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--accent-gold)]'
            }`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggle?.();
            }
          }}
        >
          <div className="flex items-center gap-3">
            <Icon
              className={`w-5 h-5 ${
                isActive
                  ? 'text-[var(--btn-primary-text)]'
                  : 'text-[var(--sidebar-text)] group-hover:text-[var(--accent-gold)]'
              }`}
            />
            <span className="font-medium">{item.name}</span>
          </div>
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            } ${
              isActive
                ? 'text-[var(--btn-primary-text)]'
                : 'text-[var(--sidebar-text)] group-hover:text-[var(--accent-gold)]'
            }`}
          />
        </div>
        {open && (
          <ul
            className="ml-4 mt-1 space-y-1 border-l-2 pl-3"
            style={{ borderColor: 'var(--accent-gold)' }}
          >
            {item.children?.map((child) => (
              <SidebarMenuItem
                key={child.path}
                item={child}
                depth={depth + 1}
                isActivePath={isActivePath}
                isDropdownActive={isDropdownActive}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        )}
      </li>
    );
  }

  // Leaf item (no children)
  const isActive = isActivePath(item.path);
  const isTopLevel = depth === 0;

  const linkClasses = isTopLevel
    ? `group flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-gold-hover)] text-[var(--btn-primary-text)] shadow-lg'
          : 'text-[var(--sidebar-text)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--accent-gold)]'
      }`
    : `group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm ${
        isActive
          ? 'text-white bg-[var(--accent-gold)]/20 font-semibold border-l-2 border-[var(--accent-gold)] pl-2'
          : 'text-[var(--sidebar-text)] hover:bg-[var(--card-hover-bg)] hover:text-[var(--accent-gold)]'
      }`;

  const iconClasses = isTopLevel
    ? `w-5 h-5 ${
        isActive
          ? 'text-[var(--btn-primary-text)]'
          : 'text-[var(--sidebar-text)] group-hover:text-[var(--accent-gold)]'
      }`
    : `w-4 h-4 ${
        isActive
          ? 'text-[var(--accent-gold)]'
          : 'text-[var(--sidebar-text)] group-hover:text-[var(--accent-gold)]'
      }`;

  return (
    <li className="mb-1">
      <Link to={item.path} onClick={onNavigate} className={linkClasses}>
        <div className="flex items-center gap-3">
          <Icon className={iconClasses} />
          <span className={isTopLevel ? 'font-medium' : ''}>{item.name}</span>
        </div>
        {isTopLevel && (
          <ChevronRight
            className={`w-4 h-4 transition-opacity duration-200 ${
              isActive
                ? 'opacity-100 text-[var(--btn-primary-text)]'
                : 'opacity-0 group-hover:opacity-50 text-[var(--sidebar-text)]'
            }`}
          />
        )}
      </Link>
    </li>
  );
};

export default SidebarMenuItem;