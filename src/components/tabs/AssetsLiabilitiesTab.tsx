import React, { useState } from 'react';
import {
  Building2,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Home,
  Receipt,
  FileCheck,
} from 'lucide-react';
import { PropertyDetail, LiabilityDetail } from '../../types/vault.ts';

interface AssetsLiabilitiesTabProps {
  properties: PropertyDetail[];
  liabilities: LiabilityDetail[];
  isMasked: boolean;
  onUpdateProperty: (prop: PropertyDetail) => void;
  onAddProperty: (prop: Omit<PropertyDetail, 'id'>) => void;
  onDeleteProperty: (id: string) => void;
  onUpdateLiability: (lia: LiabilityDetail) => void;
  onAddLiability: (lia: Omit<LiabilityDetail, 'id'>) => void;
  onDeleteLiability: (id: string) => void;
}

export const AssetsLiabilitiesTab: React.FC<AssetsLiabilitiesTabProps> = ({
  properties,
  liabilities,
  isMasked,
  onUpdateProperty,
  onAddProperty,
  onDeleteProperty,
  onUpdateLiability,
  onAddLiability,
  onDeleteLiability,
}) => {
  const [editingProp, setEditingProp] = useState<PropertyDetail | null>(null);
  const [isAddingProp, setIsAddingProp] = useState(false);
  const [newProp, setNewProp] = useState({
    propertyName: '',
    propertyArea: '',
    owners: 'ganeshbharathi',
    registrationNumber: '',
    nominee: 'Santhi',
    remarks: '',
  });

  const [editingLia, setEditingLia] = useState<LiabilityDetail | null>(null);
  const [isAddingLia, setIsAddingLia] = useState(false);
  const [newLia, setNewLia] = useState({
    bankOrLender: '',
    liabilityType: 'Home Loan',
    amount: '',
    terms: '',
    remarks: '',
  });

  const handleSavePropEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProp) {
      onUpdateProperty(editingProp);
      setEditingProp(null);
    }
  };

  const handleSavePropNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProp.propertyName) return;
    onAddProperty({
      srNo: properties.length + 1,
      propertyName: newProp.propertyName,
      propertyArea: newProp.propertyArea,
      owners: newProp.owners,
      registrationNumber: newProp.registrationNumber,
      nominee: newProp.nominee,
      remarks: newProp.remarks,
    });
    setNewProp({
      propertyName: '',
      propertyArea: '',
      owners: 'ganeshbharathi',
      registrationNumber: '',
      nominee: 'Santhi',
      remarks: '',
    });
    setIsAddingProp(false);
  };

  const handleSaveLiaEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLia) {
      onUpdateLiability(editingLia);
      setEditingLia(null);
    }
  };

  const handleSaveLiaNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLia.bankOrLender || !newLia.amount) return;
    onAddLiability({
      srNo: liabilities.length + 1,
      bankOrLender: newLia.bankOrLender,
      liabilityType: newLia.liabilityType,
      amount: newLia.amount,
      terms: newLia.terms,
      remarks: newLia.remarks,
    });
    setNewLia({
      bankOrLender: '',
      liabilityType: 'Home Loan',
      amount: '',
      terms: '',
      remarks: '',
    });
    setIsAddingLia(false);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            Real Estate Properties & Liabilities
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Immovable property titles, registration deeds, bank loans, and repayment schedules
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddingProp(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span>Add Property</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddingLia(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Liability</span>
          </button>
        </div>
      </div>

      {/* Properties Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-900">
              Property Details ({properties.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">From sheet tab: "Property Details"</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-4">Property Name / Description</th>
                <th className="py-2.5 px-4">Property Area</th>
                <th className="py-2.5 px-4">Owner(s)</th>
                <th className="py-2.5 px-4">Registration No.</th>
                <th className="py-2.5 px-4">Nominee</th>
                <th className="py-2.5 px-4">Remarks</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {properties.map((prop) => (
                <tr key={prop.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 text-center font-mono text-slate-400">{prop.srNo}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{prop.propertyName}</td>
                  <td className="py-3 px-4 font-mono text-slate-700">{prop.propertyArea}</td>
                  <td className="py-3 px-4 text-slate-700">{prop.owners}</td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-800">
                    {prop.registrationNumber || '—'}
                  </td>
                  <td className="py-3 px-4 font-medium text-emerald-800">{prop.nominee || '—'}</td>
                  <td className="py-3 px-4 text-slate-500">{prop.remarks || '—'}</td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${prop.propertyName}`}
                        onClick={() => setEditingProp(prop)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {prop.srNo > 1 && (
                        <button
                          type="button"
                          aria-label={`Delete ${prop.propertyName}`}
                          onClick={() => onDeleteProperty(prop.id)}
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

      {/* Liabilities / Loans Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-900">
              Liabilities & Loan Details ({liabilities.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">From sheet tab: "Liability details"</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-4">Bank / Lender</th>
                <th className="py-2.5 px-4">Liability Type</th>
                <th className="py-2.5 px-4">Outstanding Amount</th>
                <th className="py-2.5 px-4">EMI & Terms</th>
                <th className="py-2.5 px-4">Remarks</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {liabilities.map((lia) => (
                <tr key={lia.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 text-center font-mono text-slate-400">{lia.srNo}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{lia.bankOrLender}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-800">
                      {lia.liabilityType}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{lia.amount}</td>
                  <td className="py-3 px-4 font-mono text-slate-700">{lia.terms}</td>
                  <td className="py-3 px-4 text-slate-500">{lia.remarks || '—'}</td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${lia.bankOrLender}`}
                        onClick={() => setEditingLia(lia)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {lia.srNo > 1 && (
                        <button
                          type="button"
                          aria-label={`Delete ${lia.bankOrLender}`}
                          onClick={() => onDeleteLiability(lia.id)}
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

      {/* Edit Property Modal */}
      {editingProp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Edit Property</h3>
            <form onSubmit={handleSavePropEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Property Name</label>
                <input
                  type="text"
                  value={editingProp.propertyName}
                  onChange={(e) => setEditingProp({ ...editingProp, propertyName: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Property Area</label>
                  <input
                    type="text"
                    value={editingProp.propertyArea}
                    onChange={(e) => setEditingProp({ ...editingProp, propertyArea: e.target.value })}
                    placeholder="e.g., 1200 sq.ft"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Name(s)</label>
                  <input
                    type="text"
                    value={editingProp.owners}
                    onChange={(e) => setEditingProp({ ...editingProp, owners: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Registration No.</label>
                  <input
                    type="text"
                    value={editingProp.registrationNumber}
                    onChange={(e) =>
                      setEditingProp({ ...editingProp, registrationNumber: e.target.value })
                    }
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nominee</label>
                  <input
                    type="text"
                    value={editingProp.nominee || ''}
                    onChange={(e) => setEditingProp({ ...editingProp, nominee: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={editingProp.remarks || ''}
                  onChange={(e) => setEditingProp({ ...editingProp, remarks: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProp(null)}
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

      {/* Edit Liability Modal */}
      {editingLia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Edit Liability</h3>
            <form onSubmit={handleSaveLiaEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank / Lender</label>
                <input
                  type="text"
                  value={editingLia.bankOrLender}
                  onChange={(e) => setEditingLia({ ...editingLia, bankOrLender: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Liability Type</label>
                  <input
                    type="text"
                    value={editingLia.liabilityType}
                    onChange={(e) => setEditingLia({ ...editingLia, liabilityType: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount</label>
                  <input
                    type="text"
                    value={editingLia.amount}
                    onChange={(e) => setEditingLia({ ...editingLia, amount: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Terms & EMI</label>
                <input
                  type="text"
                  value={editingLia.terms}
                  onChange={(e) => setEditingLia({ ...editingLia, terms: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={editingLia.remarks || ''}
                  onChange={(e) => setEditingLia({ ...editingLia, remarks: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingLia(null)}
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
