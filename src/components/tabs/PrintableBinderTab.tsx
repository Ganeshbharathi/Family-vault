import React from 'react';
import {
  Printer,
  ShieldCheck,
  FileText,
  Users,
  CreditCard,
  Building2,
  TrendingUp,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import { VaultState } from '../../types/vault.ts';
import { maskSensitive } from '../../utils/vaultCalculations.ts';

interface PrintableBinderTabProps {
  vault: VaultState;
  isMasked: boolean;
  onToggleMask: () => void;
}

export const PrintableBinderTab: React.FC<PrintableBinderTabProps> = ({
  vault,
  isMasked,
  onToggleMask,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Controls (Hidden during print) */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-600" />
            Printable Family Emergency Binder
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Format prepared for physical printing or saving as a secure offline PDF dossier.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleMask}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              isMasked ? 'bg-amber-50 text-amber-900 border-amber-200' : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            {isMasked ? <EyeOff className="w-3.5 h-3.5 text-amber-700" /> : <Eye className="w-3.5 h-3.5" />}
            <span>Print {isMasked ? 'Masked' : 'Unmasked'} Numbers</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Binder / Save PDF</span>
          </button>
        </div>
      </div>

      {/* The Printable Dossier Container */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 shadow-sm space-y-8 text-slate-900 print:border-none print:shadow-none print:p-0">
        {/* Cover Header */}
        <div className="border-b-2 border-slate-900 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs uppercase tracking-widest font-bold text-indigo-700 block mb-1">
                Family Emergency Dossier
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                What My Family Should Know
              </h1>
              <p className="text-xs text-slate-500 mt-1 font-mono">
                Primary Account Holder: <strong>ganeshbharathi</strong> · Baseline Date: {vault.currentDate}
              </p>
            </div>
            <div className="text-right text-xs text-slate-500 hidden sm:block">
              <span className="font-bold text-slate-800 block">Strictly Confidential</span>
              <span>Keep with Home Safe / Bank Locker Key</span>
            </div>
          </div>
        </div>

        {/* Section 1: Immediate Emergency Contacts */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-600 no-print" />
            1. Important Contacts for Family
          </h2>
          <table className="w-full text-left text-xs border border-slate-200 border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="p-2 w-10 text-center">#</th>
                <th className="p-2">Role / Particulars</th>
                <th className="p-2">Name of Contact</th>
                <th className="p-2">Mobile</th>
                <th className="p-2">Email</th>
                <th className="p-2">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {vault.contacts.map((c) => (
                <tr key={c.id}>
                  <td className="p-2 text-center font-mono">{c.srNo}</td>
                  <td className="p-2 font-semibold">{c.particulars}</td>
                  <td className="p-2">{c.name || '—'}</td>
                  <td className="p-2 font-mono">{c.mobile || '—'}</td>
                  <td className="p-2">{c.email || '—'}</td>
                  <td className="p-2 text-slate-600">{c.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 2: Important Financial Documents */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600 no-print" />
            2. Important Financial Documents & Locations
          </h2>
          <table className="w-full text-left text-xs border border-slate-200 border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="p-2 w-10 text-center">#</th>
                <th className="p-2">Document Name</th>
                <th className="p-2">Document Number</th>
                <th className="p-2">Physical Location</th>
                <th className="p-2">Virtual Location</th>
                <th className="p-2">Expiry Date / Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {vault.documents.map((d) => (
                <tr key={d.id}>
                  <td className="p-2 text-center font-mono">{d.srNo}</td>
                  <td className="p-2 font-semibold">{d.documentName}</td>
                  <td className="p-2 font-mono">{maskSensitive(d.documentNumber, isMasked, 'generic') || '—'}</td>
                  <td className="p-2">{d.physicalLocation || '—'}</td>
                  <td className="p-2">{d.virtualLocation || '—'}</td>
                  <td className="p-2 font-mono">{d.expiryDate || d.statusNote || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 3: Online Accounts & Investments */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600 no-print" />
            3. Investments, Demat & Online Finance Accounts
          </h2>
          <table className="w-full text-left text-xs border border-slate-200 border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="p-2 w-10 text-center">#</th>
                <th className="p-2">Investment / Platform</th>
                <th className="p-2">Account / Folio No.</th>
                <th className="p-2">Holder Name</th>
                <th className="p-2">Nominee(s)</th>
                <th className="p-2">Linked Bank</th>
                <th className="p-2">Maturity / Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {vault.investments.map((inv) => (
                <tr key={inv.id}>
                  <td className="p-2 text-center font-mono">{inv.srNo}</td>
                  <td className="p-2 font-semibold">
                    {inv.investmentType} ({inv.platform})
                  </td>
                  <td className="p-2 font-mono">{maskSensitive(inv.accountNumber, isMasked, 'account')}</td>
                  <td className="p-2">{inv.accountHolderName}</td>
                  <td className="p-2 font-medium">{inv.nominee || '—'}</td>
                  <td className="p-2">{inv.linkedBank || '—'}</td>
                  <td className="p-2 text-slate-600">{inv.maturityDate || inv.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 4: Insurance Policies */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600 no-print" />
            4. Life, Health & Motor Insurance Policies
          </h2>
          <table className="w-full text-left text-xs border border-slate-200 border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="p-2 w-10 text-center">#</th>
                <th className="p-2">Policy Name & Type</th>
                <th className="p-2">Policy Number</th>
                <th className="p-2">Sum Insured</th>
                <th className="p-2">Nominee</th>
                <th className="p-2">Premium & Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {vault.insurances.map((ins) => (
                <tr key={ins.id}>
                  <td className="p-2 text-center font-mono">{ins.srNo}</td>
                  <td className="p-2 font-semibold">
                    {ins.policyName} ({ins.type})
                  </td>
                  <td className="p-2 font-mono">{maskSensitive(ins.policyNumber, isMasked, 'generic')}</td>
                  <td className="p-2 font-bold">{ins.amountInsured}</td>
                  <td className="p-2 font-medium">{ins.nominee}</td>
                  <td className="p-2 font-mono">{ins.premiumAmount} (Due: {ins.premiumDueDate || '—'})</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section 5: Lockers, Cards & Access */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-indigo-600 no-print" />
              5. Safe Deposit Lockers
            </h2>
            <div className="space-y-2 text-xs">
              {vault.lockers.map((l) => (
                <div key={l.id} className="p-3 border border-slate-200 rounded">
                  <div className="font-bold text-slate-900">
                    {l.bankAndBranch} — Locker #{l.lockerNumber}
                  </div>
                  <div className="text-slate-600 mt-1">In Name Of: {l.inNameOf} · Nominee: {l.nominee}</div>
                  <div className="text-slate-600 font-mono mt-0.5">
                    Account: {maskSensitive(l.accountNumber, isMasked, 'account')}
                  </div>
                  {l.codeOrRemarks && (
                    <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded mt-2 border border-amber-200">
                      <strong>Key Location / Notes:</strong> {l.codeOrRemarks}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1.5 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600 no-print" />
              6. Emergency Access & Trusted Custodians
            </h2>
            <div className="space-y-2 text-xs">
              {vault.passwords.map((p) => (
                <div key={p.id} className="p-3 border border-slate-200 rounded">
                  <div className="font-bold text-slate-900">{p.loginKind}</div>
                  <div className="text-indigo-950 mt-1 font-medium">Custodians Aware: {p.personAware}</div>
                  <div className="text-slate-600 mt-0.5">{p.remarks}</div>
                  {p.instructions && (
                    <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded mt-1.5 border border-slate-200">
                      {p.instructions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
          Generated from Vault · Family Financial Dossier · Confidential Personal Document
        </div>
      </div>
    </div>
  );
};
