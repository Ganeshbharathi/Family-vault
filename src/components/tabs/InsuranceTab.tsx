import React, { useState } from 'react';
import {
  Shield,
  HeartPulse,
  Car,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  IndianRupee,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { InsurancePolicy } from '../../types/vault.ts';
import { maskSensitive } from '../../utils/vaultCalculations.ts';

interface InsuranceTabProps {
  insurances: InsurancePolicy[];
  isMasked: boolean;
  onUpdateInsurance: (policy: InsurancePolicy) => void;
  onAddInsurance: (policy: Omit<InsurancePolicy, 'id'>) => void;
  onDeleteInsurance: (id: string) => void;
}

export const InsuranceTab: React.FC<InsuranceTabProps> = ({
  insurances,
  isMasked,
  onUpdateInsurance,
  onAddInsurance,
  onDeleteInsurance,
}) => {
  const [editingPolicy, setEditingPolicy] = useState<InsurancePolicy | null>(null);
  const [isAddingPolicy, setIsAddingPolicy] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    type: 'Life',
    policyName: '',
    policyNumber: '',
    coveredPerson: 'ganeshbharathi',
    amountInsured: '',
    nominee: 'Santhi',
    advisor: '',
    validTill: '',
    premiumAmount: '',
    premiumDueDate: '',
    remarks: '',
  });

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPolicy) {
      onUpdateInsurance(editingPolicy);
      setEditingPolicy(null);
    }
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPolicy.policyName || !newPolicy.policyNumber) return;
    onAddInsurance({
      srNo: insurances.length + 1,
      type: newPolicy.type,
      policyName: newPolicy.policyName,
      policyNumber: newPolicy.policyNumber,
      coveredPerson: newPolicy.coveredPerson,
      amountInsured: newPolicy.amountInsured,
      nominee: newPolicy.nominee,
      advisor: newPolicy.advisor,
      validTill: newPolicy.validTill,
      premiumAmount: newPolicy.premiumAmount,
      premiumDueDate: newPolicy.premiumDueDate,
      remarks: newPolicy.remarks,
    });
    setNewPolicy({
      type: 'Life',
      policyName: '',
      policyNumber: '',
      coveredPerson: 'ganeshbharathi',
      amountInsured: '',
      nominee: 'Santhi',
      advisor: '',
      validTill: '',
      premiumAmount: '',
      premiumDueDate: '',
      remarks: '',
    });
    setIsAddingPolicy(false);
  };

  const getPolicyIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('health') || t.includes('mediclaim')) return <HeartPulse className="w-5 h-5 text-rose-600" />;
    if (t.includes('car') || t.includes('motor') || t.includes('vehicle')) return <Car className="w-5 h-5 text-indigo-600" />;
    return <Shield className="w-5 h-5 text-emerald-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            Life, Health & Motor Insurance Policies
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete policy schedule, cover amounts, nominee protection, and premium due calendars
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingPolicy(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Policy</span>
        </button>
      </div>

      {/* Basic Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insurances.map((policy) => (
          <div
            key={policy.id}
            className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    {getPolicyIcon(policy.type)}
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                      {policy.type} Insurance
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{policy.policyName}</h3>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Edit ${policy.policyName}`}
                  onClick={() => setEditingPolicy(policy)}
                  className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 py-2 border-y border-slate-100 text-xs">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Policy No.</span>
                  <span className="font-mono font-medium text-slate-900">
                    {maskSensitive(policy.policyNumber, isMasked, 'generic')}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Covered Person</span>
                  <span className="font-medium text-slate-800">{policy.coveredPerson}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Sum Insured</span>
                  <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {policy.amountInsured}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-500">Nominee</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-indigo-500" />
                    {policy.nominee}
                  </span>
                </div>
              </div>

              {policy.remarks && (
                <p className="text-[11px] text-slate-500 mt-2.5 leading-relaxed">{policy.remarks}</p>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Due: {policy.premiumDueDate || 'Annual'}
              </span>
              <span className="font-mono font-semibold text-slate-800">{policy.premiumAmount}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Premium Details Schedule Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Life, Health & Other Insurance - Premium Details Schedule
          </h2>
          <span className="text-xs text-slate-500">Annual cashflow & calendar</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-4">Policy Name</th>
                <th className="py-2.5 px-4">Policy Number</th>
                <th className="py-2.5 px-4">Valid Till</th>
                <th className="py-2.5 px-4">Premium (Rs.)</th>
                <th className="py-2.5 px-4">Premium Due Date</th>
                <th className="py-2.5 px-4">Remarks</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {insurances.map((policy) => (
                <tr key={policy.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 text-center font-mono text-slate-400">{policy.srNo}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{policy.policyName}</td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-800">
                    {maskSensitive(policy.policyNumber, isMasked, 'generic')}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">{policy.validTill || 'Lifelong'}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{policy.premiumAmount || '—'}</td>
                  <td className="py-3 px-4 font-mono font-medium text-indigo-700">
                    {policy.premiumDueDate || '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{policy.remarks || '—'}</td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${policy.policyName}`}
                        onClick={() => setEditingPolicy(policy)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {policy.srNo > 3 && (
                        <button
                          type="button"
                          aria-label={`Delete ${policy.policyName}`}
                          onClick={() => onDeleteInsurance(policy.id)}
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

      {/* Edit Policy Modal */}
      {editingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Edit Policy: {editingPolicy.policyName}</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Policy Type</label>
                  <select
                    value={editingPolicy.type}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, type: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                  >
                    <option value="Life">Life Insurance</option>
                    <option value="Health">Health Insurance</option>
                    <option value="Car">Car / Motor Insurance</option>
                    <option value="Home">Home Insurance</option>
                    <option value="Other">Other Policy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Policy Name</label>
                  <input
                    type="text"
                    value={editingPolicy.policyName}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, policyName: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Policy Number</label>
                  <input
                    type="text"
                    value={editingPolicy.policyNumber}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, policyNumber: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sum Insured Amount</label>
                  <input
                    type="text"
                    value={editingPolicy.amountInsured}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, amountInsured: e.target.value })}
                    placeholder="e.g., ₹ 1,00,00,000"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Covered Person</label>
                  <input
                    type="text"
                    value={editingPolicy.coveredPerson}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, coveredPerson: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nominee</label>
                  <input
                    type="text"
                    value={editingPolicy.nominee}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, nominee: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Premium Amount</label>
                  <input
                    type="text"
                    value={editingPolicy.premiumAmount || ''}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, premiumAmount: e.target.value })}
                    placeholder="e.g., ₹ 18,450 / yr"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="text"
                    value={editingPolicy.premiumDueDate || ''}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, premiumDueDate: e.target.value })}
                    placeholder="e.g., 15-Dec"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Valid Till</label>
                  <input
                    type="text"
                    value={editingPolicy.validTill || ''}
                    onChange={(e) => setEditingPolicy({ ...editingPolicy, validTill: e.target.value })}
                    placeholder="e.g., 15-Dec-2055"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Hospital TPA</label>
                <input
                  type="text"
                  value={editingPolicy.remarks || ''}
                  onChange={(e) => setEditingPolicy({ ...editingPolicy, remarks: e.target.value })}
                  placeholder="e.g., Star Health Card, Cashless hospital desk info"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPolicy(null)}
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
