import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { VaultState } from '../types/vault.ts';
import { INITIAL_VAULT_DATA } from '../data/initialVaultData.ts';

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

/**
 * Push all vault data directly to Supabase tables
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

  // 1. First attempt: If running fullstack with backend Express server (/api/vault/sync)
  try {
    const res = await fetch('/api/vault/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vault || INITIAL_VAULT_DATA),
    });
    if (res.ok) {
      const json = await res.json();
      return {
        success: true,
        message: json.message || 'All 10 sections pushed to Supabase successfully!',
      };
    }
  } catch {
    // Normal for static hosting (Cloudflare Pages, GitHub Pages)
  }

  // 2. Second attempt: Direct client connection via @supabase/supabase-js
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
    // 1. Family Members
    if (vault.familyMembers?.length) {
      const rows = vault.familyMembers.map((m) => ({
        id: m.id,
        category: m.category,
        name: m.name,
        relationship: m.relationship,
        notes: m.notes || '',
      }));
      const { error } = await client.from('family_members').upsert(rows);
      results.family_members = error ? `Error: ${error.message}` : `${rows.length} rows synced`;
    }

    // 2. Contacts
    if (vault.contacts?.length) {
      const rows = vault.contacts.map((c) => ({
        id: c.id,
        sr_no: c.srNo,
        particulars: c.particulars,
        name: c.name || '',
        mobile: c.mobile || '',
        email: c.email || '',
        address: c.address || '',
        remarks: c.remarks || '',
      }));
      const { error } = await client.from('important_contacts').upsert(rows);
      results.important_contacts = error ? `Error: ${error.message}` : `${rows.length} rows synced`;
    }

    // 3. Financial Documents
    if (vault.documents?.length) {
      const rows = vault.documents.map((d) => ({
        id: d.id,
        sr_no: d.srNo,
        document_name: d.documentName,
        document_number: d.documentNumber || '',
        physical_location: d.physicalLocation || '',
        virtual_location: d.virtualLocation || '',
        remarks: d.remarks || '',
        expiry_date: d.expiryDate || '',
        status_note: d.statusNote || '',
      }));
      const { error } = await client.from('financial_documents').upsert(rows);
      results.financial_documents = error ? `Error: ${error.message}` : `${rows.length} rows synced`;
    }

    // 4. Online Accounts
    if (vault.onlineAccounts?.length) {
      const rows = vault.onlineAccounts.map((o) => ({
        id: o.id,
        sr_no: o.srNo,
        platform: o.platform,
        email: o.email,
        mobile: o.mobile || '',
        account_id: o.accountId || '',
        remarks: o.remarks || '',
      }));
      const { error } = await client.from('online_accounts').upsert(rows);
      results.online_accounts = error ? `Error: ${error.message}` : `${rows.length} rows synced`;
    }

    // 5. Investment Accounts
    if (vault.investments?.length) {
      const rows = vault.investments.map((i) => ({
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
      const { error } = await client.from('investment_accounts').upsert(rows);
      results.investment_accounts = error ? `Error: ${error.message}` : `${rows.length} rows synced`;
    }

    // 6. Insurance Policies
    if (vault.insurances?.length) {
      const rows = vault.insurances.map((p) => ({
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
      const { error } = await client.from('insurance_policies').upsert(rows);
      results.insurance_policies = error ? `Error: ${error.message}` : `${rows.length} rows synced`;
    }

    // 7. Lockers
    if (vault.lockers?.length) {
      const rows = vault.lockers.map((l) => ({
        id: l.id,
        sr_no: l.srNo,
        bank_and_branch: l.bankAndBranch,
        account_number: l.accountNumber || '',
        locker_number: l.lockerNumber,
        in_name_of: l.inNameOf || '',
        nominee: l.nominee || '',
        code_or_remarks: l.codeOrRemarks || '',
      }));
      const { error } = await client.from('safe_lockers').upsert(rows);
      results.safe_lockers = error ? `Error: ${error.message}` : `${rows.length} rows synced`;
    }

    // 8. Cards
    if (vault.cards?.length) {
      const rows = vault.cards.map((c) => ({
        id: c.id,
        sr_no: c.srNo,
        name_on_card: c.nameOnCard,
        card_type: c.cardType,
        cardnumber: c.cardNumber || '',
        linked_account: c.linkedAccount || '',
        reg_mobile: c.regMobile || '',
        valid_till: c.validTill || '',
        remarks: c.remarks || '',
      }));
      const { error } = await client.from('bank_cards').upsert(rows);
      results.bank_cards = error ? `Error: ${error.message}` : `${rows.length} rows synced`;
    }

    // 9. Properties
    if (vault.properties?.length) {
      const rows = vault.properties.map((p) => ({
        id: p.id,
        sr_no: p.srNo,
        property_name: p.propertyName,
        property_area: p.propertyArea || '',
        owners: p.owners || '',
        registration_number: p.registrationNumber || '',
        nominee: p.nominee || '',
        remarks: p.remarks || '',
      }));
      const { error } = await client.from('properties').upsert(rows);
      results.properties = error ? `Error: ${error.message}` : `${rows.length} rows synced`;
    }

    // 10. Liabilities
    if (vault.liabilities?.length) {
      const rows = vault.liabilities.map((l) => ({
        id: l.id,
        sr_no: l.srNo,
        bank_or_lender: l.bankOrLender,
        liability_type: l.liabilityType,
        amount: l.amount,
        terms: l.terms || '',
        remarks: l.remarks || '',
      }));
      const { error } = await client.from('liabilities').upsert(rows);
      results.liabilities = error ? `Error: ${error.message}` : `${rows.length} rows synced`;
    }

    // 11. Passwords
    if (vault.passwords?.length) {
      const rows = vault.passwords.map((w) => ({
        id: w.id,
        sr_no: w.srNo,
        login_kind: w.loginKind,
        person_aware: w.personAware,
        remarks: w.remarks || '',
        instructions: w.instructions || '',
      }));
      const { error } = await client.from('online_passwords').upsert(rows);
      results.online_passwords = error ? `Error: ${error.message}` : `${rows.length} rows synced`;
    }

    const hasErrors = Object.values(results).some((msg) => msg.startsWith('Error:'));
    if (hasErrors) {
      const errorList = Object.entries(results)
        .filter(([_, msg]) => msg.startsWith('Error:'))
        .map(([tbl, msg]) => `${tbl}: ${msg}`)
        .join('; ');
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
 * Fetch all vault data from Supabase tables
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

  // 1. Try server-side endpoint first (immune to CORS)
  try {
    const res = await fetch('/api/vault');
    if (res.ok) {
      const json = await res.json();
      if (json.data) {
        return {
          success: true,
          data: json.data,
          message: 'Retrieved latest vault records from Supabase!',
        };
      }
    }
  } catch {
    // Normal for static hosting
  }

  // 2. Fallback to client query
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
      client.from('family_members').select('*'),
      client.from('important_contacts').select('*').order('sr_no', { ascending: true }),
      client.from('financial_documents').select('*').order('sr_no', { ascending: true }),
      client.from('online_accounts').select('*').order('sr_no', { ascending: true }),
      client.from('investment_accounts').select('*').order('sr_no', { ascending: true }),
      client.from('insurance_policies').select('*').order('sr_no', { ascending: true }),
      client.from('safe_lockers').select('*').order('sr_no', { ascending: true }),
      client.from('bank_cards').select('*').order('sr_no', { ascending: true }),
      client.from('properties').select('*').order('sr_no', { ascending: true }),
      client.from('liabilities').select('*').order('sr_no', { ascending: true }),
      client.from('online_passwords').select('*').order('sr_no', { ascending: true }),
    ]);

    // Check if we received data
    const hasData =
      (familyRes.data && familyRes.data.length > 0) ||
      (docsRes.data && docsRes.data.length > 0);

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
      familyMembers:
        familyRes.data?.map((m: any) => ({
          id: m.id,
          category: m.category,
          name: m.name,
          relationship: m.relationship,
          notes: m.notes,
        })) || INITIAL_VAULT_DATA.familyMembers,
      contacts:
        contactsRes.data?.map((c: any) => ({
          id: c.id,
          srNo: c.sr_no,
          particulars: c.particulars,
          name: c.person_name || c.name || '',
          mobile: c.phone || c.mobile || '',
          email: c.email || '',
          address: c.address || '',
          remarks: c.remarks || '',
        })) || INITIAL_VAULT_DATA.contacts,
      documents:
        docsRes.data?.map((d: any) => ({
          id: d.id,
          srNo: d.sr_no,
          documentName: d.document_type || d.document_name,
          documentNumber: d.document_number || '',
          physicalLocation: d.location_physical || d.physical_location || '',
          virtualLocation: d.location_virtual || d.virtual_location || '',
          remarks: d.remarks || '',
          expiryDate: d.expiry_date || '',
          statusNote: d.expires_soon || d.status_note || '',
        })) || INITIAL_VAULT_DATA.documents,
      onlineAccounts:
        onlineRes.data?.map((o: any) => ({
          id: o.id,
          srNo: o.sr_no,
          platform: o.company || o.platform,
          email: o.registered_email || o.email,
          mobile: o.registered_mobile || o.mobile || '',
          accountId: o.login_id || o.account_id || '',
          remarks: o.remarks || '',
        })) || INITIAL_VAULT_DATA.onlineAccounts,
      insurances:
        insRes.data?.map((p: any) => ({
          id: p.id,
          srNo: p.sr_no,
          type: p.policy_type || p.type,
          policyName: p.policy_name,
          policyNumber: p.policy_no || p.policy_number,
          coveredPerson: p.person_covered || '',
          amountInsured: p.amount_insured || '',
          nominee: p.nominee || '',
          validTill: p.maturity_date || p.valid_till || '',
          premiumAmount: p.premium_amount || '',
          premiumDueDate: p.premium_due_date || '',
          remarks: p.remarks || '',
        })) || INITIAL_VAULT_DATA.insurances,
      lockers:
        lockersRes.data?.map((l: any) => ({
          id: l.id,
          srNo: l.sr_no,
          bankAndBranch: l.bank_name || l.bank_and_branch,
          accountNumber: '',
          lockerNumber: l.locker_no || l.locker_number,
          inNameOf: l.operating_mode || l.in_name_of || '',
          nominee: l.nominee || '',
          codeOrRemarks: l.remarks || l.code_or_remarks || '',
        })) || INITIAL_VAULT_DATA.lockers,
      cards:
        cardsRes.data?.map((c: any) => ({
          id: c.id,
          srNo: c.sr_no,
          nameOnCard: c.card_holder || c.name_on_card,
          cardType: c.card_type,
          cardNumber: c.last4 || c.cardnumber || '',
          linkedAccount: c.linked_account || '',
          regMobile: '',
          validTill: c.expiry || c.valid_till || '',
          remarks: c.remarks || '',
        })) || INITIAL_VAULT_DATA.cards,
      properties:
        propRes.data?.map((p: any) => ({
          id: p.id,
          srNo: p.sr_no,
          propertyName: p.property_name,
          propertyArea: p.property_type || p.property_area || '',
          owners: p.ownership || p.owners || '',
          registrationNumber: '',
          nominee: p.nominee || '',
          remarks: p.remarks || '',
        })) || INITIAL_VAULT_DATA.properties,
      liabilities:
        liaRes.data?.map((l: any) => ({
          id: l.id,
          srNo: l.sr_no,
          bankOrLender: l.lender_name || l.bank_or_lender,
          liabilityType: l.liability_type,
          amount: l.original_amount || l.amount,
          terms: '',
          remarks: l.remarks || '',
        })) || INITIAL_VAULT_DATA.liabilities,
      passwords:
        pwdRes.data?.map((w: any) => ({
          id: w.id,
          srNo: w.sr_no,
          loginKind: w.login_kind,
          personAware: w.person_aware,
          remarks: w.remarks || '',
          instructions: w.recovery_method || w.instructions || '',
        })) || INITIAL_VAULT_DATA.passwords,
      investments: INITIAL_VAULT_DATA.investments,
    };

    return { success: true, data: state };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}
