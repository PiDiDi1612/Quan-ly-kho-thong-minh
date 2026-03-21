import { useState, useMemo, useCallback, useRef } from 'react';
import { Material, Transaction, User, ActivityLog, Project, OrderBudget } from '@/types';
import { materialService, transactionService, userService, inventoryService, supplierService } from '@/domain';
import { apiService } from '../services/api';
import { debounce } from 'lodash';

export const useAppData = (currentUser: User | null, setCurrentUser: (user: User) => void, isAuthenticated: boolean) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [budgets, setBudgets] = useState<OrderBudget[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);
  const [serverSummary, setServerSummary] = useState<any>(null);
  const [pendingApprovalCount, setPendingApprovalCount] = useState(0);

  const parseNumber = (val: string | number | undefined): number => {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    const cleanVal = val.toString().replace(/,/g, '.');
    const floatVal = parseFloat(cleanVal);
    return isNaN(floatVal) ? 0 : Math.round(floatVal * 100) / 100;
  };

  const loadData = useCallback(async (isBackground = false) => {
    if (!isAuthenticated) return;
    if (isSyncingRef.current && !isBackground) return;
    if (!isBackground) {
      setIsSyncing(true);
      isSyncingRef.current = true;
    }
    try {
      const [matRes, txData, projData, budData, suppData, usersData, logsData, summaryData, planningTxData] = await Promise.all([
        materialService.listMaterials({}),
        transactionService.listAllTransactions({}),
        apiService.get<Project[]>('/api/projects?limit=200').then((r: any) => r?.data || r).catch(() => []),
        apiService.get<OrderBudget[]>('/api/budgets/all').catch(() => []),
        supplierService.listSuppliers().catch(() => []),
        currentUser?.role === 'ADMIN' ? userService.listUsers().catch(() => []) : Promise.resolve([]),
        currentUser?.role === 'ADMIN' ? apiService.get<any>('/api/activity_logs?limit=50').then((r: any) => r?.data || r).catch(() => []) : Promise.resolve([]),
        apiService.get<any>('/api/dashboard/summary').catch(() => null),
        apiService.get<Transaction[]>('/api/transactions/planning').catch(() => [])
      ]);

      const allTransactions = [
        ...(Array.isArray(txData) ? txData : []),
        ...(Array.isArray(planningTxData) ? planningTxData : [])
      ];

      setMaterials(Array.isArray(matRes) ? (matRes as any).data || matRes : []);
      setTransactions(allTransactions);
      setProjects(Array.isArray(projData) ? projData : []);
      setBudgets(Array.isArray(budData) ? budData : []);
      setSuppliers(Array.isArray(suppData) ? suppData : []);
      setServerSummary(summaryData);

      (inventoryService as any).allTransactions = allTransactions;
      (inventoryService as any).lastFetchTime = Date.now();
      (inventoryService as any).stockCache.clear();

      if (currentUser?.role === 'ADMIN') {
        const safeUsers = Array.isArray(usersData) ? usersData : [];
        setUsers(safeUsers);
        setActivityLogs(Array.isArray(logsData) ? logsData : []);
        const updatedSelf = currentUser ? safeUsers.find((u: User) => u.id === currentUser.id) : null;
        if (updatedSelf) setCurrentUser(updatedSelf);
      }

      if (currentUser && currentUser.role === 'ADMIN') {
        apiService.get<{ count: number }>('/api/approval/count').then(res => {
          if (res && typeof res.count === 'number') setPendingApprovalCount(res.count);
        }).catch(() => { });
      }
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      if (!isBackground) {
        setIsSyncing(false);
        isSyncingRef.current = false;
      }
    }
  }, [isAuthenticated, currentUser, setCurrentUser]);

  const debouncedLoadData = useMemo(() => debounce(() => {
    loadData(true);
  }, 1000, { leading: false, trailing: true }), [loadData]);

  return {
    materials, setMaterials,
    transactions, setTransactions,
    users, setUsers,
    activityLogs, setActivityLogs,
    projects, setProjects,
    budgets, setBudgets,
    suppliers, setSuppliers,
    isSyncing,
    serverSummary, setServerSummary,
    pendingApprovalCount, setPendingApprovalCount,
    loadData,
    debouncedLoadData,
    parseNumber
  };
};
