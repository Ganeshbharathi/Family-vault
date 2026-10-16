import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { VaultState } from '../types/vault.ts';
import { INITIAL_VAULT_DATA } from '../data/initialVaultData.ts';

const STORAGE_URL_KEY = 'kutumb_supabase_url';
const STORAGE_ANON_KEY = 'kutumb_supabase_anon_key';

let cachedClient: SupabaseClient | null = null;
let cachedUrl = '';
let cachedKey = '';

export async function getClientConfig(): Promise<{ url: string; anonKey: string }> {
  // Check local storage overrides first
  const localUrl = localStorage.getItem(STORAGE_URL_KEY);
  const localKey = localStorage.getItem(STORAGE_ANON_KEY);
  if (localUrl && localKey) {
    return { url: localUrl, anonKey: localKey };
  }

  // Fetch from server /api/config
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      return {
        url: localUrl || data.supabaseUrl || 'http://100.81.91.59:8000',
        anonKey: localKey || data.supabaseAnonKey || '',
      };
    }
  } catch (err) {
    console.warn('Could not fetch server config, using fallback:', err);
  }

  return {
    url: localUrl || 'http://100.81.91.59:8000',
    anonKey: localKey || '',
  };
}

export function saveClientConfig(url: string, anonKey: string) {
  if (url) localStorage.setItem(STORAGE_URL_KEY, url);
  if (anonKey) localStorage.setItem(STORAGE_ANON_KEY, anonKey);
  cachedClient = null; // reset client to re-init
}

export async function getSupabaseClient(): Promise<SupabaseClient | null> {
  const { url, anonKey } = await getClientConfig();
  if (!url || !anonKey) {
    return null;
  }

  if (cachedClient && cachedUrl === url && cachedKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: { persistSession: false },
    });
    cachedUrl = url;
    cachedKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize browser Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(): Promise<{
  ok: boolean;
  message: string;
  tableCount?: number;
}> {
  const client = await getSupabaseClient();
  if (!client) {
    return {
      ok: false,
      message: 'Supabase URL or Anon Key is missing. Please configure them in Settings.',
    };
  }

  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const { url } = await getClientConfig();
  const isTargetHttp = url.startsWith('http://');

  try {
    // Try querying family_members
    const { data, error } = await client.from('family_members').select('id').limit(1);
    if (error) {
      return {
        ok: false,
        message: `Query failed: ${error.message}. Ensure the SQL schema has been executed in Supabase SQL Editor.`,
      };
    }

    return {
      ok: true,
      message: 'Successfully connected directly to Supabase over Tailscale!',
    };
  } catch (err: any) {
    if (isHttps && isTargetHttp) {
      return {
        ok: false,
        message: 'Browser blocked connection (Mixed Content: HTTPS app calling HTTP Supabase). In Chrome: click the Tune icon next to the URL -> Site settings -> Insecure content -> Allow, then refresh.',
      };
    }
    return {
      ok: false,
      message: `Failed to reach Supabase: ${err.message || 'Network error'}. Make sure Tailscale is connected.`,
    };
  }
}

/**
 * Push all vault data directly to Supabase tables
 */
export async function pushVaultToSupabase(vault: VaultState): Promise<{
  success: boolean;
  message: string;
  details?: Record<string, string>;
}> {
  // 1. First attempt: Use same-origin backend API (/api/vault/sync)
  // This runs directly on the server next to Supabase, bypassing all browser CORS restrictions
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
  } catch (apiErr) {
    console.warn('Backend sync failed, falling back to direct browser client:', apiErr);
  }

  // 2. Second attempt: Direct client connection via @supabase/supabase-js
  const client = await getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Could not connect to Supabase via server or client.' };
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
export async function pullVaultFromSupabase(): Promise<{
  success: boolean;
  data?: VaultState;
  message?: string;
}> {
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
  } catch (apiErr) {
    console.warn('Backend /api/vault fetch failed, trying direct client:', apiErr);
  }

  // 2. Fallback to client query
  const client = await getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase client not initialized.' };
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
