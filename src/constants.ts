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
  VIEW_MATERIAL: 'Xem vật tư',
  MANAGE_WAREHOUSE: 'Quản lý nhập/xuất kho',
  VIEW_TRANSACTION: 'Xem lịch sử giao dịch',
  MANAGE_SUPPLIERS: 'Quản lý nhà cung cấp',
  PLANNING_PROJECTS: 'Xem dự án',
  PLANNING_ESTIMATES: 'Xem dự toán',
  MANAGE_PLANNING: 'Quản lý kế hoạch (Dự án/Dự toán)',
  VIEW_REPORT: 'Xem báo cáo',
  MANAGE_USERS: 'Quản lý người dùng',
  MANAGE_SETTINGS: 'Quản lý cài đặt',
  MANAGE_ROLES: 'Quản lý phân quyền',
  APPROVE_TRANSACTION: 'Duyệt phiếu xuất kho',
  EXPORT_DATA: 'Xuất dữ liệu Excel/PDF'
};

export const ROLE_PERMISSIONS: { [key in UserRole]: Permission[] } = {
  ADMIN: [
    'VIEW_MATERIAL', 'MANAGE_WAREHOUSE', 'VIEW_TRANSACTION', 'MANAGE_SUPPLIERS',
    'PLANNING_PROJECTS', 'PLANNING_ESTIMATES', 'MANAGE_PLANNING', 'VIEW_REPORT',
    'MANAGE_USERS', 'MANAGE_SETTINGS', 'MANAGE_ROLES', 'EXPORT_DATA', 'APPROVE_TRANSACTION'
  ],
  WAREHOUSE: [
    'VIEW_MATERIAL', 'MANAGE_WAREHOUSE', 'VIEW_TRANSACTION', 'MANAGE_SUPPLIERS',
    'PLANNING_PROJECTS', 'PLANNING_ESTIMATES', 'EXPORT_DATA',
    'APPROVE_TRANSACTION'
  ],
  PLANNING: [
    'VIEW_MATERIAL', 'VIEW_TRANSACTION', 'PLANNING_PROJECTS', 'PLANNING_ESTIMATES',
    'MANAGE_PLANNING', 'EXPORT_DATA'
  ],
  GUEST: [
    'VIEW_MATERIAL', 'VIEW_TRANSACTION', 'PLANNING_PROJECTS', 'PLANNING_ESTIMATES'
  ]
};
