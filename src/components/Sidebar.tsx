import React from 'react';
import {
  LayoutDashboard,
  Users,
  FileText,
  TrendingUp,
  Shield,
  CreditCard,
  Building2,
  KeyRound,
  BookOpen,
} from 'lucide-react';

export type TabKey =
  | 'overview'
  | 'contacts'
  | 'documents'
  | 'investments'
  | 'insurance'
  | 'banking'
  | 'assets_liabilities'
  | 'passwords'
  | 'binder';

interface SidebarProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  counts: {
    contacts: number;
    documents: number;
    investments: number;
    insurances: number;
    cards: number;
    lockers: number;
    properties: number;
    passwords: number;
    expiringSoonCount: number;
  };
  className?: string;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  counts,
  className = '',
  onCloseMobile,
}) => {
  const navItems: { key: TabKey; label: string; icon: React.ElementType; badge?: number | string; alert?: boolean }[] = [
    { key: 'overview', label: 'Overview & Readiness', icon: LayoutDashboard },
    { key: 'contacts', label: 'Family & Contacts', icon: Users, badge: counts.contacts },
    {
      key: 'documents',
      label: 'Financial Documents',
      icon: FileText,
      badge: counts.documents,
      alert: counts.expiringSoonCount > 0,
    },
    { key: 'investments', label: 'Investments & Online', icon: TrendingUp, badge: counts.investments },
    { key: 'insurance', label: 'Insurance Policies', icon: Shield, badge: counts.insurances },
    { key: 'banking', label: 'Cards & Safe Lockers', icon: CreditCard, badge: counts.cards + counts.lockers },
    { key: 'assets_liabilities', label: 'Assets & Liabilities', icon: Building2, badge: counts.properties },
    { key: 'passwords', label: 'Emergency Access & Keys', icon: KeyRound, badge: counts.passwords },
    { key: 'binder', label: 'Printable Family Binder', icon: BookOpen },
  ];

  return (
    <nav className={`flex flex-col gap-1 py-4 ${className}`} aria-label="Sidebar Navigation">
      <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 tracking-wider uppercase">
        Vault Navigation
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              onSelectTab(item.key);
              if (onCloseMobile) onCloseMobile();
            }}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
              isActive
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
            }`}
          >
            <span className="flex items-center gap-2.5 min-w-0">
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </span>

            <div className="flex items-center gap-1 shrink-0 ml-2">
              {item.alert && (
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded-md">
                  {counts.expiringSoonCount} Expiring
                </span>
              )}
              {item.badge !== undefined && (
                <span className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded ${
                  isActive ? 'bg-indigo-100 text-indigo-800' : 'text-slate-500 bg-slate-100'
                }`}>
                  {item.badge}
                </span>
              )}
            </div>
          </button>
        );
      })}

      <div className="mt-auto pt-6 px-3">
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-500 space-y-1.5">
          <div className="font-semibold text-slate-800 flex items-center justify-between">
            <span>Confidential Vault</span>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono">
              Local Encrypted
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Data resides locally in your browser storage. Never sent to untrusted servers.
          </p>
        </div>
      </div>
    </nav>
  );
};
