import React, { useState } from 'react';
import {
  CreditCard,
  Lock,
  Plus,
  Edit2,
  Trash2,
  KeyRound,
  ShieldCheck,
  Building,
  UserCheck,
} from 'lucide-react';
import { CardDetail, LockerDetail } from '../../types/vault.ts';
import { maskSensitive } from '../../utils/vaultCalculations.ts';

interface BankingCardsTabProps {
  cards: CardDetail[];
  lockers: LockerDetail[];
  isMasked: boolean;
  onUpdateCard: (card: CardDetail) => void;
  onAddCard: (card: Omit<CardDetail, 'id'>) => void;
  onDeleteCard: (id: string) => void;
  onUpdateLocker: (locker: LockerDetail) => void;
  onAddLocker: (locker: Omit<LockerDetail, 'id'>) => void;
  onDeleteLocker: (id: string) => void;
}

export const BankingCardsTab: React.FC<BankingCardsTabProps> = ({
  cards,
  lockers,
  isMasked,
  onUpdateCard,
  onAddCard,
  onDeleteCard,
  onUpdateLocker,
  onAddLocker,
  onDeleteLocker,
}) => {
  const [editingCard, setEditingCard] = useState<CardDetail | null>(null);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCard, setNewCard] = useState({
    nameOnCard: 'GANESH BHARATHI',
    cardType: 'Debit',
    cardNumber: '',
    linkedAccount: 'SBI Savings',
    regMobile: '9787004065',
    validTill: '',
    remarks: '',
  });

  const [editingLocker, setEditingLocker] = useState<LockerDetail | null>(null);
  const [isAddingLocker, setIsAddingLocker] = useState(false);
  const [newLocker, setNewLocker] = useState({
    bankAndBranch: '',
    accountNumber: '',
    lockerNumber: '',
    inNameOf: 'ganeshbharathi',
    nominee: 'Santhi',
    codeOrRemarks: '',
  });

  const handleSaveCardEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCard) {
      onUpdateCard(editingCard);
      setEditingCard(null);
    }
  };

  const handleSaveCardNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCard.nameOnCard || !newCard.cardNumber) return;
    onAddCard({
      srNo: cards.length + 1,
      nameOnCard: newCard.nameOnCard,
      cardType: newCard.cardType,
      cardNumber: newCard.cardNumber,
      linkedAccount: newCard.linkedAccount,
      regMobile: newCard.regMobile,
      validTill: newCard.validTill,
      remarks: newCard.remarks,
    });
    setNewCard({
      nameOnCard: 'GANESH BHARATHI',
      cardType: 'Debit',
      cardNumber: '',
      linkedAccount: 'SBI Savings',
      regMobile: '9787004065',
      validTill: '',
      remarks: '',
    });
    setIsAddingCard(false);
  };

  const handleSaveLockerEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLocker) {
      onUpdateLocker(editingLocker);
      setEditingLocker(null);
    }
  };

  const handleSaveLockerNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocker.bankAndBranch || !newLocker.lockerNumber) return;
    onAddLocker({
      srNo: lockers.length + 1,
      bankAndBranch: newLocker.bankAndBranch,
      accountNumber: newLocker.accountNumber,
      lockerNumber: newLocker.lockerNumber,
      inNameOf: newLocker.inNameOf,
      nominee: newLocker.nominee,
      codeOrRemarks: newLocker.codeOrRemarks,
    });
    setNewLocker({
      bankAndBranch: '',
      accountNumber: '',
      lockerNumber: '',
      inNameOf: 'ganeshbharathi',
      nominee: 'Santhi',
      codeOrRemarks: '',
    });
    setIsAddingLocker(false);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            Cards & Bank Safe Deposit Lockers
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Debit and credit cards with masked account numbers and bank locker locations with keys & nominees
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddingLocker(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4 text-slate-500" />
            <span>Add Locker</span>
          </button>
          <button
            type="button"
            onClick={() => setIsAddingCard(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Card</span>
          </button>
        </div>
      </div>

      {/* Lockers Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-700" />
            <h2 className="text-sm font-semibold text-slate-900">
              Bank Safe Deposit Lockers ({lockers.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">From sheet tab: "Locker Details"</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {lockers.map((locker) => (
            <div
              key={locker.id}
              className="p-4 rounded-lg bg-slate-50 border border-slate-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{locker.bankAndBranch}</span>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      Locker #{locker.lockerNumber}
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Edit ${locker.lockerNumber}`}
                    onClick={() => setEditingLocker(locker)}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs mt-3">
                  <div className="flex justify-between">
                    <span className="text-slate-500">In the Name of</span>
                    <span className="font-medium text-slate-800">{locker.inNameOf}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Linked Account</span>
                    <span className="font-mono text-slate-700">
                      {maskSensitive(locker.accountNumber, isMasked, 'account')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nominee</span>
                    <span className="font-semibold text-emerald-800 flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-emerald-600" />
                      {locker.nominee || 'Not assigned'}
                    </span>
                  </div>
                </div>

                {locker.codeOrRemarks && (
                  <div className="mt-3 p-2.5 bg-white rounded border border-slate-200 text-[11px] text-slate-600 space-y-0.5">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-amber-600" />
                      Key Location & Instructions
                    </span>
                    <p>{locker.codeOrRemarks}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cards Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Debit / Credit Card Details ({cards.length})
          </h2>
          <span className="text-xs text-slate-500">From sheet tab: "Debit / Credit Card Details"</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-4">Name on Card</th>
                <th className="py-2.5 px-4">Card Type</th>
                <th className="py-2.5 px-4">Card Number</th>
                <th className="py-2.5 px-4">Linked Account</th>
                <th className="py-2.5 px-4">Valid Till</th>
                <th className="py-2.5 px-4">Registered Mobile</th>
                <th className="py-2.5 px-4">Remarks</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {cards.map((card) => (
                <tr key={card.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 text-center font-mono text-slate-400">{card.srNo}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{card.nameOnCard}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase ${
                        card.cardType.toLowerCase() === 'credit'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {card.cardType}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-800">
                    {maskSensitive(card.cardNumber, isMasked, 'card')}
                  </td>
                  <td className="py-3 px-4 text-slate-700">{card.linkedAccount}</td>
                  <td className="py-3 px-4 font-mono text-slate-700">{card.validTill || '—'}</td>
                  <td className="py-3 px-4 font-mono text-slate-700">{card.regMobile}</td>
                  <td className="py-3 px-4 text-slate-500">{card.remarks || '—'}</td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${card.nameOnCard}`}
                        onClick={() => setEditingCard(card)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {card.srNo > 2 && (
                        <button
                          type="button"
                          aria-label={`Delete ${card.nameOnCard}`}
                          onClick={() => onDeleteCard(card.id)}
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

      {/* Edit Card Modal */}
      {editingCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Edit Card</h3>
            <form onSubmit={handleSaveCardEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Name on Card</label>
                <input
                  type="text"
                  value={editingCard.nameOnCard}
                  onChange={(e) => setEditingCard({ ...editingCard, nameOnCard: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Card Type</label>
                  <select
                    value={editingCard.cardType}
                    onChange={(e) => setEditingCard({ ...editingCard, cardType: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 bg-white"
                  >
                    <option value="Debit">Debit Card</option>
                    <option value="Credit">Credit Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Valid Till (MM/YY)</label>
                  <input
                    type="text"
                    value={editingCard.validTill || ''}
                    onChange={(e) => setEditingCard({ ...editingCard, validTill: e.target.value })}
                    placeholder="e.g., 08/29"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Card Number</label>
                <input
                  type="text"
                  value={editingCard.cardNumber}
                  onChange={(e) => setEditingCard({ ...editingCard, cardNumber: e.target.value })}
                  placeholder="e.g., 4591 •••• •••• 8812"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Linked Account</label>
                <input
                  type="text"
                  value={editingCard.linkedAccount}
                  onChange={(e) => setEditingCard({ ...editingCard, linkedAccount: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={editingCard.remarks || ''}
                  onChange={(e) => setEditingCard({ ...editingCard, remarks: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
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

      {/* Edit Locker Modal */}
      {editingLocker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Edit Locker Details</h3>
            <form onSubmit={handleSaveLockerEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name & Branch</label>
                <input
                  type="text"
                  value={editingLocker.bankAndBranch}
                  onChange={(e) => setEditingLocker({ ...editingLocker, bankAndBranch: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Locker Number</label>
                  <input
                    type="text"
                    value={editingLocker.lockerNumber}
                    onChange={(e) => setEditingLocker({ ...editingLocker, lockerNumber: e.target.value })}
                    required
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nominee</label>
                  <input
                    type="text"
                    value={editingLocker.nominee}
                    onChange={(e) => setEditingLocker({ ...editingLocker, nominee: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Linked Account Number</label>
                <input
                  type="text"
                  value={editingLocker.accountNumber}
                  onChange={(e) => setEditingLocker({ ...editingLocker, accountNumber: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Key Location & Code Instructions</label>
                <textarea
                  rows={2}
                  value={editingLocker.codeOrRemarks || ''}
                  onChange={(e) => setEditingLocker({ ...editingLocker, codeOrRemarks: e.target.value })}
                  placeholder="Where the physical key is placed and authorization details"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingLocker(null)}
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
