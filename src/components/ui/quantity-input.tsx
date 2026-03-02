import React from 'react';

interface QuantityInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
    label?: string;
    error?: string;
    icon?: React.ReactNode;
    value: string | number;
    onChange: (value: string) => void;
    maxValue?: number;
    allowDecimal?: boolean;
}

/**
 * QuantityInput - Input component với validation cho số lượng vật tư
 * 
 * FEATURES:
 * - Chỉ cho phép nhập số dương
 * - Hỗ trợ số thập phân (tùy chọn)
 * - Giới hạn giá trị tối đa
 * - Tự động loại bỏ ký tự không hợp lệ
 * - Hiển thị lỗi rõ ràng
 */
export const QuantityInput: React.FC<QuantityInputProps> = ({
    label,
    error,
    icon,
    className = '',
    id,
    value,
    onChange,
    maxValue = 999999,
    allowDecimal = true,
    ...props
}) => {
    const [validationError, setValidationError] = React.useState<string | undefined>();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.target.value;

        // Cho phép trống
        if (input === '') {
            setValidationError(undefined);
            onChange('');
            return;
        }

        // Regex validation
        const regex = allowDecimal
            ? /^[0-9]+(\.[0-9]{0,2})?$/ // Cho phép số thập phân tối đa 2 chữ số
            : /^[0-9]+$/; // Chỉ số nguyên

        if (!regex.test(input)) {
            setValidationError(allowDecimal
                ? 'Chỉ nhập số (tối đa 2 chữ số thập phân)'
                : 'Chỉ nhập số nguyên dương'
            );
            return;
        }

        // Check max value
        const numValue = Number(input);
        if (numValue > maxValue) {
            setValidationError(`Số lượng tối đa: ${maxValue.toLocaleString('vi-VN')}`);
            return;
        }

        // Check negative or zero
        if (numValue <= 0) {
            setValidationError('Số lượng phải lớn hơn 0');
            return;
        }

        setValidationError(undefined);
        onChange(input);
    };

    const displayError = error || validationError;

    return (
        <div className="space-y-1.5 w-full">
            {label && (
                <label
                    htmlFor={id}
                    className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 tracking-wider"
                >
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        {icon}
                    </div>
                )}
                <input
                    id={id}
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={handleChange}
                    className={`
            app-input font-medium text-[15px]
            transition-all shadow-sm
            disabled:opacity-60 disabled:cursor-not-allowed
            ${icon ? 'pl-10 pr-4' : 'px-4'} py-2.5
            ${displayError
                            ? 'border-red-500 focus:border-red-600 focus:ring-4 focus:ring-red-500/10 focus-visible:ring-2 focus-visible:ring-red-500/30'
                            : ''
                        }
            ${className}
          `}
                    {...props}
                />
            </div>
            {displayError && (
                <p className="text-[10px] font-bold text-red-500 ml-1">{displayError}</p>
            )}
        </div>
    );
};
