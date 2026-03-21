import React from 'react';
import { Material } from '@/types';
import { useWarehouseReceipt } from './hooks/useWarehouseReceipt';
import { ReceiptForm } from './components/receipt/ReceiptForm';
import { ReceiptMaterialSearch } from './components/receipt/ReceiptMaterialSearch';
import { ReceiptCart } from './components/receipt/ReceiptCart';

interface WarehouseReceiptProps {
    materials: Material[];
    currentUser: any;
    userRole: string;
    loadData: () => Promise<void>;
    logActivity: (action: string, entityType: string, entityId?: string, details?: string) => void;
    requestConfirm: (title: string, message: string, onConfirm: () => void, type?: 'danger' | 'info') => void;
    modalError: string | null;
    setModalError: (error: string | null) => void;
    closeConfirmDialog: () => void;
    createBatchReceipt: (data: any) => Promise<{ success: boolean; error?: string }>;
    generateReceiptId: (type: any, workshop: any) => string;
    parseNumber: (val: any) => number;
    formatNumber: (val: any) => string;
    suppliers: any[];
    budgets: any[];
    canManage?: boolean;
}

export const WarehouseReceipt: React.FC<WarehouseReceiptProps> = ({
    materials, currentUser, userRole, loadData, logActivity, requestConfirm,
    modalError, setModalError, closeConfirmDialog, createBatchReceipt,
    generateReceiptId, parseNumber, formatNumber, suppliers, budgets, canManage
}) => {
    const { state, actions } = useWarehouseReceipt({
        materials, currentUser, userRole, loadData, logActivity, requestConfirm,
        setModalError, closeConfirmDialog, createBatchReceipt, generateReceiptId, parseNumber, canManage
    });

    const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
    const activeOrders = (Array.isArray(budgets) ? budgets : []).filter(b =>
        b.status === 'Đang thực hiện' && b.workshop === state.receiptWorkshop
    );

    const localFormatNumber = (val: any): string => {
        if (val === null || val === undefined) return '0';
        const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, '.'));
        return isNaN(num) ? '0' : num.toLocaleString('vi-VN');
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1e293b] rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-700 animate-in fade-in duration-300">
            <div className="flex-1 grid grid-cols-12 gap-6 p-6 overflow-hidden">
                {/* CỘT TRÁI (4): THÔNG TIN PHIẾU & HÀNG CHỜ */}
                <div className="col-span-12 xl:col-span-4 flex flex-col gap-4 overflow-hidden">
                    <ReceiptForm
                        receiptType={state.receiptType} setReceiptType={actions.setReceiptType}
                        receiptWorkshop={state.receiptWorkshop} setReceiptWorkshop={actions.setReceiptWorkshop}
                        receiptId={state.receiptId} setReceiptId={actions.setReceiptId}
                        receiptTimeDisplay={(() => {
                            if (!state.receiptTime) return "";
                            const [y, m, d] = state.receiptTime.split('-');
                            return y && m && d ? `${d}/${m}/${y}` : state.receiptTime;
                        })()}
                        setReceiptTimeDisplay={(val) => {
                            const parts = val.split('/');
                            if (parts.length === 3) {
                                const [d, m, y] = parts;
                                if (d.length === 2 && m.length === 2 && y.length === 4) {
                                    actions.setReceiptTime(`${y}-${m}-${d}`);
                                }
                            }
                        }}
                        handleDateChange={(val) => {
                            const parts = val.split('/');
                            if (parts.length === 3) {
                                const [d, m, y] = parts;
                                if (d.length === 2 && m.length === 2 && y.length === 4) {
                                    actions.setReceiptTime(`${y}-${m}-${d}`);
                                }
                            }
                        }}
                        receiptSupplier={state.receiptSupplier} setReceiptSupplier={actions.setReceiptSupplier}
                        orderCode={state.orderCode} setOrderCode={actions.setOrderCode}
                        safeSuppliers={safeSuppliers} activeOrders={activeOrders}
                        modalError={modalError}
                    />
                    <ReceiptCart
                        receiptType={state.receiptType}
                        selectedItems={state.selectedItems}
                        materials={materials}
                        handleQuantityChange={actions.handleQuantityChange}
                        removeSelectedItem={actions.removeSelectedItem}
                        handleCreateReceipt={actions.handleCreateReceipt}
                        totalSelectedQuantity={state.totalSelectedQuantity}
                    />
                </div>

                {/* CỘT PHẢI: TÌM VẬT TƯ NGUỒN (WIDER) */}
                <ReceiptMaterialSearch
                    materialSearch={state.materialSearch} setMaterialSearch={actions.setMaterialSearch}
                    receiptSearchClass={state.receiptSearchClass} setReceiptSearchClass={actions.setReceiptSearchClass}
                    materials={materials}
                    receiptWorkshop={state.receiptWorkshop}
                    selectedItems={state.selectedItems}
                    toggleMaterialSelection={actions.toggleMaterialSelection}
                    localFormatNumber={localFormatNumber}
                />
            </div>
        </div>
    );
};
