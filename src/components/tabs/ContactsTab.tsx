import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  PhoneCall,
  Mail,
  Plus,
  Copy,
  Check,
  Calendar,
  Pencil,
  Trash2,
  X,
  ExternalLink,
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

const DEFAULT_HEADERS: Record<string, string> = {
  srNo: '#',
  particulars: 'Particulars / Role',
  name: 'Contact Name',
  dob: 'Date of Birth & Age',
  mobile: 'Mobile Numbers',
  email: 'Email Address',
  remarks: 'Remarks / Notes',
};

const HEADERS_STORAGE_KEY = 'vault_contacts_custom_headers_v1';

/**
 * Calculates current running age accurately from a date string (YYYY-MM-DD or parseable format)
 */
function calculateAge(dobStr?: string): { age: number; formatted: string } | null {
  if (!dobStr || dobStr.trim() === '') return null;

  // Try standard Date parsing
  let birthDate = new Date(dobStr);
  if (isNaN(birthDate.getTime())) {
    // Try DD-MMM-YYYY (e.g. 15-May-1990) or DD/MM/YYYY
    const parts = dobStr.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        birthDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
  }

  if (isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 0 || age > 130) return null;
  return { age, formatted: `${age} yrs` };
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Custom table headings editable on hover
  const [headers, setHeaders] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(HEADERS_STORAGE_KEY);
      if (saved) return { ...DEFAULT_HEADERS, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_HEADERS;
  });

  const [editingHeaderKey, setEditingHeaderKey] = useState<string | null>(null);
  const [headerDraft, setHeaderDraft] = useState('');

  // Mobile addition state
  const [addingPhoneForId, setAddingPhoneForId] = useState<string | null>(null);
  const [newPhoneDraft, setNewPhoneDraft] = useState('');

  const dateInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStartEditHeader = (key: string) => {
    setEditingHeaderKey(key);
    setHeaderDraft(headers[key] || DEFAULT_HEADERS[key]);
  };

  const handleSaveHeader = (key: string) => {
    const trimmed = headerDraft.trim() || DEFAULT_HEADERS[key];
    const updated = { ...headers, [key]: trimmed };
    setHeaders(updated);
    setEditingHeaderKey(null);
    try {
      localStorage.setItem(HEADERS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // storage unavailable
    }
  };

  const handleInlineChange = (contact: ImportantContact, field: keyof ImportantContact, value: any) => {
    onUpdateContact({
      ...contact,
      [field]: value,
    });
  };

  // Add multiple phones to a contact
  const handleAddPhone = (contact: ImportantContact) => {
    const trimmed = newPhoneDraft.trim();
    if (!trimmed) {
      setAddingPhoneForId(null);
      return;
    }

    const existingPhones = contact.mobile
      ? contact.mobile.split(/[\/\n,]+/).map((p) => p.trim()).filter(Boolean)
      : [];

    if (!existingPhones.includes(trimmed)) {
      existingPhones.push(trimmed);
    }

    const updatedMobile = existingPhones.join(' / ');
    handleInlineChange(contact, 'mobile', updatedMobile);
    setNewPhoneDraft('');
    setAddingPhoneForId(null);
  };

  const handleRemovePhone = (contact: ImportantContact, phoneToRemove: string) => {
    const existingPhones = contact.mobile
      ? contact.mobile.split(/[\/\n,]+/).map((p) => p.trim()).filter(Boolean)
      : [];

    const filtered = existingPhones.filter((p) => p !== phoneToRemove);
    handleInlineChange(contact, 'mobile', filtered.join(' / '));
  };

  const handleQuickAddRow = () => {
    const newSrNo = contacts.length > 0 ? Math.max(...contacts.map((c) => c.srNo)) + 1 : 1;
    onAddContact({
      srNo: newSrNo,
      particulars: 'Emergency Contact',
      name: '',
      dob: '',
      mobile: '',
      email: '',
      address: '',
      remarks: '',
    });
  };

  return (
    <div className="space-y-5 w-full">
      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Family Members & Contacts Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            All fields are editable directly in the table. Changes auto-save in real-time.
          </p>
        </div>
        <button
          type="button"
          onClick={handleQuickAddRow}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Contact Row</span>
        </button>
      </div>

      {/* Family Structure Cards (Inline Editable) */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Family Composition & Dependents</span>
            <span className="text-[11px] font-normal text-slate-500">(Click any field to edit)</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Couple */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                Couple Names
              </span>
              <span className="text-[10px] text-slate-400 font-mono">2 Entries</span>
            </div>
            <div className="space-y-2">
              {familyMembers.filter((m) => m.category === 'couple').map((m) => (
                <div key={m.id} className="bg-white p-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={m.name}
                      onChange={(e) => onUpdateFamilyMember({ ...m, name: e.target.value })}
                      placeholder="Enter Full Name"
                      className="w-full text-xs font-bold text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5"
                    />
                  </div>
                  <input
                    type="text"
                    value={m.relationship}
                    onChange={(e) => onUpdateFamilyMember({ ...m, relationship: e.target.value })}
                    placeholder="Relationship"
                    className="w-full text-[11px] text-slate-500 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5"
                  />
                  <input
                    type="text"
                    value={m.notes || ''}
                    onChange={(e) => onUpdateFamilyMember({ ...m, notes: e.target.value })}
                    placeholder="Notes or nominee hints"
                    className="w-full text-[10.5px] text-slate-400 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Dependent Children */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                Dependent Children
              </span>
              <button
                type="button"
                onClick={() =>
                  onAddFamilyMember({
                    category: 'child',
                    name: 'New Child Name',
                    relationship: 'Child / Son / Daughter',
                    notes: '',
                  })
                }
                className="text-[10px] font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>Add Child</span>
              </button>
            </div>
            {familyMembers.filter((m) => m.category === 'child').length === 0 ? (
              <div className="text-xs text-slate-400 p-4 bg-white/70 rounded-lg border border-dashed border-slate-200 text-center">
                No children recorded. Click + Add Child if applicable.
              </div>
            ) : (
              familyMembers.filter((m) => m.category === 'child').map((m) => (
                <div key={m.id} className="bg-white p-2.5 rounded-lg border border-slate-200 hover:border-emerald-300 transition-colors space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <input
                      type="text"
                      value={m.name}
                      onChange={(e) => onUpdateFamilyMember({ ...m, name: e.target.value })}
                      placeholder="Child Name"
                      className="w-full text-xs font-bold text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-0.5"
                    />
                    <button
                      type="button"
                      onClick={() => onDeleteFamilyMember(m.id)}
                      className="p-1 text-slate-300 hover:text-rose-600 rounded"
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={m.relationship}
                    onChange={(e) => onUpdateFamilyMember({ ...m, relationship: e.target.value })}
                    placeholder="e.g. Son (Minor)"
                    className="w-full text-[11px] text-slate-500 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 rounded px-1.5 py-0.5"
                  />
                </div>
              ))
            )}
          </div>

          {/* Dependent Parents */}
          <div className="p-3.5 rounded-xl bg-slate-50/70 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                Dependent Parents
              </span>
              <button
                type="button"
                onClick={() =>
                  onAddFamilyMember({
                    category: 'parent',
                    name: 'Parent Name',
                    relationship: 'Dependent Parent',
                    notes: '',
                  })
                }
                className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" />
                <span>Add Parent</span>
              </button>
            </div>
            <div className="space-y-2">
              {familyMembers.filter((m) => m.category === 'parent').map((m) => (
                <div key={m.id} className="bg-white p-2.5 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <input
                      type="text"
                      value={m.name}
                      onChange={(e) => onUpdateFamilyMember({ ...m, name: e.target.value })}
                      placeholder="Parent Name"
                      className="w-full text-xs font-bold text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5"
                    />
                    <button
                      type="button"
                      onClick={() => onDeleteFamilyMember(m.id)}
                      className="p-1 text-slate-300 hover:text-rose-600 rounded"
                      title="Remove"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={m.relationship}
                    onChange={(e) => onUpdateFamilyMember({ ...m, relationship: e.target.value })}
                    placeholder="e.g. Dependent Parent (MOM)"
                    className="w-full text-[11px] text-slate-500 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5"
                  />
                  <input
                    type="text"
                    value={m.notes || ''}
                    onChange={(e) => onUpdateFamilyMember({ ...m, notes: e.target.value })}
                    placeholder="Emergency notes"
                    className="w-full text-[10.5px] text-slate-400 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Full-Width Contacts Table (Action column removed, All fields inline editable) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs w-full">
        <div className="p-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900">
              Important Contacts Directory ({contacts.length} entries)
            </h2>
            <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              Hover column headers to rename
            </span>
          </div>
          <button
            type="button"
            onClick={handleQuickAddRow}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-bold select-none">
                {/* 1. Sr. No */}
                <th className="py-2.5 px-3 w-14 text-center group relative">
                  <div className="flex items-center justify-center gap-1">
                    <span>{headers.srNo}</span>
                  </div>
                </th>

                {/* 2. Particulars / Role */}
                <th className="py-2.5 px-3 min-w-[150px] group relative">
                  {editingHeaderKey === 'particulars' ? (
                    <input
                      type="text"
                      autoFocus
                      value={headerDraft}
                      onChange={(e) => setHeaderDraft(e.target.value)}
                      onBlur={() => handleSaveHeader('particulars')}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveHeader('particulars')}
                      className="w-full text-xs font-bold text-indigo-700 bg-white px-1.5 py-0.5 border border-indigo-400 rounded outline-none"
                    />
                  ) : (
                    <div
                      onClick={() => handleStartEditHeader('particulars')}
                      className="cursor-pointer flex items-center justify-between hover:text-indigo-700 transition-colors"
                      title="Click to rename column header"
                    >
                      <span>{headers.particulars}</span>
                      <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                    </div>
                  )}
                </th>

                {/* 3. Contact Name */}
                <th className="py-2.5 px-3 min-w-[160px] group relative">
                  {editingHeaderKey === 'name' ? (
                    <input
                      type="text"
                      autoFocus
                      value={headerDraft}
                      onChange={(e) => setHeaderDraft(e.target.value)}
                      onBlur={() => handleSaveHeader('name')}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveHeader('name')}
                      className="w-full text-xs font-bold text-indigo-700 bg-white px-1.5 py-0.5 border border-indigo-400 rounded outline-none"
                    />
                  ) : (
                    <div
                      onClick={() => handleStartEditHeader('name')}
                      className="cursor-pointer flex items-center justify-between hover:text-indigo-700 transition-colors"
                      title="Click to rename column header"
                    >
                      <span>{headers.name}</span>
                      <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                    </div>
                  )}
                </th>

                {/* 4. Date of Birth & Age */}
                <th className="py-2.5 px-3 min-w-[190px] group relative">
                  {editingHeaderKey === 'dob' ? (
                    <input
                      type="text"
                      autoFocus
                      value={headerDraft}
                      onChange={(e) => setHeaderDraft(e.target.value)}
                      onBlur={() => handleSaveHeader('dob')}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveHeader('dob')}
                      className="w-full text-xs font-bold text-indigo-700 bg-white px-1.5 py-0.5 border border-indigo-400 rounded outline-none"
                    />
                  ) : (
                    <div
                      onClick={() => handleStartEditHeader('dob')}
                      className="cursor-pointer flex items-center justify-between hover:text-indigo-700 transition-colors"
                      title="Click to rename column header"
                    >
                      <span>{headers.dob}</span>
                      <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                    </div>
                  )}
                </th>

                {/* 5. Mobile Numbers */}
                <th className="py-2.5 px-3 min-w-[210px] group relative">
                  {editingHeaderKey === 'mobile' ? (
                    <input
                      type="text"
                      autoFocus
                      value={headerDraft}
                      onChange={(e) => setHeaderDraft(e.target.value)}
                      onBlur={() => handleSaveHeader('mobile')}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveHeader('mobile')}
                      className="w-full text-xs font-bold text-indigo-700 bg-white px-1.5 py-0.5 border border-indigo-400 rounded outline-none"
                    />
                  ) : (
                    <div
                      onClick={() => handleStartEditHeader('mobile')}
                      className="cursor-pointer flex items-center justify-between hover:text-indigo-700 transition-colors"
                      title="Click to rename column header"
                    >
                      <span>{headers.mobile}</span>
                      <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                    </div>
                  )}
                </th>

                {/* 6. Email */}
                <th className="py-2.5 px-3 min-w-[170px] group relative">
                  {editingHeaderKey === 'email' ? (
                    <input
                      type="text"
                      autoFocus
                      value={headerDraft}
                      onChange={(e) => setHeaderDraft(e.target.value)}
                      onBlur={() => handleSaveHeader('email')}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveHeader('email')}
                      className="w-full text-xs font-bold text-indigo-700 bg-white px-1.5 py-0.5 border border-indigo-400 rounded outline-none"
                    />
                  ) : (
                    <div
                      onClick={() => handleStartEditHeader('email')}
                      className="cursor-pointer flex items-center justify-between hover:text-indigo-700 transition-colors"
                      title="Click to rename column header"
                    >
                      <span>{headers.email}</span>
                      <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                    </div>
                  )}
                </th>

                {/* 7. Remarks */}
                <th className="py-2.5 px-3 min-w-[180px] group relative">
                  {editingHeaderKey === 'remarks' ? (
                    <input
                      type="text"
                      autoFocus
                      value={headerDraft}
                      onChange={(e) => setHeaderDraft(e.target.value)}
                      onBlur={() => handleSaveHeader('remarks')}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveHeader('remarks')}
                      className="w-full text-xs font-bold text-indigo-700 bg-white px-1.5 py-0.5 border border-indigo-400 rounded outline-none"
                    />
                  ) : (
                    <div
                      onClick={() => handleStartEditHeader('remarks')}
                      className="cursor-pointer flex items-center justify-between hover:text-indigo-700 transition-colors"
                      title="Click to rename column header"
                    >
                      <span>{headers.remarks}</span>
                      <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                    </div>
                  )}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {contacts.map((contact) => {
                const ageInfo = calculateAge(contact.dob);
                const phoneList = contact.mobile
                  ? contact.mobile.split(/[\/\n,]+/).map((p) => p.trim()).filter(Boolean)
                  : [];

                return (
                  <tr
                    key={contact.id}
                    className="hover:bg-indigo-50/20 group transition-colors focus-within:bg-indigo-50/30"
                  >
                    {/* 1. Sr No */}
                    <td className="py-2 px-3 text-center font-mono text-slate-400">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-semibold text-slate-600">{contact.srNo}</span>
                        {contact.srNo > 9 && (
                          <button
                            type="button"
                            onClick={() => onDeleteContact(contact.id)}
                            className="text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                            title="Delete Row"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* 2. Particulars / Role (Inline Editable) */}
                    <td className="py-2 px-3">
                      <div className="relative">
                        <input
                          type="text"
                          value={contact.particulars}
                          onChange={(e) => handleInlineChange(contact, 'particulars', e.target.value)}
                          placeholder="e.g. Self, Spouse, MOM, Doctor"
                          className="w-full px-2 py-1 text-xs font-bold text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded transition-colors"
                        />
                        {contact.particulars === 'Self' && (
                          <span className="inline-block mt-0.5 ml-2 text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-medium border border-indigo-100">
                            Primary Account Owner
                          </span>
                        )}
                        {contact.particulars === 'MOM' && (
                          <span className="inline-block mt-0.5 ml-2 text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded font-medium border border-rose-100">
                            Primary Nominee
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Contact Name (Inline Editable) */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) => handleInlineChange(contact, 'name', e.target.value)}
                        placeholder="Enter full name"
                        className="w-full px-2 py-1 text-xs font-semibold text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded transition-colors"
                      />
                    </td>

                    {/* 4. Date of Birth & Age (Type-able + Dropdown Calendar Picker) */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="relative flex-1 min-w-[125px]">
                          <input
                            type="text"
                            value={contact.dob || ''}
                            onChange={(e) => handleInlineChange(contact, 'dob', e.target.value)}
                            placeholder="YYYY-MM-DD"
                            className="w-full pl-2 pr-7 py-1 text-xs font-mono text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded transition-colors"
                          />
                          {/* Hidden native date input triggered by calendar button */}
                          <input
                            ref={(el) => {
                              dateInputRefs.current[contact.id] = el;
                            }}
                            type="date"
                            value={contact.dob || ''}
                            onChange={(e) => handleInlineChange(contact, 'dob', e.target.value)}
                            className="absolute opacity-0 pointer-events-none w-0 h-0 right-0 top-0"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const input = dateInputRefs.current[contact.id];
                              if (input) {
                                if ('showPicker' in input && typeof (input as any).showPicker === 'function') {
                                  (input as any).showPicker();
                                } else {
                                  input.focus();
                                }
                              }
                            }}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                            title="Open Calendar Picker"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Calculated Running Age */}
                        {ageInfo ? (
                          <span
                            className="shrink-0 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs whitespace-nowrap"
                            title={`Calculated running age: ${ageInfo.age} years old`}
                          >
                            {ageInfo.formatted}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic shrink-0">—</span>
                        )}
                      </div>
                    </td>

                    {/* 5. Mobile Numbers (Multiple Additions, Click-to-Call, Copy & Delete) */}
                    <td className="py-2 px-3">
                      <div className="space-y-1.5">
                        {/* List of existing numbers */}
                        {phoneList.map((phone, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200 text-xs font-mono group/phone"
                          >
                            <a
                              href={`tel:${phone}`}
                              className="text-slate-800 hover:text-indigo-600 font-semibold truncate flex items-center gap-1"
                              title="Click to call"
                            >
                              <PhoneCall className="w-3 h-3 text-slate-400" />
                              <span>{phone}</span>
                            </a>
                            <div className="ml-auto flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => handleCopy(phone, `${contact.id}-${idx}`)}
                                className="p-0.5 text-slate-400 hover:text-slate-700 rounded"
                                title="Copy number"
                              >
                                {copiedId === `${contact.id}-${idx}` ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemovePhone(contact, phone)}
                                className="p-0.5 text-slate-300 hover:text-rose-600 opacity-0 group-hover/phone:opacity-100 transition-opacity"
                                title="Remove number"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Multiple phone addition input / button */}
                        {addingPhoneForId === contact.id ? (
                          <div className="flex items-center gap-1 pt-0.5">
                            <input
                              type="text"
                              autoFocus
                              value={newPhoneDraft}
                              onChange={(e) => setNewPhoneDraft(e.target.value)}
                              placeholder="e.g. 9876543210"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleAddPhone(contact);
                                if (e.key === 'Escape') setAddingPhoneForId(null);
                              }}
                              className="w-full text-xs font-mono px-2 py-1 bg-white border border-indigo-400 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleAddPhone(contact)}
                              className="px-2 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors shrink-0"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAddingPhoneForId(null);
                                setNewPhoneDraft('');
                              }}
                              className="p-1 text-slate-400 hover:text-slate-600 rounded"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {phoneList.length === 0 && (
                              <input
                                type="text"
                                value={contact.mobile}
                                onChange={(e) => handleInlineChange(contact, 'mobile', e.target.value)}
                                placeholder="Enter mobile number"
                                className="w-full px-2 py-1 text-xs font-mono text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded"
                              />
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setAddingPhoneForId(contact.id);
                                setNewPhoneDraft('');
                              }}
                              className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50/60 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200/70 transition-colors whitespace-nowrap"
                            >
                              <Plus className="w-3 h-3" />
                              <span>{phoneList.length > 0 ? '+ Add Number' : '+ Mobile'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 6. Email (Inline Editable) */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="email"
                          value={contact.email}
                          onChange={(e) => handleInlineChange(contact, 'email', e.target.value)}
                          placeholder="e.g. name@gmail.com"
                          className="w-full px-2 py-1 text-xs text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded transition-colors"
                        />
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="p-1 text-slate-400 hover:text-indigo-600 shrink-0"
                            title="Send email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* 7. Remarks / Address (Inline Editable) */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={contact.remarks || ''}
                        onChange={(e) => handleInlineChange(contact, 'remarks', e.target.value)}
                        placeholder="Add notes, relationship or address"
                        className="w-full px-2 py-1 text-xs text-slate-700 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded transition-colors"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Quick Add Row Banner at Bottom */}
        <div className="p-3 bg-slate-50/70 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            Tip: Click any cell above to edit values inline. Date of Birth automatically calculates and displays current running age.
          </span>
          <button
            type="button"
            onClick={handleQuickAddRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>
        </div>
      </div>
    </div>
  );
};
