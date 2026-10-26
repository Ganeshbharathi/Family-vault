import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { VaultState, DocumentAttachment } from './types.ts';
import { INITIAL_VAULT_DATA } from './initialData.ts';

const STORAGE_URL_KEY = 'kutumb_supabase_url';
const STORAGE_ANON_KEY = 'kutumb_supabase_anon_key';

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export function cleanSupabaseUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  url = url.replace(/\/+$/, '');
  // Strip /project/default or /project/* if user pasted the Studio UI link
  url = url.replace(/\/project\/[a-zA-Z0-9_-]+$/, '');
  url = url.replace(/\/project$/, '');
  return url;
}

export async function getClientConfig(): Promise<{ url: string; anonKey: string }> {
  // Check local storage overrides first
  const localUrl = localStorage.getItem(STORAGE_URL_KEY);
  const localKey = localStorage.getItem(STORAGE_ANON_KEY);
  if (localUrl && localKey) {
    return { url: cleanSupabaseUrl(localUrl), anonKey: localKey.trim() };
  }

  // Check Vite build-time environment variables (e.g. set in Cloudflare Pages / GitHub Actions)
  const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
  const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  if (envUrl && envKey) {
    return {
      url: cleanSupabaseUrl(localUrl || envUrl),
      anonKey: (localKey || envKey).trim(),
    };
  }

  // Determine smart default URL based on current host
  const isPuppylabHost = typeof window !== 'undefined' && (
    window.location.hostname.includes('puppylab.cc') ||
    window.location.hostname === 'vault.puppylab.cc'
  );
  const defaultUrl = isPuppylabHost ? 'https://sup.puppylab.cc' : 'http://100.81.91.59:8000';

  // Fetch from server /api/config if hosted with Express
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      return {
        url: cleanSupabaseUrl(localUrl || envUrl || data.supabaseUrl || defaultUrl),
        anonKey: (localKey || envKey || data.supabaseAnonKey || '').trim(),
      };
    }
  } catch {
    // Statically hosted (GitHub Pages, Cloudflare Pages, etc.)
  }

  return {
    url: cleanSupabaseUrl(localUrl || envUrl || defaultUrl),
    anonKey: (localKey || envKey || '').trim(),
  };
}

export function saveClientConfig(url: string, anonKey: string) {
  const cleanedUrl = cleanSupabaseUrl(url);
  const cleanedKey = (anonKey || '').trim();
  if (cleanedUrl) localStorage.setItem(STORAGE_URL_KEY, cleanedUrl);
  if (cleanedKey) localStorage.setItem(STORAGE_ANON_KEY, cleanedKey);
  cachedClient = null; // reset client to re-init
  cachedUrl = '';
  cachedKey = '';
}

export async function getSupabaseClient(customConfig?: { url?: string; anonKey?: string }): Promise<SupabaseClient | null> {
  let targetUrl = '';
  let targetKey = '';

  if (customConfig?.url && customConfig?.anonKey) {
    targetUrl = cleanSupabaseUrl(customConfig.url);
    targetKey = customConfig.anonKey.trim();
  } else {
    const cfg = await getClientConfig();
    targetUrl = cfg.url;
    targetKey = cfg.anonKey;
  }

  if (!targetUrl || !targetKey) {
    return null;
  }

  if (cachedClient && cachedUrl === targetUrl && cachedKey === targetKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(targetUrl, targetKey, {
      auth: { persistSession: false },
    });
    cachedUrl = targetUrl;
    cachedKey = targetKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize browser Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(customConfig?: { url?: string; anonKey?: string }): Promise<{
  ok: boolean;
  message: string;
  tableCount?: number;
}> {
  if (customConfig?.url && customConfig?.anonKey) {
    saveClientConfig(customConfig.url, customConfig.anonKey);
  }

  const { url, anonKey } = customConfig?.url && customConfig?.anonKey
    ? { url: cleanSupabaseUrl(customConfig.url), anonKey: customConfig.anonKey.trim() }
    : await getClientConfig();

  if (!url) {
    return {
      ok: false,
      message: 'Supabase URL is missing. Enter https://sup.puppylab.cc below.',
    };
  }
  if (!anonKey) {
    return {
      ok: false,
      message: 'Supabase Anon Key is missing. Paste your Anon Key in Connection Parameters below and click Save.',
    };
  }

  const client = await getSupabaseClient({ url, anonKey });
  if (!client) {
    return {
      ok: false,
      message: 'Failed to initialize Supabase client. Check URL and Anon Key.',
    };
  }

  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isTargetHttp = url.startsWith('http://');

  try {
    // Try querying family_members table
    const { data, error } = await client.from('family_members').select('id').limit(1);
    if (error) {
      if (error.code === 'PGRST301' || error.message.toLowerCase().includes('jwt') || error.message.toLowerCase().includes('apikey')) {
        return {
          ok: false,
          message: `Authentication error: ${error.message}. Double-check that your Anon Key is correct.`,
        };
      }
      if (error.message.includes('relation "family_members" does not exist') || error.message.includes('relation "public.family_members" does not exist')) {
        return {
          ok: false,
          message: 'Connected to Supabase, but SQL tables do not exist yet! Click "SQL Schema Reference" -> Copy SQL and run it in Supabase SQL Editor.',
        };
      }
      return {
        ok: false,
        message: `Supabase query error: ${error.message}`,
      };
    }

    return {
      ok: true,
      message: `Connected successfully to ${url}! Table 'family_members' is accessible.`,
    };
  } catch (err: any) {
    if (isHttps && isTargetHttp) {
      return {
        ok: false,
        message: 'Browser blocked connection (Mixed Content: HTTPS app calling HTTP Supabase). Use https://sup.puppylab.cc.',
      };
    }
    return {
      ok: false,
      message: `Network error reaching ${url}: ${err.message || 'CORS / unreachable'}. Verify your Cloudflare Tunnel is running and pointing to port 8000.`,
    };
  }
}

// Section table mapping configuration directly targeting the 11 primary tables
export const SECTION_TABLE_MAPPINGS = {
  familyMembers: ['family_members'],
  contacts: ['important_contacts'],
  documents: ['financial_documents'],
  onlineAccounts: ['online_accounts'],
  investments: ['investment_accounts'],
  insurances: ['insurance_policies'],
  lockers: ['safe_lockers'],
  cards: ['bank_cards'],
  properties: ['properties'],
  liabilities: ['liabilities'],
  passwords: ['online_passwords'],
} as const;

export type SyncSectionKey = keyof typeof SECTION_TABLE_MAPPINGS;

/**
 * Smart upsert with candidate table names and column adaptability.
 * Automatically detects missing column errors from Supabase/PostgREST
 * and strips them in-flight so partial or legacy schemas never fail!
 */
async function smartUpsert(
  client: SupabaseClient,
  tableCandidates: readonly string[],
  rows: Record<string, any>[]
): Promise<{ success: boolean; tableName: string; message: string; error?: string }> {
  if (!rows || rows.length === 0) {
    return { success: true, tableName: tableCandidates[0], message: '0 rows (empty)' };
  }

  let lastError = '';

  for (const table of tableCandidates) {
    let currentRows = rows.map((r) => ({ ...r }));
    const strippedCols: string[] = [];
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      attempts++;
      const { error } = await client.from(table).upsert(currentRows);

      if (!error) {
        const note = strippedCols.length > 0 ? ` (omitted unmapped: ${strippedCols.join(', ')})` : '';
        return {
          success: true,
          tableName: table,
          message: `${rows.length} rows synced to ${table}${note}`,
        };
      }

      lastError = error.message;

      // 1. Table missing in schema cache -> break and try next candidate
      const isTableMissing =
        error.message.includes('Could not find the table') ||
        error.message.includes('relation') ||
        (error as any).code === '42P01' ||
        (error as any).code === 'PGRST205';

      if (isTableMissing) {
        break;
      }

      // 2. Missing column in schema cache
      const colMatch =
        error.message.match(/Could not find the ['"]?([a-zA-Z0-9_]+)['"]? column/i) ||
        error.message.match(/column ['"]?([a-zA-Z0-9_]+)['"]? of relation/i) ||
        error.message.match(/column ['"]?([a-zA-Z0-9_]+)['"]? does not exist/i);

      if (colMatch && colMatch[1]) {
        const missingCol = colMatch[1];
        strippedCols.push(missingCol);
        currentRows = currentRows.map((r) => {
          const copy = { ...r };
          delete copy[missingCol];
          delete copy[missingCol.toLowerCase()];
          return copy;
        });
        continue; // Retry with stripped column
      }

      // 3. Fallback for card variations
      if (table === 'bank_cards' || table === 'card_details') {
        currentRows = currentRows.map((r) => ({
          ...r,
          card_number: r.card_number || r.cardNumber || r.cardnumber || '',
          cardnumber: r.card_number || r.cardNumber || r.cardnumber || '',
        }));
      }

      // Non-recoverable error for this candidate
      break;
    }
  }

  return {
    success: false,
    tableName: tableCandidates[0],
    message: `Error: ${lastError}`,
    error: lastError,
  };
}

/**
 * Query table with candidate fallbacks and optional ordering
 */
async function smartSelect(
  client: SupabaseClient,
  tableCandidates: readonly string[],
  orderCol?: string
): Promise<{ data: any[] | null; tableName?: string }> {
  for (const table of tableCandidates) {
    try {
      let query = client.from(table).select('*');
      if (orderCol) {
        query = query.order(orderCol, { ascending: true });
      }
      let res = await query;
      // If ordering failed because orderCol doesn't exist, retry unordered
      if (res.error && orderCol) {
        res = await client.from(table).select('*');
      }
      if (!res.error && res.data) {
        return { data: res.data, tableName: table };
      }
    } catch {
      // try next candidate
    }
  }
  return { data: null };
}

/**
 * Transform front-end objects to database rows for a specific section
 */
export function transformSectionToRows(section: SyncSectionKey, items: any[]): Record<string, any>[] {
  switch (section) {
    case 'familyMembers':
      return items.map((m) => ({
        id: m.id,
        category: m.category,
        name: m.name,
        relationship: m.relationship,
        notes: m.notes || '',
      }));

    case 'contacts':
      return items.map((c) => ({
        id: c.id,
        sr_no: c.srNo,
        particulars: c.particulars,
        name: c.name || '',
        dob: c.dob || '',
        mobile: c.mobile || '',
        email: c.email || '',
        address: c.address || '',
        remarks: c.remarks || '',
      }));

    case 'documents':
      return items.map((d) => ({
        id: d.id,
        sr_no: d.srNo,
        document_name: d.documentName,
        document_number: d.documentNumber || '',
        physical_location: d.physicalLocation || '',
        virtual_location: d.virtualLocation || '',
        remarks: d.remarks || '',
        expiry_date: d.expiryDate || '',
        status_note: d.statusNote || '',
        person_tag: d.personTag || 'Self',
        tags: d.tags || [],
        attachment_id: d.attachment?.id || null,
        attachment_file_name: d.attachment?.fileName || null,
        attachment_original_name: d.attachment?.originalName || null,
        attachment_file_size: d.attachment?.fileSize || null,
        attachment_mime_type: d.attachment?.mimeType || null,
        attachment_storage_path: d.attachment?.storagePath || null,
        attachment_file_url: d.attachment?.fileUrl || null,
        attachment_uploaded_at: d.attachment?.uploadedAt || null,
      }));

    case 'onlineAccounts':
      return items.map((o) => ({
        id: o.id,
        sr_no: o.srNo,
        platform: o.platform,
        email: o.email,
        mobile: o.mobile || '',
        account_id: o.accountId || '',
        remarks: o.remarks || '',
      }));

    case 'investments':
      return items.map((i) => ({
        id: i.id,
        sr_no: i.srNo,
        investment_type: i.investmentType,
        platform: i.platform,
        account_holder_name: i.accountHolderName,
        agent_or_advisor: i.agentOrAdvisor || '',
        account_number: i.accountNumber,
        nominee: i.nominee || '',
        maturity_date: i.maturityDate || '',
        linked_bank: i.linkedBank || '',
        reg_mobile: i.regMobile || '',
        reg_email: i.regEmail || '',
        remarks: i.remarks || '',
      }));

    case 'insurances':
      return items.map((p) => ({
        id: p.id,
        sr_no: p.srNo,
        type: p.type,
        policy_name: p.policyName,
        policy_number: p.policyNumber,
        covered_person: p.coveredPerson || '',
        amount_insured: p.amountInsured || '',
        nominee: p.nominee || '',
        advisor: p.advisor || '',
        valid_till: p.validTill || '',
        premium_amount: p.premiumAmount || '',
        premium_due_date: p.premiumDueDate || '',
        remarks: p.remarks || '',
      }));

    case 'lockers':
      return items.map((l) => ({
        id: l.id,
        sr_no: l.srNo,
        bank_and_branch: l.bankAndBranch,
        account_number: l.accountNumber || '',
        locker_number: l.lockerNumber,
        in_name_of: l.inNameOf || '',
        nominee: l.nominee || '',
        code_or_remarks: l.codeOrRemarks || '',
      }));

    case 'cards':
      return items.map((c) => ({
        id: c.id,
        sr_no: c.srNo,
        name_on_card: c.nameOnCard,
        card_type: c.cardType,
        cardnumber: c.cardNumber || '',
        card_number: c.cardNumber || '',
        linked_account: c.linkedAccount || '',
        reg_mobile: c.regMobile || '',
        valid_till: c.validTill || '',
        remarks: c.remarks || '',
      }));

    case 'properties':
      return items.map((p) => ({
        id: p.id,
        sr_no: p.srNo,
        property_name: p.propertyName,
        property_area: p.propertyArea || '',
        owners: p.owners || '',
        registration_number: p.registrationNumber || '',
        nominee: p.nominee || '',
        remarks: p.remarks || '',
      }));

    case 'liabilities':
      return items.map((l) => ({
        id: l.id,
        sr_no: l.srNo,
        bank_or_lender: l.bankOrLender,
        liability_type: l.liabilityType,
        amount: l.amount,
        terms: l.terms || '',
        remarks: l.remarks || '',
      }));

    case 'passwords':
      return items.map((w) => ({
        id: w.id,
        sr_no: w.srNo,
        login_kind: w.loginKind,
        person_aware: w.personAware,
        remarks: w.remarks || '',
        instructions: w.instructions || '',
      }));

    default:
      return [];
  }
}

/**
 * Automatically sync a single section to Supabase in the background
 */
export async function syncSectionToSupabase(
  section: SyncSectionKey,
  items: any[]
): Promise<{ success: boolean; message: string; tableName?: string }> {
  const client = await getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase client not configured.' };
  }

  const candidates = SECTION_TABLE_MAPPINGS[section];
  const rows = transformSectionToRows(section, items);
  const result = await smartUpsert(client, candidates, rows);

  return {
    success: result.success,
    message: result.message,
    tableName: result.tableName,
  };
}

/**
 * Automatically sync a single record modification to Supabase
 */
export async function syncSingleRecord(
  section: SyncSectionKey,
  record: any
): Promise<{ success: boolean; message: string }> {
  // 1. Try direct browser Supabase client
  const client = await getSupabaseClient();
  if (client) {
    const candidates = SECTION_TABLE_MAPPINGS[section];
    const rows = transformSectionToRows(section, [record]);
    const result = await smartUpsert(client, candidates, rows);
    if (result.success) {
      return {
        success: true,
        message: result.message,
      };
    }
  }

  // 2. Fallback via server API proxy
  if (section === 'contacts') {
    try {
      const res = await fetch('/api/contacts/sync-row', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (res.ok) {
        return { success: true, message: `Contact synced to Supabase via server` };
      }
    } catch {
      // server offline
    }
  }

  return { success: false, message: 'Supabase client not configured or unreachable.' };
}

/**
 * Automatically delete a single record from Supabase
 */
export async function deleteSingleRecord(
  section: SyncSectionKey,
  recordId: string
): Promise<{ success: boolean; message: string }> {
  // 1. Try direct browser Supabase client
  const client = await getSupabaseClient();
  if (client) {
    const candidates = SECTION_TABLE_MAPPINGS[section];
    for (const table of candidates) {
      const { error } = await client.from(table).delete().eq('id', recordId);
      if (!error) {
        return { success: true, message: `Record deleted from ${table}` };
      }
    }
  }

  // 2. Fallback via server API proxy
  if (section === 'contacts') {
    try {
      const res = await fetch(`/api/contacts/${encodeURIComponent(recordId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        return { success: true, message: 'Record deleted from Supabase via server' };
      }
    } catch {
      // server offline
    }
  }

  return { success: false, message: 'Failed to delete record from Supabase' };
}

/**
 * Push all vault data directly to Supabase tables (Full sync fallback)
 */
export async function pushVaultToSupabase(
  vault: VaultState,
  customConfig?: { url?: string; anonKey?: string }
): Promise<{
  success: boolean;
  message: string;
  details?: Record<string, string>;
}> {
  if (customConfig?.url && customConfig?.anonKey) {
    saveClientConfig(customConfig.url, customConfig.anonKey);
  }

  const cfg = customConfig?.url && customConfig?.anonKey
    ? { url: cleanSupabaseUrl(customConfig.url), anonKey: customConfig.anonKey.trim() }
    : await getClientConfig();

  if (!cfg.url) {
    return {
      success: false,
      message: 'Supabase URL is missing. Please set your Supabase URL (e.g. https://sup.puppylab.cc) in the modal.',
    };
  }
  if (!cfg.anonKey) {
    return {
      success: false,
      message: 'Supabase Anon Key is missing. Please paste your anon key in Connection Parameters and click Save.',
    };
  }

  const client = await getSupabaseClient(cfg);
  if (!client) {
    return {
      success: false,
      message: `Could not initialize Supabase client for ${cfg.url}. Please verify URL and Anon Key.`,
    };
  }

  const results: Record<string, string> = {};

  try {
    const sectionsToSync: Array<{ key: SyncSectionKey; label: string; items: any[] }> = [
      { key: 'familyMembers', label: 'family_members', items: vault.familyMembers || [] },
      { key: 'contacts', label: 'important_contacts', items: vault.contacts || [] },
      { key: 'documents', label: 'financial_documents', items: vault.documents || [] },
      { key: 'onlineAccounts', label: 'online_accounts', items: vault.onlineAccounts || [] },
      { key: 'investments', label: 'investment_accounts', items: vault.investments || [] },
      { key: 'insurances', label: 'insurance_policies', items: vault.insurances || [] },
      { key: 'lockers', label: 'locker_details', items: vault.lockers || [] },
      { key: 'cards', label: 'card_details', items: vault.cards || [] },
      { key: 'properties', label: 'property_details', items: vault.properties || [] },
      { key: 'liabilities', label: 'liability_details', items: vault.liabilities || [] },
      { key: 'passwords', label: 'online_passwords', items: vault.passwords || [] },
    ];

    for (const sec of sectionsToSync) {
      if (sec.items.length > 0) {
        const candidates = SECTION_TABLE_MAPPINGS[sec.key];
        const rows = transformSectionToRows(sec.key, sec.items);
        const res = await smartUpsert(client, candidates, rows);
        results[res.tableName || sec.label] = res.message;
      }
    }

    const errorEntries = Object.entries(results).filter(([_, msg]) => msg.startsWith('Error:'));
    if (errorEntries.length > 0) {
      const errorList = errorEntries.map(([tbl, msg]) => `${tbl}: ${msg}`).join('; ');
      return {
        success: false,
        message: `Failed to push: ${errorList}`,
        details: results,
      };
    }

    return {
      success: true,
      message: 'All sections pushed to Supabase successfully!',
      details: results,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to push data: ${err.message}`,
      details: results,
    };
  }
}

/**
 * Fetch all vault data from Supabase tables (Pull Latest from DB)
 */
export async function pullVaultFromSupabase(
  customConfig?: { url?: string; anonKey?: string }
): Promise<{
  success: boolean;
  data?: VaultState;
  message?: string;
}> {
  if (customConfig?.url && customConfig?.anonKey) {
    saveClientConfig(customConfig.url, customConfig.anonKey);
  }

  const cfg = customConfig?.url && customConfig?.anonKey
    ? { url: cleanSupabaseUrl(customConfig.url), anonKey: customConfig.anonKey.trim() }
    : await getClientConfig();

  if (!cfg.url) {
    return { success: false, message: 'Supabase URL is missing.' };
  }
  if (!cfg.anonKey) {
    return { success: false, message: 'Supabase Anon Key is missing. Paste your Anon Key in Connection Parameters.' };
  }

  const client = await getSupabaseClient(cfg);
  if (!client) {
    return { success: false, message: `Could not connect to Supabase at ${cfg.url}.` };
  }

  try {
    const [
      familyRes,
      contactsRes,
      docsRes,
      onlineRes,
      invRes,
      insRes,
      lockersRes,
      cardsRes,
      propRes,
      liaRes,
      pwdRes,
    ] = await Promise.all([
      smartSelect(client, SECTION_TABLE_MAPPINGS.familyMembers),
      smartSelect(client, SECTION_TABLE_MAPPINGS.contacts, 'sr_no'),
      smartSelect(client, SECTION_TABLE_MAPPINGS.documents, 'sr_no'),
      smartSelect(client, SECTION_TABLE_MAPPINGS.onlineAccounts, 'sr_no'),
      smartSelect(client, SECTION_TABLE_MAPPINGS.investments, 'sr_no'),
      smartSelect(client, SECTION_TABLE_MAPPINGS.insurances, 'sr_no'),
      smartSelect(client, SECTION_TABLE_MAPPINGS.lockers, 'sr_no'),
      smartSelect(client, SECTION_TABLE_MAPPINGS.cards, 'sr_no'),
      smartSelect(client, SECTION_TABLE_MAPPINGS.properties, 'sr_no'),
      smartSelect(client, SECTION_TABLE_MAPPINGS.liabilities, 'sr_no'),
      smartSelect(client, SECTION_TABLE_MAPPINGS.passwords, 'sr_no'),
    ]);

    const hasData =
      (familyRes.data && familyRes.data.length > 0) ||
      (docsRes.data && docsRes.data.length > 0) ||
      (contactsRes.data && contactsRes.data.length > 0) ||
      (lockersRes.data && lockersRes.data.length > 0) ||
      (cardsRes.data && cardsRes.data.length > 0);

    if (!hasData) {
      return {
        success: true,
        data: INITIAL_VAULT_DATA,
        message: 'Supabase tables are currently empty. Push initial data to populate them.',
      };
    }

    const state: VaultState = {
      currentDate: '15-Oct-2026',
      currentYear: 2026,
      familyMembers: familyRes.data && familyRes.data.length > 0
        ? familyRes.data.map((m: any) => ({
            id: m.id,
            category: m.category,
            name: m.name,
            relationship: m.relationship,
            notes: m.notes || '',
          }))
        : INITIAL_VAULT_DATA.familyMembers,
      contacts: contactsRes.data && contactsRes.data.length > 0
        ? contactsRes.data.map((c: any) => ({
            id: c.id,
            srNo: c.sr_no,
            particulars: c.particulars,
            name: c.person_name || c.name || '',
            dob: c.dob || c.date_of_birth || '',
            mobile: c.mobile || c.phone || c.mobile_no || c.contact_no || '',
            email: c.email || '',
            address: c.address || '',
            remarks: c.remarks || '',
          }))
        : INITIAL_VAULT_DATA.contacts,
      documents: docsRes.data && docsRes.data.length > 0
        ? docsRes.data.map((d: any) => ({
            id: d.id,
            srNo: d.sr_no,
            documentName: d.document_name || d.document_type || '',
            documentNumber: d.document_number || '',
            physicalLocation: d.physical_location || d.location_physical || '',
            virtualLocation: d.virtual_location || d.location_virtual || '',
            remarks: d.remarks || '',
            expiryDate: d.expiry_date || '',
            statusNote: d.status_note || d.expires_soon || '',
            personTag: d.person_tag || d.persontag || d.person || 'Self',
            tags: Array.isArray(d.tags)
              ? d.tags
              : typeof d.tags === 'string' && d.tags.trim().length > 0
              ? d.tags.split(',').map((t: string) => t.trim())
              : [],
          }))
        : INITIAL_VAULT_DATA.documents,
      onlineAccounts: onlineRes.data && onlineRes.data.length > 0
        ? onlineRes.data.map((o: any) => ({
            id: o.id,
            srNo: o.sr_no,
            platform: o.platform || o.company || '',
            email: o.email || o.registered_email || '',
            mobile: o.mobile || o.registered_mobile || '',
            accountId: o.account_id || o.login_id || '',
            remarks: o.remarks || '',
          }))
        : INITIAL_VAULT_DATA.onlineAccounts,
      investments: invRes.data && invRes.data.length > 0
        ? invRes.data.map((i: any) => ({
            id: i.id,
            srNo: i.sr_no,
            investmentType: i.investment_type || '',
            platform: i.platform || '',
            accountHolderName: i.account_holder_name || '',
            agentOrAdvisor: i.agent_or_advisor || '',
            accountNumber: i.account_number || '',
            nominee: i.nominee || '',
            maturityDate: i.maturity_date || '',
            linkedBank: i.linked_bank || '',
            regMobile: i.reg_mobile || '',
            regEmail: i.reg_email || '',
            remarks: i.remarks || '',
          }))
        : INITIAL_VAULT_DATA.investments,
      insurances: insRes.data && insRes.data.length > 0
        ? insRes.data.map((p: any) => ({
            id: p.id,
            srNo: p.sr_no,
            type: p.type || p.policy_type || '',
            policyName: p.policy_name || '',
            policyNumber: p.policy_number || p.policy_no || '',
            coveredPerson: p.covered_person || p.person_covered || '',
            amountInsured: p.amount_insured || '',
            nominee: p.nominee || '',
            advisor: p.advisor || '',
            validTill: p.valid_till || p.maturity_date || '',
            premiumAmount: p.premium_amount || '',
            premiumDueDate: p.premium_due_date || '',
            remarks: p.remarks || '',
          }))
        : INITIAL_VAULT_DATA.insurances,
      lockers: lockersRes.data && lockersRes.data.length > 0
        ? lockersRes.data.map((l: any) => ({
            id: l.id,
            srNo: l.sr_no,
            bankAndBranch: l.bank_and_branch || l.bank_name || '',
            accountNumber: l.account_number || '',
            lockerNumber: l.locker_number || l.locker_no || '',
            inNameOf: l.in_name_of || l.operating_mode || '',
            nominee: l.nominee || '',
            codeOrRemarks: l.code_or_remarks || l.remarks || '',
          }))
        : INITIAL_VAULT_DATA.lockers,
      cards: cardsRes.data && cardsRes.data.length > 0
        ? cardsRes.data.map((c: any) => ({
            id: c.id,
            srNo: c.sr_no,
            nameOnCard: c.name_on_card || c.card_holder || '',
            cardType: c.card_type || 'Debit',
            cardNumber: c.cardnumber || c.card_number || c.last4 || '',
            linkedAccount: c.linked_account || '',
            regMobile: c.reg_mobile || '',
            validTill: c.valid_till || c.expiry || '',
            remarks: c.remarks || '',
          }))
        : INITIAL_VAULT_DATA.cards,
      properties: propRes.data && propRes.data.length > 0
        ? propRes.data.map((p: any) => ({
            id: p.id,
            srNo: p.sr_no,
            propertyName: p.property_name || '',
            propertyArea: p.property_area || p.property_type || '',
            owners: p.owners || p.ownership || '',
            registrationNumber: p.registration_number || '',
            nominee: p.nominee || '',
            remarks: p.remarks || '',
          }))
        : INITIAL_VAULT_DATA.properties,
      liabilities: liaRes.data && liaRes.data.length > 0
        ? liaRes.data.map((l: any) => ({
            id: l.id,
            srNo: l.sr_no,
            bankOrLender: l.bank_or_lender || l.lender_name || '',
            liabilityType: l.liability_type || '',
            amount: l.amount || l.original_amount || '',
            terms: l.terms || '',
            remarks: l.remarks || '',
          }))
        : INITIAL_VAULT_DATA.liabilities,
      passwords: pwdRes.data && pwdRes.data.length > 0
        ? pwdRes.data.map((w: any) => ({
            id: w.id,
            srNo: w.sr_no,
            loginKind: w.login_kind || '',
            personAware: w.person_aware || '',
            remarks: w.remarks || '',
            instructions: w.instructions || w.recovery_method || '',
          }))
        : INITIAL_VAULT_DATA.passwords,
    };

    return { success: true, data: state };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

/**
 * Direct file upload to Supabase Storage bucket 'vault_documents'
 * Enables document hosting directly from the browser (e.g. on Cloudflare Pages)
 */
export async function uploadDocumentToSupabaseStorage(
  file: File,
  docId: string
): Promise<{ success: boolean; attachment?: DocumentAttachment; message?: string }> {
  const client = await getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase client not initialized' };
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${docId}/${Date.now()}_${cleanName}`;

  try {
    const { error: uploadError } = await client.storage
      .from('vault_documents')
      .upload(filePath, file, {
        upsert: true,
        cacheControl: '3600',
        contentType: file.type || 'application/octet-stream',
      });

    if (uploadError) {
      return { success: false, message: `Storage upload failed: ${uploadError.message}` };
    }

    const { data: publicUrlData } = client.storage
      .from('vault_documents')
      .getPublicUrl(filePath);

    const attachment: DocumentAttachment = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fileName: file.name,
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type || 'application/octet-stream',
      storagePath: filePath,
      fileUrl: publicUrlData?.publicUrl || '',
      uploadedAt: new Date().toISOString(),
    };

    return { success: true, attachment, message: 'Uploaded to Supabase Storage' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
