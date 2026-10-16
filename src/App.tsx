/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { VaultState, FinancialDocument, DocumentAttachment } from './types/vault.ts';
import { INITIAL_VAULT_DATA } from './data/initialVaultData.ts';
import { exportVaultToCsv, checkExpiryStatus } from './utils/vaultCalculations.ts';

import { Navbar } from './components/Navbar.tsx';
import { Sidebar, TabKey } from './components/Sidebar.tsx';
import { GlobalSearchModal } from './components/GlobalSearchModal.tsx';
import { SupabaseGuideModal } from './components/modals/SupabaseGuideModal.tsx';
import { testSupabaseConnection, pullVaultFromSupabase } from './services/supabaseClient.ts';

import { OverviewTab } from './components/tabs/OverviewTab.tsx';
import { ContactsTab } from './components/tabs/ContactsTab.tsx';
import { DocumentsTab } from './components/tabs/DocumentsTab.tsx';
import { InvestmentsTab } from './components/tabs/InvestmentsTab.tsx';
import { InsuranceTab } from './components/tabs/InsuranceTab.tsx';
import { BankingCardsTab } from './components/tabs/BankingCardsTab.tsx';
import { AssetsLiabilitiesTab } from './components/tabs/AssetsLiabilitiesTab.tsx';
import { PasswordsAccessTab } from './components/tabs/PasswordsAccessTab.tsx';
import { PrintableBinderTab } from './components/tabs/PrintableBinderTab.tsx';

const STORAGE_KEY = 'kutumb_vault_data_v1';

export default function App() {
  const [vault, setVault] = useState<VaultState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return INITIAL_VAULT_DATA;
  });

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Check direct browser Supabase connection over Tailscale
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

  // On mount: check both direct browser connection (Tailscale) and backend
  useEffect(() => {
    checkDirectSupabase();
    checkSupabaseStatus();
  }, [checkDirectSupabase, checkSupabaseStatus]);

  // Sync to local storage whenever vault state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vault));
    } catch {
      // Ignore quota error
    }
  }, [vault]);

  // Sync data to Supabase
  const handleSyncDataToSupabase = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/vault/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vault),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Successfully synced all vault tables to Supabase!');
      } else {
        showToast(`Sync failed: ${data.error || 'Check Supabase logs'}`);
      }
    } catch (err: any) {
      showToast(`Error connecting to server: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Upload file attachment for a document
  const handleUploadFile = async (docId: string, file: File): Promise<DocumentAttachment | null> => {
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

          const res = await fetch('/api/documents/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            throw new Error('Upload failed');
          }

          const resData = await res.json();
          const attachment: DocumentAttachment = resData.attachment;

          // Update local state
          setVault((prev) => ({
            ...prev,
            documents: prev.documents.map((d) =>
              d.id === docId ? { ...d, attachment } : d
            ),
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
          if (d.id === docId && d.attachment) {
            return {
              ...d,
              attachment: {
                ...d.attachment,
                fileName: newFileName,
              },
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
            const { attachment, ...rest } = d;
            return rest as FinancialDocument;
          }
          return d;
        }),
      }));
      showToast('Document file deleted');
    } catch {
      showToast('Failed to delete file');
    }
  };

  const handleResetData = () => {
    if (window.confirm('Reset all vault data back to initial sheet values? Any edits will be overwritten.')) {
      setVault(INITIAL_VAULT_DATA);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
      showToast('Vault restored to original sheet values');
    }
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
  };

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
        mobileMenuOpen={mobileMenuOpen}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        lastUpdated={vault.currentDate}
      />

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 bg-white border border-slate-200 rounded-xl p-2 h-[calc(100vh-6.5rem)] sticky top-20 shadow-xs">
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
              onUpdateContact={(updated) => {
                setVault((prev) => ({
                  ...prev,
                  contacts: prev.contacts.map((c) => (c.id === updated.id ? updated : c)),
                }));
                showToast(`Contact "${updated.particulars}" updated`);
              }}
              onAddContact={(newContact) => {
                const item = { ...newContact, id: `c-${Date.now()}` };
                setVault((prev) => ({
                  ...prev,
                  contacts: [...prev.contacts, item],
                }));
                showToast(`Contact "${item.particulars}" added`);
              }}
              onDeleteContact={(id) => {
                setVault((prev) => ({
                  ...prev,
                  contacts: prev.contacts.filter((c) => c.id !== id),
                }));
                showToast('Contact removed');
              }}
              onUpdateFamilyMember={(updated) => {
                setVault((prev) => ({
                  ...prev,
                  familyMembers: prev.familyMembers.map((m) => (m.id === updated.id ? updated : m)),
                }));
                showToast('Family member updated');
              }}
              onAddFamilyMember={(newMember) => {
                const item = { ...newMember, id: `fam-${Date.now()}` };
                setVault((prev) => ({
                  ...prev,
                  familyMembers: [...prev.familyMembers, item],
                }));
                showToast('Family member added');
              }}
              onDeleteFamilyMember={(id) => {
                setVault((prev) => ({
                  ...prev,
                  familyMembers: prev.familyMembers.filter((m) => m.id !== id),
                }));
              }}
            />
          )}

          {currentTab === 'documents' && (
            <DocumentsTab
              documents={vault.documents}
              isMasked={isMasked}
              currentYear={vault.currentYear}
              onUpdateDocument={(updated) => {
                setVault((prev) => ({
                  ...prev,
                  documents: prev.documents.map((d) => (d.id === updated.id ? updated : d)),
                }));
                showToast(`Document "${updated.documentName}" updated`);
              }}
              onAddDocument={(newDoc) => {
                const item = { ...newDoc, id: `doc-${Date.now()}` };
                setVault((prev) => ({
                  ...prev,
                  documents: [...prev.documents, item],
                }));
                showToast(`Document "${item.documentName}" added`);
              }}
              onDeleteDocument={(id) => {
                setVault((prev) => ({
                  ...prev,
                  documents: prev.documents.filter((d) => d.id !== id),
                }));
                showToast('Document removed');
              }}
              onUploadFile={handleUploadFile}
              onRenameFile={handleRenameFile}
              onDeleteFile={handleDeleteFile}
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
    </div>
  );
}
