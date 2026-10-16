import React from 'react';
import { 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Search, 
  Printer, 
  Download, 
  RotateCcw,
  Menu,
  X,
  Database,
} from 'lucide-react';

interface NavbarProps {
  isMasked: boolean;
  onToggleMask: () => void;
  onOpenSearch: () => void;
  onOpenPrint: () => void;
  onExportCsv: () => void;
  onResetData: () => void;
  onOpenSupabaseGuide: () => void;
  supabaseConnected: boolean;
  mobileMenuOpen: boolean;
  onToggleMobileMenu: () => void;
  lastUpdated: string;
  syncStatus?: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedTime?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  isMasked,
  onToggleMask,
  onOpenSearch,
  onOpenPrint,
  onExportCsv,
  onResetData,
  onOpenSupabaseGuide,
  supabaseConnected,
  mobileMenuOpen,
  onToggleMobileMenu,
  lastUpdated,
  syncStatus = 'idle',
  lastSavedTime,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 h-16 flex items-center justify-between gap-3">
        {/* Brand Zone */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            aria-label="Toggle navigation menu"
            onClick={onToggleMobileMenu}
            className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
                Vault
              </span>
              <span className="hidden xl:inline text-xs text-slate-500 font-normal">
                Family Financial & Document Directory
              </span>
            </div>
          </div>
        </div>

        {/* Search bar trigger */}
        <div className="flex-1 max-w-xs xl:max-w-md hidden md:block">
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-100/70 transition-colors whitespace-nowrap overflow-hidden"
          >
            <span className="flex items-center gap-2 truncate min-w-0">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">Search documents, Zerodha, contacts...</span>
            </span>
            <kbd className="hidden lg:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-mono text-slate-500 bg-white border border-slate-200 rounded shadow-2xs shrink-0">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Supabase Auto-Sync & Database Status Button */}
          <button
            type="button"
            onClick={onOpenSupabaseGuide}
            aria-label="Open Supabase Cloud Sync settings"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap ${
              syncStatus === 'saving'
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : syncStatus === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-300'
                : supabaseConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
            }`}
            title="Click to view Supabase connection, Auto-Sync status & manual Push/Fetch"
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Supabase:</span>
            {syncStatus === 'saving' ? (
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Auto-saving...</span>
              </span>
            ) : syncStatus === 'saved' && lastSavedTime ? (
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-medium">Synced {lastSavedTime}</span>
              </span>
            ) : (
              <span>{supabaseConnected ? 'Connected' : 'Setup DB'}</span>
            )}
          </button>

          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Search Vault"
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Privacy masking toggle */}
          <button
            type="button"
            onClick={onToggleMask}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
              isMasked
                ? 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title={isMasked ? 'Click to show sensitive numbers' : 'Click to mask sensitive numbers'}
          >
            {isMasked ? <EyeOff className="w-3.5 h-3.5 text-amber-700 shrink-0" /> : <Eye className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
            <span className="hidden sm:inline">Privacy:</span>
            <span>{isMasked ? 'Masked' : 'Revealed'}</span>
          </button>

          {/* Print Dossier */}
          <button
            type="button"
            onClick={onOpenPrint}
            aria-label="Print or save Family Dossier PDF"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>Print Dossier</span>
          </button>

          {/* Download CSV matching sheet format */}
          <button
            type="button"
            onClick={onExportCsv}
            aria-label="Export Vault to CSV"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="hidden md:inline">Export</span>
            <span>CSV</span>
          </button>

          {/* Reset button */}
          <button
            type="button"
            onClick={onResetData}
            aria-label="Reset Vault to original sheet data"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
            title="Reset data back to initial sheet values"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
