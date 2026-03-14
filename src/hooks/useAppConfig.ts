import { useState, useEffect } from 'react';
import { apiService } from '../services/api';

export const useAppConfig = (isAuthenticated: boolean) => {
  // --- CONNECTION CONFIG ---
  const [connectionConfig] = useState<{ mode: 'SERVER' | 'CLIENT' | null, serverIp: string }>(() => {
    const saved = localStorage.getItem('connection_config');
    if (saved) return JSON.parse(saved);
    return { mode: null, serverIp: '' };
  });

  const [serverIp, setServerIp] = useState<string>('');
  
  // --- UI STATE ---
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
    }
    return 'light';
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  // Handle Theme application
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle Server IP fetching
  useEffect(() => {
    const fetchIp = async () => {
      try {
        const data = await apiService.get<{ ip: string }>('/api/system-info');
        if (data && data.ip) setServerIp(data.ip);
      } catch (error) { }
    };
    fetchIp();
  }, [connectionConfig.mode, isAuthenticated]);

  // Handle Clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSaveConnection = (mode: 'SERVER' | 'CLIENT', ip?: string) => {
    apiService.setConfig(mode, ip || '');
    window.location.reload();
  };

  return {
    connectionConfig,
    serverIp,
    theme,
    setTheme,
    currentTime,
    handleSaveConnection
  };
};
