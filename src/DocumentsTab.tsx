import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileText,
  Search,
  Clock,
  Plus,
  Trash2,
  UploadCloud,
  Eye,
  Paperclip,
  Check,
  RotateCcw,
  Pencil,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  GripVertical,
  User,
  Users,
  Tag,
  X,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Download,
  FolderDown,
  Archive,
  Loader2,
  Info,
  Folder,
  Lock,
  SlidersHorizontal,
} from 'lucide-react';
import { FinancialDocument, DocumentAttachment, FamilyMember, ImportantContact, PersonRecord } from './types.ts';
import { checkExpiryStatus, reorderDocumentsList } from './calculations.ts';
import { DocumentPreviewModal } from './DocumentPreviewModal.tsx';
import { downloadDocumentsAsZip, sanitizeName } from './documentZip.ts';

interface DocumentsTabProps {
  documents: FinancialDocument[];
  people?: PersonRecord[];
  onAddPerson?: (name: string) => void;
  initialPersonFilter?: string | null;
  onClearInitialPersonFilter?: () => void;
  familyMembers?: FamilyMember[];
  contacts?: ImportantContact[];
  isMasked: boolean;
  currentYear: number;
  onUpdateDocument: (doc: FinancialDocument) => void;
  onCommitDocument?: (doc: FinancialDocument) => void;
  onAddDocument: (doc: Omit<FinancialDocument, 'id'>) => void;
  onDeleteDocument: (id: string) => void;
  onUploadFile: (docId: string, file: File) => Promise<DocumentAttachment | null>;
  onRenameFile: (docId: string, newFileName: string) => Promise<void>;
  onDeleteFile: (docId: string, storagePath?: string) => Promise<void>;
  onMoveFileToTrash?: (docId: string, attachment: DocumentAttachment) => void;
  onReorderDocuments?: (docs: FinancialDocument[]) => void;
  syncStatus?: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedTime?: string;
  supabaseConnected?: boolean;
}

// Requirement 2: Status column completely removed
const DEFAULT_HEADERS: Record<string, string> = {
  srNo: '#',
  documentName: 'Document Title & Remarks',
  documentNumber: 'Document / ID Number',
  attachment: 'Uploaded Scan / File',
  expiryDate: 'Expiry Date',
  tags: 'TAGs (Person & Category)',
};

const HEADERS_STORAGE_KEY = 'vault_documents_custom_headers_v3';

const DEFAULT_COL_WIDTHS: Record<string, number> = {
  srNo: 50,
  documentName: 280,
  documentNumber: 180,
  attachment: 130,
  expiryDate: 165,
  tags: 280,
};

const MIN_COL_WIDTHS: Record<string, number> = {
  srNo: 40,
  documentName: 160,
  documentNumber: 120,
  attachment: 95,
  expiryDate: 120,
  tags: 200,
};

const COL_WIDTHS_STORAGE_KEY = 'vault_documents_column_widths_v4';
const CUSTOM_PEOPLE_STORAGE_KEY = 'vault_custom_people_v4';

// Requirement: Delete all demo names from the TAG column person dropdown
const DEMO_PERSON_NAMES = new Set([
  'primary member',
  'self',
  'spouse',
  'dependent parent (mom)',
  'mom',
  'family doctor',
  'financial advisor',
  'lawyer',
  'chartered accountant',
  'office hr',
  'others',
  'others (mention name)',
]);

// Requirement 3: TAG addition quick suggestions only have Adhaar, PAN, Voter ID, Photo, Others
const SUGGESTED_TAGS = ['Adhaar', 'PAN', 'Voter ID', 'Photo', 'Others'];

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

  const handlePrevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const handleSelectDay = (day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${year}-${mm}-${dd}`);
    onClose();
  };

  const handleClear = () => {
    onChange('');
    onClose();
  };

  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear + 15; y >= 1930; y--) {
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
      if (y === year && m - 1 === month) return d;
    }
    return null;
  })();

  return (
    <div
      ref={containerRef}
      className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-3 w-64 text-slate-800 select-none font-sans"
      onClick={(e) => e.stopPropagation()}
    >
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

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 mb-1">
        <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {days.map((item, idx) => {
          const isSelected = item.isCurrentMonth && item.day === selectedDay;
          return (
            <button
              key={idx}
              type="button"
              disabled={!item.isCurrentMonth}
              onClick={() => item.isCurrentMonth && handleSelectDay(item.day)}
              className={`h-7 w-7 rounded flex items-center justify-center font-mono transition-colors text-xs ${
                !item.isCurrentMonth
                  ? 'text-slate-300 cursor-not-allowed'
                  : isSelected
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
              }`}
            >
              {item.day}
            </button>
          );
        })}
      </div>

      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            onChange(`${yyyy}-${mm}-${dd}`);
            onClose();
          }}
          className="text-indigo-600 hover:text-indigo-800 font-semibold"
        >
          Today
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="text-slate-400 hover:text-rose-600 font-medium"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
  documents,
  people = [],
  onAddPerson,
  initialPersonFilter,
  onClearInitialPersonFilter,
  familyMembers = [],
  contacts = [],
  isMasked,
  currentYear,
  onUpdateDocument,
  onCommitDocument,
  onAddDocument,
  onDeleteDocument,
  onUploadFile,
  onRenameFile,
  onDeleteFile,
  onMoveFileToTrash,
  onReorderDocuments,
  syncStatus = 'idle',
  lastSavedTime,
  supabaseConnected = false,
}) => {
  // Requirement 1 & 2: Filter by Person AND Multi-Select Tag Filter
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('all');

  useEffect(() => {
    if (initialPersonFilter) {
      setSelectedPersonFilter(initialPersonFilter);
      onClearInitialPersonFilter?.();
    }
  }, [initialPersonFilter, onClearInitialPersonFilter]);

  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Requirement 4: Drag and drop row reordering state
  const [draggedDocId, setDraggedDocId] = useState<string | null>(null);
  const [dragOverState, setDragOverState] = useState<{ docId: string; position: 'above' | 'below' } | null>(null);

  const [filterType, setFilterType] = useState<'all' | 'expiring' | 'with_files'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & popovers
  const [previewDoc, setPreviewDoc] = useState<FinancialDocument | null>(null);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [targetUploadDocId, setTargetUploadDocId] = useState<string | null>(null);
  const [openCalendarId, setOpenCalendarId] = useState<string | null>(null);
  const [activePersonPickerDocId, setActivePersonPickerDocId] = useState<string | null>(null);
  const [activeTagInputDocId, setActiveTagInputDocId] = useState<string | null>(null);
  const [tagDraft, setTagDraft] = useState('');
  const [customPersonDraft, setCustomPersonDraft] = useState('');

  // Requirement 1: Confirmation modal before deleting document records
  const [docToDelete, setDocToDelete] = useState<FinancialDocument | null>(null);

  // Requirement 1: Confirmation modal before deleting uploaded files (30-day trash retention)
  const [fileToDelete, setFileToDelete] = useState<{ docId: string; documentName: string; attachment: DocumentAttachment } | null>(null);

  // ZIP packaging and download state
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);
  const [zipProgressText, setZipProgressText] = useState<string | null>(null);
  const [showNoFilesModal, setShowNoFilesModal] = useState(false);
  const [showZipOptionsModal, setShowZipOptionsModal] = useState(false);

  // Requirement 2: Dynamic list of user-typed people remembered persistently across the table (no demo names)
  const [customPeople, setCustomPeople] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_PEOPLE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .map((p: any) => (typeof p === 'string' ? p.trim() : ''))
            .filter((p: string) => p.length > 0 && !DEMO_PERSON_NAMES.has(p.toLowerCase()));
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Column header renaming state
  const [headers, setHeaders] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(HEADERS_STORAGE_KEY);
      if (saved) return { ...DEFAULT_HEADERS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_HEADERS;
  });
  const [editingHeaderKey, setEditingHeaderKey] = useState<string | null>(null);
  const [headerDraft, setHeaderDraft] = useState('');

  // Draggable column resizing state
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(COL_WIDTHS_STORAGE_KEY);
      if (saved) return { ...DEFAULT_COL_WIDTHS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_COL_WIDTHS;
  });

  const resizingColRef = useRef<string | null>(null);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);
  const [resizingCol, setResizingCol] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Column resize mouse listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingColRef.current) return;
      const col = resizingColRef.current;
      const deltaX = e.clientX - startXRef.current;
      const minW = MIN_COL_WIDTHS[col] || 50;
      const newWidth = Math.max(minW, startWidthRef.current + deltaX);

      setColWidths((prev) => {
        const next = { ...prev, [col]: newWidth };
        try {
          localStorage.setItem(COL_WIDTHS_STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    };

    const handleMouseUp = () => {
      if (resizingColRef.current) {
        resizingColRef.current = null;
        setResizingCol(null);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Close tag multi-select popover when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (tagDropdownRef.current && !tagDropdownRef.current.contains(e.target as Node)) {
        setIsTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleResizeMouseDown = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingColRef.current = colKey;
    startXRef.current = e.clientX;
    startWidthRef.current = colWidths[colKey] || DEFAULT_COL_WIDTHS[colKey];
    setResizingCol(colKey);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleResetColWidth = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const defaultW = DEFAULT_COL_WIDTHS[colKey] || 150;
    setColWidths((prev) => {
      const next = { ...prev, [colKey]: defaultW };
      try {
        localStorage.setItem(COL_WIDTHS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleResetAllColWidths = () => {
    setColWidths(DEFAULT_COL_WIDTHS);
    try {
      localStorage.removeItem(COL_WIDTHS_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleStartEditHeader = (key: string) => {
    setEditingHeaderKey(key);
    setHeaderDraft(headers[key] || DEFAULT_HEADERS[key] || '');
  };

  const handleSaveHeader = (key: string) => {
    const finalTitle = headerDraft.trim() || DEFAULT_HEADERS[key];
    const next = { ...headers, [key]: finalTitle };
    setHeaders(next);
    setEditingHeaderKey(null);
    try {
      localStorage.setItem(HEADERS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  // Requirement: Centralized people list from People List tab
  const availablePeople = useMemo(() => {
    if (people && people.length > 0) {
      return people.map((p) => p.name.trim()).filter(Boolean);
    }
    const set = new Set<string>();
    customPeople.forEach((p) => {
      const clean = p.trim();
      if (clean && !DEMO_PERSON_NAMES.has(clean.toLowerCase())) set.add(clean);
    });
    documents.forEach((d) => {
      const clean = (d.personTag || '').trim();
      if (clean && !DEMO_PERSON_NAMES.has(clean.toLowerCase())) set.add(clean);
    });
    return Array.from(set);
  }, [people, customPeople, documents]);

  const handleDeleteCustomPerson = (personToDelete: string) => {
    const updated = customPeople.filter((p) => p !== personToDelete);
    setCustomPeople(updated);
    try {
      localStorage.setItem(CUSTOM_PEOPLE_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Requirement 1: When a person is selected, automatically filter out irrelevant tags (for the selected person) in the tag dropdown options
  const personRelevantTags = useMemo(() => {
    const set = new Set<string>();
    if (selectedPersonFilter === 'all') {
      // Show all tags across all documents
      documents.forEach((d) => {
        d.tags?.forEach((t) => {
          if (t && t.trim()) set.add(t.trim());
        });
      });
    } else {
      // Filter out irrelevant tags: show ONLY tags attached to documents for the selected person
      const selected = selectedPersonFilter.toLowerCase();
      documents.forEach((d) => {
        const docPerson = (d.personTag || '').toLowerCase();
        const matches = docPerson === selected || d.tags?.some((t) => t.toLowerCase() === selected);
        if (matches) {
          d.tags?.forEach((t) => {
            if (t && t.trim()) set.add(t.trim());
          });
        }
      });
    }
    return Array.from(set);
  }, [documents, selectedPersonFilter]);

  // Requirement 1 & 2: If tags were selected that do not belong to the selected person, automatically filter them out
  useEffect(() => {
    if (selectedTagFilters.length > 0) {
      const validTags = selectedTagFilters.filter((t) => personRelevantTags.includes(t));
      if (validTags.length !== selectedTagFilters.length) {
        setSelectedTagFilters(validTags);
      }
    }
  }, [selectedPersonFilter, personRelevantTags, selectedTagFilters]);

  // Counts for people filter dropdown
  const personDocumentCounts = useMemo(() => {
    const map: Record<string, number> = {};
    documents.forEach((d) => {
      const p = d.personTag?.trim();
      if (p && p !== 'Primary Member') {
        map[p] = (map[p] || 0) + 1;
      }
    });
    return map;
  }, [documents]);

  // Counts for tag filter dropdown (calculated for the selected person or all)
  const tagDocumentCounts = useMemo(() => {
    const map: Record<string, number> = {};
    const relevantDocs = selectedPersonFilter === 'all'
      ? documents
      : documents.filter((d) => {
          const docPerson = (d.personTag || '').toLowerCase();
          const selected = selectedPersonFilter.toLowerCase();
          return docPerson === selected || d.tags?.some((t) => t.toLowerCase() === selected);
        });

    relevantDocs.forEach((d) => {
      d.tags?.forEach((t) => {
        const clean = t.trim();
        map[clean] = (map[clean] || 0) + 1;
      });
    });
    return map;
  }, [documents, selectedPersonFilter]);

  // Filter with Person AND Tag (AND operation with Person; OR among multi-selected tags)
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      // 1. Person filter
      if (selectedPersonFilter !== 'all') {
        const docPerson = (doc.personTag || '').toLowerCase();
        const selected = selectedPersonFilter.toLowerCase();
        const matchesPerson = docPerson === selected || doc.tags?.some((t) => t.toLowerCase() === selected);
        if (!matchesPerson) return false;
      }

      // 2. Multi-Select Tag filter (matches if doc contains ANY of the selected tags)
      if (selectedTagFilters.length > 0) {
        const lowerSelected = selectedTagFilters.map((t) => t.toLowerCase());
        const matchesTag = doc.tags?.some((t) => lowerSelected.includes(t.toLowerCase()));
        if (!matchesTag) return false;
      }

      // 3. Search query filter
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const match =
          doc.documentName.toLowerCase().includes(q) ||
          doc.documentNumber.toLowerCase().includes(q) ||
          (doc.personTag && doc.personTag.toLowerCase().includes(q)) ||
          (doc.tags && doc.tags.some((t) => t.toLowerCase().includes(q))) ||
          (doc.remarks && doc.remarks.toLowerCase().includes(q)) ||
          (doc.attachment?.fileName && doc.attachment.fileName.toLowerCase().includes(q)) ||
          (doc.attachments && doc.attachments.some((a) => a.fileName.toLowerCase().includes(q)));
        if (!match) return false;
      }

      // 4. Segment Filter
      const expiry = checkExpiryStatus(doc.expiryDate);
      if (filterType === 'expiring') {
        return expiry.isUrgent || doc.statusNote?.toLowerCase().includes('expire soon');
      }
      if (filterType === 'with_files') {
        return (doc.attachments && doc.attachments.length > 0) || Boolean(doc.attachment);
      }

      return true;
    });
  }, [documents, selectedPersonFilter, selectedTagFilters, searchQuery, filterType]);

  const expiringCount = useMemo(() => {
    return documents.filter((d) => {
      const exp = checkExpiryStatus(d.expiryDate);
      return exp.isUrgent || d.statusNote?.toLowerCase().includes('expire soon');
    }).length;
  }, [documents]);

  const withFilesCount = useMemo(() => {
    return documents.filter((d) => (d.attachments && d.attachments.length > 0) || Boolean(d.attachment)).length;
  }, [documents]);

  // Handle cell edit
  const handleInlineChange = (doc: FinancialDocument, field: keyof FinancialDocument, value: any) => {
    const updated = { ...doc, [field]: value };
    onUpdateDocument(updated);
  };

  const handleBlurDoc = (doc: FinancialDocument) => {
    onCommitDocument?.(doc);
  };

  // Add tag to document
  const handleAddTag = (doc: FinancialDocument, newTag: string) => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    const currentTags = doc.tags || [];
    if (currentTags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setTagDraft('');
      setActiveTagInputDocId(null);
      return;
    }
    const updated: FinancialDocument = {
      ...doc,
      tags: [...currentTags, trimmed],
    };
    onUpdateDocument(updated);
    onCommitDocument?.(updated);
    setTagDraft('');
    setActiveTagInputDocId(null);
  };

  // Remove tag from document
  const handleRemoveTag = (doc: FinancialDocument, tagToRemove: string) => {
    const updated: FinancialDocument = {
      ...doc,
      tags: (doc.tags || []).filter((t) => t !== tagToRemove),
    };
    onUpdateDocument(updated);
    onCommitDocument?.(updated);
  };

  // Set mandatory person tag & register in master people list
  const handleSetPersonTag = (doc: FinancialDocument, person: string) => {
    const trimmed = person.trim();
    if (!trimmed) return;

    if (onAddPerson && !availablePeople.some((p) => p.toLowerCase() === trimmed.toLowerCase())) {
      onAddPerson(trimmed);
    }

    // Save to customPeople if new
    if (!customPeople.includes(trimmed)) {
      const updatedPeople = [...customPeople, trimmed];
      setCustomPeople(updatedPeople);
      try {
        localStorage.setItem(CUSTOM_PEOPLE_STORAGE_KEY, JSON.stringify(updatedPeople));
      } catch {
        // ignore
      }
    }

    const updated: FinancialDocument = {
      ...doc,
      personTag: trimmed,
    };
    onUpdateDocument(updated);
    onCommitDocument?.(updated);
    setActivePersonPickerDocId(null);
    setCustomPersonDraft('');
  };

  // Quick Add Row with clean state (no demo tags)
  const handleQuickAddRow = () => {
    const defaultPerson =
      selectedPersonFilter !== 'all'
        ? selectedPersonFilter
        : '';

    const newDoc: Omit<FinancialDocument, 'id'> = {
      srNo: documents.length + 1,
      documentName: 'New Document',
      documentNumber: '',
      remarks: '',
      expiryDate: '',
      personTag: defaultPerson,
      tags: [], // No preloaded demo tags!
    };
    onAddDocument(newDoc);
  };

  const handleTriggerUpload = (docId: string) => {
    setTargetUploadDocId(docId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetUploadDocId) return;

    setUploadingDocId(targetUploadDocId);
    try {
      await onUploadFile(targetUploadDocId, file);
    } finally {
      setUploadingDocId(null);
      setTargetUploadDocId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Total count of uploaded files across all documents
  const totalAttachedFilesCount = useMemo(() => {
    return documents.reduce((sum, doc) => {
      const atts = Array.isArray(doc.attachments) && doc.attachments.length > 0
        ? doc.attachments
        : (doc.attachment ? [doc.attachment] : []);
      return sum + atts.length;
    }, 0);
  }, [documents]);

  // Count of uploaded files in currently filtered view
  const filteredAttachedFilesCount = useMemo(() => {
    return filteredDocs.reduce((sum, doc) => {
      const atts = Array.isArray(doc.attachments) && doc.attachments.length > 0
        ? doc.attachments
        : (doc.attachment ? [doc.attachment] : []);
      return sum + atts.length;
    }, 0);
  }, [filteredDocs]);

  // Download all uploaded docs organized by person folders
  const handleDownloadAllDocsZip = async () => {
    if (totalAttachedFilesCount === 0) {
      setShowNoFilesModal(true);
      return;
    }
    setShowZipOptionsModal(false);
    setIsDownloadingZip(true);
    setZipProgressText('Packaging all family documents...');
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const res = await downloadDocumentsAsZip(documents, {
        customFilename: `Family_Documents_All_Folders_${dateStr}.zip`,
        onProgress: (txt) => setZipProgressText(txt),
      });
      if (res.success) {
        setZipProgressText(res.message || 'ZIP downloaded!');
        setTimeout(() => {
          setIsDownloadingZip(false);
          setZipProgressText(null);
        }, 1600);
      } else {
        setShowNoFilesModal(true);
        setIsDownloadingZip(false);
        setZipProgressText(null);
      }
    } catch (err: any) {
      console.error('ZIP export error:', err);
      setIsDownloadingZip(false);
      setZipProgressText(null);
    }
  };

  // Download filtered person's uploaded docs
  const handleDownloadFilteredDocsZip = async () => {
    if (filteredAttachedFilesCount === 0) {
      setShowNoFilesModal(true);
      return;
    }
    setShowZipOptionsModal(false);
    setIsDownloadingZip(true);
    setZipProgressText(`Packaging docs for ${selectedPersonFilter}...`);
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const safePerson = sanitizeName(selectedPersonFilter);
      const res = await downloadDocumentsAsZip(filteredDocs, {
        customFilename: `${safePerson}_Documents_${dateStr}.zip`,
        onProgress: (txt) => setZipProgressText(txt),
      });
      if (res.success) {
        setZipProgressText(res.message || 'ZIP downloaded!');
        setTimeout(() => {
          setIsDownloadingZip(false);
          setZipProgressText(null);
        }, 1600);
      } else {
        setShowNoFilesModal(true);
        setIsDownloadingZip(false);
        setZipProgressText(null);
      }
    } catch (err: any) {
      console.error('ZIP export error:', err);
      setIsDownloadingZip(false);
      setZipProgressText(null);
    }
  };

  // Trigger download action
  const handleClickDownloadDocs = () => {
    if (totalAttachedFilesCount === 0) {
      setShowNoFilesModal(true);
      return;
    }
    if (selectedPersonFilter !== 'all') {
      setShowZipOptionsModal(true);
    } else {
      handleDownloadAllDocsZip();
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for document attachment upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp,image/jpg"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Header bar with title and live sync indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Family Documents Records ({documents.length} Tracked)
            </h1>
            {syncStatus === 'saving' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                Saving to Supabase...
              </span>
            )}
            {syncStatus === 'saved' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Check className="w-3 h-3" />
                Saved {lastSavedTime ? `at ${lastSavedTime}` : ''}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Inline editable family records with mandatory person tags, category chips, multi-file uploads, and secure trash bin safety.
          </p>
        </div>
      </div>

      {/* Expiration Notice Banner if urgent */}
      {expiringCount > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-amber-950">
              {expiringCount} Document{expiringCount === 1 ? '' : 's'} Expiring Soon or Needs Attention
            </p>
            <p className="text-amber-800 leading-relaxed">
              Ensure important identity cards and registrations are renewed in advance. You can edit any date directly in the table below.
            </p>
          </div>
        </div>
      )}

      {/* Split Layout: Fixed/Sticky Left Vertical Panel + Right Main Documents Table */}
      <div className="flex flex-col lg:flex-row items-start gap-4 w-full">
        {/* Left Sticky Vertical Control & Filter Panel */}
        <aside className="w-full lg:w-72 xl:w-80 shrink-0 lg:sticky lg:top-20 z-10 space-y-3.5">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4">
            {/* Header & Stats */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <span>Controls & Filters</span>
              </h3>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
                {filteredDocs.length} shown
              </span>
            </div>

            {/* Feature 3 Action Buttons (Only in this section) */}
            <div className="space-y-2">
              <button
                type="button"
                id="sidebar-add-row-btn"
                onClick={handleQuickAddRow}
                className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Add Document Row</span>
              </button>

              <button
                type="button"
                id="sidebar-download-zip-btn"
                onClick={handleClickDownloadDocs}
                disabled={isDownloadingZip}
                title="Download all scans & docs as ZIP organized by person"
                className="w-full inline-flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                <div className="flex items-center gap-2">
                  {isDownloadingZip ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  ) : (
                    <FolderDown className="w-4 h-4 text-indigo-600" />
                  )}
                  <span>Download Docs (.zip)</span>
                </div>
                {totalAttachedFilesCount > 0 ? (
                  <span className="text-[11px] text-indigo-700 font-bold bg-indigo-100/70 px-2 py-0.5 rounded-full border border-indigo-200 font-mono">
                    {totalAttachedFilesCount}
                  </span>
                ) : (
                  <span className="text-[10.5px] text-slate-400">0</span>
                )}
              </button>

              <button
                type="button"
                id="sidebar-reset-col-btn"
                onClick={handleResetAllColWidths}
                title="Reset all column widths to default"
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                <span>Reset Column Size</span>
              </button>
            </div>

            <div className="border-t border-slate-100 pt-1 space-y-3.5">
              {/* Filter 1: Person Filter with dynamic live count and Show all */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="person-filter-dropdown" className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>Person:</span>
                  </label>
                  <button
                    type="button"
                    id="person-show-all-btn"
                    onClick={() => setSelectedPersonFilter('all')}
                    className={`text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                      selectedPersonFilter !== 'all'
                        ? 'text-indigo-600 hover:text-indigo-800 underline'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="Reset Person filter to All"
                  >
                    Show all
                  </button>
                </div>
                <select
                  id="person-filter-dropdown"
                  value={selectedPersonFilter}
                  onChange={(e) => setSelectedPersonFilter(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs transition-colors"
                >
                  <option value="all">🌟 All People ({availablePeople.length})</option>
                  {availablePeople.map((person) => {
                    const count = personDocumentCounts[person] || 0;
                    return (
                      <option key={person} value={person}>
                        👤 {person} ({count} doc{count === 1 ? '' : 's'})
                      </option>
                    );
                  })}
                </select>
                <span className="text-[10.5px] text-slate-400 px-0.5">
                  {selectedPersonFilter === 'all'
                    ? `Viewing all ${availablePeople.length} people`
                    : `Active: ${selectedPersonFilter}`}
                </span>
              </div>

              {/* Filter 2: Multi-Select Tag Filter with Show all */}
              <div className="flex flex-col gap-1.5 relative" ref={tagDropdownRef}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <span>TAG:</span>
                  </span>
                  <button
                    type="button"
                    id="tag-show-all-btn"
                    onClick={() => setSelectedTagFilters([])}
                    className={`text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer ${
                      selectedTagFilters.length > 0
                        ? 'text-emerald-600 hover:text-emerald-800 underline'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                    title="Reset Tag filter to All"
                  >
                    Show all
                  </button>
                </div>

                <button
                  type="button"
                  id="tag-filter-dropdown"
                  onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                  className="w-full text-left text-xs font-semibold text-slate-800 bg-slate-50 hover:bg-slate-100/80 border border-slate-300 rounded-lg px-2.5 py-1.5 flex items-center justify-between focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs transition-colors"
                  title="Click to multi-select tags"
                >
                  <span className="truncate flex items-center gap-1">
                    {selectedTagFilters.length === 0 ? (
                      <>
                        <span>🏷️</span>
                        <span>
                          {selectedPersonFilter !== 'all' ? `Tags (${selectedPersonFilter})` : 'All Tags'} ({personRelevantTags.length})
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[11px] font-bold">
                          🏷️ {selectedTagFilters.length} selected
                        </span>
                      </>
                    )}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isTagDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isTagDropdownOpen && (
                  <div className="absolute top-[58px] left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-2.5 text-slate-800 space-y-2">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-xs">
                      <span className="font-bold text-slate-700 text-[11px]">
                        {selectedPersonFilter !== 'all' ? `Tags for ${selectedPersonFilter}` : 'Select Tags'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedTagFilters([...personRelevantTags])}
                          className="text-[10.5px] font-semibold text-emerald-600 hover:text-emerald-800 cursor-pointer"
                        >
                          Select all
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedTagFilters([])}
                          className="text-[10.5px] font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {personRelevantTags.length === 0 ? (
                      <div className="py-3 text-center text-xs text-slate-400 italic">
                        No tags available for {selectedPersonFilter !== 'all' ? selectedPersonFilter : 'documents'}
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-0.5 py-0.5">
                        {personRelevantTags.map((tagItem) => {
                          const isChecked = selectedTagFilters.includes(tagItem);
                          const count = tagDocumentCounts[tagItem] || 0;
                          return (
                            <label
                              key={tagItem}
                              className={`flex items-center justify-between px-2 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                                isChecked ? 'bg-emerald-50 text-emerald-950 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setSelectedTagFilters(selectedTagFilters.filter((t) => t !== tagItem));
                                    } else {
                                      setSelectedTagFilters([...selectedTagFilters, tagItem]);
                                    }
                                  }}
                                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                                />
                                <span>🏷️ {tagItem}</span>
                              </div>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                  isChecked ? 'bg-emerald-200/70 text-emerald-900 font-bold' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {count}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsTagDropdownOpen(false)}
                        className="px-2.5 py-1 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
                <span className="text-[10.5px] text-slate-400 px-0.5">
                  {selectedTagFilters.length === 0
                    ? 'All tags active'
                    : `${selectedTagFilters.length} of ${personRelevantTags.length} selected`}
                </span>
              </div>

              {/* Filter 3: Search Records */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="documents-search-input" className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Search className="w-4 h-4 text-slate-500" />
                    <span>Search:</span>
                  </label>
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="documents-search-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search title, ID, tags..."
                    className="w-full text-xs pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Segment Views */}
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Quick Views:</span>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterType('all')}
                    className={`py-1 text-center font-medium rounded-md transition-colors text-[11px] ${
                      filterType === 'all'
                        ? 'bg-slate-900 text-white font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 bg-slate-50 border border-slate-200'
                    }`}
                  >
                    All ({documents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('expiring')}
                    className={`py-1 text-center font-medium rounded-md transition-colors text-[11px] flex items-center justify-center gap-1 ${
                      filterType === 'expiring'
                        ? 'bg-amber-600 text-white font-bold'
                        : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>({expiringCount})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType('with_files')}
                    className={`py-1 text-center font-medium rounded-md transition-colors text-[11px] flex items-center justify-center gap-1 ${
                      filterType === 'with_files'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200'
                    }`}
                  >
                    <Paperclip className="w-3 h-3" />
                    <span>({withFilesCount})</span>
                  </button>
                </div>
              </div>

              {/* Active Filters Summary & Reset */}
              {(selectedPersonFilter !== 'all' || selectedTagFilters.length > 0) && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-600">Active Filters:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPersonFilter('all');
                        setSelectedTagFilters([]);
                      }}
                      className="text-indigo-600 hover:text-indigo-800 underline font-semibold cursor-pointer"
                    >
                      Reset all
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedPersonFilter !== 'all' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-semibold text-indigo-700 bg-indigo-50 rounded border border-indigo-200">
                        <span>👤 {selectedPersonFilter}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedPersonFilter('all')}
                          className="hover:text-indigo-900 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {selectedTagFilters.map((tagItem) => (
                      <span
                        key={tagItem}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 rounded border border-emerald-200"
                      >
                        <span>🏷️ {tagItem}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedTagFilters(selectedTagFilters.filter((t) => t !== tagItem))}
                          className="hover:text-emerald-900 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Right Section: Pinned Table Title Bar and Data Table */}
        <div className="flex-1 min-w-0 w-full space-y-3">
          {/* Feature 3.1: Pinned / Fixed Title of the Table */}
          <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-xs border border-slate-200 rounded-xl px-4 py-3 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Family Documents Records</span>
              </h2>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-mono">
                {filteredDocs.length} of {documents.length} records
              </span>
              {selectedPersonFilter !== 'all' && (
                <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                  Person: {selectedPersonFilter}
                </span>
              )}
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:inline-block">
              Drag column borders to resize • Double-click to reset • Hover to rename
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs w-full">
            <div className="overflow-x-auto w-full">
              <table
                className="text-left border-collapse table-fixed w-full"
                style={{ minWidth: `${Math.max(860, Object.values(colWidths).reduce((a, b) => a + b, 0))}px` }}
              >
                {/* Requirement 2: Status column is omitted */}
                <colgroup>
                  <col style={{ width: `${colWidths.srNo}px` }} />
                  <col style={{ width: `${colWidths.documentName}px` }} />
                  <col style={{ width: `${colWidths.documentNumber}px` }} />
                  <col style={{ width: `${colWidths.attachment}px` }} />
                  <col style={{ width: `${colWidths.expiryDate}px` }} />
                  <col style={{ width: `${colWidths.tags}px` }} />
                </colgroup>
                <thead>
                  <tr className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-600 font-bold select-none shadow-2xs">
                {/* 1. Sr. No */}
                <th className="py-2.5 px-3 text-center relative group">
                  <div className="flex items-center justify-center gap-1">
                    <span>{headers.srNo}</span>
                  </div>
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

                {/* 2. Document Title & Remarks */}
                <th className="py-2.5 px-3 relative group">
                  {editingHeaderKey === 'documentName' ? (
                    <input
                      type="text"
                      autoFocus
                      value={headerDraft}
                      onChange={(e) => setHeaderDraft(e.target.value)}
                      onBlur={() => handleSaveHeader('documentName')}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveHeader('documentName')}
                      className="w-full text-xs font-bold text-indigo-700 bg-white px-1.5 py-0.5 border border-indigo-400 rounded outline-none"
                    />
                  ) : (
                    <div
                      onClick={() => handleStartEditHeader('documentName')}
                      className="cursor-pointer flex items-center justify-between hover:text-indigo-700 transition-colors pr-2"
                      title="Click to rename column header"
                    >
                      <span className="truncate">{headers.documentName}</span>
                      <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                    </div>
                  )}
                  <div
                    onMouseDown={(e) => handleResizeMouseDown('documentName', e)}
                    onDoubleClick={(e) => handleResetColWidth('documentName', e)}
                    title="Drag to resize column (double-click to reset)"
                    className={`absolute top-0 right-0 bottom-0 w-2.5 cursor-col-resize flex items-center justify-center z-20 select-none group/resize ${
                      resizingCol === 'documentName' ? 'bg-indigo-500/20' : 'hover:bg-indigo-300/40'
                    }`}
                  >
                    <div
                      className={`w-[1.5px] h-3.5 rounded-full ${
                        resizingCol === 'documentName' ? 'bg-indigo-600' : 'bg-slate-300 group-hover/resize:bg-indigo-500'
                      }`}
                    />
                  </div>
                </th>

                {/* 3. Document / ID Number */}
                <th className="py-2.5 px-3 relative group">
                  {editingHeaderKey === 'documentNumber' ? (
                    <input
                      type="text"
                      autoFocus
                      value={headerDraft}
                      onChange={(e) => setHeaderDraft(e.target.value)}
                      onBlur={() => handleSaveHeader('documentNumber')}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveHeader('documentNumber')}
                      className="w-full text-xs font-bold text-indigo-700 bg-white px-1.5 py-0.5 border border-indigo-400 rounded outline-none"
                    />
                  ) : (
                    <div
                      onClick={() => handleStartEditHeader('documentNumber')}
                      className="cursor-pointer flex items-center justify-between hover:text-indigo-700 transition-colors pr-2"
                      title="Click to rename column header"
                    >
                      <span className="truncate">{headers.documentNumber}</span>
                      <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                    </div>
                  )}
                  <div
                    onMouseDown={(e) => handleResizeMouseDown('documentNumber', e)}
                    onDoubleClick={(e) => handleResetColWidth('documentNumber', e)}
                    title="Drag to resize column (double-click to reset)"
                    className={`absolute top-0 right-0 bottom-0 w-2.5 cursor-col-resize flex items-center justify-center z-20 select-none group/resize ${
                      resizingCol === 'documentNumber' ? 'bg-indigo-500/20' : 'hover:bg-indigo-300/40'
                    }`}
                  >
                    <div
                      className={`w-[1.5px] h-3.5 rounded-full ${
                        resizingCol === 'documentNumber' ? 'bg-indigo-600' : 'bg-slate-300 group-hover/resize:bg-indigo-500'
                      }`}
                    />
                  </div>
                </th>

                {/* 4. Uploaded Scan / File */}
                <th className="py-2.5 px-3 relative group">
                  {editingHeaderKey === 'attachment' ? (
                    <input
                      type="text"
                      autoFocus
                      value={headerDraft}
                      onChange={(e) => setHeaderDraft(e.target.value)}
                      onBlur={() => handleSaveHeader('attachment')}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveHeader('attachment')}
                      className="w-full text-xs font-bold text-indigo-700 bg-white px-1.5 py-0.5 border border-indigo-400 rounded outline-none"
                    />
                  ) : (
                    <div
                      onClick={() => handleStartEditHeader('attachment')}
                      className="cursor-pointer flex items-center justify-between hover:text-indigo-700 transition-colors pr-2"
                      title="Click to rename column header"
                    >
                      <span className="truncate">{headers.attachment}</span>
                      <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                    </div>
                  )}
                  <div
                    onMouseDown={(e) => handleResizeMouseDown('attachment', e)}
                    onDoubleClick={(e) => handleResetColWidth('attachment', e)}
                    title="Drag to resize column (double-click to reset)"
                    className={`absolute top-0 right-0 bottom-0 w-2.5 cursor-col-resize flex items-center justify-center z-20 select-none group/resize ${
                      resizingCol === 'attachment' ? 'bg-indigo-500/20' : 'hover:bg-indigo-300/40'
                    }`}
                  >
                    <div
                      className={`w-[1.5px] h-3.5 rounded-full ${
                        resizingCol === 'attachment' ? 'bg-indigo-600' : 'bg-slate-300 group-hover/resize:bg-indigo-500'
                      }`}
                    />
                  </div>
                </th>

                {/* 5. Expiry Date */}
                <th className="py-2.5 px-3 relative group">
                  {editingHeaderKey === 'expiryDate' ? (
                    <input
                      type="text"
                      autoFocus
                      value={headerDraft}
                      onChange={(e) => setHeaderDraft(e.target.value)}
                      onBlur={() => handleSaveHeader('expiryDate')}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveHeader('expiryDate')}
                      className="w-full text-xs font-bold text-indigo-700 bg-white px-1.5 py-0.5 border border-indigo-400 rounded outline-none"
                    />
                  ) : (
                    <div
                      onClick={() => handleStartEditHeader('expiryDate')}
                      className="cursor-pointer flex items-center justify-between hover:text-indigo-700 transition-colors pr-2"
                      title="Click to rename column header"
                    >
                      <span className="truncate">{headers.expiryDate}</span>
                      <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                    </div>
                  )}
                  <div
                    onMouseDown={(e) => handleResizeMouseDown('expiryDate', e)}
                    onDoubleClick={(e) => handleResetColWidth('expiryDate', e)}
                    title="Drag to resize column (double-click to reset)"
                    className={`absolute top-0 right-0 bottom-0 w-2.5 cursor-col-resize flex items-center justify-center z-20 select-none group/resize ${
                      resizingCol === 'expiryDate' ? 'bg-indigo-500/20' : 'hover:bg-indigo-300/40'
                    }`}
                  >
                    <div
                      className={`w-[1.5px] h-3.5 rounded-full ${
                        resizingCol === 'expiryDate' ? 'bg-indigo-600' : 'bg-slate-300 group-hover/resize:bg-indigo-500'
                      }`}
                    />
                  </div>
                </th>

                {/* 6. TAGs (Person & Category) */}
                <th className="py-2.5 px-3 relative group">
                  {editingHeaderKey === 'tags' ? (
                    <input
                      type="text"
                      autoFocus
                      value={headerDraft}
                      onChange={(e) => setHeaderDraft(e.target.value)}
                      onBlur={() => handleSaveHeader('tags')}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveHeader('tags')}
                      className="w-full text-xs font-bold text-indigo-700 bg-white px-1.5 py-0.5 border border-indigo-400 rounded outline-none"
                    />
                  ) : (
                    <div
                      onClick={() => handleStartEditHeader('tags')}
                      className="cursor-pointer flex items-center justify-between hover:text-indigo-700 transition-colors pr-2"
                      title="Click to rename column header"
                    >
                      <span className="truncate">{headers.tags}</span>
                      <Pencil className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0" />
                    </div>
                  )}
                  <div
                    onMouseDown={(e) => handleResizeMouseDown('tags', e)}
                    onDoubleClick={(e) => handleResetColWidth('tags', e)}
                    title="Drag to resize column (double-click to reset)"
                    className={`absolute top-0 right-0 bottom-0 w-2.5 cursor-col-resize flex items-center justify-center z-20 select-none group/resize ${
                      resizingCol === 'tags' ? 'bg-indigo-500/20' : 'hover:bg-indigo-300/40'
                    }`}
                  >
                    <div
                      className={`w-[1.5px] h-3.5 rounded-full ${
                        resizingCol === 'tags' ? 'bg-indigo-600' : 'bg-slate-300 group-hover/resize:bg-indigo-500'
                      }`}
                    />
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    {documents.length === 0 ? (
                      <div className="space-y-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                        <p className="font-semibold text-slate-700 text-sm">No Family Documents Recorded</p>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Click &quot;+ Add Row&quot; above to track your first family document. You can assign person tags, category chips, and upload multiple documents.
                        </p>
                        <button
                          type="button"
                          onClick={handleQuickAddRow}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors mt-2"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add First Family Document</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-700">No documents matching selected filters</p>
                        <p className="text-xs text-slate-400">Try changing or resetting your Person or Tag filter above.</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc, index) => {
                  const expiry = checkExpiryStatus(doc.expiryDate);
                  const isExpSoon = expiry.isUrgent || doc.statusNote?.toLowerCase().includes('expire soon');
                  const isUploadingThis = uploadingDocId === doc.id;
                  const personTagValue = doc.personTag && doc.personTag.trim() !== 'Primary Member' ? doc.personTag.trim() : '';
                  const docTags = doc.tags || [];
                  const allAttachments: DocumentAttachment[] = Array.isArray(doc.attachments) && doc.attachments.length > 0
                    ? doc.attachments
                    : (doc.attachment ? [doc.attachment] : []);

                  const isDragging = draggedDocId === doc.id;
                  const isOverAbove = dragOverState?.docId === doc.id && dragOverState.position === 'above';
                  const isOverBelow = dragOverState?.docId === doc.id && dragOverState.position === 'below';

                  return (
                    <tr
                      key={doc.id}
                      draggable={true}
                      onDragStart={(e) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('input, textarea, select, button, [contenteditable="true"]')) {
                          e.preventDefault();
                          return;
                        }
                        e.dataTransfer.setData('text/plain', doc.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggedDocId(doc.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        if (!draggedDocId || draggedDocId === doc.id) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const relY = e.clientY - rect.top;
                        const position = relY < rect.height / 2 ? 'above' : 'below';
                        if (dragOverState?.docId !== doc.id || dragOverState?.position !== position) {
                          setDragOverState({ docId: doc.id, position });
                        }
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          if (dragOverState?.docId === doc.id) {
                            setDragOverState(null);
                          }
                        }
                      }}
                      onDragEnd={() => {
                        setDraggedDocId(null);
                        setDragOverState(null);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (!draggedDocId || draggedDocId === doc.id) {
                          setDraggedDocId(null);
                          setDragOverState(null);
                          return;
                        }
                        const position = dragOverState?.position || 'below';
                        const reordered = reorderDocumentsList(documents, draggedDocId, doc.id, position);
                        if (onReorderDocuments) {
                          onReorderDocuments(reordered);
                        }
                        setDraggedDocId(null);
                        setDragOverState(null);
                      }}
                      className={`group transition-all duration-150 ${
                        isDragging
                          ? 'opacity-35 bg-indigo-50/70 border-2 border-dashed border-indigo-400'
                          : 'hover:bg-indigo-50/25 focus-within:bg-indigo-50/30'
                      } ${isOverAbove ? 'border-t-2 border-indigo-600' : ''} ${
                        isOverBelow ? 'border-b-2 border-indigo-600' : ''
                      } ${isExpSoon && !isDragging ? 'bg-amber-50/20' : ''}`}
                    >
                      {/* 1. Sr. No & Drag Handle & Delete Confirmation Trigger (Requirement 4) */}
                      <td className="py-2.5 px-2 text-center font-mono text-slate-400">
                        <div className="flex items-center justify-center gap-1">
                          <span
                            title="Drag to reorder row (or drag from anywhere on the row)"
                            className="cursor-grab active:cursor-grabbing inline-flex items-center"
                          >
                            <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 shrink-0" />
                          </span>
                          <span className="font-semibold text-slate-600">{index + 1}</span>
                          <button
                            type="button"
                            onClick={() => setDocToDelete(doc)}
                            className="text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded cursor-pointer"
                            title="Delete Document (Moves to Trash)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* 2. Document Title & Remarks (Inline Editable) */}
                      <td className="py-2.5 px-3">
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={doc.documentName}
                            onChange={(e) => handleInlineChange(doc, 'documentName', e.target.value)}
                            onBlur={() => handleBlurDoc(doc)}
                            placeholder="Document name (e.g. Passport, PAN)"
                            className="w-full px-2 py-1 text-xs font-bold text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded transition-colors"
                          />
                          <input
                            type="text"
                            value={doc.remarks || ''}
                            onChange={(e) => handleInlineChange(doc, 'remarks', e.target.value)}
                            onBlur={() => handleBlurDoc(doc)}
                            placeholder="Remarks or notes..."
                            className="w-full px-2 py-0.5 text-[11px] text-slate-500 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded transition-colors"
                          />
                        </div>
                      </td>

                      {/* 3. Document / ID Number (Inline Editable) */}
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={doc.documentNumber}
                          onChange={(e) => handleInlineChange(doc, 'documentNumber', e.target.value)}
                          onBlur={() => handleBlurDoc(doc)}
                          placeholder="Document / ID number..."
                          className="w-full px-2 py-1 text-xs font-mono font-medium text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded transition-colors"
                        />
                      </td>

                      {/* 4. Uploaded Scan / File (Requirement 3: Live Upload Option Always Available) */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {allAttachments.map((attItem, attIdx) => (
                            <div
                              key={attItem.id || attIdx}
                              className="inline-flex items-center gap-0.5 bg-indigo-50 border border-indigo-200 rounded-md p-0.5 shadow-2xs group/att"
                            >
                              <button
                                type="button"
                                onClick={() => setPreviewDoc(doc)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 hover:text-indigo-900 transition-colors"
                                title={`Preview ${attItem.fileName}`}
                              >
                                <Eye className="w-3 h-3 text-indigo-600 shrink-0" />
                                <span className="truncate max-w-[80px]">{attItem.fileName}</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFileToDelete({ docId: doc.id, documentName: doc.documentName, attachment: attItem });
                                }}
                                className="p-0.5 text-slate-400 hover:text-rose-600 transition-colors rounded cursor-pointer"
                                title={`Move ${attItem.fileName} to Trash (safely kept for 30 days)`}
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}

                          {/* Live Upload button - Always accessible even after uploading! */}
                          <button
                            type="button"
                            disabled={isUploadingThis}
                            onClick={() => handleTriggerUpload(doc.id)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                              allAttachments.length > 0
                                ? 'text-indigo-700 bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200 shadow-2xs'
                                : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-100 border border-dashed border-slate-300'
                            }`}
                            title={allAttachments.length > 0 ? 'Upload another document for this record' : 'Attach File'}
                          >
                            {allAttachments.length > 0 ? (
                              <>
                                <Plus className="w-3 h-3 text-indigo-600" />
                                <span>{isUploadingThis ? 'Uploading...' : 'Add Doc'}</span>
                              </>
                            ) : (
                              <>
                                <UploadCloud className={`w-3.5 h-3.5 ${isUploadingThis ? 'animate-bounce text-indigo-600' : ''}`} />
                                <span>{isUploadingThis ? 'Uploading...' : 'Attach File'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 5. Expiry Date (Inline Editable + Calendar Picker) */}
                      <td className="py-2.5 px-3">
                        <div className="relative">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={doc.expiryDate || ''}
                              onChange={(e) => handleInlineChange(doc, 'expiryDate', e.target.value)}
                              onBlur={() => handleBlurDoc(doc)}
                              placeholder="e.g. 2030-12-31"
                              className="w-full pl-2 pr-6 py-1 text-xs font-mono text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded transition-colors"
                            />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenCalendarId(openCalendarId === doc.id ? null : doc.id);
                              }}
                              className={`p-1 rounded transition-colors shrink-0 ${
                                openCalendarId === doc.id ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400 hover:text-indigo-600'
                              }`}
                              title="Open Calendar Dropdown"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {openCalendarId === doc.id && (
                            <DatePickerDropdown
                              value={doc.expiryDate || ''}
                              onChange={(val) => {
                                const exp = checkExpiryStatus(val);
                                const statusNote = exp.isUrgent
                                  ? exp.status === 'expired'
                                    ? 'Expired'
                                    : 'Going to Expire Soon'
                                  : exp.status === 'valid'
                                  ? 'Active & Valid'
                                  : doc.statusNote || 'Permanent';
                                const updated = { ...doc, expiryDate: val, statusNote };
                                onUpdateDocument(updated);
                                onCommitDocument?.(updated);
                              }}
                              onClose={() => setOpenCalendarId(null)}
                            />
                          )}

                          {isExpSoon && (
                            <div className="mt-0.5 text-[10.5px] font-bold text-amber-700 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{expiry.label || 'Expiring soon'}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 6. TAGs Column (Requirement 2: No demo tags; Clean Person Tag + Custom Category Tags) */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap items-center gap-1.5 relative">
                          {/* MANDATORY PERSON TAG BADGE */}
                          <div className="relative">
                            {personTagValue ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setActivePersonPickerDocId(activePersonPickerDocId === doc.id ? null : doc.id);
                                  setActiveTagInputDocId(null);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs transition-colors cursor-pointer group/persontag"
                                title="Mandatory Person Tag (click to change person)"
                              >
                                <User className="w-3 h-3 text-indigo-200" />
                                <span>{personTagValue}</span>
                                <span className="text-[10px] text-indigo-300 opacity-80 group-hover/persontag:opacity-100">▾</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setActivePersonPickerDocId(activePersonPickerDocId === doc.id ? null : doc.id);
                                  setActiveTagInputDocId(null);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 border-dashed shadow-2xs transition-colors cursor-pointer"
                                title="Assign Person Tag (Mandatory)"
                              >
                                <User className="w-3 h-3 text-indigo-500" />
                                <span>+ Assign Person</span>
                                <span className="text-[10px] text-indigo-400">▾</span>
                              </button>
                            )}

                            {/* Dropdown to change mandatory person tag (Only real people, no demo suggestions) */}
                            {activePersonPickerDocId === doc.id && (
                              <div
                                className="absolute top-full right-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-2.5 w-60 text-slate-800"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="text-[10px] uppercase font-bold text-slate-400 px-1 py-1 flex items-center justify-between">
                                  <span>Assign Person (Mandatory)</span>
                                  <button
                                    type="button"
                                    onClick={() => setActivePersonPickerDocId(null)}
                                    className="text-slate-400 hover:text-slate-600"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>

                                {availablePeople.length > 0 ? (
                                  <div className="max-h-40 overflow-y-auto space-y-0.5 divide-y divide-slate-100 my-1">
                                    {availablePeople.map((person) => (
                                      <div
                                        key={person}
                                        className={`group/person flex items-center justify-between px-2 py-1 text-xs rounded hover:bg-indigo-50 ${
                                          personTagValue === person ? 'font-bold text-indigo-600 bg-indigo-50/50' : 'text-slate-700'
                                        }`}
                                      >
                                        <button
                                          type="button"
                                          onClick={() => handleSetPersonTag(doc, person)}
                                          className="flex-1 text-left flex items-center justify-between min-w-0 pr-1.5"
                                        >
                                          <span className="truncate">👤 {person}</span>
                                          {personTagValue === person && <Check className="w-3 h-3 text-indigo-600 shrink-0 ml-1" />}
                                        </button>

                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="py-2 text-[11px] text-slate-500 italic px-1">
                                    No people added yet. Type a person name below.
                                  </div>
                                )}

                                {/* Add new person input */}
                                <div className="pt-2 border-t border-slate-100 flex items-center gap-1">
                                  <input
                                    type="text"
                                    autoFocus
                                    value={customPersonDraft}
                                    onChange={(e) => setCustomPersonDraft(e.target.value)}
                                    placeholder="Type person name & Enter..."
                                    className="w-full text-xs px-2 py-1 border border-slate-200 rounded-md focus:outline-hidden focus:border-indigo-500"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && customPersonDraft.trim()) {
                                        handleSetPersonTag(doc, customPersonDraft.trim());
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    disabled={!customPersonDraft.trim()}
                                    onClick={() => handleSetPersonTag(doc, customPersonDraft.trim())}
                                    className="px-2.5 py-1 bg-indigo-600 text-white text-xs rounded-md font-semibold disabled:opacity-50"
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ADDITIONAL TAG CHIPS */}
                          {docTags.map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs"
                            >
                              <span>{t}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(doc, t)}
                                className="text-slate-400 hover:text-rose-600 rounded-full p-0.2"
                                title={`Remove ${t} tag`}
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </span>
                          ))}

                          {/* + TAG BUTTON AND INLINE PICKER (Requirement 3: quick suggestions only Adhaar, PAN, Voter ID, Photo, Others) */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTagInputDocId(activeTagInputDocId === doc.id ? null : doc.id);
                                setActivePersonPickerDocId(null);
                                setTagDraft('');
                              }}
                              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-semibold text-slate-500 hover:text-indigo-600 hover:bg-slate-100 border border-dashed border-slate-300 transition-colors"
                              title="Add category tag"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Tag</span>
                            </button>

                            {/* Tag suggestions popover */}
                            {activeTagInputDocId === doc.id && (
                              <div
                                className="absolute top-full right-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-2xl p-2.5 w-60 text-slate-800"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 flex items-center justify-between">
                                  <span>Add Tag</span>
                                  <button
                                    type="button"
                                    onClick={() => setActiveTagInputDocId(null)}
                                    className="text-slate-400 hover:text-slate-600"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>

                                <div className="flex items-center gap-1 mb-2">
                                  <input
                                    type="text"
                                    autoFocus
                                    value={tagDraft}
                                    onChange={(e) => setTagDraft(e.target.value)}
                                    placeholder="Type tag & Enter..."
                                    className="w-full text-xs px-2 py-1 border border-slate-200 rounded-md focus:outline-hidden focus:border-indigo-500"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleAddTag(doc, tagDraft);
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    disabled={!tagDraft.trim()}
                                    onClick={() => handleAddTag(doc, tagDraft)}
                                    className="px-2.5 py-1 bg-indigo-600 text-white text-xs font-semibold rounded-md disabled:opacity-50"
                                  >
                                    Add
                                  </button>
                                </div>

                                {/* Requirement 3: Only Adhaar, PAN, Voter ID, Photo, Others */}
                                <div className="text-[10.5px] font-semibold text-slate-500 mb-1">Quick Suggestions:</div>
                                <div className="flex flex-wrap gap-1">
                                  {SUGGESTED_TAGS.filter((s) => !docTags.includes(s)).map((tagOption) => (
                                    <button
                                      key={tagOption}
                                      type="button"
                                      onClick={() => handleAddTag(doc, tagOption)}
                                      className="px-2 py-0.5 text-[11px] rounded bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 transition-colors font-medium"
                                    >
                                      + {tagOption}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* End Right Column */}
      </div>
    {/* End Split Layout Container */}
    </div>

      {/* Requirement 4: Confirmation Modal Before Deletion */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Move Document to Trash?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to delete &quot;<strong>{docToDelete.documentName}</strong>&quot;? It will be moved to the <strong>Trash</strong> section where you can restore it anytime or delete it permanently.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteDocument(docToDelete.id);
                  setDocToDelete(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Move to Trash</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Deletion Confirmation Modal with 30-day retention notice */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Move File to Trash?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to delete file &quot;<strong>{fileToDelete.attachment.fileName}</strong>&quot; from &quot;{fileToDelete.documentName}&quot;?
                </p>
                <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-center gap-2">
                  <span className="text-base shrink-0">⏳</span>
                  <span>
                    <strong>30-Day Safety Retention:</strong> This file will be kept in your <strong>Trash</strong> section for 30 days before being permanently purged. You can restore it back anytime!
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel / Keep File
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onMoveFileToTrash) {
                    onMoveFileToTrash(fileToDelete.docId, fileToDelete.attachment);
                  } else {
                    onDeleteFile(fileToDelete.docId, fileToDelete.attachment.storagePath || fileToDelete.attachment.id);
                  }
                  setFileToDelete(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Move to Trash (30 Days)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: No Files Uploaded Yet */}
      {showNoFilesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <FolderDown className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">
                  No Uploaded Files Found
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  You currently have <strong>{documents.length}</strong> document record{documents.length === 1 ? '' : 's'} tracked, but no digital scans or files (PDF, JPG, PNG) have been attached yet.
                </p>
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg text-indigo-950 text-xs space-y-1.5">
                  <div className="font-semibold flex items-center gap-1.5 text-indigo-900">
                    <Folder className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>How Person Folders Work:</span>
                  </div>
                  <p className="text-[11.5px] text-indigo-800 leading-relaxed">
                    Click <strong>&quot;Attach File&quot;</strong> on any document row (Passport, Aadhaar, PAN, etc.) to upload scans. Once files are attached, the ZIP download will automatically create a <strong>dedicated folder for each family member</strong> with their respective documents inside!
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowNoFilesModal(false)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Choose ZIP Export Scope (When Filter is Active) */}
      {showZipOptionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <FolderDown className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Download Documents as ZIP
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Choose which documents you want to export. Each person will have their own folder containing their files.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadAllDocsZip}
                className="w-full p-3 text-left rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors flex items-start gap-3 cursor-pointer group"
              >
                <div className="p-2 rounded-md bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Archive className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>Download All Family Docs ({totalAttachedFilesCount} files)</span>
                    <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Includes folders for all family members with their respective documents.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={handleDownloadFilteredDocsZip}
                className="w-full p-3 text-left rounded-lg border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors flex items-start gap-3 cursor-pointer group"
              >
                <div className="p-2 rounded-md bg-slate-100 text-slate-700 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-slate-900">
                    Download {selectedPersonFilter}&apos;s Docs ({filteredAttachedFilesCount} files)
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Creates a ZIP containing only the &quot;{selectedPersonFilter}&quot; folder.
                  </p>
                </div>
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowZipOptionsModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview & File Management Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        onRenameFile={async (docId, newName) => {
          await onRenameFile(docId, newName);
          if (previewDoc && previewDoc.attachment) {
            setPreviewDoc({
              ...previewDoc,
              attachment: {
                ...previewDoc.attachment,
                fileName: newName,
              },
            });
          }
        }}
        onDeleteFile={async (docId, attachment) => {
          if (onMoveFileToTrash) {
            onMoveFileToTrash(docId, attachment);
          } else {
            await onDeleteFile(docId, attachment.storagePath || attachment.id);
          }
          setPreviewDoc(null);
        }}
      />
    </div>
  );
};
