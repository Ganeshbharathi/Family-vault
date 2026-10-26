/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VaultState, FinancialDocument, DocumentAttachment, TrashedAttachment } from './types.ts';
import { INITIAL_VAULT_DATA } from './initialData.ts';
import { exportVaultToCsv, checkExpiryStatus } from './calculations.ts';
import { RotateCcw } from 'lucide-react';

import { Navbar } from './Navbar.tsx';
import { Sidebar, TabKey } from './Sidebar.tsx';
import { GlobalSearchModal } from './GlobalSearchModal.tsx';
import { SupabaseGuideModal } from './SupabaseGuideModal.tsx';
import {
  testSupabaseConnection,
  pullVaultFromSupabase,
  pushVaultToSupabase,
  syncSectionToSupabase,
  uploadDocumentToSupabaseStorage,
  syncSingleRecord,
  deleteSingleRecord,
  SyncSectionKey,
} from './supabase.ts';

import { OverviewTab } from './OverviewTab.tsx';
import { ContactsTab } from './ContactsTab.tsx';
import { DocumentsTab } from './DocumentsTab.tsx';
import { InvestmentsTab } from './InvestmentsTab.tsx';
import { InsuranceTab } from './InsuranceTab.tsx';
import { BankingCardsTab } from './BankingCardsTab.tsx';
import { AssetsLiabilitiesTab } from './AssetsLiabilitiesTab.tsx';
import { PasswordsAccessTab } from './PasswordsAccessTab.tsx';
import { PrintableBinderTab } from './PrintableBinderTab.tsx';
import { TrashTab } from './TrashTab.tsx';
import { PeopleListTab } from './PeopleListTab.tsx';
import { ImportantContact, FamilyMember, PersonRecord } from './types.ts';

const STORAGE_KEY = 'kutumb_vault_data_v1';
const DEMO_CLEARED_KEY = 'kutumb_documents_demo_cleared_v4';

export default function App() {
  const [vault, setVault] = useState<VaultState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Clear old mock placeholder values in contacts and family members so only titles remain
        if (parsed.contacts && Array.isArray(parsed.contacts)) {
          parsed.contacts = parsed.contacts.map((c: any) => {
            if (
              c.name?.toLowerCase().includes('ganesh') ||
              c.name?.toLowerCase().includes('santhi') ||
              c.email?.toLowerCase().includes('ganesh') ||
              c.email?.toLowerCase().includes('santhi')
            ) {
              return { ...c, name: '', mobile: '', email: '', remarks: '', dob: '' };
            }
            return c;
          });
        }
        if (parsed.familyMembers && Array.isArray(parsed.familyMembers)) {
          parsed.familyMembers = parsed.familyMembers.map((m: any) => {
            if (
              m.name?.toLowerCase().includes('ganesh') ||
              m.name?.toLowerCase().includes('santhi')
            ) {
              return { ...m, name: '', notes: '' };
            }
            return m;
          });
        }
        // Requirement 1: Remove pre-populated demo data from documents table
        const hasClearedDemo = localStorage.getItem(DEMO_CLEARED_KEY);
        if (!hasClearedDemo) {
          parsed.documents = (parsed.documents || []).filter((d: any) => {
            const isDemo =
              d.id.startsWith('doc-') &&
              Number(d.id.replace('doc-', '')) <= 19 &&
              (d.documentName === 'PAN Card' ||
                d.documentName === 'Passport' ||
                d.documentName === 'Aadhar Card' ||
                d.documentName === 'Driving License' ||
                d.documentName === 'Election card' ||
                d.documentName === 'Will' ||
                d.documentName === 'Amazon prime');
            return !isDemo;
          });
          localStorage.setItem(DEMO_CLEARED_KEY, 'true');
        }

        // Requirement 3: Remove pre-populated tags in the tag column fields
        const TAGS_CLEARED_KEY = 'kutumb_tags_cleared_v2';
        const hasClearedPrepopulatedTags = localStorage.getItem(TAGS_CLEARED_KEY);
        if (!hasClearedPrepopulatedTags) {
          parsed.documents = (parsed.documents || []).map((d: any) => ({
            ...d,
            tags: [], // strip pre-populated tags so tag fields start clean
          }));
          localStorage.setItem(TAGS_CLEARED_KEY, 'true');
        }

        parsed.documents = (Array.isArray(parsed.documents) ? parsed.documents : []).map((d: any) => {
          const personTag = d.personTag === 'Primary Member' ? '' : (d.personTag || '');
          const attachments = Array.isArray(d.attachments)
            ? d.attachments
            : (d.attachment ? [d.attachment] : []);
          return {
            ...d,
            personTag,
            tags: Array.isArray(d.tags) ? d.tags : [],
            attachments,
            attachment: attachments.length > 0 ? attachments[attachments.length - 1] : undefined,
          };
        });
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        parsed.trashDocuments = (Array.isArray(parsed.trashDocuments) ? parsed.trashDocuments : []).filter((d: any) => {
          if (!d.deletedAt) return true;
          const time = new Date(d.deletedAt).getTime();
          return !isNaN(time) ? now - time < THIRTY_DAYS_MS : true;
        });
        parsed.trashAttachments = (Array.isArray(parsed.trashAttachments) ? parsed.trashAttachments : []).filter((a: any) => {
          if (!a.deletedAt) return true;
          const time = new Date(a.deletedAt).getTime();
          return !isNaN(time) ? now - time < THIRTY_DAYS_MS : true;
        });
                // Ensure people array exists and is seeded with existing document people or custom people if empty
        if (!parsed.people || !Array.isArray(parsed.people)) {
          const discovered = new Set<string>();
          try {
            const savedPeople = localStorage.getItem('kutumb_custom_people_v1');
            if (savedPeople) {
              const arr = JSON.parse(savedPeople);
              if (Array.isArray(arr)) {
                arr.forEach((p: any) => {
                  const s = typeof p === 'string' ? p.trim() : '';
                  if (s && s !== 'Primary Member') discovered.add(s);
                });
              }
            }
          } catch {}
          (parsed.documents || []).forEach((d: any) => {
            const p = (d.personTag || '').trim();
            if (p && p !== 'Primary Member') discovered.add(p);
          });
          parsed.people = Array.from(discovered).map((name, idx) => ({
            id: `person-${Date.now()}-${idx}`,
            name,
            createdAt: new Date().toISOString(),
          }));
        }
return parsed;
      }
    } catch {
      // Fallback
    }
    return INITIAL_VAULT_DATA;
  });

  const [isPeopleUnlocked, setIsPeopleUnlocked] = useState(false);
  const [targetPersonFilter, setTargetPersonFilter] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<TabKey>('overview');
  const [isMasked, setIsMasked] = useState<boolean>(true);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isSupabaseGuideOpen, setIsSupabaseGuideOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Supabase backend status
  const [supabaseStatus, setSupabaseStatus] = useState<{
    configured: boolean;
    connected: boolean;
    url: string | null;
    message?: string;
    error?: string;
  }>({
    configured: false,
    connected: false,
    url: null,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const prevVaultRef = useRef<VaultState>(vault);
  const isInitialMount = useRef(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Check direct browser Supabase connection over Tailscale / Cloudflare Tunnel
  const [browserConnected, setBrowserConnected] = useState(false);

  const checkDirectSupabase = useCallback(async () => {
    try {
      const res = await testSupabaseConnection();
      setBrowserConnected(res.ok);
      if (res.ok) {
        const pullRes = await pullVaultFromSupabase();
        if (pullRes.success && pullRes.data) {
          // If Supabase has data, use it
          setVault(pullRes.data);
          prevVaultRef.current = pullRes.data;
          setSyncStatus('saved');
          setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
      }
    } catch {
      setBrowserConnected(false);
    }
  }, []);

  // Check backend Supabase connection status as fallback
  const checkSupabaseStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        setSupabaseStatus(data);
        return data;
      }
    } catch {
      setSupabaseStatus({ configured: false, connected: false, url: null });
    }
    return null;
  }, []);

  // On mount: check direct browser connection and backend
  useEffect(() => {
    checkDirectSupabase();
    checkSupabaseStatus();
  }, [checkDirectSupabase, checkSupabaseStatus]);

  // Intelligent real-time auto-sync to Supabase on any field update
  useEffect(() => {
    // 1. Immediately persist to localStorage (offline safety)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
    } catch {
      // Ignore quota error
    }

    // Skip auto-sync on initial component mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevVaultRef.current = vault;
      return;
    }

    // 2. Detect which sections changed
    const prev = prevVaultRef.current;
    const changedSections: Array<{ key: SyncSectionKey; items: any[] }> = [];

    if (prev.familyMembers !== vault.familyMembers) {
      changedSections.push({ key: 'familyMembers', items: vault.familyMembers });
    }
    if (prev.contacts !== vault.contacts) {
      changedSections.push({ key: 'contacts', items: vault.contacts });
    }
    if (prev.documents !== vault.documents) {
      changedSections.push({ key: 'documents', items: vault.documents });
    }
    if (prev.onlineAccounts !== vault.onlineAccounts) {
      changedSections.push({ key: 'onlineAccounts', items: vault.onlineAccounts });
    }
    if (prev.investments !== vault.investments) {
      changedSections.push({ key: 'investments', items: vault.investments });
    }
    if (prev.insurances !== vault.insurances) {
      changedSections.push({ key: 'insurances', items: vault.insurances });
    }
    if (prev.lockers !== vault.lockers) {
      changedSections.push({ key: 'lockers', items: vault.lockers });
    }
    if (prev.cards !== vault.cards) {
      changedSections.push({ key: 'cards', items: vault.cards });
    }
    if (prev.properties !== vault.properties) {
      changedSections.push({ key: 'properties', items: vault.properties });
    }
    if (prev.liabilities !== vault.liabilities) {
      changedSections.push({ key: 'liabilities', items: vault.liabilities });
    }
    if (prev.passwords !== vault.passwords) {
      changedSections.push({ key: 'passwords', items: vault.passwords });
    }

    prevVaultRef.current = vault;

    if (changedSections.length === 0) return;

    setSyncStatus('saving');

    // Debounce the Supabase database write by 1200ms so typing in fields doesn't flood the DB
    const timer = setTimeout(async () => {
      let anyError = false;
      for (const { key, items } of changedSections) {
        try {
          const res = await syncSectionToSupabase(key, items);
          if (!res.success) {
            anyError = true;
          }
        } catch {
          anyError = true;
        }
      }

      if (!anyError) {
        setSyncStatus('saved');
        setBrowserConnected(true);
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        setSyncStatus('error');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [vault]);

  // Sync data to Supabase
  const handleSyncDataToSupabase = async () => {
    setIsSyncing(true);
    try {
      const result = await pushVaultToSupabase(vault);
      if (result.success) {
        showToast(result.message || 'Successfully synced all vault tables to Supabase!');
        setBrowserConnected(true);
      } else {
        showToast(`Sync failed: ${result.message}`);
        if (result.message.toLowerCase().includes('missing') || result.message.toLowerCase().includes('initialize')) {
          setIsSupabaseGuideOpen(true);
        }
      }
    } catch (err: any) {
      showToast(`Error connecting to Supabase: ${err.message}`);
      setIsSupabaseGuideOpen(true);
    } finally {
      setIsSyncing(false);
    }
  };

  // Upload file attachment for a document (Supabase Storage direct or local fallback)
  const handleUploadFile = async (docId: string, file: File): Promise<DocumentAttachment | null> => {
    // 1. First attempt direct upload to Supabase Storage bucket 'vault_documents'
    try {
      const storageRes = await uploadDocumentToSupabaseStorage(file, docId);
      if (storageRes.success && storageRes.attachment) {
        setVault((prev) => ({
          ...prev,
          documents: prev.documents.map((d) =>
            d.id === docId ? { ...d, attachment: storageRes.attachment! } : d
          ),
        }));
        showToast(`File "${file.name}" uploaded to Supabase Storage!`);
        return storageRes.attachment;
      }
    } catch {
      // Continue to local / server fallback
    }

    // 2. Fallback to server endpoint or local base64 Data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const payload = {
            docId,
            fileName: file.name,
            originalName: file.name,
            mimeType: file.type || 'application/octet-stream',
            base64Data,
          };

          let attachment: DocumentAttachment | null = null;
          try {
            const res = await fetch('/api/documents/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            if (res.ok) {
              const resData = await res.json();
              attachment = resData.attachment;
            }
          } catch {
            // Backend not present
          }

          if (!attachment) {
            attachment = {
              id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              fileName: file.name,
              originalName: file.name,
              fileSize: file.size,
              mimeType: file.type || 'application/octet-stream',
              storagePath: `local/${docId}/${file.name}`,
              fileUrl: base64Data,
              uploadedAt: new Date().toISOString(),
            };
          }

          // Update local state - supports multiple documents / attachments
          setVault((prev) => ({
            ...prev,
            documents: prev.documents.map((d) => {
              if (d.id === docId) {
                const currentAttachments = Array.isArray(d.attachments)
                  ? d.attachments
                  : (d.attachment ? [d.attachment] : []);
                const updatedAttachments = [...currentAttachments, attachment!];
                return {
                  ...d,
                  attachment: attachment!, // latest uploaded file
                  attachments: updatedAttachments,
                };
              }
              return d;
            }),
          }));

          showToast(`File "${file.name}" uploaded successfully`);
          resolve(attachment);
        } catch (err: any) {
          showToast(`Upload failed: ${err.message}`);
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Rename attached document file
  const handleRenameFile = async (docId: string, newFileName: string) => {
    try {
      await fetch('/api/documents/rename-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId, newFileName }),
      });

      setVault((prev) => ({
        ...prev,
        documents: prev.documents.map((d) => {
          if (d.id === docId) {
            const updatedAttachments = (d.attachments || (d.attachment ? [d.attachment] : [])).map((att) =>
              att.fileName === d.attachment?.fileName ? { ...att, fileName: newFileName } : att
            );
            return {
              ...d,
              attachment: d.attachment ? { ...d.attachment, fileName: newFileName } : undefined,
              attachments: updatedAttachments,
            };
          }
          return d;
        }),
      }));
      showToast(`Renamed file to "${newFileName}"`);
    } catch {
      showToast('Failed to rename file');
    }
  };

  // Delete attached document file
  const handleDeleteFile = async (docId: string, storagePath?: string) => {
    try {
      await fetch('/api/documents/delete-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docId, storagePath }),
      });

      setVault((prev) => ({
        ...prev,
        documents: prev.documents.map((d) => {
          if (d.id === docId) {
            const currentAttachments = Array.isArray(d.attachments)
              ? d.attachments
              : (d.attachment ? [d.attachment] : []);
            const updatedAttachments = currentAttachments.filter(
              (a) => a.storagePath !== storagePath && a.id !== storagePath && a.fileName !== storagePath
            );
            return {
              ...d,
              attachment: updatedAttachments.length > 0 ? updatedAttachments[updatedAttachments.length - 1] : undefined,
              attachments: updatedAttachments,
            };
          }
          return d;
        }),
      }));
      showToast('Document file removed');
    } catch {
      showToast('Failed to delete file');
    }
  };

  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  const handleResetData = () => {
    setShowResetConfirmModal(true);
  };

  const handleConfirmReset = () => {
    setVault(INITIAL_VAULT_DATA);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setShowResetConfirmModal(false);
    showToast('Vault restored to original sheet values');
  };

  const handleExportJsonBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(vault, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `Family_Vault_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Full Vault JSON backup downloaded safely!');
  };

  const handleExportCsv = () => {
    const csvContent = exportVaultToCsv(vault);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Family_Financial_Details_${vault.currentDate || '2026'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Vault CSV file downloaded');
  };

  const handleOpenPrint = () => {
    setCurrentTab('binder');
    showToast('Switched to Printable Family Binder');
  };

  const handleSelectSearchResult = (tabKey: TabKey) => {
    setCurrentTab(tabKey);
  };

  // Counts for sidebar badges
  const counts = {
    contacts: vault.contacts.length,
    documents: vault.documents.length,
    investments: vault.investments.length + vault.onlineAccounts.length,
    insurances: vault.insurances.length,
    cards: vault.cards.length,
    lockers: vault.lockers.length,
    properties: vault.properties.length + vault.liabilities.length,
    passwords: vault.passwords.length,
    expiringSoonCount: vault.documents.filter((d) => {
      const exp = checkExpiryStatus(d.expiryDate);
      return exp.isUrgent || d.statusNote?.toLowerCase().includes('expire soon');
    }).length,
    people: (vault.people || []).length,
    trash: (vault.trashDocuments?.length || 0) + (vault.trashAttachments?.length || 0),
  };


  // People List handlers (password-protected 'ganesh22' in PeopleListTab)
  const handleAddPerson = useCallback((newPerson: Omit<PersonRecord, 'id'>) => {
    const item: PersonRecord = {
      ...newPerson,
      id: `person-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setVault((prev) => {
      const existing = prev.people || [];
      if (existing.some((p) => p.name.trim().toLowerCase() === item.name.trim().toLowerCase())) {
        return prev;
      }
      return {
        ...prev,
        people: [...existing, item],
      };
    });
    showToast(`Added "${item.name}" to People List`);
  }, []);

  const handleQuickAddPersonName = useCallback((name: string) => {
    const clean = name.trim();
    if (!clean) return;
    setVault((prev) => {
      const existing = prev.people || [];
      if (existing.some((p) => p.name.trim().toLowerCase() === clean.toLowerCase())) {
        return prev;
      }
      const item: PersonRecord = {
        id: `person-${Date.now()}`,
        name: clean,
        createdAt: new Date().toISOString(),
      };
      return {
        ...prev,
        people: [...existing, item],
      };
    });
    showToast(`Registered "${clean}" to People List`);
  }, []);

  const handleUpdatePerson = useCallback((updated: PersonRecord, oldName?: string) => {
    setVault((prev) => {
      const updatedPeople = (prev.people || []).map((p) => (p.id === updated.id ? updated : p));
      let updatedDocs = prev.documents;
      if (oldName && oldName.trim() && oldName.trim().toLowerCase() !== updated.name.trim().toLowerCase()) {
        const oldClean = oldName.trim().toLowerCase();
        updatedDocs = prev.documents.map((d) => {
          if ((d.personTag || '').trim().toLowerCase() === oldClean) {
            return { ...d, personTag: updated.name.trim() };
          }
          return d;
        });
      }
      return {
        ...prev,
        people: updatedPeople,
        documents: updatedDocs,
      };
    });
    showToast(`Updated person "${updated.name}"`);
  }, []);

  const handleDeletePerson = useCallback((personId: string, personName: string) => {
    setVault((prev) => {
      const cleanTarget = personName.trim().toLowerCase();
      return {
        ...prev,
        people: (prev.people || []).filter((p) => p.id !== personId),
        documents: prev.documents.map((d) => {
          if ((d.personTag || '').trim().toLowerCase() === cleanTarget) {
            return { ...d, personTag: '' };
          }
          return d;
        }),
      };
    });
    showToast(`Removed "${personName}" from People List`);
  }, []);

  const handleNavigateToPersonDocs = useCallback((personName: string) => {
    setTargetPersonFilter(personName);
    setCurrentTab('documents');
  }, []);

  // Dedicated contact auto-sync timers for real-time immediate database write
  const contactDebounceTimers = useRef<Map<string, any>>(new Map());

  const handleUpdateContact = useCallback((updated: ImportantContact) => {
    setVault((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c) => (c.id === updated.id ? updated : c)),
    }));
    setSyncStatus('saving');

    const existing = contactDebounceTimers.current.get(updated.id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      contactDebounceTimers.current.delete(updated.id);
      try {
        const res = await syncSingleRecord('contacts', updated);
        if (res.success) {
          setSyncStatus('saved');
          setBrowserConnected(true);
          setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      } catch (err) {
        console.warn('Auto-update contact error:', err);
      }
    }, 350);

    contactDebounceTimers.current.set(updated.id, timer);
  }, []);

  const handleCommitContact = useCallback(async (contact: ImportantContact) => {
    const existing = contactDebounceTimers.current.get(contact.id);
    if (existing) {
      clearTimeout(existing);
      contactDebounceTimers.current.delete(contact.id);
    }
    setSyncStatus('saving');
    try {
      const res = await syncSingleRecord('contacts', contact);
      if (res.success) {
        setSyncStatus('saved');
        setBrowserConnected(true);
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.warn('Commit contact error:', err);
    }
  }, []);

  const handleAddContact = useCallback(async (newContact: Omit<ImportantContact, 'id'>) => {
    const item: ImportantContact = { ...newContact, id: `c-${Date.now()}` };
    setVault((prev) => ({
      ...prev,
      contacts: [...prev.contacts, item],
    }));
    setSyncStatus('saving');
    try {
      const res = await syncSingleRecord('contacts', item);
      if (res.success) {
        setSyncStatus('saved');
        setBrowserConnected(true);
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        showToast(`Contact "${item.particulars || 'New'}" added & synced to Supabase`);
      }
    } catch (err) {
      console.warn('Add contact sync error:', err);
    }
  }, []);

  const handleDeleteContact = useCallback(async (id: string) => {
    const existing = contactDebounceTimers.current.get(id);
    if (existing) {
      clearTimeout(existing);
      contactDebounceTimers.current.delete(id);
    }
    setVault((prev) => ({
      ...prev,
      contacts: prev.contacts.filter((c) => c.id !== id),
    }));
    setSyncStatus('saving');
    try {
      const res = await deleteSingleRecord('contacts', id);
      if (res.success) {
        setSyncStatus('saved');
        setBrowserConnected(true);
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        showToast('Contact removed from Supabase');
      }
    } catch (err) {
      console.warn('Delete contact sync error:', err);
    }
  }, []);

  const familyDebounceTimers = useRef<Map<string, any>>(new Map());

  const handleUpdateFamilyMember = useCallback((updated: FamilyMember) => {
    setVault((prev) => ({
      ...prev,
      familyMembers: prev.familyMembers.map((m) => (m.id === updated.id ? updated : m)),
    }));
    setSyncStatus('saving');

    const existing = familyDebounceTimers.current.get(updated.id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      familyDebounceTimers.current.delete(updated.id);
      try {
        const res = await syncSingleRecord('familyMembers', updated);
        if (res.success) {
          setSyncStatus('saved');
          setBrowserConnected(true);
          setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      } catch (err) {
        console.warn('Auto-update family member error:', err);
      }
    }, 350);

    familyDebounceTimers.current.set(updated.id, timer);
  }, []);

  const handleCommitFamilyMember = useCallback(async (member: FamilyMember) => {
    const existing = familyDebounceTimers.current.get(member.id);
    if (existing) {
      clearTimeout(existing);
      familyDebounceTimers.current.delete(member.id);
    }
    setSyncStatus('saving');
    try {
      const res = await syncSingleRecord('familyMembers', member);
      if (res.success) {
        setSyncStatus('saved');
        setBrowserConnected(true);
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.warn('Commit family member error:', err);
    }
  }, []);

  const handleAddFamilyMember = useCallback(async (newMember: Omit<FamilyMember, 'id'>) => {
    const item: FamilyMember = { ...newMember, id: `fam-${Date.now()}` };
    setVault((prev) => ({
      ...prev,
      familyMembers: [...prev.familyMembers, item],
    }));
    setSyncStatus('saving');
    try {
      const res = await syncSingleRecord('familyMembers', item);
      if (res.success) {
        setSyncStatus('saved');
        setBrowserConnected(true);
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        showToast('Family member added & synced to Supabase');
      }
    } catch (err) {
      console.warn('Add family member error:', err);
    }
  }, []);

  const handleDeleteFamilyMember = useCallback(async (id: string) => {
    const existing = familyDebounceTimers.current.get(id);
    if (existing) {
      clearTimeout(existing);
      familyDebounceTimers.current.delete(id);
    }
    setVault((prev) => ({
      ...prev,
      familyMembers: prev.familyMembers.filter((m) => m.id !== id),
    }));
    setSyncStatus('saving');
    try {
      const res = await deleteSingleRecord('familyMembers', id);
      if (res.success) {
        setSyncStatus('saved');
        setBrowserConnected(true);
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.warn('Delete family member error:', err);
    }
  }, []);

  const docDebounceTimers = useRef<Map<string, any>>(new Map());

  const handleUpdateDocument = useCallback((updated: FinancialDocument) => {
    setVault((prev) => ({
      ...prev,
      documents: prev.documents.map((d) => (d.id === updated.id ? updated : d)),
    }));
    setSyncStatus('saving');

    const existing = docDebounceTimers.current.get(updated.id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      docDebounceTimers.current.delete(updated.id);
      try {
        const res = await syncSingleRecord('documents', updated);
        if (res.success) {
          setSyncStatus('saved');
          setBrowserConnected(true);
          setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      } catch (err) {
        console.warn('Auto-update document error:', err);
      }
    }, 350);

    docDebounceTimers.current.set(updated.id, timer);
  }, []);

  const handleCommitDocument = useCallback(async (doc: FinancialDocument) => {
    const existing = docDebounceTimers.current.get(doc.id);
    if (existing) {
      clearTimeout(existing);
      docDebounceTimers.current.delete(doc.id);
    }
    setSyncStatus('saving');
    try {
      const res = await syncSingleRecord('documents', doc);
      if (res.success) {
        setSyncStatus('saved');
        setBrowserConnected(true);
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.warn('Commit document error:', err);
    }
  }, []);

  const handleAddDocument = useCallback(async (newDoc: Omit<FinancialDocument, 'id'>) => {
    const item: FinancialDocument = { ...newDoc, id: `doc-${Date.now()}` };
    setVault((prev) => ({
      ...prev,
      documents: [...prev.documents, item],
    }));
    setSyncStatus('saving');
    try {
      const res = await syncSingleRecord('documents', item);
      if (res.success) {
        setSyncStatus('saved');
        setBrowserConnected(true);
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        showToast(`Document "${item.documentName}" added & synced`);
      }
    } catch (err) {
      console.warn('Add document error:', err);
    }
  }, []);

  const handleReorderDocuments = useCallback(async (reorderedDocs: FinancialDocument[]) => {
    const resequenced = reorderedDocs.map((doc, idx) => ({
      ...doc,
      srNo: idx + 1,
    }));
    setVault((prev) => ({
      ...prev,
      documents: resequenced,
    }));
    setSyncStatus('saving');
    try {
      const res = await syncSectionToSupabase('documents', resequenced);
      if (res.success) {
        setSyncStatus('saved');
        setBrowserConnected(true);
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch (err) {
      console.warn('Reorder documents sync error:', err);
    }
  }, []);

  // Trash System: 30-day retention for both documents and uploaded files
  const handleMoveDocumentToTrash = useCallback((id: string) => {
    const existing = docDebounceTimers.current.get(id);
    if (existing) {
      clearTimeout(existing);
      docDebounceTimers.current.delete(id);
    }
    const docToTrash = vault.documents.find((d) => d.id === id);
    if (!docToTrash) return;

    setVault((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== id),
      trashDocuments: [
        { ...docToTrash, deletedAt: new Date().toISOString() },
        ...(prev.trashDocuments || []).filter((d) => d.id !== id),
      ],
    }));
    showToast(`Moved "${docToTrash.documentName}" to Trash (kept for 30 days)`);
  }, [vault.documents]);

  const handleRestoreDocument = useCallback((id: string) => {
    const docToRestore = (vault.trashDocuments || []).find((d) => d.id === id);
    if (!docToRestore) return;

    const { deletedAt, ...cleanDoc } = docToRestore;
    setVault((prev) => ({
      ...prev,
      trashDocuments: (prev.trashDocuments || []).filter((d) => d.id !== id),
      documents: [...prev.documents, cleanDoc],
    }));
    showToast(`Restored "${cleanDoc.documentName}" to Family Documents`);
  }, [vault.trashDocuments]);

  const handlePermanentDelete = useCallback(async (id: string) => {
    setVault((prev) => ({
      ...prev,
      trashDocuments: (prev.trashDocuments || []).filter((d) => d.id !== id),
    }));
    try {
      await deleteSingleRecord('documents', id);
    } catch {
      // offline
    }
    showToast('Record permanently deleted');
  }, []);

  const handleMoveFileToTrash = useCallback((docId: string, attachment: DocumentAttachment) => {
    const doc = vault.documents.find((d) => d.id === docId);
    const trashedItem: TrashedAttachment = {
      id: `trash-att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      docId,
      documentName: doc?.documentName || 'Family Document',
      attachment,
      deletedAt: new Date().toISOString(),
    };

    setVault((prev) => ({
      ...prev,
      documents: prev.documents.map((d) => {
        if (d.id === docId) {
          const cur = (d.attachments && d.attachments.length > 0) ? d.attachments : (d.attachment ? [d.attachment] : []);
          const filtered = cur.filter((a) => a.id !== attachment.id && a.fileName !== attachment.fileName);
          return {
            ...d,
            attachment: filtered.length > 0 ? filtered[filtered.length - 1] : undefined,
            attachments: filtered,
          };
        }
        return d;
      }),
      trashAttachments: [trashedItem, ...(prev.trashAttachments || [])],
    }));
    showToast(`Moved "${attachment.fileName}" to Trash (kept for 30 days)`);
  }, [vault.documents]);

  const handleRestoreFileFromTrash = useCallback((trashAttId: string) => {
    const trashed = (vault.trashAttachments || []).find((a) => a.id === trashAttId);
    if (!trashed) return;

    setVault((prev) => {
      const docExists = prev.documents.some((d) => d.id === trashed.docId);
      let newDocs = [...prev.documents];

      if (!docExists) {
        const newDoc: FinancialDocument = {
          id: trashed.docId,
          srNo: newDocs.length + 1,
          documentName: trashed.documentName,
          documentNumber: '',
          personTag: '',
          tags: [],
          attachment: trashed.attachment,
          attachments: [trashed.attachment],
        };
        newDocs.push(newDoc);
      } else {
        newDocs = newDocs.map((d) => {
          if (d.id === trashed.docId) {
            const cur = (d.attachments && d.attachments.length > 0) ? d.attachments : (d.attachment ? [d.attachment] : []);
            const updated = [...cur, trashed.attachment];
            return {
              ...d,
              attachment: trashed.attachment,
              attachments: updated,
            };
          }
          return d;
        });
      }

      return {
        ...prev,
        trashAttachments: (prev.trashAttachments || []).filter((a) => a.id !== trashAttId),
        documents: newDocs,
      };
    });
    showToast(`Restored file "${trashed.attachment.fileName}" to Family Documents`);
  }, [vault.trashAttachments]);

  const handlePermanentDeleteAttachment = useCallback(async (trashAttId: string) => {
    const trashed = (vault.trashAttachments || []).find((a) => a.id === trashAttId);
    setVault((prev) => ({
      ...prev,
      trashAttachments: (prev.trashAttachments || []).filter((a) => a.id !== trashAttId),
    }));
    if (trashed) {
      try {
        await fetch('/api/documents/delete-file', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docId: trashed.docId, storagePath: trashed.attachment.storagePath }),
        });
      } catch {
        // offline
      }
    }
    showToast('File permanently deleted');
  }, [vault.trashAttachments]);

  const handleEmptyTrash = useCallback(() => {
    setVault((prev) => ({
      ...prev,
      trashDocuments: [],
      trashAttachments: [],
    }));
    showToast('Trash emptied');
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-lg border border-slate-700 animate-fade-in flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        isMasked={isMasked}
        onToggleMask={() => setIsMasked((prev) => !prev)}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenPrint={handleOpenPrint}
        onExportCsv={handleExportCsv}
        onResetData={handleResetData}
        onOpenSupabaseGuide={() => setIsSupabaseGuideOpen(true)}
        supabaseConnected={browserConnected || supabaseStatus.connected}
        syncStatus={syncStatus}
        lastSavedTime={lastSavedTime}
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        lastUpdated={vault.currentDate}
      />

      {/* Main Container - Full-width layout minimizing empty margins */}
      <div className="flex-1 w-full max-w-full px-2 sm:px-3 lg:px-5 py-3.5 flex gap-3 xl:gap-4">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-56 xl:w-60 shrink-0 bg-white border border-slate-200 rounded-xl p-2 h-[calc(100vh-5.5rem)] sticky top-20 shadow-xs">
          <Sidebar
            currentTab={currentTab}
            onSelectTab={setCurrentTab}
            counts={counts}
            className="h-full"
          />
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-full bg-white h-full shadow-2xl p-4 flex flex-col z-50">
              <Sidebar
                currentTab={currentTab}
                onSelectTab={setCurrentTab}
                counts={counts}
                onCloseMobile={() => setMobileMenuOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Dynamic Content Viewport */}
        <main className="flex-1 min-w-0" id="main-content">
          {currentTab === 'overview' && (
            <OverviewTab
              vault={vault}
              isMasked={isMasked}
              onNavigateTab={setCurrentTab}
              onOpenPrint={handleOpenPrint}
            />
          )}

          {currentTab === 'contacts' && (
            <ContactsTab
              familyMembers={vault.familyMembers}
              contacts={vault.contacts}
              onUpdateContact={handleUpdateContact}
              onCommitContact={handleCommitContact}
              onAddContact={handleAddContact}
              onDeleteContact={handleDeleteContact}
              onUpdateFamilyMember={handleUpdateFamilyMember}
              onCommitFamilyMember={handleCommitFamilyMember}
              onAddFamilyMember={handleAddFamilyMember}
              onDeleteFamilyMember={handleDeleteFamilyMember}
              syncStatus={syncStatus}
              lastSavedTime={lastSavedTime}
              supabaseConnected={browserConnected || supabaseStatus.connected}
            />
          )}

          {currentTab === 'people' && (
            <PeopleListTab
              people={vault.people || []}
              documents={vault.documents}
              onAddPerson={handleAddPerson}
              onUpdatePerson={handleUpdatePerson}
              onDeletePerson={handleDeletePerson}
              onNavigateToPersonDocs={handleNavigateToPersonDocs}
              isUnlocked={isPeopleUnlocked}
              onUnlock={() => setIsPeopleUnlocked(true)}
              onLock={() => setIsPeopleUnlocked(false)}
            />
          )}

          {currentTab === 'documents' && (
            <DocumentsTab
              documents={vault.documents}
              people={vault.people || []}
              onAddPerson={handleQuickAddPersonName}
              initialPersonFilter={targetPersonFilter}
              onClearInitialPersonFilter={() => setTargetPersonFilter(null)}
              familyMembers={vault.familyMembers}
              contacts={vault.contacts}
              isMasked={isMasked}
              currentYear={vault.currentYear}
              onUpdateDocument={handleUpdateDocument}
              onCommitDocument={handleCommitDocument}
              onAddDocument={handleAddDocument}
              onDeleteDocument={handleMoveDocumentToTrash}
              onMoveFileToTrash={handleMoveFileToTrash}
              onUploadFile={handleUploadFile}
              onRenameFile={handleRenameFile}
              onDeleteFile={handleDeleteFile}
              onReorderDocuments={handleReorderDocuments}
              syncStatus={syncStatus}
              lastSavedTime={lastSavedTime}
              supabaseConnected={browserConnected || supabaseStatus.connected}
            />
          )}

          {currentTab === 'investments' && (
            <InvestmentsTab
              onlineAccounts={vault.onlineAccounts}
              investments={vault.investments}
              isMasked={isMasked}
              onUpdateOnlineAccount={(updated) => {
                setVault((prev) => ({
                  ...prev,
                  onlineAccounts: prev.onlineAccounts.map((a) => (a.id === updated.id ? updated : a)),
                }));
                showToast(`Platform "${updated.platform}" updated`);
              }}
              onAddOnlineAccount={(newAcc) => {
                const item = { ...newAcc, id: `oa-${Date.now()}` };
                setVault((prev) => ({
                  ...prev,
                  onlineAccounts: [...prev.onlineAccounts, item],
                }));
                showToast(`Platform "${item.platform}" added`);
              }}
              onDeleteOnlineAccount={(id) => {
                setVault((prev) => ({
                  ...prev,
                  onlineAccounts: prev.onlineAccounts.filter((a) => a.id !== id),
                }));
                showToast('Platform removed');
              }}
              onUpdateInvestment={(updated) => {
                setVault((prev) => ({
                  ...prev,
                  investments: prev.investments.map((i) => (i.id === updated.id ? updated : i)),
                }));
                showToast(`Investment "${updated.investmentType}" updated`);
              }}
              onAddInvestment={(newInv) => {
                const item = { ...newInv, id: `inv-${Date.now()}` };
                setVault((prev) => ({
                  ...prev,
                  investments: [...prev.investments, item],
                }));
                showToast(`Investment "${item.investmentType}" added`);
              }}
              onDeleteInvestment={(id) => {
                setVault((prev) => ({
                  ...prev,
                  investments: prev.investments.filter((i) => i.id !== id),
                }));
                showToast('Investment removed');
              }}
            />
          )}

          {currentTab === 'insurance' && (
            <InsuranceTab
              insurances={vault.insurances}
              isMasked={isMasked}
              onUpdateInsurance={(updated) => {
                setVault((prev) => ({
                  ...prev,
                  insurances: prev.insurances.map((i) => (i.id === updated.id ? updated : i)),
                }));
                showToast(`Policy "${updated.policyName}" updated`);
              }}
              onAddInsurance={(newPolicy) => {
                const item = { ...newPolicy, id: `ins-${Date.now()}` };
                setVault((prev) => ({
                  ...prev,
                  insurances: [...prev.insurances, item],
                }));
                showToast(`Policy "${item.policyName}" added`);
              }}
              onDeleteInsurance={(id) => {
                setVault((prev) => ({
                  ...prev,
                  insurances: prev.insurances.filter((i) => i.id !== id),
                }));
                showToast('Policy removed');
              }}
            />
          )}

          {currentTab === 'banking' && (
            <BankingCardsTab
              cards={vault.cards}
              lockers={vault.lockers}
              isMasked={isMasked}
              onUpdateCard={(updated) => {
                setVault((prev) => ({
                  ...prev,
                  cards: prev.cards.map((c) => (c.id === updated.id ? updated : c)),
                }));
                showToast(`Card ending in ${updated.cardNumber.slice(-4)} updated`);
              }}
              onAddCard={(newCard) => {
                const item = { ...newCard, id: `card-${Date.now()}` };
                setVault((prev) => ({
                  ...prev,
                  cards: [...prev.cards, item],
                }));
                showToast('New card added');
              }}
              onDeleteCard={(id) => {
                setVault((prev) => ({
                  ...prev,
                  cards: prev.cards.filter((c) => c.id !== id),
                }));
                showToast('Card removed');
              }}
              onUpdateLocker={(updated) => {
                setVault((prev) => ({
                  ...prev,
                  lockers: prev.lockers.map((l) => (l.id === updated.id ? updated : l)),
                }));
                showToast(`Locker "${updated.lockerNumber}" updated`);
              }}
              onAddLocker={(newLocker) => {
                const item = { ...newLocker, id: `loc-${Date.now()}` };
                setVault((prev) => ({
                  ...prev,
                  lockers: [...prev.lockers, item],
                }));
                showToast(`Locker "${item.lockerNumber}" added`);
              }}
              onDeleteLocker={(id) => {
                setVault((prev) => ({
                  ...prev,
                  lockers: prev.lockers.filter((l) => l.id !== id),
                }));
                showToast('Locker removed');
              }}
            />
          )}

          {currentTab === 'assets_liabilities' && (
            <AssetsLiabilitiesTab
              properties={vault.properties}
              liabilities={vault.liabilities}
              isMasked={isMasked}
              onUpdateProperty={(updated) => {
                setVault((prev) => ({
                  ...prev,
                  properties: prev.properties.map((p) => (p.id === updated.id ? updated : p)),
                }));
                showToast(`Property "${updated.propertyName}" updated`);
              }}
              onAddProperty={(newProp) => {
                const item = { ...newProp, id: `prop-${Date.now()}` };
                setVault((prev) => ({
                  ...prev,
                  properties: [...prev.properties, item],
                }));
                showToast(`Property "${item.propertyName}" added`);
              }}
              onDeleteProperty={(id) => {
                setVault((prev) => ({
                  ...prev,
                  properties: prev.properties.filter((p) => p.id !== id),
                }));
                showToast('Property removed');
              }}
              onUpdateLiability={(updated) => {
                setVault((prev) => ({
                  ...prev,
                  liabilities: prev.liabilities.map((l) => (l.id === updated.id ? updated : l)),
                }));
                showToast(`Liability "${updated.bankOrLender}" updated`);
              }}
              onAddLiability={(newLia) => {
                const item = { ...newLia, id: `lia-${Date.now()}` };
                setVault((prev) => ({
                  ...prev,
                  liabilities: [...prev.liabilities, item],
                }));
                showToast(`Liability "${item.bankOrLender}" added`);
              }}
              onDeleteLiability={(id) => {
                setVault((prev) => ({
                  ...prev,
                  liabilities: prev.liabilities.filter((l) => l.id !== id),
                }));
                showToast('Liability removed');
              }}
            />
          )}

          {currentTab === 'passwords' && (
            <PasswordsAccessTab
              passwords={vault.passwords}
              onUpdatePassword={(updated) => {
                setVault((prev) => ({
                  ...prev,
                  passwords: prev.passwords.map((p) => (p.id === updated.id ? updated : p)),
                }));
                showToast(`Access rule "${updated.loginKind}" updated`);
              }}
              onAddPassword={(newPwd) => {
                const item = { ...newPwd, id: `pwd-${Date.now()}` };
                setVault((prev) => ({
                  ...prev,
                  passwords: [...prev.passwords, item],
                }));
                showToast(`Access rule "${item.loginKind}" added`);
              }}
              onDeletePassword={(id) => {
                setVault((prev) => ({
                  ...prev,
                  passwords: prev.passwords.filter((p) => p.id !== id),
                }));
                showToast('Access rule removed');
              }}
            />
          )}

          {currentTab === 'binder' && (
            <PrintableBinderTab
              vault={vault}
              isMasked={isMasked}
              onToggleMask={() => setIsMasked((prev) => !prev)}
            />
          )}

          {currentTab === 'trash' && (
            <TrashTab
              trashDocuments={vault.trashDocuments || []}
              trashAttachments={vault.trashAttachments || []}
              onRestoreDocument={handleRestoreDocument}
              onPermanentDelete={handlePermanentDelete}
              onRestoreFile={handleRestoreFileFromTrash}
              onPermanentDeleteFile={handlePermanentDeleteAttachment}
              onEmptyTrash={handleEmptyTrash}
              onNavigateToDocuments={() => setCurrentTab('documents')}
            />
          )}
        </main>
      </div>

      {/* Global Search Dialog Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        vault={vault}
        onSelectResult={handleSelectSearchResult}
      />

      {/* Supabase Proxmox Setup Guide & Connection Modal */}
      <SupabaseGuideModal
        isOpen={isSupabaseGuideOpen}
        onClose={() => setIsSupabaseGuideOpen(false)}
        vault={vault}
        onUpdateVault={setVault}
        showToast={showToast}
      />

      {/* Reset Vault In-App Confirmation Modal (No window.confirm) */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Reset Vault to Initial Values?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Resetting will restore initial blank sheet values. Any real family records or uploaded documents you have added will be replaced.
                </p>
                <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 p-2 rounded-lg font-medium">
                  Tip: You can click &quot;Backup JSON&quot; in the header to download a complete copy before resetting.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-2xs"
              >
                Yes, Reset Vault
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
