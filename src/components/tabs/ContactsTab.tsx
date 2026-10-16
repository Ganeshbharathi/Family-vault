import React, { useState } from 'react';
import {
  Users,
  PhoneCall,
  Mail,
  Edit2,
  Trash2,
  Plus,
  Copy,
  Check,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { ImportantContact, FamilyMember } from '../../types/vault.ts';

interface ContactsTabProps {
  familyMembers: FamilyMember[];
  contacts: ImportantContact[];
  onUpdateContact: (contact: ImportantContact) => void;
  onAddContact: (contact: Omit<ImportantContact, 'id'>) => void;
  onDeleteContact: (id: string) => void;
  onUpdateFamilyMember: (member: FamilyMember) => void;
  onAddFamilyMember: (member: Omit<FamilyMember, 'id'>) => void;
  onDeleteFamilyMember: (id: string) => void;
}

export const ContactsTab: React.FC<ContactsTabProps> = ({
  familyMembers,
  contacts,
  onUpdateContact,
  onAddContact,
  onDeleteContact,
  onUpdateFamilyMember,
  onAddFamilyMember,
  onDeleteFamilyMember,
}) => {
  const [editingContact, setEditingContact] = useState<ImportantContact | null>(null);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({
    particulars: '',
    name: '',
    mobile: '',
    email: '',
    address: '',
    remarks: '',
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContact) {
      onUpdateContact(editingContact);
      setEditingContact(null);
    }
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.particulars || !newContact.name) return;
    onAddContact({
      srNo: contacts.length + 1,
      particulars: newContact.particulars,
      name: newContact.name,
      mobile: newContact.mobile,
      email: newContact.email,
      address: newContact.address,
      remarks: newContact.remarks,
    });
    setNewContact({ particulars: '', name: '', mobile: '', email: '', address: '', remarks: '' });
    setIsAddingContact(false);
  };

  return (
    <div className="space-y-6">
      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Family Members & Important Contacts
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Official sheet directory for emergency communication and family circle
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingContact(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Contact</span>
        </button>
      </div>

      {/* Family Structure Cards */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Family Composition & Dependents</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Couple */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 block mb-2">
              Couple Names
            </span>
            <div className="space-y-2">
              {familyMembers.filter((m) => m.category === 'couple').map((m) => (
                <div key={m.id} className="bg-white p-2.5 rounded border border-slate-200">
                  <div className="text-xs font-bold text-slate-900">{m.name || 'Not yet updated'}</div>
                  <div className="text-[11px] text-slate-500">{m.relationship}</div>
                  {m.notes && <div className="text-[10px] text-slate-400 mt-0.5">{m.notes}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Dependent Children */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 block mb-2">
              Dependent Children
            </span>
            {familyMembers.filter((m) => m.category === 'child').length === 0 ? (
              <div className="text-xs text-slate-400 p-3 bg-white/70 rounded border border-dashed border-slate-200 text-center">
                None recorded in sheet
              </div>
            ) : (
              familyMembers.filter((m) => m.category === 'child').map((m) => (
                <div key={m.id} className="bg-white p-2.5 rounded border border-slate-200 mb-2">
                  <div className="text-xs font-bold text-slate-900">{m.name}</div>
                  <div className="text-[11px] text-slate-500">{m.relationship}</div>
                </div>
              ))
            )}
          </div>

          {/* Dependent Parents */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 block mb-2">
              Dependent Parents
            </span>
            <div className="space-y-2">
              {familyMembers.filter((m) => m.category === 'parent').map((m) => (
                <div key={m.id} className="bg-white p-2.5 rounded border border-slate-200">
                  <div className="text-xs font-bold text-slate-900">{m.name}</div>
                  <div className="text-[11px] text-slate-500">{m.relationship}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{m.notes}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Contacts Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            Important Contacts Directory ({contacts.length} entries)
          </h2>
          <span className="text-xs text-slate-500">From sheet tab: "Important Contacts for Family"</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                <th className="py-2.5 px-4">Particulars / Role</th>
                <th className="py-2.5 px-4">Contact Name</th>
                <th className="py-2.5 px-4">Mobile</th>
                <th className="py-2.5 px-4">Email</th>
                <th className="py-2.5 px-4">Remarks</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {contacts.map((contact) => {
                const isConfigured = Boolean(contact.name || contact.mobile || contact.email);
                return (
                  <tr
                    key={contact.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      !isConfigured ? 'bg-slate-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center font-mono text-slate-400">{contact.srNo}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{contact.particulars}</div>
                      {contact.particulars === 'Self' && (
                        <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded font-medium">
                          Account Owner
                        </span>
                      )}
                      {contact.particulars === 'MOM' && (
                        <span className="text-[10px] text-rose-700 bg-rose-50 px-1 py-0.2 rounded font-medium">
                          Primary Family Nominee
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {contact.name ? (
                        <span className="font-medium text-slate-800">{contact.name}</span>
                      ) : (
                        <span className="text-slate-400 italic">Not recorded</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {contact.mobile ? (
                        <div className="space-y-1">
                          {contact.mobile.split(/[\/\n]+/).map((num, i) => (
                            <div key={i} className="flex items-center gap-1.5">
                              <a
                                href={`tel:${num.trim()}`}
                                className="text-slate-700 hover:text-indigo-600 font-medium"
                              >
                                {num.trim()}
                              </a>
                              <button
                                type="button"
                                aria-label="Copy phone number"
                                onClick={() => handleCopy(num.trim(), `${contact.id}-${i}`)}
                                className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                              >
                                {copiedId === `${contact.id}-${i}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {contact.email ? (
                        <a
                          href={`mailto:${contact.email}`}
                          className="text-slate-600 hover:text-indigo-600 underline-offset-2 hover:underline truncate max-w-[180px] block"
                        >
                          {contact.email}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500">{contact.remarks || '—'}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Edit ${contact.particulars}`}
                          onClick={() => setEditingContact(contact)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {contact.srNo > 9 && (
                          <button
                            type="button"
                            aria-label={`Delete ${contact.particulars}`}
                            onClick={() => onDeleteContact(contact.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Contact Modal */}
      {editingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Edit Contact: {editingContact.particulars}
            </h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Particulars</label>
                <input
                  type="text"
                  value={editingContact.particulars}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, particulars: e.target.value })
                  }
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Name</label>
                <input
                  type="text"
                  value={editingContact.name}
                  onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                  placeholder="e.g., Dr. Ramesh / Santhi"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number(s)</label>
                <input
                  type="text"
                  value={editingContact.mobile}
                  onChange={(e) => setEditingContact({ ...editingContact, mobile: e.target.value })}
                  placeholder="e.g., 9787004065"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={editingContact.email}
                  onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                  placeholder="e.g., doctor@example.com"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Address</label>
                <input
                  type="text"
                  value={editingContact.remarks || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, remarks: e.target.value })}
                  placeholder="e.g., Hospital clinic address or relationship note"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingContact(null)}
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

      {/* Add Custom Contact Modal */}
      {isAddingContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add Important Contact</h3>
            <form onSubmit={handleSaveNew} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Particulars *</label>
                <input
                  type="text"
                  value={newContact.particulars}
                  onChange={(e) => setNewContact({ ...newContact, particulars: e.target.value })}
                  placeholder="e.g., Tax Consultant, Neighbor, Landlord"
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Name *</label>
                <input
                  type="text"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  placeholder="e.g., John Doe"
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={newContact.mobile}
                  onChange={(e) => setNewContact({ ...newContact, mobile: e.target.value })}
                  placeholder="e.g., 9876543210"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  placeholder="e.g., contact@example.com"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={newContact.remarks}
                  onChange={(e) => setNewContact({ ...newContact, remarks: e.target.value })}
                  placeholder="e.g., Available 24/7 or emergency only"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingContact(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs"
                >
                  Add Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
