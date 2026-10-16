import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  Copy,
  Check,
  Download,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Layers,
  HardDrive,
  Terminal,
  UploadCloud,
  DownloadCloud,
  Key,
  Eye,
  EyeOff,
  ExternalLink,
} from 'lucide-react';
import { SUPABASE_SQL_SCHEMA, PROXMOX_SETUP_GUIDE_STEPS } from '../../data/supabaseSchema.ts';
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
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

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
    message: 'Checking Supabase connection...',
    checked: false,
  });

  // Load config on mount/open
  useEffect(() => {
    if (isOpen) {
      getClientConfig().then((cfg) => {
        if (cfg.url) setSupabaseUrl(cfg.url);
        if (cfg.anonKey) setSupabaseAnonKey(cfg.anonKey);

        if (cfg.url && cfg.anonKey) {
          handleTestConnection(cfg.url, cfg.anonKey);
        } else {
          setConnectionStatus({
            connected: false,
            message: !cfg.anonKey
              ? 'Anon Key required: Enter your Supabase Anon Key in Connection Parameters below.'
              : 'Testing connection...',
            checked: true,
          });
        }
      });
    }
  }, [isOpen]);

  const handleTestConnection = async (urlToTest?: string, keyToTest?: string) => {
    setIsChecking(true);
    const targetUrl = urlToTest !== undefined ? urlToTest : supabaseUrl;
    const targetKey = keyToTest !== undefined ? keyToTest : supabaseAnonKey;

    if (targetUrl) {
      saveClientConfig(targetUrl, targetKey || '');
    }

    const res = await testSupabaseConnection({ url: targetUrl, anonKey: targetKey });
    setConnectionStatus({
      connected: res.ok,
      message: res.message,
      checked: true,
    });
    setIsChecking(false);
  };

  const handleSaveConfig = async () => {
    const cleanUrl = cleanSupabaseUrl(supabaseUrl);
    const cleanKey = (supabaseAnonKey || '').trim();

    if (!cleanUrl) {
      showToast('Please enter your Supabase URL (e.g. https://sup.puppylab.cc)');
      return;
    }
    if (!cleanKey) {
      showToast('Please paste your Supabase Anon Key');
      return;
    }

    saveClientConfig(cleanUrl, cleanKey);
    await handleTestConnection(cleanUrl, cleanKey);
    showToast('Supabase configuration saved & tested!');
  };

  const handlePushData = async () => {
    const cleanUrl = cleanSupabaseUrl(supabaseUrl);
    const cleanKey = (supabaseAnonKey || '').trim();

    if (!cleanUrl) {
      showToast('Please enter your Supabase URL (e.g. https://sup.puppylab.cc)');
      return;
    }
    if (!cleanKey) {
      showToast('Please paste your Supabase Anon Key in Connection Parameters below first!');
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
      showToast('All family data successfully pushed to Supabase!');
      setConnectionStatus({
        connected: true,
        message: 'All 10 sections populated with records in Supabase.',
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
    link.setAttribute('download', 'kutumbvault_supabase_schema.sql');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const envSample = `# Set in your server environment / .env
SUPABASE_URL="${supabaseUrl}"
SUPABASE_ANON_KEY="${supabaseAnonKey ? `${supabaseAnonKey.slice(0, 15)}...` : 'eyJhbGciOi...'}"`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envSample);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div
        className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-label="Supabase Proxmox Setup Guide"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Supabase Database Integration</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Tailscale LAN
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Self-hosted on Ubuntu VM @ Proxmox (Bangalore) &bull; Connected via Tailscale
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
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-slate-700">Status:</span>
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
            <span className="font-mono text-slate-500 text-[11px] truncate max-w-[240px]">
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Action Center: Push / Pull */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-emerald-600" />
                  Synchronize Data with Your Supabase Instance
                </h3>
                <p className="text-[11px] text-emerald-800 mt-0.5">
                  Now that your SQL tables are created, push your sheet's family data into Supabase, or pull any updates back.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                disabled={isPushing}
                onClick={handlePushData}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm hover:shadow"
              >
                <UploadCloud className={`w-4 h-4 ${isPushing ? 'animate-bounce' : ''}`} />
                <span>{isPushing ? 'Pushing Records...' : 'Push All Initial Data to Supabase'}</span>
              </button>

              <button
                type="button"
                disabled={isPulling}
                onClick={handlePullData}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-all shadow-2xs"
              >
                <DownloadCloud className={`w-4 h-4 ${isPulling ? 'animate-bounce' : ''}`} />
                <span>{isPulling ? 'Fetching...' : 'Fetch Latest from Supabase'}</span>
              </button>
            </div>
            {connectionStatus.message && (
              <div className="text-[11px] font-mono text-emerald-900 bg-white/70 p-2 rounded border border-emerald-200/60">
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
                Client-to-Supabase
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Supabase Backend URL
                </label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://sup.puppylab.cc"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Cloudflare Tunnel domain routing to your Ubuntu Supabase instance.
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
                    className="text-[10px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                  >
                    {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showKey ? 'Hide' : 'Reveal'}</span>
                  </button>
                </div>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={supabaseAnonKey}
                  onChange={(e) => setSupabaseAnonKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Safe public key for PostgREST & Kong. Saved locally in your browser.
                </span>
              </div>
            </div>

            {/* Quick Helper for finding Anon Key */}
            <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-amber-800">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                Where to get your Supabase Anon Key:
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[10.5px] text-amber-900">
                <li>
                  <strong>From Studio UI:</strong> Open{' '}
                  <a
                    href="https://sup.puppylab.cc/project/default/settings/api"
                    target="_blank"
                    rel="noreferrer"
                    className="underline text-indigo-700 font-mono inline-flex items-center gap-0.5"
                  >
                    https://sup.puppylab.cc/project/default/settings/api <ExternalLink className="w-2.5 h-2.5" />
                  </a>{' '}
                  &rarr; copy the <strong>anon / public</strong> key.
                </li>
                <li>
                  <strong>From Ubuntu Terminal:</strong> Run{' '}
                  <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono text-amber-950">
                    cat /opt/kutumbvault/docker/.env | grep ANON_KEY
                  </code>
                </li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Configuration & Re-test</span>
              </button>
            </div>
          </div>

          {/* Section Tables Summary */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-600" />
              Created Tables in Supabase:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { name: 'family_members', desc: 'Couples, children, dependent parents' },
                { name: 'important_contacts', desc: 'Doctors, lawyers, CA, HR, Mom' },
                { name: 'financial_documents', desc: '19 IDs + locations & expiry notes' },
                { name: 'online_accounts', desc: 'Zerodha, Golden Pi, Wint Wealth, CDSL' },
                { name: 'insurance_policies', desc: 'Life, health floater, motor policies' },
                { name: 'locker_details', desc: 'Bank safe deposit lockers & keys' },
                { name: 'card_details', desc: 'Debit and credit cards' },
                { name: 'property_details', desc: 'Real estate deeds & area records' },
                { name: 'liability_details', desc: 'Bank loans, EMIs, and terms' },
                { name: 'online_passwords', desc: 'Emergency access trustees & 2FA' },
              ].map((tbl) => (
                <div key={tbl.name} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <code className="font-mono font-bold text-indigo-700 block">{tbl.name}</code>
                  <span className="text-[11px] text-slate-500">{tbl.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SQL Reference Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-emerald-600" />
                SQL Schema Reference
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadSql}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .sql</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? 'Copied!' : 'Copy SQL'}</span>
                </button>
              </div>
            </div>

            <div className="relative">
              <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48 leading-relaxed">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            </div>
          </div>
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
