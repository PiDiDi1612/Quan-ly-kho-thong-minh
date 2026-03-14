import { useState, useCallback, useEffect } from 'react';
import { AppTab } from '../features/layout/AppSidebar';

export const useTabNavigation = (initialTab: AppTab = 'dashboard') => {
  const [activeTab, setActiveTabState] = useState<AppTab>(initialTab);

  const setActiveTab = useCallback((tab: AppTab) => {
    setActiveTabState(tab);
    // Optional: Scroll to top when changing tab
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // You could add logic here to sync with URL hash if needed in the future

  return {
    activeTab,
    setActiveTab
  };
};
