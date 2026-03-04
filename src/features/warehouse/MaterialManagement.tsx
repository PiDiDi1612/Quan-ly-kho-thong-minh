import React from 'react';
import { Material, Transaction, User } from '@/types';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { ExcelMappingModal } from '@/components/ui/excel-mapping-modal';
import { useMaterialManagement } from '@/features/warehouse/hooks/useMaterialManagement';
import { MaterialDetailModal } from '@/features/warehouse/components/material-management/MaterialDetailModal';
import { MaterialFormModal } from '@/features/warehouse/components/material-management/MaterialFormModal';
import { MaterialTable } from '@/features/warehouse/components/material-management/MaterialTable';
import { MaterialToolbar } from '@/features/warehouse/components/material-management/MaterialToolbar';

interface MaterialManagementProps {
  materials: Material[];
  transactions: Transaction[];
  currentUser: User | null;
  onUpdate: () => void;
  canManage: boolean;
}

const MATERIAL_FIELDS = [
  { key: 'name', label: 'Tên vật tư', required: true },
  { key: 'classification', label: 'Phân loại (Vật tư chính/phụ)', required: false },
  { key: 'unit', label: 'Đơn vị tính', required: true },
  { key: 'workshop', label: 'Xưởng (OG, CD, CM...)', required: false },
  { key: 'minThreshold', label: 'Định mức tồn tối thiểu', required: false },
  { key: 'origin', label: 'Xuất xứ', required: false },
  { key: 'note', label: 'Ghi chú', required: false },
];

export const MaterialManagement: React.FC<MaterialManagementProps> = ({ transactions, onUpdate, canManage }) => {
  const formatNumber = (num: number) => new Intl.NumberFormat('en-US').format(num);
  const state = useMaterialManagement(onUpdate);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <MaterialToolbar
        searchTerm={state.searchTerm}
        onSearchChange={state.setSearchTerm}
        workshopFilter={state.workshopFilter}
        onWorkshopFilterChange={state.setWorkshopFilter}
        classFilter={state.classFilter}
        onClassFilterChange={state.setClassFilter}
        startDate={state.startDate}
        endDate={state.endDate}
        onStartDateChange={state.setStartDate}
        onEndDateChange={state.setEndDate}
        canManage={canManage}
        onExportExcel={state.handleExportExcel}
        onImportExcel={state.handleImportClick}
        onCreate={() => state.handleOpenModal()}
      />

      <MaterialTable
        materials={state.fetchedMaterials}
        isLoading={state.isLoading}
        canManage={canManage}
        formatNumber={formatNumber}
        onView={(material) => {
          state.setViewingMaterial(material);
          state.setIsDetailModalOpen(true);
        }}
        onEdit={state.handleOpenModal}
        onDelete={state.handleDelete}
        currentPage={state.currentPage}
        pageLimit={state.pageLimit}
        totalItems={state.totalItems}
        totalPages={state.totalPages}
        onPageChange={state.setCurrentPage}
        onLimitChange={state.setPageLimit}
      />

      <MaterialFormModal
        isOpen={state.isModalOpen}
        editingMaterial={state.editingMaterial}
        formData={state.formData}
        setFormData={state.setFormData}
        onClose={() => state.setIsModalOpen(false)}
        onSave={state.handleSave}
      />

      <MaterialDetailModal
        isOpen={state.isDetailModalOpen}
        viewingMaterial={state.viewingMaterial}
        dashboardTab={state.dashboardTab}
        setDashboardTab={state.setDashboardTab}
        transactions={transactions}
        formatNumber={formatNumber}
        onClose={() => state.setIsDetailModalOpen(false)}
      />

      {state.importExcelData && (
        <ExcelMappingModal
          isOpen={state.isImportModalOpen}
          onClose={() => state.setIsImportModalOpen(false)}
          fields={MATERIAL_FIELDS}
          excelHeaders={state.importExcelData.headers}
          excelData={state.importExcelData.data}
          onImport={state.handleProcessImport}
          title="CẤU HÌNH NHẬP VẬT TƯ TỪ EXCEL"
        />
      )}

      <ConfirmModal
        isOpen={state.confirmState.isOpen}
        onClose={() => state.setConfirmState((p) => ({ ...p, isOpen: false }))}
        title={state.confirmState.title}
        message={state.confirmState.message}
        onConfirm={state.confirmState.onConfirm}
        type={state.confirmState.type}
      />
    </div>
  );
};

export default MaterialManagement;
