import { useEffect, useRef } from 'react';
import { apiService } from '../services/api';

export const useSocket = (isAuthenticated: boolean, onDataReload: () => void) => {
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      if (isInitialized.current) {
        apiService.disconnectSocket();
        isInitialized.current = false;
      }
      return;
    }

    // Initialize socket with reload callback
    apiService.initSocket(onDataReload);
    isInitialized.current = true;

    // Periodic check for case where socket might fail but we want to pull data anyway
    const interval = setInterval(() => onDataReload(), 10000);

    return () => {
      clearInterval(interval);
      apiService.disconnectSocket();
      isInitialized.current = false;
    };
  }, [isAuthenticated, onDataReload]);
};
