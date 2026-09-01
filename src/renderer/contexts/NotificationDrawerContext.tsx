// src/renderer/contexts/NotificationDrawerContext.tsx
import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { NotificationDrawer } from '../components/Shared/NotificationDrawer';

interface NotificationDrawerContextType {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

const NotificationDrawerContext = createContext<NotificationDrawerContextType | undefined>(undefined);

export const useNotificationDrawer = () => {
  const context = useContext(NotificationDrawerContext);
  if (!context) {
    throw new Error('useNotificationDrawer must be used within a NotificationDrawerProvider');
  }
  return context;
};

interface NotificationDrawerProviderProps {
  children: ReactNode;
}

export const NotificationDrawerProvider: React.FC<NotificationDrawerProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);
  const toggleDrawer = useCallback(() => setIsOpen(prev => !prev), []);

  return (
    <NotificationDrawerContext.Provider value={{ isOpen, openDrawer, closeDrawer, toggleDrawer }}>
      {children}
      {/* Render the drawer at the root level so it overlays everything */}
      <NotificationDrawer isOpen={isOpen} onClose={closeDrawer} />
    </NotificationDrawerContext.Provider>
  );
};