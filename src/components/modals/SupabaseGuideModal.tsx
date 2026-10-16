import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Copy,
  Check,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Layers,
  HardDrive,
  UploadCloud,
  DownloadCloud,
  Key,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  FileCheck,
} from 'lucide-react';
import {
  SUPABASE_SQL_SCHEMA,
  VAULT_SECTIONS_SPECIFICATION,
  PROXMOX_SETUP_GUIDE_STEPS,
} from '../../data/supabaseSchema.ts';
import {
  getClientConfig,
  saveClientConfig,
  cleanSupabaseUrl,
  testSupabaseConnection,
  pushVaultToSupabase,
  pullVaultFromSupabase,
} from '../../services/supabaseClient.ts';
import type { VaultState } from '../../types/vault.ts';

interface SupabaseGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  vault: VaultState;
  onUpdateVault: (newVault: VaultState) => void;
  showToast: (msg: string) => void;
}

export const SupabaseGuideModal: React.FC<SupabaseGuideModalProps> = ({
  isOpen,
  onClose,
  vault,
  onUpdateVault,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'revamp' | 'specs'>('sync');
  const [copiedSql, setCopiedSql] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState(
    typeof window !== 'undefined' && window.location.hostname.includes('puppylab.cc')
      ? 'https://sup.puppylab.cc'
      : 'http://100.81.91.59:8000'
  );
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    message: string;
    checked: boolean;
  }>({
    connected: false,
    message: '',
    checked: false,
  });
  const [isChecking, setIsChecking] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  useEffect(() => {
    if (isOpen) {
      getClientConfig().then((cfg) => {
        if (cfg.url) {
          setSupabaseUrl(cfg.url);
        }
        if (cfg.anonKey) {
          setSupabaseAnonKey(cfg.anonKey);
        }
        if (cfg.url && cfg.anonKey) {
          handleTestConnection(cfg.url, cfg.anonKey);
        } else {
          setConnectionStatus({
            connected: false,
            message: 'Anon key is missing. Paste your Anon Key below and click "Save & Re-test".',
            checked: true,
          });
        }
      });
    }
  }, [isOpen]);

  const handleTestConnection = async (targetUrl?: string, targetKey?: string) => {
    const urlToTest = cleanSupabaseUrl(targetUrl || supabaseUrl);
    const keyToTest = (targetKey !== undefined ? targetKey : supabaseAnonKey).trim();

    if (!urlToTest) {
      setConnectionStatus({
        connected: false,
        message: 'Please enter a valid Supabase URL.',
        checked: true,
      });
      return;
    }

    if (!keyToTest) {
      setConnectionStatus({
        connected: false,
        message: 'Anon Key is empty. Paste your public anon key below and click "Save & Re-test".',
        checked: true,
      });
      return;
    }

    setIsChecking(true);
    const result = await testSupabaseConnection({ url: urlToTest, anonKey: keyToTest });
    setIsChecking(false);
    setConnectionStatus({
      connected: result.ok,
      message: result.message,
      checked: true,
    });
  };

  const handleSaveConfig = () => {
    const cleanUrl = cleanSupabaseUrl(supabaseUrl);
    const cleanKey = (supabaseAnonKey || '').trim();

    if (!cleanUrl) {
      showToast('Please enter your Supabase URL (e.g. https://sup.puppylab.cc)');
      return;
    }
    if (!cleanKey) {
      showToast('Please paste your Supabase anon key');
      return;
    }

    saveClientConfig(cleanUrl, cleanKey);
    showToast('Saved Supabase configuration to local storage!');
    handleTestConnection(cleanUrl, cleanKey);
  };

  const handlePushData = async () => {
    const cleanUrl = cleanSupabaseUrl(supabaseUrl);
    const cleanKey = (supabaseAnonKey || '').trim();

    if (!cleanKey) {
      showToast('Please paste your Supabase Anon Key first.');
      setConnectionStatus({
        connected: false,
        message: 'Anon Key missing: Please paste your Supabase Anon Key in Connection Parameters below and click "Save & Re-test".',
        checked: true,
      });
      return;
    }

    setIsPushing(true);
    saveClientConfig(cleanUrl, cleanKey);
    const res = await pushVaultToSupabase(vault, { url: cleanUrl, anonKey: cleanKey });
    setIsPushing(false);
    if (res.success) {
      showToast('All family vault data successfully pushed to Supabase!');
      setConnectionStatus({
        connected: true,
        message: 'All sections populated with records in Supabase.',
        checked: true,
      });
    } else {
      showToast(`Push failed: ${res.message}`);
      setConnectionStatus({
        connected: false,
        message: `Push failed: ${res.message}`,
        checked: true,
      });
    }
  };

  const handlePullData = async () => {
    const cleanUrl = cleanSupabaseUrl(supabaseUrl);
    const cleanKey = (supabaseAnonKey || '').trim();

    if (!cleanUrl || !cleanKey) {
      showToast('Please enter your Supabase URL and Anon Key first.');
      return;
    }

    setIsPulling(true);
    saveClientConfig(cleanUrl, cleanKey);
    const res = await pullVaultFromSupabase({ url: cleanUrl, anonKey: cleanKey });
    setIsPulling(false);
    if (res.success && res.data) {
      onUpdateVault(res.data);
      showToast('Successfully refreshed vault from Supabase database!');
      setConnectionStatus({
        connected: true,
        message: 'Successfully pulled latest records from Supabase.',
        checked: true,
      });
    } else {
      showToast(`Pull failed: ${res.message || 'Could not fetch data'}`);
      setConnectionStatus({
        connected: false,
        message: `Pull failed: ${res.message || 'Could not fetch data'}`,
        checked: true,
      });
    }
  };

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([SUPABASE_SQL_SCHEMA], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'kutumbvault_revamp_schema.sql');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        role="dialog"
        aria-modal="true"
        aria-label="Supabase Database Center"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Supabase Database Integration & Sync</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Cloudflare Tunnel / Proxmox
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Self-hosted Supabase @ Ubuntu VM &bull; Connected via https://sup.puppylab.cc
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Bar */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-slate-700">Database Status:</span>
            {connectionStatus.connected ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md font-semibold border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Connected to Supabase
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md font-semibold border border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                {connectionStatus.checked ? 'Not Connected' : 'Checking connection...'}
              </span>
            )}
            <span className="font-mono text-slate-500 text-[11px] truncate max-w-[260px]">
              {supabaseUrl}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isChecking}
              onClick={() => handleTestConnection(supabaseUrl, supabaseAnonKey)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-6 pt-2 gap-2 text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`px-4 py-2 rounded-t-lg border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'sync'
                ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs font-bold'
                : 'border-transparent hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>Sync Center (Push & Pull)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('revamp')}
            className={`px-4 py-2 rounded-t-lg border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'revamp'
                ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs font-bold'
                : 'border-transparent hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <HardDrive className="w-4 h-4" />
            <span>Master Revamp SQL Script</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('specs')}
            className={`px-4 py-2 rounded-t-lg border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'specs'
                ? 'bg-white text-indigo-700 border-indigo-600 shadow-2xs font-bold'
                : 'border-transparent hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Sections & Doc Hosting Specs (11)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {activeTab === 'sync' && (
            <>
              {/* Intelligent Real-Time Sync Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 text-slate-800 space-y-3.5">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-emerald-600" />
                      Two-Way Supabase Synchronization
                    </h3>
                    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-bold bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-full border border-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                      Automatic Real-Time Field Sync Active
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate-600 mt-1">
                    Whenever you edit any field in the application, the app automatically makes intelligent routing decisions to update the corresponding table in Supabase. The two manual options below serve as your instant manual fallback.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {/* Option 1: Manual Full Push */}
                  <div className="p-3.5 bg-white rounded-xl border border-emerald-300 shadow-2xs flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-bold text-xs text-emerald-950">
                        <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold">1</span>
                        <span>Option 1: Push All Data to Supabase</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1.5">
                        Populates all current application records across all 11 sections directly into your Supabase PostgreSQL database tables.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isPushing}
                      onClick={handlePushData}
                      className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-2xs"
                    >
                      <UploadCloud className={`w-4 h-4 ${isPushing ? 'animate-bounce' : ''}`} />
                      <span>{isPushing ? 'Pushing All 11 Sections...' : 'Push All Data from App to Supabase'}</span>
                    </button>
                  </div>

                  {/* Option 2: Fetch Latest */}
                  <div className="p-3.5 bg-white rounded-xl border border-indigo-300 shadow-2xs flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-bold text-xs text-indigo-950">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold">2</span>
                        <span>Option 2: Fetch Latest from Supabase</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1.5">
                        Fetches the latest database records from your home server and reloads the browser application state.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isPulling}
                      onClick={handlePullData}
                      className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all shadow-2xs"
                    >
                      <DownloadCloud className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
                      <span>{isPulling ? 'Fetching Latest Records...' : 'Fetch Latest from Supabase'}</span>
                    </button>
                  </div>
                </div>

                {connectionStatus.message && (
                  <div className="text-[11px] font-mono text-slate-800 bg-white/90 p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    {connectionStatus.message}
                  </div>
                )}
              </div>

              {/* Connection Details Config Box */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-indigo-600" />
                    Connection Parameters (Cloudflare Tunnel / Direct HTTPS)
                  </h3>
                  <span className="text-[10px] font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-semibold">
                    Local Storage Override
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Supabase Public URL
                    </label>
                    <input
                      type="text"
                      value={supabaseUrl}
                      onChange={(e) => setSupabaseUrl(e.target.value)}
                      placeholder="https://sup.puppylab.cc"
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Must route to your Ubuntu Supabase instance (Kong port 8000).
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-semibold text-slate-700">
                        Supabase Anon / Public Key
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-semibold"
                      >
                        {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showKey ? 'Hide Key' : 'Reveal Key'}</span>
                      </button>
                    </div>
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={supabaseAnonKey}
                      onChange={(e) => setSupabaseAnonKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      JWT token starting with <code className="bg-slate-100 px-1 rounded">eyJhbGciOi...</code>
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-slate-600">
                    Need your key? Open{' '}
                    <a
                      href="https://sup.puppylab.cc/project/default/settings/api"
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 font-semibold underline inline-flex items-center gap-0.5"
                    >
                      Supabase Project API Settings <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Configuration & Re-test</span>
                  </button>
                </div>
              </div>
            </>
          )}

          {activeTab === 'revamp' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-indigo-600" />
                    How to Revamp Your Database in 1 Step
                  </h3>
                  <a
                    href="https://sup.puppylab.cc/project/default/sql"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-2xs"
                  >
                    <span>Open Supabase SQL Editor</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
                <p className="text-[11.5px] text-slate-600 leading-relaxed">
                  This master script cleanly drops any mismatched or incomplete tables, recreates all <strong>11 dedicated tables</strong> with exact columns, sets up the <strong>vault_documents</strong> storage bucket for document hosting, enables RLS, creates compatibility views, and notifies PostgREST to reload its schema cache.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy Master Revamp SQL'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSql}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .sql File</span>
                  </button>
                </div>
              </div>

              {/* Steps Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PROXMOX_SETUP_GUIDE_STEPS.map((step) => (
                  <div key={step.step} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10.5px] font-bold">
                        {step.step}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs">{step.title}</h4>
                    </div>
                    <p className="text-[10.5px] text-slate-500">{step.description}</p>
                  </div>
                ))}
              </div>

              {/* SQL Code View */}
              <div className="relative">
                <div className="flex items-center justify-between p-2 bg-slate-800 text-slate-300 rounded-t-xl text-[11px] font-mono px-4">
                  <span>kutumbvault_revamp_schema.sql</span>
                  <span className="text-[10px] text-slate-400">PostgreSQL (11 Tables + Storage Bucket)</span>
                </div>
                <pre className="p-4 bg-slate-900 text-emerald-300 rounded-b-xl font-mono text-[11px] overflow-x-auto max-h-72 leading-relaxed">
                  {SUPABASE_SQL_SCHEMA}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'specs' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2 mb-1">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  Frontend Section & Document Hosting Review
                </h3>
                <p className="text-[11px] text-slate-600">
                  Here is the architectural review of all 11 sections in KutumbVault, their dedicated table names, expected column fields, and document hosting requirements.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {VAULT_SECTIONS_SPECIFICATION.map((spec) => (
                  <div
                    key={spec.sectionKey}
                    className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 transition-colors space-y-2 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          {spec.title}
                        </h4>
                        <code className="text-[11px] text-indigo-700 font-mono font-semibold">
                          {spec.tableName}
                        </code>
                      </div>
                      <div className="flex items-center gap-1">
                        {spec.needsDocHosting && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            Storage Bucket
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {spec.columns.length} columns
                        </span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500">{spec.description}</p>

                    <div className="pt-1.5 border-t border-slate-100">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                        Expected Columns:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {spec.columns.map((c) => (
                          <span
                            key={c.name}
                            className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                              c.isPrimary
                                ? 'bg-indigo-100 text-indigo-800 font-bold'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                            title={`${c.name} (${c.type}) - ${c.description}`}
                          >
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            KutumbVault &bull; End-to-end family privacy running against your personal home cloud.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg shadow-2xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
