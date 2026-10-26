import React, { useState } from 'react';
import {
  Trash2,
  RotateCcw,
  Search,
  AlertTriangle,
  User,
  Calendar,
  FileText,
  Clock,
  Download,
  HardDrive,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { FinancialDocument, TrashedAttachment } from './types.ts';

interface TrashTabProps {
  trashDocuments: (FinancialDocument & { deletedAt?: string })[];
  trashAttachments?: TrashedAttachment[];
  onRestoreDocument: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onRestoreFile?: (trashAttId: string) => void;
  onPermanentDeleteFile?: (trashAttId: string) => void;
  onEmptyTrash: () => void;
  onNavigateToDocuments?: () => void;
}

export const TrashTab: React.FC<TrashTabProps> = ({
  trashDocuments,
  trashAttachments = [],
  onRestoreDocument,
  onPermanentDelete,
  onRestoreFile,
  onPermanentDeleteFile,
  onEmptyTrash,
  onNavigateToDocuments,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'documents' | 'files'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [docToDeleteForever, setDocToDeleteForever] = useState<FinancialDocument | null>(null);
  const [fileToDeleteForever, setFileToDeleteForever] = useState<TrashedAttachment | null>(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);

  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const calculateDaysRemaining = (deletedAt?: string) => {
    if (!deletedAt) return 30;
    try {
      const time = new Date(deletedAt).getTime();
      if (isNaN(time)) return 30;
      const elapsedMs = now - time;
      const remainingMs = THIRTY_DAYS_MS - elapsedMs;
      const days = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));
      return Math.max(0, Math.min(30, days));
    } catch {
      return 30;
    }
  };

  const formatDeletedDate = (deletedAt?: string) => {
    if (!deletedAt) return 'Recently';
    try {
      const d = new Date(deletedAt);
      if (isNaN(d.getTime())) return deletedAt;
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return deletedAt;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredDocs = trashDocuments.filter((doc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.documentName.toLowerCase().includes(q) ||
      doc.documentNumber.toLowerCase().includes(q) ||
      (doc.personTag && doc.personTag.toLowerCase().includes(q)) ||
      (doc.tags && doc.tags.some((t) => t.toLowerCase().includes(q))) ||
      (doc.remarks && doc.remarks.toLowerCase().includes(q))
    );
  });

  const filteredFiles = trashAttachments.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.attachment.fileName.toLowerCase().includes(q) ||
      f.documentName.toLowerCase().includes(q)
    );
  });

  const totalItemsCount = trashDocuments.length + trashAttachments.length;

  return (
    <div className="space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-600" />
            Trash &amp; Safety Retention ({totalItemsCount})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Documents and uploaded files deleted from your vault are retained here safely for <strong>30 days</strong>. You can restore them anytime or delete them permanently.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {totalItemsCount > 0 && (
            <button
              type="button"
              onClick={() => setConfirmEmptyTrash(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Empty Trash</span>
            </button>
          )}
          {onNavigateToDocuments && (
            <button
              type="button"
              onClick={onNavigateToDocuments}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
              <span>Back to Family Documents</span>
            </button>
          )}
        </div>
      </div>

      {/* 30-Day Policy Safety Notice Banner */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start sm:items-center gap-2.5">
          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
          <span>
            <strong>30-Day Recovery Guarantee:</strong> Deleted items are preserved for 30 days before automatic cleanup. Restoring an item returns it immediately to Family Documents.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white border border-amber-200 text-amber-800 shadow-2xs">
            📄 {trashDocuments.length} doc{trashDocuments.length === 1 ? '' : 's'}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white border border-amber-200 text-amber-800 shadow-2xs">
            📎 {trashAttachments.length} file{trashAttachments.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Category Tabs & Search Bar */}
      {totalItemsCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveSubTab('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                activeSubTab === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Items ({totalItemsCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('documents')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                activeSubTab === 'documents'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Documents ({trashDocuments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('files')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                activeSubTab === 'files'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Uploaded Files ({trashAttachments.length})
            </button>
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search trash by name, person, file..."
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {totalItemsCount === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs py-16 text-center text-slate-400 px-4 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <Trash2 className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Trash is Empty</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            No family documents or uploaded files are currently in the trash. When you delete a record or an attachment, it will be kept safely here for 30 days.
          </p>
          {onNavigateToDocuments && (
            <button
              type="button"
              onClick={onNavigateToDocuments}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors mt-2"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Go to Family Documents</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Trashed Documents */}
          {(activeSubTab === 'all' || activeSubTab === 'documents') && trashDocuments.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Deleted Documents ({filteredDocs.length})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500">
                  Full document records &amp; metadata
                </span>
              </div>

              {filteredDocs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No deleted documents matching &quot;{searchQuery}&quot;.
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-4">Document Title &amp; Details</th>
                        <th className="py-2.5 px-4">Document / ID Number</th>
                        <th className="py-2.5 px-4">Person &amp; TAGs</th>
                        <th className="py-2.5 px-4">30-Day Retention</th>
                        <th className="py-2.5 px-4">Deleted On</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDocs.map((doc, idx) => {
                        const daysLeft = calculateDaysRemaining(doc.deletedAt);
                        return (
                          <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-800 line-through opacity-75">
                                {doc.documentName}
                              </div>
                              {doc.remarks && (
                                <div className="text-[11px] text-slate-400 mt-0.5">{doc.remarks}</div>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">
                              {doc.documentNumber || '—'}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {doc.personTag && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    <User className="w-2.5 h-2.5" />
                                    <span>{doc.personTag}</span>
                                  </span>
                                )}
                                {doc.tags?.map((t) => (
                                  <span
                                    key={t}
                                    className="px-1.5 py-0.5 rounded text-[10.5px] bg-slate-100 text-slate-600 border border-slate-200"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                daysLeft <= 5
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                <Clock className="w-3 h-3" />
                                <span>{daysLeft} days left</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px]">
                              {formatDeletedDate(doc.deletedAt)}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onRestoreDocument(doc.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                                  title="Restore document back to active Family Documents"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Restore</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDocToDeleteForever(doc)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-md transition-colors cursor-pointer"
                                  title="Delete permanently"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete Forever</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Section 2: Trashed Uploaded Files (Kept for 30 days) */}
          {(activeSubTab === 'all' || activeSubTab === 'files') && trashAttachments.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Deleted Uploaded Files ({filteredFiles.length})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500">
                  Individual uploaded attachments kept safely for 30 days
                </span>
              </div>

              {filteredFiles.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No deleted files matching &quot;{searchQuery}&quot;.
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-500 font-semibold select-none">
                        <th className="py-2.5 px-3 w-12 text-center">#</th>
                        <th className="py-2.5 px-4">Uploaded File</th>
                        <th className="py-2.5 px-4">Original Document</th>
                        <th className="py-2.5 px-4">File Size &amp; Type</th>
                        <th className="py-2.5 px-4">30-Day Retention</th>
                        <th className="py-2.5 px-4">Deleted On</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredFiles.map((item, idx) => {
                        const daysLeft = calculateDaysRemaining(item.deletedAt);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                                <span className="font-semibold text-slate-800 line-through opacity-75 truncate max-w-[200px]">
                                  {item.attachment.fileName}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-700 font-medium">
                              {item.documentName || 'Family Document'}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-500">
                              <span>{formatFileSize(item.attachment.fileSize)}</span>
                              <span className="ml-1.5 uppercase text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">
                                {item.attachment.mimeType?.split('/')[1] || 'FILE'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                daysLeft <= 5
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}>
                                <Clock className="w-3 h-3" />
                                <span>{daysLeft} days left</span>
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px]">
                              {formatDeletedDate(item.deletedAt)}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {item.attachment.fileUrl && (
                                  <a
                                    href={item.attachment.fileUrl}
                                    download={item.attachment.fileName}
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-md transition-colors"
                                    title="Download File"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onRestoreFile?.(item.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                                  title="Restore file back into the document"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Restore File</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFileToDeleteForever(item)}
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-md transition-colors cursor-pointer"
                                  title="Delete file permanently"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete Forever</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Permanent Delete of Document */}
      {docToDeleteForever && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Delete Document Permanently?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to permanently delete &quot;<strong>{docToDeleteForever.documentName}</strong>&quot;? This bypasses the 30-day retention and cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDocToDeleteForever(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onPermanentDelete(docToDeleteForever.id);
                  setDocToDeleteForever(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-2xs"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Permanent Delete of File */}
      {fileToDeleteForever && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Delete File Permanently?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to permanently delete file &quot;<strong>{fileToDeleteForever.attachment.fileName}</strong>&quot;? This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setFileToDeleteForever(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onPermanentDeleteFile?.(fileToDeleteForever.id);
                  setFileToDeleteForever(null);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-2xs"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Empty Trash */}
      {confirmEmptyTrash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Empty Entire Trash?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  This will permanently delete all <strong>{trashDocuments.length} document{trashDocuments.length === 1 ? '' : 's'}</strong> and <strong>{trashAttachments.length} uploaded file{trashAttachments.length === 1 ? '' : 's'}</strong> in the trash bin. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmEmptyTrash(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onEmptyTrash();
                  setConfirmEmptyTrash(false);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-2xs"
              >
                Empty Trash Forever
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
