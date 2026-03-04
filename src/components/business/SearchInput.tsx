import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder, className }) => {
  return (
    <div className="relative flex-1 min-w-[300px] group">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-emerald-600 transition-colors" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className || 'pl-12 h-12 bg-white dark:bg-slate-900 border-slate-200 rounded-xl focus-visible:ring-emerald-600/20 font-bold shadow-sm w-full'}
      />
    </div>
  );
};
