import { Material, Transaction, TransactionType, WorkshopCode, User, UserRole, Permission } from './types';

export const CLASSIFICATIONS = [
  'Vật tư chính',
  'Vật tư phụ'
];

export const WORKSHOPS: { code: WorkshopCode; name: string }[] = [
  { code: 'OG', name: 'Xưởng Ống gió' },
  { code: 'CK', name: 'Xưởng Cơ khí' },
  { code: 'NT', name: 'Xưởng Nội thất' }
];

export const PERMISSIONS: { [key in Permission]: string } = {
  MANAGE_WAREHOUSE: 'Phòng kho',
  MANAGE_PLANNING: 'Phòng kế hoạch',
  EXPORT_DATA: 'Xuất dữ liệu',
  MANAGE_USERS: 'Quản lý người dùng',
  MANAGE_SETTINGS: 'Quản lý cài đặt'
};

// Permissions visible in user management UI (hide admin-only ones)
export const VISIBLE_PERMISSIONS: Permission[] = [
  'MANAGE_WAREHOUSE',
  'MANAGE_PLANNING',
  'EXPORT_DATA'
];

export const ROLE_PERMISSIONS: { [key in UserRole]: Permission[] } = {
  ADMIN: [
    'MANAGE_WAREHOUSE',
    'MANAGE_PLANNING',
    'EXPORT_DATA',
    'MANAGE_USERS',
    'MANAGE_SETTINGS'
  ],
  WAREHOUSE: [
    'MANAGE_WAREHOUSE',
    'EXPORT_DATA'
  ],
  PLANNING: [
    'MANAGE_PLANNING',
    'EXPORT_DATA'
  ],
  GUEST: []
};

