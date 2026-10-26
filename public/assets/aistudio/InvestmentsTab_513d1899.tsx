import React, { useState } from 'react';
import {
  TrendingUp,
  Globe,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Building,
} from 'lucide-react';
import { OnlineAccount, InvestmentAccount } from './types.ts';
import { maskSensitive } from './calculations.ts';

interface InvestmentsTabProps {
  onlineAccounts: OnlineAccount[];
  investments: InvestmentAccount[];
  isMasked: boolean;
  onUpdateOnlineAccount: (acc: OnlineAccount) => void;
  onAddOnlineAccount: (acc: Omit<OnlineAccount, 'id'>) => void;
  onDeleteOnlineAccount: (id: string) => void;
  onUpdateInvestment: (inv: InvestmentAccount) => void;
  onAddInvestment: (inv: Omit<InvestmentAccount, 'id'>) => void;
  onDeleteInvestment: (id: string) => void;
}

export const InvestmentsTab: React.FC<InvestmentsTabProps> = ({
  onlineAccounts,
  investments,
  isMasked,
  onUpdateOnlineAccount,
  onAddOnlineAccount,
  onDeleteOnlineAccount,
  onUpdateInvestment,
  onAddInvestment,
  onDeleteInvestment,
}) => {
  const [editingOnline, setEditingOnline] = useState<OnlineAccount | null>(null);
  const [isAddingOnline, setIsAddingOnline] = useState(false);
  const [newOnline, setNewOnline] = useState({
    platform: '',
    email: '',
    mobile: '',
    accountId: '',
    remarks: '',
  });

  const [editingInv, setEditingInv] = useState<InvestmentAccount | null>(null);
  const [isAddingInv, setIsAddingInv] = useState(false);
  const [newInv, setNewInv] = useState({
    investmentType: 'Mutual Funds',
    platform: '',
    accountHolderName: 'ganeshbharathi',
    agentOrAdvisor: '',
    accountNumber: '',
    nominee: 'Santhi',
    maturityDate: '',
    linkedBank: 'SBI Savings Account',
    regMobile: '9787004065',
    regEmail: 'ganeshbharathi99@gmail.com',
    remarks: '',
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveOnlineEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingOnline) {
      onUpdateOnlineAccount(editingOnline);
      setEditingOnline(null);
    }
  };

  const handleSaveOnlineNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOnline.platform) return;
    onAddOnlineAccount({
      srNo: onlineAccounts.length + 1,
      platform: newOnline.platform,
      email: newOnline.email,
      mobile: newOnline.mobile,
      accountId: newOnline.accountId,
      remarks: newOnline.remarks,
    });
    setNewOnline({ platform: '', email: '', mobile: '', accountId: '', remarks: '' });
    setIsAddingOnline(false);
  };

  const handleSaveInvEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingInv) {
      onUpdateInvestment(editingInv);
      setEditingInv(null);
    }
  };

  const handleSaveInvNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInv.platform || !newInv.accountNumber) return;
    onAddInvestment({
      srNo: investments.length + 1,
      investmentType: newInv.investmentType,
      platform: newInv.platform,
      accountHolderName: newInv.accountHolderName,
      agentOrAdvisor: newInv.agentOrAdvisor,
      accountNumber: newInv.accountNumber,
      nominee: newInv.nominee,
      maturityDate: newInv.maturityDate,
      linkedBank: newInv.linkedBank,
      regMobile: newInv.regMobile,
      regEmail: newInv.regEmail,
      remarks: newInv.remarks,
    });
    setNewInv({
      investmentType: 'Mutual Funds',
      platform: '',
      accountHolderName: 'ganeshbharathi',
      agentOrAdvisor: '',
      accountNumber: '',
      nominee: 'Santhi',
      maturityDate: '',
      linkedBank: 'SBI Savings Account',
      regMobile: '9787004065',
      regEmail: 'ganeshbharathi99@gmail.com',
      remarks: '',
    });
    setIsAddingInv(false);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Investments & Online Financial Portals
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Registered online accounts, Demat BO IDs, Mutual Funds, Fixed Deposits, PPF, and EPF
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddingOnline(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span>Add Portal</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddingInv(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Investment</span>
          </button>
        </div>
      </div>

      {/* Online Accounts Strip (Golden Pi, Wint Wealth, Zerodha, CDSL) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-900">
              Online Accounts - Related to Finance ({onlineAccounts.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">Registered Mobile: 9787004065</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {onlineAccounts.map((acc) => (
            <div
              key={acc.id}
              className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between hover:border-indigo-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900">{acc.platform}</span>
                  <button
                    type="button"
                    aria-label={`Edit ${acc.platform}`}
                    onClick={() => setEditingOnline(acc)}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="text-slate-600 truncate">
                    <span className="text-[11px] text-slate-400 block">Registered Email</span>
                    {acc.email}
                  </div>
                  {acc.accountId && (
                    <div className="pt-1.5">
                      <span className="text-[11px] text-slate-400 block">Demat / BO ID</span>
                      <div className="flex items-center gap-1.5 font-mono font-medium text-slate-900">
                        <span>{maskSensitive(acc.accountId, isMasked, 'account')}</span>
                        <button
                          type="button"
                          aria-label="Copy account ID"
                          onClick={() => handleCopy(acc.accountId!, acc.id)}
                          className="p-0.5 text-slate-400 hover:text-slate-600"
                        >
                          {copiedId === acc.id ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                  {acc.remarks && (
                    <p className="text-[11px] text-slate-500 pt-1 leading-relaxed">{acc.remarks}</p>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Mob: {acc.mobile || '9787004065'}</span>
                <span className="text-emerald-700 font-sans">Active</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Investment Account Details Table (Part 1 & Part 2 combined) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Investment Account Portfolio & Nominees
            </h2>
            <p className="text-xs text-slate-500">
              Combined Part 1 & Part 2: Platform, Folio/Account, Nominees, Maturity and Linked Bank
            </p>
          </div>
          <span className="text-xs text-slate-500">{investments.length} Folios / Accounts</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-4">Investment Type</th>
                <th className="py-2.5 px-4">Platform / Entity</th>
                <th className="py-2.5 px-4">Account / Folio No.</th>
                <th className="py-2.5 px-4">Holder Name</th>
                <th className="py-2.5 px-4">Nominee(s)</th>
                <th className="py-2.5 px-4">Maturity / Terms</th>
                <th className="py-2.5 px-4">Linked Bank</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {investments.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 text-center font-mono text-slate-400">{inv.srNo}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    {inv.investmentType}
                    {inv.agentOrAdvisor && (
                      <div className="text-[10px] text-slate-400 font-normal">
                        Advisor: {inv.agentOrAdvisor}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-indigo-950">{inv.platform}</span>
                    {inv.remarks && (
                      <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{inv.remarks}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-800">
                    {maskSensitive(inv.accountNumber, isMasked, 'account')}
                  </td>
                  <td className="py-3 px-4 text-slate-700">{inv.accountHolderName}</td>
                  <td className="py-3 px-4">
                    {inv.nominee ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {inv.nominee}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-medium">
                        <AlertCircle className="w-3 h-3" />
                        No Nominee
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">{inv.maturityDate || 'Open-ended'}</td>
                  <td className="py-3 px-4 text-slate-600">
                    <div className="flex items-center gap-1">
                      <Building className="w-3 h-3 text-slate-400" />
                      <span>{inv.linkedBank || 'SBI Savings'}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${inv.investmentType}`}
                        onClick={() => setEditingInv(inv)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {inv.srNo > 5 && (
                        <button
                          type="button"
                          aria-label={`Delete ${inv.investmentType}`}
                          onClick={() => onDeleteInvestment(inv.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Online Portal Modal */}
      {editingOnline && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Edit Platform: {editingOnline.platform}</h3>
            <form onSubmit={handleSaveOnlineEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Platform Name</label>
                <input
                  type="text"
                  value={editingOnline.platform}
                  onChange={(e) => setEditingOnline({ ...editingOnline, platform: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Email</label>
                <input
                  type="email"
                  value={editingOnline.email}
                  onChange={(e) => setEditingOnline({ ...editingOnline, email: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Registered Mobile</label>
                <input
                  type="text"
                  value={editingOnline.mobile}
                  onChange={(e) => setEditingOnline({ ...editingOnline, mobile: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account ID / DP BO ID</label>
                <input
                  type="text"
                  value={editingOnline.accountId || ''}
                  onChange={(e) => setEditingOnline({ ...editingOnline, accountId: e.target.value })}
                  placeholder="e.g., 12081601 57789711"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={editingOnline.remarks || ''}
                  onChange={(e) => setEditingOnline({ ...editingOnline, remarks: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOnline(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Investment Modal */}
      {editingInv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Edit Investment: {editingInv.investmentType}</h3>
            <form onSubmit={handleSaveInvEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Investment Type</label>
                  <input
                    type="text"
                    value={editingInv.investmentType}
                    onChange={(e) => setEditingInv({ ...editingInv, investmentType: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Platform / Entity</label>
                  <input
                    type="text"
                    value={editingInv.platform}
                    onChange={(e) => setEditingInv({ ...editingInv, platform: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account / Folio Number</label>
                  <input
                    type="text"
                    value={editingInv.accountNumber}
                    onChange={(e) => setEditingInv({ ...editingInv, accountNumber: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    value={editingInv.accountHolderName}
                    onChange={(e) => setEditingInv({ ...editingInv, accountHolderName: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nominee(s)</label>
                  <input
                    type="text"
                    value={editingInv.nominee}
                    onChange={(e) => setEditingInv({ ...editingInv, nominee: e.target.value })}
                    placeholder="e.g., Santhi (100%)"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Maturity Date / SIP</label>
                  <input
                    type="text"
                    value={editingInv.maturityDate || ''}
                    onChange={(e) => setEditingInv({ ...editingInv, maturityDate: e.target.value })}
                    placeholder="e.g., Open-ended SIP or 14-Sep-2027"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Linked Bank</label>
                  <input
                    type="text"
                    value={editingInv.linkedBank || ''}
                    onChange={(e) => setEditingInv({ ...editingInv, linkedBank: e.target.value })}
                    placeholder="e.g., SBI Savings"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Agent / Advisor</label>
                  <input
                    type="text"
                    value={editingInv.agentOrAdvisor || ''}
                    onChange={(e) => setEditingInv({ ...editingInv, agentOrAdvisor: e.target.value })}
                    placeholder="e.g., Direct / Branch Manager"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={editingInv.remarks || ''}
                  onChange={(e) => setEditingInv({ ...editingInv, remarks: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingInv(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
