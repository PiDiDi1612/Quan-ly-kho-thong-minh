import React from 'react';
import { UserRole } from '@/types';

interface RequireRoleProps {
  role: UserRole;
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ 
  role, 
  allowedRoles, 
  children, 
  fallback = null 
}) => {
  // ADMIN always has access
  if (role === 'ADMIN') return <>{children}</>;
  
  if (allowedRoles.includes(role)) {
    return <>{children}</>;
  }
  
  return <>{fallback}</>;
};
