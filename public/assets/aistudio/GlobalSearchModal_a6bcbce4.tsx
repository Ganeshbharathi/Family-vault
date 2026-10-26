import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { VaultState } from './types.ts';
import { searchVault, SearchResultItem } from './calculations.ts';
import { TabKey } from './Sidebar.tsx';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: VaultState;
  onSelectResult: (tabKey: TabKey, itemId: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  vault,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim().length > 0) {
      setResults(searchVault(vault, val));
    } else {
      setResults([]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-slate-900/50 backdrop-blur-xs">
      <div 
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]"
        role="dialog"
        aria-modal="true"
        aria-label="Search Vault"
      >
        {/* Search header */}
        <div className="p-3.5 border-b border-slate-200 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            placeholder="Type to find Passport, MOM, Zerodha, PAN, Locker, Will..."
            className="w-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden bg-transparent"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear query"
              onClick={() => {
                setQuery('');
                setResults([]);
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            aria-label="Close search"
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded bg-slate-100"
          >
            Esc
          </button>
        </div>

        {/* Results area */}
        <div className="p-2 overflow-y-auto flex-1 divide-y divide-slate-100">
          {query.trim().length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 space-y-2">
              <p className="font-medium text-slate-600">Quick Searches for Emergency</p>
              <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                {['Passport', 'Santhi', 'Zerodha', 'PAN Card', 'Locker', 'Insurance', 'Driving License'].map(
                  (term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        setQuery(term);
                        setResults(searchVault(vault, term));
                      }}
                      className="px-2.5 py-1 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                    >
                      {term}
                    </button>
                  )
                )}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No records found matching <span className="font-semibold text-slate-800">"{query}"</span>.
            </div>
          ) : (
            results.map((item) => (
              <button
                key={`${item.category}-${item.id}`}
                type="button"
                onClick={() => {
                  onSelectResult(item.tabKey as TabKey, item.id);
                  onClose();
                }}
                className="w-full p-3 text-left hover:bg-indigo-50/60 rounded-lg transition-colors flex items-center justify-between group"
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                      {item.category}
                    </span>
                    <h4 className="text-xs font-semibold text-slate-900 truncate">{item.title}</h4>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{item.subtitle}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 shrink-0 transition-colors" />
              </button>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span>{results.length} result{results.length === 1 ? '' : 's'}</span>
          <span>Click to view in sheet tab</span>
        </div>
      </div>
    </div>
  );
};
