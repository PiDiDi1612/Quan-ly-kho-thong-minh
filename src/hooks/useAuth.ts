import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole, Permission } from '@/types';
import { authService } from '@/domain';
import { useToast } from './useToast';
import {
  clearRememberedUsername,
  getRememberedUsername,
  setAuthSession,
  setRememberedUsername
} from '../utils/authStorage';

export const useAuth = () => {
  const toast = useToast();
  
  // --- AUTH STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('GUEST');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string>('');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  // Load remembered username on mount
  useEffect(() => {
    const storedUsername = getRememberedUsername();
    if (storedUsername) {
      setRememberMe(true);
      setLoginForm(prev => ({ ...prev, username: storedUsername }));
    }
  }, []);

  // Initialize Auth from storage/service
  useEffect(() => {
    const { user, token, isAuthenticated: isAuth } = authService.initAuth();
    if (isAuth && user && token) {
      setCurrentUser(user);
      setUserRole(user.role);
      setIsAuthenticated(true);
      setAuthToken(token);
    }
  }, []);

  // Token Expiry Check
  useEffect(() => {
    if (!isAuthenticated || !authToken) return;
    const checkTokenExpiry = () => {
      if (authService.isTokenExpired(authToken)) {
        authService.logout();
        setIsAuthenticated(false);
        setAuthToken('');
        setCurrentUser(null);
        toast.warning('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
    };
    checkTokenExpiry();
    const interval = setInterval(checkTokenExpiry, 60000);

    // Listen for 401 unauthorized event from apiService
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setAuthToken('');
      setCurrentUser(null);
      toast.error('Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.');
    };

    window.addEventListener('api-unauthorized', handleUnauthorized);

    return () => {
      clearInterval(interval);
      window.removeEventListener('api-unauthorized', handleUnauthorized);
    };
  }, [isAuthenticated, authToken, toast]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await authService.login(
        loginForm.username.trim().toLowerCase(), 
        loginForm.password.trim(), 
        rememberMe
      );
      
      if (!response.success) {
        setLoginError('Thông tin đăng nhập không chính xác');
        setTimeout(() => setLoginError(null), 3000);
        return;
      }
      
      setAuthToken(response.token);
      if (rememberMe) setRememberedUsername(loginForm.username.trim().toLowerCase());
      else clearRememberedUsername();
      
      setCurrentUser(response.user);
      setUserRole(response.user.role);
      setIsAuthenticated(true);
      setLoginError(null);
    } catch (error) {
      setLoginError('Không thể kết nối máy chủ.');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setAuthToken('');
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const hasPermission = useCallback((permission: Permission): boolean => {
    return authService.hasPermission(currentUser, permission);
  }, [currentUser]);

  return {
    isAuthenticated,
    userRole,
    currentUser,
    setCurrentUser, // Needed for account update
    authToken,
    setAuthToken, // Needed for account update session sync
    loginForm,
    setLoginForm,
    showPassword,
    setShowPassword,
    loginError,
    setLoginError,
    rememberMe,
    setRememberMe,
    handleLogin,
    handleLogout,
    hasPermission
  };
};
