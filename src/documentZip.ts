import JSZip from 'jszip';
import type { FinancialDocument, DocumentAttachment } from './types.ts';

export interface ZipExportOptions {
  scope?: 'all' | 'filtered';
  customFilename?: string;
  onProgress?: (progressText: string) => void;
}

export interface ZipExportResult {
  success: boolean;
  totalFiles: number;
  totalPeople: number;
  message?: string;
  error?: string;
}

/**
 * Sanitizes folder and file names to be valid across Windows, macOS, and Linux
 */
export function sanitizeName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Formats file size in readable units
 */
function formatBytes(bytes?: number): string {
  if (!bytes) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Converts a data URL to binary ArrayBuffer / base64 for JSZip
 */
async function processAttachmentContent(
  att: DocumentAttachment
): Promise<{ data: string | ArrayBuffer | Blob; isBase64: boolean }> {
  const url = att.fileUrl;

  if (url.startsWith('data:')) {
    const base64Marker = ';base64,';
    const base64Idx = url.indexOf(base64Marker);

    if (base64Idx !== -1) {
      const base64Data = url.substring(base64Idx + base64Marker.length);
      return { data: base64Data, isBase64: true };
    }

    // URL-encoded data URI
    const commaIdx = url.indexOf(',');
    const encodedData = commaIdx !== -1 ? url.substring(commaIdx + 1) : url;
    const decoded = decodeURIComponent(encodedData);
    return { data: decoded, isBase64: false };
  }

  // Remote URL (e.g. Supabase Storage or server API)
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file from storage (HTTP ${response.status})`);
  }
  const blob = await response.blob();
  return { data: blob, isBase64: false };
}

/**
 * Groups documents by person, creates a folder per person in a ZIP archive,
 * places all their uploaded files inside their folder, and triggers download.
 */
export async function downloadDocumentsAsZip(
  documents: FinancialDocument[],
  options?: ZipExportOptions
): Promise<ZipExportResult> {
  const onProgress = options?.onProgress;
  const zip = new JSZip();

  // 1. Group documents by person
  const personMap = new Map<string, FinancialDocument[]>();
  let totalFilesCount = 0;

  for (const doc of documents) {
    const rawPerson = (doc.personTag && doc.personTag.trim()) || 'General (No Person Tag)';
    const personKey = sanitizeName(rawPerson) || 'General';

    if (!personMap.has(personKey)) {
      personMap.set(personKey, []);
    }
    personMap.get(personKey)!.push(doc);

    const atts = Array.isArray(doc.attachments) && doc.attachments.length > 0
      ? doc.attachments
      : (doc.attachment ? [doc.attachment] : []);
    totalFilesCount += atts.length;
  }

  if (totalFilesCount === 0) {
    return {
      success: false,
      totalFiles: 0,
      totalPeople: personMap.size,
      message: 'No uploaded document files (PDF, JPG, etc.) were found to export.',
    };
  }

  onProgress?.(`Starting ZIP packaging for ${personMap.size} people...`);

  // Track filenames per person folder to avoid naming collisions
  const usedNamesByPerson = new Map<string, Set<string>>();
  let processedFiles = 0;
  const manifestLines: string[] = [
    '================================================================================',
    'KUTUMBVAULT - FAMILY DOCUMENTS ARCHIVE',
    '================================================================================',
    `Export Date: ${new Date().toLocaleString()}`,
    `Total Family Members / Folders: ${personMap.size}`,
    `Total Files Archived: ${totalFilesCount}`,
    '================================================================================',
    '',
    'DIRECTORY STRUCTURE:',
    '--------------------------------------------------------------------------------',
  ];

  for (const [personName, personDocs] of personMap.entries()) {
    const personFolder = zip.folder(personName);
    if (!personFolder) continue;

    if (!usedNamesByPerson.has(personName)) {
      usedNamesByPerson.set(personName, new Set<string>());
    }
    const usedNames = usedNamesByPerson.get(personName)!;

    manifestLines.push(`📁 ${personName}/`);

    // Prepare a person dossier summary file
    const personSummaryLines: string[] = [
      `================================================================================`,
      `DOCUMENT DOSSIER FOR: ${personName.toUpperCase()}`,
      `================================================================================`,
      `Generated: ${new Date().toLocaleString()}`,
      `Total Recorded Documents: ${personDocs.length}`,
      '',
      'DOCUMENTS LIST:',
      '--------------------------------------------------------------------------------',
    ];

    for (const doc of personDocs) {
      const atts = Array.isArray(doc.attachments) && doc.attachments.length > 0
        ? doc.attachments
        : (doc.attachment ? [doc.attachment] : []);

      personSummaryLines.push(`• Document: ${doc.documentName}`);
      if (doc.documentNumber) personSummaryLines.push(`  ID Number: ${doc.documentNumber}`);
      if (doc.expiryDate) personSummaryLines.push(`  Expiry: ${doc.expiryDate}`);
      if (doc.tags && doc.tags.length > 0) personSummaryLines.push(`  Tags: ${doc.tags.join(', ')}`);
      if (doc.remarks) personSummaryLines.push(`  Remarks: ${doc.remarks}`);
      personSummaryLines.push(`  Attached Files (${atts.length}):`);

      for (const att of atts) {
        processedFiles++;
        onProgress?.(
          `Packaging file ${processedFiles} of ${totalFilesCount}: ${att.fileName} (${personName})...`
        );

        // Sanitize and ensure unique file name
        let cleanName = sanitizeName(att.fileName) || `document_${doc.id}.dat`;
        if (usedNames.has(cleanName)) {
          const dotIdx = cleanName.lastIndexOf('.');
          const base = dotIdx !== -1 ? cleanName.substring(0, dotIdx) : cleanName;
          const ext = dotIdx !== -1 ? cleanName.substring(dotIdx) : '';
          let counter = 2;
          while (usedNames.has(`${base}_(${counter})${ext}`)) {
            counter++;
          }
          cleanName = `${base}_(${counter})${ext}`;
        }
        usedNames.add(cleanName);

        personSummaryLines.push(`    - ${cleanName} (${formatBytes(att.fileSize)}, ${att.mimeType || 'unknown'})`);
        manifestLines.push(`   ├── 📄 ${cleanName} [${doc.documentName}]`);

        try {
          const content = await processAttachmentContent(att);
          if (content.isBase64) {
            personFolder.file(cleanName, content.data as string, { base64: true });
          } else {
            personFolder.file(cleanName, content.data as Blob | ArrayBuffer | string);
          }
        } catch (err: any) {
          console.warn(`Could not add ${att.fileName} to zip:`, err);
          manifestLines.push(`   ├── ⚠️ [ERROR LOADING FILE: ${att.fileName}]`);
        }
      }
      personSummaryLines.push('');
    }

    // Save summary text for this person in their folder
    personFolder.file(`_Summary_${personName}.txt`, personSummaryLines.join('\n'));
    manifestLines.push('');
  }

  // Add root manifest to ZIP
  manifestLines.push('================================================================================');
  manifestLines.push('End of Archive. Extracted files are organized into dedicated folders per person.');
  zip.file('MANIFEST.txt', manifestLines.join('\n'));

  onProgress?.('Compressing ZIP archive...');

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      onProgress?.(`Compressing ZIP: ${Math.round(metadata.percent)}%`);
    }
  );

  // Trigger download
  const dateStr = new Date().toISOString().slice(0, 10);
  const finalFilename = options?.customFilename || `Family_Documents_All_Folders_${dateStr}.zip`;

  const blobUrl = URL.createObjectURL(zipBlob);
  const downloadLink = document.createElement('a');
  downloadLink.href = blobUrl;
  downloadLink.download = finalFilename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(blobUrl);

  return {
    success: true,
    totalFiles: totalFilesCount,
    totalPeople: personMap.size,
    message: `Successfully downloaded ${totalFilesCount} documents across ${personMap.size} person folders!`,
  };
}
