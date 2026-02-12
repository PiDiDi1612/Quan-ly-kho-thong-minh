export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT',
  TRANSFER = 'TRANSFER'
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF';

export type Permission =
  | 'VIEW_DASHBOARD'
  | 'VIEW_INVENTORY'
  | 'VIEW_HISTORY'
  | 'VIEW_ORDERS'
  | 'MANAGE_MATERIALS'
  | 'CREATE_RECEIPT'
  | 'DELETE_TRANSACTION'
  | 'MANAGE_BUDGETS'
  | 'TRANSFER_MATERIALS'
  | 'EXPORT_DATA'
  | 'MANAGE_USERS'
  | 'VIEW_ACTIVITY_LOG'
  | 'MANAGE_SETTINGS';

export interface User {
  id: string;
  username: string;
  password?: string; // Legacy field (không nên dùng ở client)
  fullName: string;
  email?: string;
  role: UserRole;
  permissions: Permission[];
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  createdBy?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  entityType: 'MATERIAL' | 'TRANSACTION' | 'BUDGET' | 'USER' | 'SYSTEM';
  entityId?: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export type MaterialClassification = 'Vật tư chính' | 'Vật tư phụ';
export type WorkshopCode = 'OG' | 'CK' | 'NT';

export interface Material {
  id: string;
  name: string;
  classification: MaterialClassification;
  unit: string;
  quantity: number;
  minThreshold: number;
  lastUpdated: string;
  workshop: WorkshopCode;
  origin: string; // Xuất xứ vật tư
  image?: string; // Hình ảnh vật tư (base64)

  // Stock Report Fields (populated by API when date range provided)
  openingStock?: number;
  closingStock?: number;
  periodIn?: number;
  periodOut?: number;
  note?: string;
}

export interface Project {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  description?: string;
  createdAt: string;
}

export interface BudgetItem {
  materialId: string;
  materialName: string;
  classification?: MaterialClassification;
  estimatedQty: number;
  unit?: string;
}

export interface OrderBudget {
  id: string;
  orderCode: string;
  orderName: string;
  projectName: string;
  address?: string;
  phone?: string;
  description?: string;
  status: 'Đang thực hiện' | 'Hoàn thành';
  workshop: WorkshopCode;
  items: BudgetItem[];
  createdAt: string;
  lastUpdated?: string;
}

export interface Transaction {
  id: string;
  receiptId: string;
  materialId: string;
  targetMaterialId?: string;
  materialName: string;
  type: TransactionType;
  quantity: number;
  date: string;
  user: string;
  workshop: WorkshopCode;
  targetWorkshop?: WorkshopCode; // Dùng cho điều chuyển
  orderCode?: string;
  supplier?: string;
  transactionTime?: string;
  note?: string;
}

export interface CreateUserData {
  username: string;
  fullName: string;
  password?: string;
  role: UserRole;
  email?: string;
  permissions?: Permission[];
  createdBy?: string;
}

export interface UpdateUserData {
  fullName?: string;
  password?: string;
  role?: UserRole;
  email?: string;
  permissions?: Permission[];
  isActive?: boolean;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  description?: string;
  createdAt: string;
  createdBy?: string;
  updatedAt?: string;
}
