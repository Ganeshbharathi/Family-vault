import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Lock,
  UserCheck,
  FileKey,
  Smartphone,
} from 'lucide-react';
import { OnlinePasswordEntry } from '../../types/vault.ts';

interface PasswordsAccessTabProps {
  passwords: OnlinePasswordEntry[];
  onUpdatePassword: (entry: OnlinePasswordEntry) => void;
  onAddPassword: (entry: Omit<OnlinePasswordEntry, 'id'>) => void;
  onDeletePassword: (id: string) => void;
}

export const PasswordsAccessTab: React.FC<PasswordsAccessTabProps> = ({
  passwords,
  onUpdatePassword,
  onAddPassword,
  onDeletePassword,
}) => {
  const [editingEntry, setEditingEntry] = useState<OnlinePasswordEntry | null>(null);
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [newEntry, setNewEntry] = useState({
    loginKind: '',
    personAware: '',
    remarks: '',
    instructions: '',
  });

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEntry) {
      onUpdatePassword(editingEntry);
      setEditingEntry(null);
    }
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEntry.loginKind || !newEntry.personAware) return;
    onAddPassword({
      srNo: passwords.length + 1,
      loginKind: newEntry.loginKind,
      personAware: newEntry.personAware,
      remarks: newEntry.remarks,
      instructions: newEntry.instructions,
    });
    setNewEntry({ loginKind: '', personAware: '', remarks: '', instructions: '' });
    setIsAddingEntry(false);
  };

  const getLoginIcon = (kind: string) => {
    const k = kind.toLowerCase();
    if (k.includes('mobile') || k.includes('phone')) return <Smartphone className="w-5 h-5 text-indigo-600" />;
    if (k.includes('manager') || k.includes('master')) return <FileKey className="w-5 h-5 text-amber-600" />;
    return <KeyRound className="w-5 h-5 text-emerald-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-600" />
            Emergency Access, Passwords & Digital Legacy
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Designated emergency access trustees, device unlock authorization, and master recovery protocols
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingEntry(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Access Rule</span>
        </button>
      </div>

      {/* Security Best Practices Callout */}
      <div className="p-4 rounded-xl bg-slate-900 text-white flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-white">Security & Digital Estate Protocol</p>
          <p className="text-slate-300 leading-relaxed">
            Never store actual plain-text passwords in unencrypted spreadsheets. Instead, record the <strong>person who knows the access</strong>, the location of physical emergency master kits (e.g. sealed envelope in locker), and phone unlock procedures for OTP verification.
          </p>
        </div>
      </div>

      {/* Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {passwords.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                    {getLoginIcon(item.loginKind)}
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                      Access Vector #{item.srNo}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{item.loginKind}</h3>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`Edit ${item.loginKind}`}
                  onClick={() => setEditingEntry(item)}
                  className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-0.5">Person Aware / Custodian</span>
                  <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{item.personAware}</span>
                  </div>
                </div>

                {item.remarks && (
                  <div className="pt-1">
                    <span className="text-[11px] text-slate-400 block mb-0.5">Application / System</span>
                    <p className="text-slate-700">{item.remarks}</p>
                  </div>
                )}
              </div>

              {item.instructions && (
                <div className="mt-3 p-2.5 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800 block mb-0.5">Emergency Procedure</span>
                  <p>{item.instructions}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Sheet Table Representation */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Online Passwords Directory Table ({passwords.length})
          </h2>
          <span className="text-xs text-slate-500">From sheet tab: "Online Passwords"</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-4">Login Kind</th>
                <th className="py-2.5 px-4">Person Who Is Aware of Password</th>
                <th className="py-2.5 px-4">Remarks</th>
                <th className="py-2.5 px-4">Emergency Instructions</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {passwords.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-3 text-center font-mono text-slate-400">{item.srNo}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{item.loginKind}</td>
                  <td className="py-3 px-4 font-medium text-indigo-950">{item.personAware}</td>
                  <td className="py-3 px-4 text-slate-600">{item.remarks || '—'}</td>
                  <td className="py-3 px-4 text-slate-500">{item.instructions || '—'}</td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Edit ${item.loginKind}`}
                        onClick={() => setEditingEntry(item)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {item.srNo > 3 && (
                        <button
                          type="button"
                          aria-label={`Delete ${item.loginKind}`}
                          onClick={() => onDeletePassword(item.id)}
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

      {/* Edit Password Access Modal */}
      {editingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Edit Emergency Access Rule</h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Login Kind</label>
                <input
                  type="text"
                  value={editingEntry.loginKind}
                  onChange={(e) => setEditingEntry({ ...editingEntry, loginKind: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Person Who Is Aware</label>
                <input
                  type="text"
                  value={editingEntry.personAware}
                  onChange={(e) => setEditingEntry({ ...editingEntry, personAware: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account / Remarks</label>
                <input
                  type="text"
                  value={editingEntry.remarks || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, remarks: e.target.value })}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Instructions</label>
                <textarea
                  rows={3}
                  value={editingEntry.instructions || ''}
                  onChange={(e) => setEditingEntry({ ...editingEntry, instructions: e.target.value })}
                  placeholder="Where master password or backup sheet is kept"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
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
