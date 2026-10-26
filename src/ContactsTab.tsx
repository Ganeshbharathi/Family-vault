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
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { ImportantContact, FamilyMember } from './types.ts';

interface ContactsTabProps {
  familyMembers: FamilyMember[];
  contacts: ImportantContact[];
  onUpdateContact: (contact: ImportantContact) => void;
  onCommitContact?: (contact: ImportantContact) => void;
  onAddContact: (contact: Omit<ImportantContact, 'id'>) => void;
  onDeleteContact: (id: string) => void;
  onUpdateFamilyMember: (member: FamilyMember) => void;
  onCommitFamilyMember?: (member: FamilyMember) => void;
  onAddFamilyMember: (member: Omit<FamilyMember, 'id'>) => void;
  onDeleteFamilyMember: (id: string) => void;
  syncStatus?: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedTime?: string;
  supabaseConnected?: boolean;
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

// Default and minimum column widths (in pixels) for draggable resizing
const DEFAULT_COL_WIDTHS: Record<string, number> = {
  srNo: 64,
  particulars: 180,
  name: 195,
  dob: 215,
  mobile: 245,
  email: 215,
  remarks: 245,
};

const MIN_COL_WIDTHS: Record<string, number> = {
  srNo: 48,
  particulars: 110,
  name: 120,
  dob: 140,
  mobile: 150,
  email: 130,
  remarks: 130,
};

const COL_WIDTHS_STORAGE_KEY = 'vault_contacts_column_widths_v2';

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

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface DatePickerDropdownProps {
  value: string;
  onChange: (dateStr: string) => void;
  onClose: () => void;
}

const DatePickerDropdown: React.FC<DatePickerDropdownProps> = ({ value, onChange, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewDate, setViewDate] = useState(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      const [y, m, d] = value.trim().split('-').map(Number);
      return new Date(y, m - 1, d || 1);
    }
    return new Date();
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${year}-${mm}-${dd}`);
    onClose();
  };

  const handleToday = () => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    onClose();
  };

  const handleClear = () => {
    onChange('');
    onClose();
  };

  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear + 1; y >= 1930; y--) {
    years.push(y);
  }

  const days: { day: number; isCurrentMonth: boolean }[] = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push({ day: daysInPrevMonth - i, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ day: d, isCurrentMonth: true });
  }
  const remaining = (7 - (days.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    days.push({ day: d, isCurrentMonth: false });
  }

  const selectedDay = (() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      const [y, m, d] = value.trim().split('-').map(Number);
      if (y === year && m - 1 === month) {
        return d;
      }
    }
    return null;
  })();

  const todayDate = new Date();
  const isCurrentMonthToday = todayDate.getFullYear() === year && todayDate.getMonth() === month;

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-3 w-64 text-slate-800 select-none font-sans"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Month & Year Select Header */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          title="Previous month"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-1">
          <select
            value={month}
            onChange={(e) => setViewDate(new Date(year, Number(e.target.value), 1))}
            className="text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx}>{m.slice(0, 3)}</option>
            ))}
          </select>

          <select
            value={year}
            onChange={(e) => setViewDate(new Date(Number(e.target.value), month, 1))}
            className="text-xs font-mono font-semibold text-slate-800 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          title="Next month"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Weekday initials */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
        <span>Su</span>
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((item, index) => {
          if (!item.isCurrentMonth) {
            return (
              <span
                key={index}
                className="h-6 w-6 mx-auto flex items-center justify-center text-[10px] text-slate-300 font-mono"
              >
                {item.day}
              </span>
            );
          }

          const isSelected = item.day === selectedDay;
          const isToday = isCurrentMonthToday && todayDate.getDate() === item.day;

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleSelectDay(item.day)}
              className={`h-6 w-6 mx-auto flex items-center justify-center text-[11px] font-mono rounded transition-colors ${
                isSelected
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : isToday
                  ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-300'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {item.day}
            </button>
          );
        })}
      </div>

      {/* Bottom quick actions */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <button
          type="button"
          onClick={handleToday}
          className="font-semibold text-indigo-600 hover:text-indigo-800 px-1 py-0.5 rounded"
        >
          Today
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="text-slate-400 hover:text-rose-600 px-1 py-0.5 rounded"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 font-medium px-1 py-0.5 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export const ContactsTab: React.FC<ContactsTabProps> = ({
  familyMembers,
  contacts,
  onUpdateContact,
  onCommitContact,
  onAddContact,
  onDeleteContact,
  onUpdateFamilyMember,
  onCommitFamilyMember,
  onAddFamilyMember,
  onDeleteFamilyMember,
  syncStatus = 'idle',
  lastSavedTime,
  supabaseConnected = false,
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

  // Column Widths for Draggable Resizing
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(COL_WIDTHS_STORAGE_KEY);
      if (saved) return { ...DEFAULT_COL_WIDTHS, ...JSON.parse(saved) };
    } catch {
      // fallback
    }
    return DEFAULT_COL_WIDTHS;
  });
  const [resizingCol, setResizingCol] = useState<string | null>(null);

  // Mobile addition and editing state
  const [addingPhoneForId, setAddingPhoneForId] = useState<string | null>(null);
  const [newPhoneDraft, setNewPhoneDraft] = useState('');
  const [editingPhoneIndex, setEditingPhoneIndex] = useState<{ contactId: string; index: number } | null>(null);
  const [editingPhoneDraft, setEditingPhoneDraft] = useState('');

  // Dropdown interactive calendar state (safe for cross-origin iframes)
  const [openCalendarId, setOpenCalendarId] = useState<string | null>(null);

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

  // Draggable Column Resizing Handlers
  const handleResizeMouseDown = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startWidth = colWidths[colKey] || DEFAULT_COL_WIDTHS[colKey];
    const minWidth = MIN_COL_WIDTHS[colKey] || 48;

    setResizingCol(colKey);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(minWidth, Math.round(startWidth + delta));
      setColWidths((prev) => ({
        ...prev,
        [colKey]: newWidth,
      }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setResizingCol(null);
      setColWidths((current) => {
        try {
          localStorage.setItem(COL_WIDTHS_STORAGE_KEY, JSON.stringify(current));
        } catch {
          // ignore
        }
        return current;
      });
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleResetColWidth = (colKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setColWidths((prev) => {
      const updated = { ...prev, [colKey]: DEFAULT_COL_WIDTHS[colKey] };
      try {
        localStorage.setItem(COL_WIDTHS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleResetAllColWidths = () => {
    setColWidths(DEFAULT_COL_WIDTHS);
    try {
      localStorage.setItem(COL_WIDTHS_STORAGE_KEY, JSON.stringify(DEFAULT_COL_WIDTHS));
    } catch {}
  };

  const handleInlineChange = (contact: ImportantContact, field: keyof ImportantContact, value: any) => {
    onUpdateContact({
      ...contact,
      [field]: value,
    });
  };

  const handleBlurContact = (contact: ImportantContact) => {
    onCommitContact?.(contact);
  };

  // Add multiple phones to a contact seamlessly
  const handleAddPhone = (contact: ImportantContact) => {
    const trimmed = newPhoneDraft.trim();
    if (!trimmed) {
      setAddingPhoneForId(null);
      return;
    }

    const newNumbers = trimmed
      .split(/[\/\n,;]+/)
      .map((p) => p.trim())
      .filter(Boolean);

    const existingPhones = contact.mobile
      ? contact.mobile.split(/[\/\n,;]+/).map((p) => p.trim()).filter(Boolean)
      : [];

    for (const num of newNumbers) {
      if (!existingPhones.includes(num)) {
        existingPhones.push(num);
      }
    }

    const updatedMobile = existingPhones.join(' / ');
    const updated = { ...contact, mobile: updatedMobile };
    handleInlineChange(contact, 'mobile', updatedMobile);
    onCommitContact?.(updated);
    setNewPhoneDraft('');
    setAddingPhoneForId(null);
  };

  // Edit existing phone number in place
  const handleSaveEditedPhone = (contact: ImportantContact, idxToEdit: number) => {
    const trimmed = editingPhoneDraft.trim();
    const existingPhones = contact.mobile
      ? contact.mobile.split(/[\/\n,;]+/).map((p) => p.trim()).filter(Boolean)
      : [];

    if (trimmed) {
      existingPhones[idxToEdit] = trimmed;
    } else {
      existingPhones.splice(idxToEdit, 1);
    }

    const updatedMobile = existingPhones.join(' / ');
    const updated = { ...contact, mobile: updatedMobile };
    handleInlineChange(contact, 'mobile', updatedMobile);
    onCommitContact?.(updated);
    setEditingPhoneIndex(null);
    setEditingPhoneDraft('');
  };

  const handleRemovePhone = (contact: ImportantContact, phoneToRemove: string) => {
    const existingPhones = contact.mobile
      ? contact.mobile.split(/[\/\n,;]+/).map((p) => p.trim()).filter(Boolean)
      : [];

    const filtered = existingPhones.filter((p) => p !== phoneToRemove);
    const updatedMobile = filtered.join(' / ');
    const updated = { ...contact, mobile: updatedMobile };
    handleInlineChange(contact, 'mobile', updatedMobile);
    onCommitContact?.(updated);
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
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Family Members & Contacts Directory
            </h1>
            {/* Live Supabase Sync Status Indicator Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 border border-slate-200/80">
              {syncStatus === 'saving' ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <span className="text-amber-700 font-semibold">Syncing to Supabase...</span>
                </>
              ) : syncStatus === 'saved' ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  <span className="text-emerald-700 font-semibold">
                    Supabase Synced {lastSavedTime ? `(${lastSavedTime})` : ''}
                  </span>
                </>
              ) : (
                <>
                  <span className={`h-2 w-2 rounded-full ${supabaseConnected ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                  <span className="text-slate-600">
                    {supabaseConnected ? 'Supabase Live Sync Connected' : 'Supabase Ready'}
                  </span>
                </>
              )}
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            All fields are editable directly in the table. Changes auto-update immediately to Supabase database.
          </p>
        </div>
        <button
          type="button"
          onClick={handleQuickAddRow}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs self-start sm:self-auto shrink-0"
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
                      onBlur={() => onCommitFamilyMember?.(m)}
                      placeholder="Enter Full Name"
                      className="w-full text-xs font-bold text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5"
                    />
                  </div>
                  <input
                    type="text"
                    value={m.relationship}
                    onChange={(e) => onUpdateFamilyMember({ ...m, relationship: e.target.value })}
                    onBlur={() => onCommitFamilyMember?.(m)}
                    placeholder="Relationship"
                    className="w-full text-[11px] text-slate-500 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5"
                  />
                  <input
                    type="text"
                    value={m.notes || ''}
                    onChange={(e) => onUpdateFamilyMember({ ...m, notes: e.target.value })}
                    onBlur={() => onCommitFamilyMember?.(m)}
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
                      onBlur={() => onCommitFamilyMember?.(m)}
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
                    onBlur={() => onCommitFamilyMember?.(m)}
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
                      onBlur={() => onCommitFamilyMember?.(m)}
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
                    onBlur={() => onCommitFamilyMember?.(m)}
                    placeholder="e.g. Dependent Parent (MOM)"
                    className="w-full text-[11px] text-slate-500 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5"
                  />
                  <input
                    type="text"
                    value={m.notes || ''}
                    onChange={(e) => onUpdateFamilyMember({ ...m, notes: e.target.value })}
                    onBlur={() => onCommitFamilyMember?.(m)}
                    placeholder="Emergency notes"
                    className="w-full text-[10.5px] text-slate-400 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-indigo-500 rounded px-1.5 py-0.5"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Full-Width Contacts Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs w-full">
        <div className="p-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm font-bold text-slate-900">
              Important Contacts Directory ({contacts.length} entries)
            </h2>
            <span className="text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 hidden sm:inline-flex">
              Drag column borders to resize | Hover headers to rename
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAllColWidths}
              title="Reset all column widths to default"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>Reset Columns</span>
            </button>
            <button
              type="button"
              onClick={handleQuickAddRow}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Row</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table
            className="text-left border-collapse table-fixed w-full"
            style={{ minWidth: `${Math.max(880, Object.values(colWidths).reduce((a, b) => a + b, 0))}px` }}
          >
            <colgroup>
              <col style={{ width: `${colWidths.srNo}px` }} />
              <col style={{ width: `${colWidths.particulars}px` }} />
              <col style={{ width: `${colWidths.name}px` }} />
              <col style={{ width: `${colWidths.dob}px` }} />
              <col style={{ width: `${colWidths.mobile}px` }} />
              <col style={{ width: `${colWidths.email}px` }} />
              <col style={{ width: `${colWidths.remarks}px` }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-bold select-none">
                {/* 1. Sr. No */}
                <th className="py-2.5 px-3 text-center relative group">
                  <div className="flex items-center justify-center gap-1">
                    <span>{headers.srNo}</span>
                  </div>
                  {/* Resize Divider */}
                  <div
                    onMouseDown={(e) => handleResizeMouseDown('srNo', e)}
                    onDoubleClick={(e) => handleResetColWidth('srNo', e)}
                    title="Drag to resize column (double-click to reset)"
                    className={`absolute top-0 right-0 bottom-0 w-2.5 cursor-col-resize flex items-center justify-center z-20 select-none group/resize ${
                      resizingCol === 'srNo' ? 'bg-indigo-500/20' : 'hover:bg-indigo-300/40'
                    }`}
                  >
                    <div
                      className={`w-[1.5px] h-3.5 rounded-full ${
                        resizingCol === 'srNo' ? 'bg-indigo-600' : 'bg-slate-300 group-hover/resize:bg-indigo-500'
                      }`}
                    />
                  </div>
                </th>

                {/* 2. Particulars / Role */}
                <th className="py-2.5 px-3 relative group">
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
                      className="cursor-pointer flex items-center justify-between hover:text-indigo-700 transition-colors pr-2"
                      title="Click to rename column header"
                    >
                      <span className="truncate">{headers.particulars}</span>
                      <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                    </div>
                  )}
                  {/* Resize Divider */}
                  <div
                    onMouseDown={(e) => handleResizeMouseDown('particulars', e)}
                    onDoubleClick={(e) => handleResetColWidth('particulars', e)}
                    title="Drag to resize column (double-click to reset)"
                    className={`absolute top-0 right-0 bottom-0 w-2.5 cursor-col-resize flex items-center justify-center z-20 select-none group/resize ${
                      resizingCol === 'particulars' ? 'bg-indigo-500/20' : 'hover:bg-indigo-300/40'
                    }`}
                  >
                    <div
                      className={`w-[1.5px] h-3.5 rounded-full ${
                        resizingCol === 'particulars' ? 'bg-indigo-600' : 'bg-slate-300 group-hover/resize:bg-indigo-500'
                      }`}
                    />
                  </div>
                </th>

                {/* 3. Contact Name */}
                <th className="py-2.5 px-3 relative group">
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
                      className="cursor-pointer flex items-center justify-between hover:text-indigo-700 transition-colors pr-2"
                      title="Click to rename column header"
                    >
                      <span className="truncate">{headers.name}</span>
                      <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                    </div>
                  )}
                  {/* Resize Divider */}
                  <div
                    onMouseDown={(e) => handleResizeMouseDown('name', e)}
                    onDoubleClick={(e) => handleResetColWidth('name', e)}
                    title="Drag to resize column (double-click to reset)"
                    className={`absolute top-0 right-0 bottom-0 w-2.5 cursor-col-resize flex items-center justify-center z-20 select-none group/resize ${
                      resizingCol === 'name' ? 'bg-indigo-500/20' : 'hover:bg-indigo-300/40'
                    }`}
                  >
                    <div
                      className={`w-[1.5px] h-3.5 rounded-full ${
                        resizingCol === 'name' ? 'bg-indigo-600' : 'bg-slate-300 group-hover/resize:bg-indigo-500'
                      }`}
                    />
                  </div>
                </th>

                {/* 4. Date of Birth & Age */}
                <th className="py-2.5 px-3 relative group">
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
                      className="cursor-pointer flex items-center justify-between hover:text-indigo-700 transition-colors pr-2"
                      title="Click to rename column header"
                    >
                      <span className="truncate">{headers.dob}</span>
                      <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                    </div>
                  )}
                  {/* Resize Divider */}
                  <div
                    onMouseDown={(e) => handleResizeMouseDown('dob', e)}
                    onDoubleClick={(e) => handleResetColWidth('dob', e)}
                    title="Drag to resize column (double-click to reset)"
                    className={`absolute top-0 right-0 bottom-0 w-2.5 cursor-col-resize flex items-center justify-center z-20 select-none group/resize ${
                      resizingCol === 'dob' ? 'bg-indigo-500/20' : 'hover:bg-indigo-300/40'
                    }`}
                  >
                    <div
                      className={`w-[1.5px] h-3.5 rounded-full ${
                        resizingCol === 'dob' ? 'bg-indigo-600' : 'bg-slate-300 group-hover/resize:bg-indigo-500'
                      }`}
                    />
                  </div>
                </th>

                {/* 5. Mobile Numbers */}
                <th className="py-2.5 px-3 relative group">
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
                      className="cursor-pointer flex items-center justify-between hover:text-indigo-700 transition-colors pr-2"
                      title="Click to rename column header"
                    >
                      <span className="truncate">{headers.mobile}</span>
                      <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                    </div>
                  )}
                  {/* Resize Divider */}
                  <div
                    onMouseDown={(e) => handleResizeMouseDown('mobile', e)}
                    onDoubleClick={(e) => handleResetColWidth('mobile', e)}
                    title="Drag to resize column (double-click to reset)"
                    className={`absolute top-0 right-0 bottom-0 w-2.5 cursor-col-resize flex items-center justify-center z-20 select-none group/resize ${
                      resizingCol === 'mobile' ? 'bg-indigo-500/20' : 'hover:bg-indigo-300/40'
                    }`}
                  >
                    <div
                      className={`w-[1.5px] h-3.5 rounded-full ${
                        resizingCol === 'mobile' ? 'bg-indigo-600' : 'bg-slate-300 group-hover/resize:bg-indigo-500'
                      }`}
                    />
                  </div>
                </th>

                {/* 6. Email */}
                <th className="py-2.5 px-3 relative group">
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
                      className="cursor-pointer flex items-center justify-between hover:text-indigo-700 transition-colors pr-2"
                      title="Click to rename column header"
                    >
                      <span className="truncate">{headers.email}</span>
                      <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                    </div>
                  )}
                  {/* Resize Divider */}
                  <div
                    onMouseDown={(e) => handleResizeMouseDown('email', e)}
                    onDoubleClick={(e) => handleResetColWidth('email', e)}
                    title="Drag to resize column (double-click to reset)"
                    className={`absolute top-0 right-0 bottom-0 w-2.5 cursor-col-resize flex items-center justify-center z-20 select-none group/resize ${
                      resizingCol === 'email' ? 'bg-indigo-500/20' : 'hover:bg-indigo-300/40'
                    }`}
                  >
                    <div
                      className={`w-[1.5px] h-3.5 rounded-full ${
                        resizingCol === 'email' ? 'bg-indigo-600' : 'bg-slate-300 group-hover/resize:bg-indigo-500'
                      }`}
                    />
                  </div>
                </th>

                {/* 7. Remarks */}
                <th className="py-2.5 px-3 relative group">
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
                      className="cursor-pointer flex items-center justify-between hover:text-indigo-700 transition-colors pr-2"
                      title="Click to rename column header"
                    >
                      <span className="truncate">{headers.remarks}</span>
                      <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                    </div>
                  )}
                  {/* Resize Divider */}
                  <div
                    onMouseDown={(e) => handleResizeMouseDown('remarks', e)}
                    onDoubleClick={(e) => handleResetColWidth('remarks', e)}
                    title="Drag to resize column (double-click to reset)"
                    className={`absolute top-0 right-0 bottom-0 w-2.5 cursor-col-resize flex items-center justify-center z-20 select-none group/resize ${
                      resizingCol === 'remarks' ? 'bg-indigo-500/20' : 'hover:bg-indigo-300/40'
                    }`}
                  >
                    <div
                      className={`w-[1.5px] h-3.5 rounded-full ${
                        resizingCol === 'remarks' ? 'bg-indigo-600' : 'bg-slate-300 group-hover/resize:bg-indigo-500'
                      }`}
                    />
                  </div>
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
                          onBlur={() => handleBlurContact(contact)}
                          placeholder="e.g. Self, Spouse, MOM, Doctor"
                          className="w-full px-2 py-1 text-xs font-bold text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded transition-colors"
                        />
                      </div>
                    </td>

                    {/* 3. Contact Name (Inline Editable) */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={contact.name}
                        onChange={(e) => handleInlineChange(contact, 'name', e.target.value)}
                        onBlur={() => handleBlurContact(contact)}
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
                            onBlur={() => handleBlurContact(contact)}
                            placeholder="YYYY-MM-DD"
                            className="w-full pl-2 pr-7 py-1 text-xs font-mono text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded transition-colors"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenCalendarId(openCalendarId === contact.id ? null : contact.id);
                            }}
                            className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-colors ${
                              openCalendarId === contact.id ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600'
                            }`}
                            title="Open Calendar Dropdown"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                          </button>

                          {openCalendarId === contact.id && (
                            <DatePickerDropdown
                              value={contact.dob || ''}
                              onChange={(val) => {
                                const updated = { ...contact, dob: val };
                                handleInlineChange(contact, 'dob', val);
                                onCommitContact?.(updated);
                              }}
                              onClose={() => setOpenCalendarId(null)}
                            />
                          )}
                        </div>

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

                    {/* 5. Mobile Numbers */}
                    <td className="py-2 px-3">
                      <div className="space-y-1.5 w-full">
                        {/* List of existing phone badges */}
                        {phoneList.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {phoneList.map((phone, idx) => {
                              const isEditingThis =
                                editingPhoneIndex?.contactId === contact.id &&
                                editingPhoneIndex?.index === idx;

                              if (isEditingThis) {
                                return (
                                  <div key={idx} className="flex items-center gap-1 w-full max-w-[200px]">
                                    <input
                                      type="tel"
                                      autoFocus
                                      value={editingPhoneDraft}
                                      onChange={(e) => setEditingPhoneDraft(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          handleSaveEditedPhone(contact, idx);
                                        } else if (e.key === 'Escape') {
                                          setEditingPhoneIndex(null);
                                        }
                                      }}
                                      onBlur={() => handleSaveEditedPhone(contact, idx)}
                                      className="w-full text-xs font-mono px-2 py-0.5 bg-white border border-indigo-500 rounded outline-none shadow-2xs"
                                    />
                                    <button
                                      type="button"
                                      onMouseDown={(e) => e.preventDefault()}
                                      onClick={() => handleSaveEditedPhone(contact, idx)}
                                      className="px-2 py-0.5 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors shrink-0"
                                    >
                                      Save
                                    </button>
                                  </div>
                                );
                              }

                              return (
                                <div
                                  key={idx}
                                  className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200 text-xs font-mono group/phone"
                                >
                                  <a
                                    href={`tel:${phone}`}
                                    className="text-slate-800 hover:text-indigo-600 font-semibold truncate flex items-center gap-1"
                                    title="Click to call"
                                  >
                                    <PhoneCall className="w-3 h-3 text-slate-400" />
                                    <span>{phone}</span>
                                  </a>
                                  <div className="flex items-center gap-0.5 ml-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingPhoneIndex({ contactId: contact.id, index: idx });
                                        setEditingPhoneDraft(phone);
                                      }}
                                      className="p-0.5 text-slate-400 hover:text-indigo-600 rounded opacity-0 group-hover/phone:opacity-100 transition-opacity"
                                      title="Edit number"
                                    >
                                      <Pencil className="w-2.5 h-2.5" />
                                    </button>
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
                              );
                            })}
                          </div>
                        )}

                        {/* Active Add Phone Input if opened */}
                        {addingPhoneForId === contact.id ? (
                          <div className="flex items-center gap-1 pt-0.5 w-full">
                            <input
                              type="tel"
                              autoFocus
                              value={newPhoneDraft}
                              onChange={(e) => setNewPhoneDraft(e.target.value)}
                              placeholder="e.g. 9876543210"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddPhone(contact);
                                }
                                if (e.key === 'Escape') {
                                  setAddingPhoneForId(null);
                                  setNewPhoneDraft('');
                                }
                              }}
                              onBlur={(e) => {
                                const related = e.relatedTarget as HTMLElement | null;
                                if (related && related.closest('.phone-action-btn')) return;
                                if (newPhoneDraft.trim()) {
                                  handleAddPhone(contact);
                                } else {
                                  setAddingPhoneForId(null);
                                }
                              }}
                              className="w-full text-xs font-mono px-2 py-1 bg-white border border-indigo-500 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                            />
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleAddPhone(contact)}
                              className="phone-action-btn px-2.5 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors shrink-0"
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setAddingPhoneForId(null);
                                setNewPhoneDraft('');
                              }}
                              className="phone-action-btn p-1 text-slate-400 hover:text-slate-600 rounded"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setAddingPhoneForId(contact.id);
                                setNewPhoneDraft('');
                              }}
                              className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50/70 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200/80 transition-colors whitespace-nowrap"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add</span>
                            </button>
                            {phoneList.length === 0 && (
                              <span className="text-[11px] text-slate-300 italic select-none">
                                —
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* 6. Email */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="email"
                          value={contact.email}
                          onChange={(e) => handleInlineChange(contact, 'email', e.target.value)}
                          onBlur={() => handleBlurContact(contact)}
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

                    {/* 7. Remarks / Address */}
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={contact.remarks || ''}
                        onChange={(e) => handleInlineChange(contact, 'remarks', e.target.value)}
                        onBlur={() => handleBlurContact(contact)}
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
