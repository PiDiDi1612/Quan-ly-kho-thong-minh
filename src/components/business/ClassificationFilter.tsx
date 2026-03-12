import React from 'react';

export type ClassificationType = 'ALL' | 'Vật tư chính' | 'Vật tư phụ';

export interface ClassificationFilterProps {
    value: ClassificationType;
    onChange: (val: ClassificationType) => void;
    styleType?: 'default' | 'outline';
}

export const ClassificationFilter: React.FC<ClassificationFilterProps> = ({
    value,
    onChange,
    styleType = 'default'
}) => {
    if (styleType === 'outline') {
        return (
            <div className="flex gap-2">
                <button
                    onClick={() => onChange('ALL')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${value === 'ALL' ? 'bg-slate-800 dark:bg-slate-700 text-white border-slate-800 dark:border-slate-600' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'}`}
                >
                    Tất cả Loại
                </button>
                <button
                    onClick={() => onChange('Vật tư chính')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${value === 'Vật tư chính' ? 'bg-sky-600 text-white border-sky-600' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'}`}
                >
                    Chính
                </button>
                <button
                    onClick={() => onChange('Vật tư phụ')}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${value === 'Vật tư phụ' ? 'bg-rose-500 text-white border-rose-500' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'}`}
                >
                    Phụ
                </button>
            </div>
        );
    }

    // Default style (used in WarehouseTransfer inner shadow container)
    return (
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#0f172a] rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto no-scrollbar">
            <button
                onClick={() => onChange('ALL')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${value === 'ALL' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
                Tất cả
            </button>
            <button
                onClick={() => onChange('Vật tư chính')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${value === 'Vật tư chính' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
                Chính
            </button>
            <button
                onClick={() => onChange('Vật tư phụ')}
                className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${value === 'Vật tư phụ' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
                Phụ
            </button>
        </div>
    );
};
