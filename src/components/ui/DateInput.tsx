import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

interface DateInputProps {
    value?: string; // Expects YYYY-MM-DD
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    readOnly?: boolean;
}

export const DateInput: React.FC<DateInputProps> = ({
    value,
    onChange,
    placeholder = "dd/mm/yyyy",
    className = "",
    readOnly = false
}) => {
    // value is YYYY-MM-DD
    // displayValue turned into DD/MM/YYYY
    const [displayValue, setDisplayValue] = useState("");

    useEffect(() => {
        if (value) {
            const [y, m, d] = value.split('-');
            if (y && m && d) {
                setDisplayValue(`${d}/${m}/${y}`);
            } else {
                setDisplayValue(value); // Fallback
            }
        } else {
            setDisplayValue("");
        }
    }, [value]);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setDisplayValue(val);

        // Try parse dd/mm/yyyy
        const parts = val.split('/');
        if (parts.length === 3) {
            const [d, m, y] = parts;
            if (d.length === 2 && m.length === 2 && y.length === 4) {
                // Return YYYY-MM-DD
                onChange(`${y}-${m}-${d}`);
            }
        } else if (val === "") {
            onChange("");
        }
    };

    const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value); // e.target.value is YYYY-MM-DD from date picker
    };

    return (
        <div className={`relative ${className}`}>
            <input
                type="text"
                className={`app-input px-3 py-2 font-bold text-[15px] transition-all shadow-sm ${readOnly ? 'opacity-70 pointer-events-none' : ''}`}
                placeholder={placeholder}
                value={displayValue}
                onChange={handleTextChange}
                readOnly={readOnly}
            />
            {!readOnly && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="relative w-5 h-5">
                        <input
                            type="date"
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                            value={value || ''}
                            onChange={handleDateSelect}
                        />
                        <div className="pointer-events-none text-slate-400 flex items-center justify-center w-full h-full">
                            <Calendar size={16} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
