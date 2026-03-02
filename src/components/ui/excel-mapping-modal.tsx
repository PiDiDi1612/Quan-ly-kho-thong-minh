import React, { useState, useEffect } from 'react';
import { Modal } from './modal';
import { Button } from './button';
import { FileSpreadsheet, X, Check, AlertCircle } from 'lucide-react';

export interface ExcelField {
    key: string;
    label: string;
    required?: boolean;
    autoMatchPatterns?: string[];
}

interface ExcelMappingModalProps {
    isOpen: boolean;
    onClose: () => void;
    fields: ExcelField[];
    excelHeaders: string[];
    excelData: any[][];
    onImport: (mappedData: any[]) => void;
    title?: string;
}

export const ExcelMappingModal: React.FC<ExcelMappingModalProps> = ({
    isOpen,
    onClose,
    fields,
    excelHeaders,
    excelData,
    onImport,
    title = "Nhập khẩu từ Excel"
}) => {
    const [columnMapping, setColumnMapping] = useState<{ [key: string]: string }>({});

    // Auto-mapping logic
    useEffect(() => {
        if (isOpen && Array.isArray(excelHeaders) && excelHeaders.length > 0) {
            const initialMapping: { [key: string]: string } = {};

            fields.forEach(field => {
                const patterns = [
                    String(field.label || '').toLowerCase(),
                    String(field.key || '').toLowerCase(),
                    ...(field.autoMatchPatterns || []).map(p => String(p || '').toLowerCase())
                ];

                const match = excelHeaders.find(header => {
                    const h = String(header || '').toLowerCase().trim();
                    return h && patterns.some(p => p && (h.includes(p) || p.includes(h)));
                });

                if (match) {
                    initialMapping[field.key] = match;
                }
            });

            setColumnMapping(initialMapping);
        }
    }, [isOpen, excelHeaders, fields]);

    const handleImport = () => {
        // Validate required fields
        const missingRequired = fields
            .filter(f => f.required && !columnMapping[f.key])
            .map(f => f.label);

        if (missingRequired.length > 0) {
            alert(`Vui lòng ánh xạ các cột bắt buộc: ${missingRequired.join(', ')}`);
            return;
        }

        const mappedData = excelData.map(row => {
            const item: any = {};
            fields.forEach(field => {
                const header = columnMapping[field.key];
                const colIndex = excelHeaders.indexOf(header);
                if (colIndex !== -1) {
                    item[field.key] = row[colIndex];
                }
            });
            return item;
        });

        onImport(mappedData);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={
                <div className="flex items-center gap-2">
                    <FileSpreadsheet className="text-emerald-500" size={24} />
                    <span>{title}</span>
                </div>
            }
            maxWidth="max-w-4xl"
        >
            <div className="space-y-6">
                <div className="bg-sky-50 dark:bg-sky-900/10 p-4 rounded-xl border border-sky-100 dark:border-sky-800/50 flex gap-3 text-sky-700 dark:text-sky-400">
                    <AlertCircle size={20} className="shrink-0" />
                    <p className="text-xs font-medium italic">
                        Vui lòng ánh xạ các cột tiêu đề từ file Excel của bạn tương ứng với các trường trong hệ thống. Các trường có dấu (*) là bắt buộc.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    {fields.map(field => (
                        <div key={field.key} className="space-y-1.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 group transition-all hover:border-emerald-200 dark:hover:border-emerald-900/50">
                            <label className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                                </span>
                                {columnMapping[field.key] && (
                                    <Check size={14} className="text-emerald-500" />
                                )}
                            </label>
                            <select
                                className={`w-full px-3 py-2 bg-white dark:bg-slate-800 border ${columnMapping[field.key] ? 'border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'} rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all`}
                                value={columnMapping[field.key] || ''}
                                onChange={e => setColumnMapping({ ...columnMapping, [field.key]: e.target.value })}
                            >
                                <option value="">-- Chọn cột --</option>
                                {excelHeaders.map(h => (
                                    <option key={h} value={h}>{h}</option>
                                ))}
                            </select>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                    <Button variant="secondary" onClick={onClose} className="px-6 h-10 font-bold uppercase text-[10px] tracking-widest rounded-xl">Hủy bỏ</Button>
                    <Button
                        onClick={handleImport}
                        className="px-6 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg shadow-emerald-500/20"
                    >
                        Tiến hành Nhập ({excelData.length} dòng)
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
