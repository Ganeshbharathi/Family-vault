import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  PhoneCall,
  Mail,
  FileCheck2,
  Lock,
  ArrowRight,
  FolderOpen,
  Printer,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { VaultState, TabKey } from './types.ts';
import { calculateReadinessScore, maskSensitive } from './calculations.ts';

interface OverviewTabProps {
  vault: VaultState;
  isMasked: boolean;
  onNavigateTab: (tabKey: TabKey) => void;
  onOpenPrint: () => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  vault,
  isMasked,
  onNavigateTab,
  onOpenPrint,
}) => {
  const readiness = calculateReadinessScore(vault);

  // Quick emergency contacts (Self, MOM, and any configured ones)
  const primaryContacts = vault.contacts.filter(
    (c) => c.name && c.name.trim().length > 0 && c.mobile && c.mobile.trim().length > 0
  );

  return (
    <div className="space-y-6">
      {/* Hero Welcome & Estate Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-medium mb-3">
            <Calendar className="w-3.5 h-3.5" />
            <span>Sheet Baseline Date: {vault.currentDate} · Year {vault.currentYear}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            What My Family Should Know: Financial & Document Dossier
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl mb-6">
            A comprehensive, centralized emergency vault containing family identity documents, bank accounts,
            demat platforms, insurance policies, safe lockers, and emergency instructions for{' '}
            <strong className="text-white font-semibold">ganeshbharathi</strong> and family.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onOpenPrint}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-white rounded-lg hover:bg-slate-100 transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4 text-indigo-600" />
              <span>Print Complete Family Binder</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('documents')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg transition-colors"
            >
              <FileCheck2 className="w-4 h-4 text-indigo-300" />
              <span>View 19 Financial Documents</span>
            </button>
          </div>
        </div>
      </div>

      {/* Readiness & Urgency Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Readiness Score Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900">Emergency Readiness</h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                {readiness.rating}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-4">
              <span className="text-4xl font-bold font-mono tabular-nums text-slate-900">
                {readiness.overallScore}%
              </span>
              <span className="text-xs text-slate-500">Completeness across 5 core domains</span>
            </div>

            {/* Category breakdown bars */}
            <div className="space-y-3 pt-2">
              {readiness.categories.map((cat) => (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">{cat.name}</span>
                    <span className="font-mono tabular-nums text-slate-700 font-medium">{cat.score}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        cat.score >= 80 ? 'bg-emerald-500' : cat.score >= 50 ? 'bg-indigo-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${cat.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Critical legal Will location needed</span>
            <button
              type="button"
              onClick={() => onNavigateTab('documents')}
              className="text-indigo-600 font-medium hover:underline inline-flex items-center gap-1"
            >
              Update Vault <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Attention & Expiry Alert Center */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between lg:col-span-2">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-semibold text-slate-900">Critical Expiry & Attention Items</h2>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {readiness.urgentAlerts.length} Action{readiness.urgentAlerts.length === 1 ? '' : 's'}
              </span>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Automated expiry watch calculated relative to current baseline date (October 2026):
            </p>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {readiness.urgentAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 ${
                    alert.severity === 'high'
                      ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                      : 'bg-amber-50/70 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{alert.title}</span>
                    </div>
                    <p className="text-[11px] opacity-90">{alert.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (alert.category === 'Documents') onNavigateTab('documents');
                      else if (alert.category === 'Investments') onNavigateTab('investments');
                      else if (alert.category === 'Insurance') onNavigateTab('insurance');
                      else onNavigateTab('contacts');
                    }}
                    className="shrink-0 text-[11px] font-medium px-2 py-1 rounded bg-white border border-slate-200 shadow-2xs hover:bg-slate-50"
                  >
                    Resolve
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Driving license valid until 2038
            </span>
            <span className="font-mono text-[11px]">Passport renewal due: Aug 2027</span>
          </div>
        </div>
      </div>

      {/* Immediate Emergency Contacts Strip */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Emergency Family Speed-Dial</h2>
            <p className="text-xs text-slate-500">First response contacts ready for instant communication</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('contacts')}
            className="text-xs font-medium text-indigo-600 hover:underline inline-flex items-center gap-1"
          >
            Manage All 9 Contacts <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {primaryContacts.map((contact) => (
            <div
              key={contact.id}
              className="p-4 rounded-lg bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
                    {contact.particulars}
                  </span>
                  {contact.particulars === 'Self' && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-medium">
                      Primary
                    </span>
                  )}
                  {contact.particulars === 'MOM' && (
                    <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-medium">
                      Mother
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-slate-900">{contact.name}</h3>
                <p className="text-xs text-slate-600 font-mono mt-1">{contact.mobile}</p>
                {contact.email && (
                  <p className="text-xs text-slate-500 truncate mt-0.5">{contact.email}</p>
                )}
              </div>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-200/60">
                {contact.mobile && (
                  <a
                    href={`tel:${contact.mobile.split(/[\/\n]/)[0].trim()}`}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>
                )}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email</span>
                  </a>
                )}
              </div>
            </div>
          ))}

          {/* Prompt to add Doctor / Lawyer */}
          <div className="p-4 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 flex flex-col items-center justify-center text-center">
            <h3 className="text-xs font-semibold text-slate-800 mb-1">Add Family Doctor & CA</h3>
            <p className="text-[11px] text-slate-500 mb-3">Keep trusted advisors accessible to family</p>
            <button
              type="button"
              onClick={() => onNavigateTab('contacts')}
              className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
            >
              Fill Contact Information
            </button>
          </div>
        </div>
      </div>

      {/* High-Level Vault Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <button
          type="button"
          onClick={() => onNavigateTab('documents')}
          className="p-3.5 bg-white border border-slate-200 rounded-xl text-left hover:border-indigo-300 transition-colors shadow-2xs group"
        >
          <span className="text-[11px] text-slate-500 block">Identity Docs</span>
          <span className="text-xl font-bold font-mono text-slate-900 group-hover:text-indigo-600">
            {vault.documents.length}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">PAN, Aadhar, DL</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('investments')}
          className="p-3.5 bg-white border border-slate-200 rounded-xl text-left hover:border-indigo-300 transition-colors shadow-2xs group"
        >
          <span className="text-[11px] text-slate-500 block">Investments</span>
          <span className="text-xl font-bold font-mono text-slate-900 group-hover:text-indigo-600">
            {vault.investments.length}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">MF, FD, Shares, PF</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('investments')}
          className="p-3.5 bg-white border border-slate-200 rounded-xl text-left hover:border-indigo-300 transition-colors shadow-2xs group"
        >
          <span className="text-[11px] text-slate-500 block">Online Portals</span>
          <span className="text-xl font-bold font-mono text-slate-900 group-hover:text-indigo-600">
            {vault.onlineAccounts.length}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">Zerodha, Golden Pi</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('insurance')}
          className="p-3.5 bg-white border border-slate-200 rounded-xl text-left hover:border-indigo-300 transition-colors shadow-2xs group"
        >
          <span className="text-[11px] text-slate-500 block">Insurance</span>
          <span className="text-xl font-bold font-mono text-slate-900 group-hover:text-indigo-600">
            {vault.insurances.length}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">Life, Health, Motor</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('banking')}
          className="p-3.5 bg-white border border-slate-200 rounded-xl text-left hover:border-indigo-300 transition-colors shadow-2xs group"
        >
          <span className="text-[11px] text-slate-500 block">Bank Lockers</span>
          <span className="text-xl font-bold font-mono text-slate-900 group-hover:text-indigo-600">
            {vault.lockers.length}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">SBI Main Branch</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('passwords')}
          className="p-3.5 bg-white border border-slate-200 rounded-xl text-left hover:border-indigo-300 transition-colors shadow-2xs group"
        >
          <span className="text-[11px] text-slate-500 block">Emergency Access</span>
          <span className="text-xl font-bold font-mono text-slate-900 group-hover:text-indigo-600">
            {vault.passwords.length}
          </span>
          <span className="text-[10px] text-slate-400 block mt-1">Master Keys & 2FA</span>
        </button>
      </div>

      {/* Document Physical vs Virtual Storage Directory */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-slate-600" />
            <h2 className="text-sm font-semibold text-slate-900">Document Location Map</h2>
          </div>
          <span className="text-xs text-slate-500">Quick physical & cloud references</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <h3 className="text-xs font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              Virtual / Cloud Folder: "1 - BHARATHI Docs"
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Stored in secure cloud drive with e-Aadhar, scanned PAN, DL copy, ITR acknowledgment & TN Employment certificate.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {vault.documents
                .filter((d) => d.virtualLocation.includes('BHARATHI'))
                .map((d) => (
                  <span
                    key={d.id}
                    className="text-[11px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-mono"
                  >
                    {d.documentName}
                  </span>
                ))}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <h3 className="text-xs font-semibold text-slate-900 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              Physical File & Wallet Locations
            </h3>
            <p className="text-[11px] text-slate-500 mb-3">
              Original paper records, booklets, and plastic smart cards kept in physical locations.
            </p>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between items-center bg-white px-2.5 py-1 rounded border border-slate-200">
                <span>Passport (R4417463)</span>
                <span className="font-semibold text-slate-900">Physical File</span>
              </div>
              <div className="flex justify-between items-center bg-white px-2.5 py-1 rounded border border-slate-200">
                <span>Driving License (TN93 20180002121)</span>
                <span className="font-semibold text-slate-900">Personal Wallet</span>
              </div>
              <div className="flex justify-between items-center bg-white px-2.5 py-1 rounded border border-slate-200">
                <span>SBI Locker Key (L-24)</span>
                <span className="font-semibold text-slate-900">Master Wardrobe Safe</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
