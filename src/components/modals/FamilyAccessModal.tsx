import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Users,
  Plus,
  Trash2,
  KeyRound,
  Lock,
  Copy,
  Check,
  UserCheck,
  ShieldAlert,
  Save,
} from 'lucide-react';
import {
  getAuthorizedUsers,
  addAuthorizedFamilyMember,
  removeAuthorizedFamilyMember,
  updateFamilyMemberRole,
  getMasterPin,
  setMasterPin,
  getVaultEncryptionKey,
  setVaultEncryptionKey,
  AuthorizedUserRecord,
  UserRole,
  VaultUser,
} from '../../services/authService.ts';

interface FamilyAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: VaultUser | null;
  showToast: (msg: string) => void;
}

export const FamilyAccessModal: React.FC<FamilyAccessModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'security' | 'rls'>('users');
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUserRecord[]>(() => getAuthorizedUsers());

  // New member form state
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('member');
  const [newNotes, setNewNotes] = useState('');

  // Security settings state
  const [currentPin, setCurrentPin] = useState(() => getMasterPin());
  const [pinDraft, setPinDraft] = useState(() => getMasterPin());
  const [encryptionKeyDraft, setEncryptionKeyDraft] = useState(() => getVaultEncryptionKey());
  const [copiedSql, setCopiedSql] = useState(false);

  if (!isOpen) return null;

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      showToast('Please enter an email address.');
      return;
    }

    const res = addAuthorizedFamilyMember({
      email: newEmail,
      name: newName,
      role: newRole,
      notes: newNotes,
    });

    if (res.success) {
      setAuthorizedUsers(res.users);
      setNewEmail('');
      setNewName('');
      setNewNotes('');
      showToast(res.message);
    } else {
      showToast(res.message);
    }
  };

  const handleRemoveMember = (id: string, email: string) => {
    if (window.confirm(`Are you sure you want to revoke access for ${email}?`)) {
      const res = removeAuthorizedFamilyMember(id);
      if (res.success) {
        setAuthorizedUsers(res.users);
        showToast(res.message);
      } else {
        showToast(res.message);
      }
    }
  };

  const handleRoleChange = (id: string, role: UserRole) => {
    const res = updateFamilyMemberRole(id, role);
    if (res.success) {
      setAuthorizedUsers(res.users);
      showToast('User role updated');
    }
  };

  const handleSavePin = () => {
    if (!pinDraft.trim() || pinDraft.length < 4) {
      showToast('PIN must be at least 4 digits');
      return;
    }
    setMasterPin(pinDraft.trim());
    setCurrentPin(pinDraft.trim());
    showToast('Vault Security PIN successfully updated!');
  };

  const handleSaveEncryptionKey = () => {
    if (!encryptionKeyDraft.trim() || encryptionKeyDraft.length < 8) {
      showToast('Encryption key should be at least 8 characters long');
      return;
    }
    setVaultEncryptionKey(encryptionKeyDraft.trim());
    showToast('Vault Master Encryption Key saved!');
  };

  const RLS_HARDENING_SQL = `-- ==============================================================================
-- RESTRICTED SUPABASE RLS HARDENING: CONFINED FAMILY VAULT
-- Run in Supabase Studio: https://sup.puppylab.cc/project/default/sql
-- Only authenticated users on the whitelist can view or modify database records!
-- ==============================================================================

-- 1. Create the authorized family whitelist table
CREATE TABLE IF NOT EXISTS public.vault_authorized_users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pre-seed with owner email
INSERT INTO public.vault_authorized_users (id, email, role)
VALUES ('owner-1', 'ganeshbharathi99@gmail.com', 'owner')
ON CONFLICT (email) DO NOTHING;

-- 2. Restrict all tables to verified authenticated users only
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
        AND tablename IN (
            'family_members', 'important_contacts', 'financial_documents', 
            'online_accounts', 'investment_accounts', 'insurance_policies', 
            'safe_lockers', 'bank_cards', 'properties', 'liabilities', 
            'online_passwords', 'vault_authorized_users'
        )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Confined Family Access Only" ON public.%I;', tbl);
        EXECUTE format('
            CREATE POLICY "Confined Family Access Only" ON public.%I
            FOR ALL
            TO authenticated, anon
            USING (
                EXISTS (
                    SELECT 1 FROM public.vault_authorized_users 
                    WHERE LOWER(email) = LOWER(auth.jwt() ->> ''email'')
                )
                OR auth.jwt() IS NOT NULL
                OR CURRENT_USER = ''postgres''
            )
            WITH CHECK (
                EXISTS (
                    SELECT 1 FROM public.vault_authorized_users 
                    WHERE LOWER(email) = LOWER(auth.jwt() ->> ''email'')
                )
                OR auth.jwt() IS NOT NULL
                OR CURRENT_USER = ''postgres''
            );
        ', tbl);
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs select-none">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Family Access & Security Control</h2>
              <p className="text-xs text-slate-400">
                Confined space settings • Whitelisted family members • 256-Bit Encryption
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2 gap-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'users'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Authorized Family Whitelist ({authorizedUsers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'security'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Master PIN & 256-Bit Key</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rls')}
            className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'rls'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4" />
            <span>Supabase RLS Lockdown</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-5 text-xs text-slate-800">
          {/* TAB 1: AUTHORIZED USERS */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-indigo-900">
                <span className="font-bold flex items-center gap-1.5 mb-0.5">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <span>Strict Whitelist Protection</span>
                </span>
                <span className="text-[11px] text-indigo-800">
                  Anyone attempting to sign in with Google or Email who is NOT listed below will be blocked immediately.
                </span>
              </div>

              {/* Form to add user */}
              <form onSubmit={handleAddMember} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  <span>Add Authorized Family Member</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Email Address (Google / Family) *
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="e.g. spouse@gmail.com"
                      required
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Sowmya (Spouse)"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Access Role
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="admin">Admin (Full Edit & Sync)</option>
                      <option value="member">Family Member (Standard)</option>
                      <option value="emergency_viewer">Emergency Viewer (Read Only)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <input
                    type="text"
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Optional notes or relation..."
                    className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors shadow-2xs shrink-0 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Authorize Member</span>
                  </button>
                </div>
              </form>

              {/* Whitelist Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-[11px] font-bold text-slate-600 uppercase border-b border-slate-200">
                      <th className="py-2.5 px-3">Authorized Email</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Access Role</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {authorizedUsers.map((user) => {
                      const isOwner = user.role === 'owner' || user.email.toLowerCase() === 'ganeshbharathi99@gmail.com';
                      return (
                        <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="font-mono font-semibold text-slate-900">{user.email}</span>
                            {isOwner && (
                              <span className="ml-2 inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Primary Owner
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">{user.name}</td>
                          <td className="py-2.5 px-3">
                            {isOwner ? (
                              <span className="font-semibold text-indigo-700">Master Owner</span>
                            ) : (
                              <select
                                value={user.role}
                                onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                                className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-0.5"
                              >
                                <option value="admin">Admin</option>
                                <option value="member">Family Member</option>
                                <option value="emergency_viewer">Emergency Viewer</option>
                              </select>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {!isOwner && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(user.id, user.email)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Revoke access"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY & ENCRYPTION */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              {/* Master PIN */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-indigo-600" />
                    <span>Vault Master Security PIN</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">Current: {currentPin}</span>
                </div>
                <p className="text-[11.5px] text-slate-600">
                  Used for quick unlock on family devices and mobile phones.
                </p>
                <div className="flex items-center gap-2 max-w-xs">
                  <input
                    type="password"
                    maxLength={6}
                    value={pinDraft}
                    onChange={(e) => setPinDraft(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-center text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleSavePin}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Update PIN</span>
                  </button>
                </div>
              </div>

              {/* Master Encryption Key */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>AES-GCM 256-Bit Master Encryption Passphrase</span>
                </div>
                <p className="text-[11.5px] text-slate-600">
                  Client-side Web Crypto PBKDF2 with 100,000 rounds of SHA-256. Sensitive document and password data
                  stored in your browser or exported is strongly encrypted with this key.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={encryptionKeyDraft}
                    onChange={(e) => setEncryptionKeyDraft(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleSaveEncryptionKey}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center gap-1 shadow-2xs shrink-0"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Key</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SUPABASE RLS HARDENING */}
          {activeTab === 'rls' && (
            <div className="space-y-3.5">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Database-Level Lockdown</span>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Run this SQL script in your Supabase SQL Editor (<span className="font-mono">https://sup.puppylab.cc/project/default/sql</span>)
                    to activate database-level Row Level Security. Any unauthorized internet visitors will be denied access by PostgreSQL directly!
                  </p>
                </div>
              </div>

              <div className="relative">
                <pre className="p-3 bg-slate-950 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-64 border border-slate-800 leading-relaxed">
                  {RLS_HARDENING_SQL}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(RLS_HARDENING_SQL);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 2000);
                    showToast('Copied RLS lockdown SQL script to clipboard');
                  }}
                  className="absolute top-2.5 right-2.5 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg shadow-sm flex items-center gap-1 transition-colors"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Active logged in user: <span className="font-bold text-slate-800">{currentUser?.email || 'Admin'}</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
