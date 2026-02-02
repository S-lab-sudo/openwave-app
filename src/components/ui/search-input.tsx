'use client';

import { Search, X, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  className?: string;
  autoFocus?: boolean;
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
  filters?: { label: string; suffix: string }[];
  fullWidth?: boolean;
  hideIcon?: boolean;
}

export function SearchInput({
  placeholder = 'Search...',
  value: controlledValue,
  defaultValue = '',
  onChange,
  onSubmit,
  className,
  autoFocus = false,
  activeFilter = 'Playlist',
  onFilterChange,
  filters = [],
  fullWidth = false,
  hideIcon = false,
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);
  const value = controlledValue ?? internalValue;

  const setVal = (newVal: string) => {
    if (onChange) {
      onChange(newVal);
    } else {
      setInternalValue(newVal);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit?.(value);
  };

  const handleClear = () => {
    setVal('');
  };

  return (
    <div
      style={{ willChange: 'max-width' }}
      className={cn(
        'relative flex items-center overflow-hidden transition-[max-width] duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)]',
        fullWidth ? 'max-w-none w-full' : (isFocused ? 'max-w-[100%] w-full' : 'max-w-[600px] w-full'),
        className
      )}
    >
      <form
        onSubmit={handleSubmit}
        className="relative flex-1"
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setVal(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            'w-full h-14 rounded-full transition-colors duration-500',
            hideIcon ? 'pl-6' : 'pl-14',
            value ? (filters.length > 0 ? 'pr-64' : 'pr-32') : (filters.length > 0 ? 'pr-44' : 'pr-14'),
            'bg-white/[0.03] text-white placeholder:text-[#444444]',
            'border border-white/5 focus:bg-white/[0.08]',
            'outline-none shadow-2xl ring-0 focus:ring-0 appearance-none',
            'text-base font-bold'
          )}
          aria-label="Search"
        />

        {!hideIcon && (
          <div className="absolute left-5 top-1/2 -translate-y-1/2 p-1 z-10 pointer-events-none">
            <Search className="w-5 h-5 text-[#ff6b35]" />
          </div>
        )}

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-[#888888]" />
            </button>
          )}

          {filters.length > 0 && (
            <div className="flex bg-white/5 p-1 rounded-full border border-white/5 mr-1 overflow-hidden">
              {filters.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => onFilterChange?.(f.label)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer",
                    activeFilter === f.label ? "bg-[#ff6b35] text-white shadow-lg" : "text-[#666666] hover:text-white"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence>
            {value && (
              <motion.button
                initial={{ opacity: 0, x: 10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 10, scale: 0.95 }}
                type="submit"
                className="bg-[#ff6b35] text-white text-[11px] font-black uppercase tracking-widest px-6 h-10 rounded-full shadow-lg hover:bg-[#ff824d] active:scale-95 transition-all ml-1 flex items-center justify-center"
              >
                Search
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </form>
    </div>
  );
}
