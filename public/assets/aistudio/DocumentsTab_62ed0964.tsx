import React, { useState, useRef } from 'react';
import {
  FileText,
  Search,
  Filter,
  Clock,
  AlertCircle,
  CheckCircle2,
  Edit2,
  Plus,
  Trash2,
  FolderOpen,
  MapPin,
  UploadCloud,
  Eye,
  Paperclip,
  Check,
} from 'lucide-react';
import { FinancialDocument, DocumentAttachment } from './types.ts';
import { checkExpiryStatus, maskSensitive } from './calculations.ts';
import { DocumentPreviewModal } from './DocumentPreviewModal.tsx';

interface DocumentsTabProps {
  documents: FinancialDocument[];
  isMasked: boolean;
  currentYear: number;
  onUpdateDocument: (doc: FinancialDocument) => void;
  onAddDocument: (doc: Omit<FinancialDocument, 'id'>) => void;
  onDeleteDocument: (id: string) => void;
  onUploadFile: (docId: string, file: File) => Promise<DocumentAttachment | null>;
  onRenameFile: (docId: string, newFileName: string) => Promise<void>;
  onDeleteFile: (docId: string, storagePath?: string) => Promise<void>;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
  documents,
  isMasked,
  currentYear,
  onUpdateDocument,
  onAddDocument,
  onDeleteDocument,
  onUploadFile,
  onRenameFile,
  onDeleteFile,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'expiring' | 'with_files' | 'physical' | 'virtual' | 'untracked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingDoc, setEditingDoc] = useState<FinancialDocument | null>(null);
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<FinancialDocument | null>(null);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetUploadDocId, setTargetUploadDocId] = useState<string | null>(null);

  const [newDoc, setNewDoc] = useState({
    documentName: '',
    documentNumber: '',
    physicalLocation: '',
    virtualLocation: '',
    remarks: '',
    expiryDate: '',
  });

  const filteredDocs = documents.filter((doc) => {
    // Search filter
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const match =
        doc.documentName.toLowerCase().includes(q) ||
        doc.documentNumber.toLowerCase().includes(q) ||
        doc.physicalLocation.toLowerCase().includes(q) ||
        doc.virtualLocation.toLowerCase().includes(q) ||
        (doc.remarks && doc.remarks.toLowerCase().includes(q)) ||
        (doc.attachment?.fileName && doc.attachment.fileName.toLowerCase().includes(q));
      if (!match) return false;
    }

    const expiry = checkExpiryStatus(doc.expiryDate);

    // Segment filter
    if (filterType === 'expiring') {
      return expiry.isUrgent || doc.statusNote?.toLowerCase().includes('expire soon');
    }
    if (filterType === 'with_files') {
      return Boolean(doc.attachment);
    }
    if (filterType === 'physical') {
      return Boolean(doc.physicalLocation && doc.physicalLocation !== 'no physical card yet');
    }
    if (filterType === 'virtual') {
      return Boolean(doc.virtualLocation);
    }
    if (filterType === 'untracked') {
      return !doc.documentNumber && !doc.physicalLocation && !doc.virtualLocation;
    }

    return true;
  });

  const expiringCount = documents.filter((d) => {
    const exp = checkExpiryStatus(d.expiryDate);
    return exp.isUrgent || d.statusNote?.toLowerCase().includes('expire soon');
  }).length;

  const withFilesCount = documents.filter((d) => Boolean(d.attachment)).length;

  const handleTriggerUpload = (docId: string) => {
    setTargetUploadDocId(docId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetUploadDocId) return;

    setUploadingDocId(targetUploadDocId);
    try {
      const attachment = await onUploadFile(targetUploadDocId, file);
      if (attachment && editingDoc && editingDoc.id === targetUploadDocId) {
        setEditingDoc({
          ...editingDoc,
          attachment,
        });
      }
    } finally {
      setUploadingDocId(null);
      setTargetUploadDocId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDoc) {
      const exp = checkExpiryStatus(editingDoc.expiryDate);
      const statusNote = exp.isUrgent
        ? exp.status === 'expired'
          ? 'Expired'
          : 'Going to Expire Soon/Next Year'
        : exp.status === 'valid'
        ? 'Active & Valid'
        : editingDoc.statusNote || 'Tracked';

      onUpdateDocument({
        ...editingDoc,
        statusNote,
      });
      setEditingDoc(null);
    }
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.documentName) return;

    const exp = checkExpiryStatus(newDoc.expiryDate);
    const statusNote = exp.isUrgent
      ? 'Going to Expire Soon/Next Year'
      : exp.status === 'valid'
      ? 'Active & Valid'
      : 'Tracked';

    onAddDocument({
      srNo: documents.length + 1,
      documentName: newDoc.documentName,
      documentNumber: newDoc.documentNumber,
      physicalLocation: newDoc.physicalLocation,
      virtualLocation: newDoc.virtualLocation,
      remarks: newDoc.remarks,
      expiryDate: newDoc.expiryDate,
      statusNote,
    });

    setNewDoc({
      documentName: '',
      documentNumber: '',
      physicalLocation: '',
      virtualLocation: '',
      remarks: '',
      expiryDate: '',
    });
    setIsAddingDoc(false);
  };

  const formatDocNumber = (doc: FinancialDocument) => {
    if (!doc.documentNumber) return '—';
    const nameLower = doc.documentName.toLowerCase();
    if (nameLower.includes('aadhar')) {
      return maskSensitive(doc.documentNumber, isMasked, 'aadhar');
    }
    if (nameLower.includes('pan')) {
      return maskSensitive(doc.documentNumber, isMasked, 'pan');
    }
    if (nameLower.includes('passport') || nameLower.includes('driving')) {
      return maskSensitive(doc.documentNumber, isMasked, 'generic');
    }
    return doc.documentNumber;
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp,image/jpg"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Important Financial Documents ({documents.length} Tracked)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Upload, preview, and host physical file & virtual document attachments in Supabase Storage
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddingDoc(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Document</span>
        </button>
      </div>

      {/* Expiration Notice Banner */}
      {expiringCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-amber-950">
              {expiringCount} Document{expiringCount === 1 ? '' : 's'} Expiring Soon or Needs Action
            </p>
            <p className="text-amber-800 leading-relaxed">
              • <strong>Passport (R4417463)</strong> valid till 31-Aug-2027 (~10 months away, plan renewal next year).
              <br />
              • <strong>Amazon Prime</strong> validity ended 8 Jun 2026.
              <br />
              • You can attach digital scans or PDFs to any document row using the <strong>Attach File</strong> button below.
            </p>
          </div>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded-xl">
        {/* Segmented filter buttons */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterType === 'all'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All ({documents.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType('expiring')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              filterType === 'expiring'
                ? 'bg-amber-600 text-white'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Expiring Soon ({expiringCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('with_files')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              filterType === 'with_files'
                ? 'bg-indigo-600 text-white'
                : 'text-indigo-800 bg-indigo-50 hover:bg-indigo-100'
            }`}
          >
            <Paperclip className="w-3.5 h-3.5" />
            <span>Attached Files ({withFilesCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterType('physical')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterType === 'physical'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            In Physical File
          </button>
          <button
            type="button"
            onClick={() => setFilterType('virtual')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filterType === 'virtual'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Cloud / "1 - BHARATHI Docs"
          </button>
        </div>

        {/* Live search input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter document or number..."
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Documents Data Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-4">Document Title</th>
                <th className="py-2.5 px-4">Document / ID Number</th>
                <th className="py-2.5 px-4">Physical Location</th>
                <th className="py-2.5 px-4">Virtual Location</th>
                <th className="py-2.5 px-4">Uploaded File</th>
                <th className="py-2.5 px-4">Expiry Date</th>
                <th className="py-2.5 px-4">Status / Action</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No documents matching selected filter or search query.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const expiry = checkExpiryStatus(doc.expiryDate);
                  const isExpSoon =
                    expiry.isUrgent || doc.statusNote?.toLowerCase().includes('expire soon');
                  const isUploadingThis = uploadingDocId === doc.id;

                  return (
                    <tr
                      key={doc.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isExpSoon ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-mono text-slate-400">{doc.srNo}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{doc.documentName}</div>
                        {doc.remarks && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{doc.remarks}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-800">
                        {formatDocNumber(doc)}
                      </td>
                      <td className="py-3 px-4">
                        {doc.physicalLocation ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {doc.physicalLocation}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not in physical file</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {doc.virtualLocation ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700">
                            <FolderOpen className="w-3 h-3 text-indigo-500" />
                            {doc.virtualLocation}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No cloud upload</span>
                        )}
                      </td>

                      {/* File attachment upload & preview cell */}
                      <td className="py-3 px-4">
                        {doc.attachment ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc(doc)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
                              title="Click to preview, rename, or delete file"
                            >
                              <Eye className="w-3 h-3 text-indigo-600" />
                              <span className="truncate max-w-[110px]">{doc.attachment.fileName}</span>
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={isUploadingThis}
                            onClick={() => handleTriggerUpload(doc.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium text-slate-500 hover:text-indigo-600 hover:bg-slate-100 border border-dashed border-slate-300 transition-colors"
                          >
                            <UploadCloud className={`w-3.5 h-3.5 ${isUploadingThis ? 'animate-bounce' : ''}`} />
                            <span>{isUploadingThis ? 'Uploading...' : 'Attach File'}</span>
                          </button>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono">
                        {doc.expiryDate ? (
                          <span className="font-medium text-slate-800">{doc.expiryDate}</span>
                        ) : (
                          <span className="text-slate-400">Permanent</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {isExpSoon ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3" />
                            {expiry.label || doc.statusNote}
                          </span>
                        ) : doc.documentNumber || doc.physicalLocation || doc.virtualLocation ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            {doc.statusNote || 'Tracked'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            <AlertCircle className="w-3 h-3 text-slate-400" />
                            Record Info
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Edit ${doc.documentName}`}
                            onClick={() => setEditingDoc(doc)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {doc.srNo > 19 && (
                            <button
                              type="button"
                              aria-label={`Delete ${doc.documentName}`}
                              onClick={() => onDeleteDocument(doc.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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

      {/* Edit Document Modal with file upload option */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Edit Document: {editingDoc.documentName}
            </h3>
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Name</label>
                <input
                  type="text"
                  value={editingDoc.documentName}
                  onChange={(e) => setEditingDoc({ ...editingDoc, documentName: e.target.value })}
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Document Number</label>
                  <input
                    type="text"
                    value={editingDoc.documentNumber}
                    onChange={(e) => setEditingDoc({ ...editingDoc, documentNumber: e.target.value })}
                    placeholder="e.g., CFDPG5192R / R4417463"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date (if applicable)</label>
                  <input
                    type="text"
                    value={editingDoc.expiryDate || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, expiryDate: e.target.value })}
                    placeholder="e.g., 31-Aug-2027 or 2027-08-31"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Location</label>
                  <input
                    type="text"
                    value={editingDoc.physicalLocation}
                    onChange={(e) => setEditingDoc({ ...editingDoc, physicalLocation: e.target.value })}
                    placeholder="e.g., File, Wallet, Safe locker"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Virtual / Cloud Location</label>
                  <input
                    type="text"
                    value={editingDoc.virtualLocation}
                    onChange={(e) => setEditingDoc({ ...editingDoc, virtualLocation: e.target.value })}
                    placeholder="e.g., 1 - BHARATHI Docs"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Document File Attachment Section inside modal */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Attached Digital File (Supabase Storage)
                </label>
                {editingDoc.attachment ? (
                  <div className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span className="text-xs font-medium text-slate-900 truncate">
                        {editingDoc.attachment.fileName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(editingDoc)}
                        className="px-2 py-0.5 text-xs text-indigo-600 hover:bg-indigo-50 rounded font-medium"
                      >
                        Preview / Manage
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleTriggerUpload(editingDoc.id)}
                    className="w-full py-2.5 px-3 border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-lg text-xs text-slate-600 flex items-center justify-center gap-2 transition-colors"
                  >
                    <UploadCloud className="w-4 h-4 text-indigo-600" />
                    <span>Click to Upload PDF or Image to Supabase</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Details</label>
                <input
                  type="text"
                  value={editingDoc.remarks || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, remarks: e.target.value })}
                  placeholder="e.g., Original in home file, digital copy in Google Drive"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDoc(null)}
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

      {/* Add Document Modal */}
      {isAddingDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add Document to Vault</h3>
            <form onSubmit={handleSaveNew} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Document Name *</label>
                <input
                  type="text"
                  value={newDoc.documentName}
                  onChange={(e) => setNewDoc({ ...newDoc, documentName: e.target.value })}
                  placeholder="e.g., OCI Card, Vehicle RC Book, Degree Certificate"
                  required
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Document Number</label>
                  <input
                    type="text"
                    value={newDoc.documentNumber}
                    onChange={(e) => setNewDoc({ ...newDoc, documentNumber: e.target.value })}
                    placeholder="e.g., DOC123456"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Expiry Date</label>
                  <input
                    type="text"
                    value={newDoc.expiryDate}
                    onChange={(e) => setNewDoc({ ...newDoc, expiryDate: e.target.value })}
                    placeholder="e.g., 31-Dec-2030"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Physical Location</label>
                  <input
                    type="text"
                    value={newDoc.physicalLocation}
                    onChange={(e) => setNewDoc({ ...newDoc, physicalLocation: e.target.value })}
                    placeholder="e.g., File, Locker, Drawer"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Virtual Location</label>
                  <input
                    type="text"
                    value={newDoc.virtualLocation}
                    onChange={(e) => setNewDoc({ ...newDoc, virtualLocation: e.target.value })}
                    placeholder="e.g., 1 - BHARATHI Docs"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
                <input
                  type="text"
                  value={newDoc.remarks}
                  onChange={(e) => setNewDoc({ ...newDoc, remarks: e.target.value })}
                  placeholder="e.g., Original papers kept with bank"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingDoc(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs"
                >
                  Add Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview & Management Modal */}
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
        onDeleteFile={async (docId, storagePath) => {
          await onDeleteFile(docId, storagePath);
          setPreviewDoc(null);
        }}
      />
    </div>
  );
};
