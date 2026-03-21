import { format, isValid, parseISO } from 'date-fns';

export function formatDateStr(dateVal: string | Date | number | undefined | null): string {
    if (!dateVal) return '';
    try {
        const d = new Date(dateVal);
        if (!isValid(d)) return '';
        return format(d, 'dd/MM/yyyy');
    } catch {
        return '';
    }
}
