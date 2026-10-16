import React, { useState } from 'react';
import {
  X,
  Download,
  Trash2,
  Edit2,
  Check,
  FileText,
  Calendar,
  HardDrive,
  ExternalLink,
} from 'lucide-react';
import { FinancialDocument, DocumentAttachment } from '../../types/vault.ts';

interface DocumentPreviewModalProps {
  document: FinancialDocument | null;
  isOpen: boolean;
  onClose: () => void;
  onRenameFile: (docId: string, newName: string) => void;
  onDeleteFile: (docId: string, storagePath?: string) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  isOpen,
  onClose,
  onRenameFile,
  onDeleteFile,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  if (!isOpen || !document || !document.attachment) return null;

  const att = document.attachment;
  const isImage = att.mimeType.startsWith('image/');
  const isPdf = att.mimeType === 'application/pdf' || att.fileName.toLowerCase().endsWith('.pdf');

  const handleStartRename = () => {
    setEditedName(att.fileName);
    setIsEditingName(true);
  };

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (editedName.trim().length > 0) {
      onRenameFile(document.id, editedName.trim());
      setIsEditingName(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Delete attached file "${att.fileName}" for ${document.documentName}?`)) {
      onDeleteFile(document.id, att.storagePath);
      onClose();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${att.fileName}`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              {isEditingName ? (
                <form onSubmit={handleSaveRename} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="text-xs font-semibold px-2 py-1 border border-indigo-400 rounded focus:outline-hidden"
                    autoFocus
                  />
                  <button
                    type="submit"
                    aria-label="Save file name"
                    className="p-1 text-emerald-700 hover:bg-emerald-100 rounded"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Cancel rename"
                    onClick={() => setIsEditingName(false)}
                    className="p-1 text-slate-500 hover:bg-slate-200 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{att.fileName}</h3>
                  <button
                    type="button"
                    aria-label="Rename file"
                    onClick={handleStartRename}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                    title="Rename file"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                <span>{document.documentName}</span>
                <span>·</span>
                <span className="font-mono">{formatFileSize(att.fileSize)}</span>
                <span>·</span>
                <span className="uppercase">{att.mimeType.split('/')[1] || 'DOC'}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <a
              href={att.fileUrl}
              download={att.fileName}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Download</span>
            </a>

            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete File</span>
            </button>

            <button
              type="button"
              aria-label="Close Preview"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div className="flex-1 overflow-auto p-4 bg-slate-100/60 flex items-center justify-center min-h-[420px]">
          {isImage ? (
            <div className="max-w-full max-h-full flex items-center justify-center">
              <img
                src={att.fileUrl}
                alt={att.fileName}
                referrerPolicy="no-referrer"
                className="max-h-[70vh] max-w-full rounded-lg shadow-md object-contain border border-slate-200 bg-white"
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={att.fileUrl}
              title={att.fileName}
              className="w-full h-[65vh] rounded-lg border border-slate-200 bg-white shadow-xs"
            />
          ) : (
            <div className="text-center p-8 bg-white rounded-xl border border-slate-200 max-w-sm space-y-3">
              <FileText className="w-12 h-12 text-indigo-500 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-800">Preview not supported for this type</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                You can download the original file to view it on your device.
              </p>
              <a
                href={att.fileUrl}
                download={att.fileName}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-2xs"
              >
                <Download className="w-4 h-4" />
                <span>Download {att.fileName}</span>
              </a>
            </div>
          )}
        </div>

        {/* Footer info strip */}
        <div className="p-3 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Uploaded: {new Date(att.uploadedAt).toLocaleDateString()}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" />
              Bucket: vault_documents / {att.storagePath}
            </span>
          </div>
          <span className="text-emerald-700 font-medium">Stored in Supabase Backend</span>
        </div>
      </div>
    </div>
  );
};
