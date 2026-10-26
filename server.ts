import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from 'vite';
import { INITIAL_VAULT_DATA } from './src/initialData.ts';
import { SUPABASE_SQL_SCHEMA } from './src/supabaseSchema.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Increase payload limit for document upload previews (e.g. PDFs / Images)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Supabase client initialization
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseKey && !supabaseUrl.includes('YOUR_PROXMOX')) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
  }
}

// In-memory document storage fallback when Supabase is not yet connected
const inMemoryUploads = new Map<string, { buffer: Buffer; mimeType: string; originalName: string; fileName: string }>();

// -----------------------------------------------------------------------------
// API Endpoints
// -----------------------------------------------------------------------------

// 0. Public Config Endpoint for Client-Side Supabase (Tailscale Direct Connection)
app.get('/api/config', (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || 'http://100.81.91.59:8000',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  });
});

// 1. Connection Status
app.get('/api/status', async (req, res) => {
  if (!supabase || !supabaseUrl || !supabaseKey) {
    return res.json({
      configured: false,
      connected: false,
      url: supabaseUrl || null,
      message: 'Supabase credentials not configured in environment (SUPABASE_URL, SUPABASE_ANON_KEY).',
    });
  }

  try {
    const { data, error } = await supabase.from('family_members').select('id').limit(1);
    if (error) {
      return res.json({
        configured: true,
        connected: false,
        url: supabaseUrl,
        error: error.message,
        message: 'Could not connect to Supabase tables. Ensure SQL schema script has been executed.',
      });
    }

    return res.json({
      configured: true,
      connected: true,
      url: supabaseUrl,
      message: 'Successfully connected to self-hosted Proxmox Supabase instance.',
    });
  } catch (err: any) {
    return res.json({
      configured: true,
      connected: false,
      url: supabaseUrl,
      error: err.message,
      message: 'Network error reaching Proxmox Supabase instance.',
    });
  }
});

// 2. Fetch full vault data from Supabase
app.get('/api/vault', async (req, res) => {
  if (!supabase) {
    return res.json({ source: 'local', data: INITIAL_VAULT_DATA });
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
      supabase.from('family_members').select('*'),
      supabase.from('important_contacts').select('*').order('sr_no', { ascending: true }),
      supabase.from('financial_documents').select('*').order('sr_no', { ascending: true }),
      supabase.from('online_accounts').select('*').order('sr_no', { ascending: true }),
      supabase.from('investment_accounts').select('*').order('sr_no', { ascending: true }),
      supabase.from('insurance_policies').select('*').order('sr_no', { ascending: true }),
      supabase.from('safe_lockers').select('*').order('sr_no', { ascending: true }),
      supabase.from('bank_cards').select('*').order('sr_no', { ascending: true }),
      supabase.from('properties').select('*').order('sr_no', { ascending: true }),
      supabase.from('liabilities').select('*').order('sr_no', { ascending: true }),
      supabase.from('online_passwords').select('*').order('sr_no', { ascending: true }),
    ]);

    // If tables are empty, return initial data
    if (!docsRes.data || docsRes.data.length === 0) {
      return res.json({ source: 'supabase_empty', data: INITIAL_VAULT_DATA });
    }

    const transformedData = {
      currentDate: '15-Oct-2026',
      currentYear: 2026,
      familyMembers: familyRes.data?.map((m: any) => ({
        id: m.id,
        category: m.category,
        name: m.name,
        relationship: m.relationship,
        notes: m.notes,
      })) || [],
      contacts: contactsRes.data?.map((c: any) => ({
        id: c.id,
        srNo: c.sr_no,
        particulars: c.particulars,
        name: c.name || '',
        dob: c.dob || '',
        mobile: c.mobile || '',
        email: c.email || '',
        address: c.address || '',
        remarks: c.remarks || '',
      })) || [],
      documents: docsRes.data?.map((d: any) => ({
        id: d.id,
        srNo: d.sr_no,
        documentName: d.document_name,
        documentNumber: d.document_number || '',
        physicalLocation: d.physical_location || '',
        virtualLocation: d.virtual_location || '',
        remarks: d.remarks || '',
        expiryDate: d.expiry_date || '',
        statusNote: d.status_note || '',
        attachment: d.attachment_id
          ? {
              id: d.attachment_id,
              fileName: d.attachment_file_name,
              originalName: d.attachment_original_name,
              fileSize: Number(d.attachment_file_size) || 0,
              mimeType: d.attachment_mime_type,
              storagePath: d.attachment_storage_path,
              fileUrl: d.attachment_file_url,
              uploadedAt: d.attachment_uploaded_at,
            }
          : undefined,
      })) || [],
      onlineAccounts: onlineRes.data?.map((o: any) => ({
        id: o.id,
        srNo: o.sr_no,
        platform: o.platform,
        email: o.email,
        mobile: o.mobile || '',
        accountId: o.account_id || '',
        remarks: o.remarks || '',
      })) || [],
      investments: invRes.data?.map((i: any) => ({
        id: i.id,
        srNo: i.sr_no,
        investmentType: i.investment_type,
        platform: i.platform,
        accountHolderName: i.account_holder_name,
        agentOrAdvisor: i.agent_or_advisor || '',
        accountNumber: i.account_number,
        nominee: i.nominee || '',
        maturityDate: i.maturity_date || '',
        linkedBank: i.linked_bank || '',
        regMobile: i.reg_mobile || '',
        regEmail: i.reg_email || '',
        remarks: i.remarks || '',
      })) || [],
      insurances: insRes.data?.map((p: any) => ({
        id: p.id,
        srNo: p.sr_no,
        type: p.type,
        policy_name: p.policy_name,
        policy_number: p.policy_number,
        coveredPerson: p.covered_person || '',
        amountInsured: p.amount_insured || '',
        nominee: p.nominee || '',
        advisor: p.advisor || '',
        validTill: p.valid_till || '',
        premiumAmount: p.premium_amount || '',
        premiumDueDate: p.premium_due_date || '',
        remarks: p.remarks || '',
      })) || [],
      lockers: lockersRes.data?.map((l: any) => ({
        id: l.id,
        srNo: l.sr_no,
        bankAndBranch: l.bank_and_branch,
        accountNumber: l.account_number || '',
        lockerNumber: l.locker_number,
        inNameOf: l.in_name_of || '',
        nominee: l.nominee || '',
        codeOrRemarks: l.code_or_remarks || '',
      })) || [],
      cards: cardsRes.data?.map((c: any) => ({
        id: c.id,
        srNo: c.sr_no,
        nameOnCard: c.name_on_card,
        cardType: c.card_type,
        cardNumber: c.cardnumber || '',
        linkedAccount: c.linked_account || '',
        regMobile: c.reg_mobile || '',
        validTill: c.valid_till || '',
        remarks: c.remarks || '',
      })) || [],
      properties: propRes.data?.map((p: any) => ({
        id: p.id,
        srNo: p.sr_no,
        propertyName: p.property_name,
        propertyArea: p.property_area || '',
        owners: p.owners || '',
        registrationNumber: p.registration_number || '',
        nominee: p.nominee || '',
        remarks: p.remarks || '',
      })) || [],
      liabilities: liaRes.data?.map((l: any) => ({
        id: l.id,
        sr_no: l.sr_no,
        bankOrLender: l.bank_or_lender,
        liability_type: l.liability_type,
        amount: l.amount,
        terms: l.terms || '',
        remarks: l.remarks || '',
      })) || [],
      passwords: pwdRes.data?.map((w: any) => ({
        id: w.id,
        sr_no: w.sr_no,
        login_kind: w.login_kind,
        person_aware: w.person_aware,
        remarks: w.remarks || '',
        instructions: w.instructions || '',
      })) || [],
    };

    return res.json({ source: 'supabase', data: transformedData });
  } catch (err: any) {
    console.error('Error fetching from Supabase:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 3. Seed / Bulk Sync vault state to Supabase
app.post('/api/vault/sync', async (req, res) => {
  if (!supabase) {
    return res.status(400).json({ error: 'Supabase is not configured on this server.' });
  }

  const vault = (req.body && Object.keys(req.body).length > 0) ? req.body : INITIAL_VAULT_DATA;

  try {
    // 1. Family Members
    if (vault.familyMembers?.length) {
      const rows = vault.familyMembers.map((m: any) => ({
        id: m.id,
        category: m.category,
        name: m.name,
        relationship: m.relationship,
        notes: m.notes || '',
      }));
      await supabase.from('family_members').upsert(rows);
    }

    // 2. Contacts
    if (vault.contacts?.length) {
      const rows = vault.contacts.map((c: any) => ({
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
      await supabase.from('important_contacts').upsert(rows);
    }

    // 3. Financial Documents
    if (vault.documents?.length) {
      const rows = vault.documents.map((d: any) => ({
        id: d.id,
        sr_no: d.srNo,
        document_name: d.documentName,
        document_number: d.documentNumber || '',
        physical_location: d.physicalLocation || '',
        virtual_location: d.virtualLocation || '',
        remarks: d.remarks || '',
        expiry_date: d.expiryDate || '',
        status_note: d.statusNote || '',
        attachment_id: d.attachment?.id || null,
        attachment_file_name: d.attachment?.fileName || null,
        attachment_original_name: d.attachment?.originalName || null,
        attachment_file_size: d.attachment?.fileSize || null,
        attachment_mime_type: d.attachment?.mimeType || null,
        attachment_storage_path: d.attachment?.storagePath || null,
        attachment_file_url: d.attachment?.fileUrl || null,
        attachment_uploaded_at: d.attachment?.uploadedAt || null,
      }));
      await supabase.from('financial_documents').upsert(rows);
    }

    // 4. Online Accounts
    if (vault.onlineAccounts?.length) {
      const rows = vault.onlineAccounts.map((o: any) => ({
        id: o.id,
        sr_no: o.srNo,
        platform: o.platform,
        email: o.email,
        mobile: o.mobile || '',
        account_id: o.accountId || '',
        remarks: o.remarks || '',
      }));
      await supabase.from('online_accounts').upsert(rows);
    }

    // 5. Investment Accounts
    if (vault.investments?.length) {
      const rows = vault.investments.map((i: any) => ({
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
      await supabase.from('investment_accounts').upsert(rows);
    }

    // 6. Insurance Policies
    if (vault.insurances?.length) {
      const rows = vault.insurances.map((p: any) => ({
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
      await supabase.from('insurance_policies').upsert(rows);
    }

    // 7. Lockers
    if (vault.lockers?.length) {
      const rows = vault.lockers.map((l: any) => ({
        id: l.id,
        sr_no: l.srNo,
        bank_and_branch: l.bankAndBranch,
        account_number: l.accountNumber || '',
        locker_number: l.lockerNumber,
        in_name_of: l.inNameOf || '',
        nominee: l.nominee || '',
        code_or_remarks: l.codeOrRemarks || '',
      }));
      await supabase.from('safe_lockers').upsert(rows);
    }

    // 8. Bank Cards
    if (vault.cards?.length) {
      const rows = vault.cards.map((c: any) => ({
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
      await supabase.from('bank_cards').upsert(rows);
    }

    // 9. Properties
    if (vault.properties?.length) {
      const rows = vault.properties.map((p: any) => ({
        id: p.id,
        sr_no: p.srNo,
        property_name: p.propertyName,
        property_area: p.propertyArea || '',
        owners: p.owners || '',
        registration_number: p.registrationNumber || '',
        nominee: p.nominee || '',
        remarks: p.remarks || '',
      }));
      await supabase.from('properties').upsert(rows);
    }

    // 10. Liabilities
    if (vault.liabilities?.length) {
      const rows = vault.liabilities.map((l: any) => ({
        id: l.id,
        sr_no: l.srNo,
        bank_or_lender: l.bankOrLender,
        liability_type: l.liabilityType,
        amount: l.amount,
        terms: l.terms || '',
        remarks: l.remarks || '',
      }));
      await supabase.from('liabilities').upsert(rows);
    }

    // 11. Passwords
    if (vault.passwords?.length) {
      const rows = vault.passwords.map((w: any) => ({
        id: w.id,
        sr_no: w.srNo,
        login_kind: w.loginKind,
        person_aware: w.personAware,
        remarks: w.remarks || '',
        instructions: w.instructions || '',
      }));
      await supabase.from('online_passwords').upsert(rows);
    }

    return res.json({ success: true, message: 'All sections synced to Supabase successfully' });
  } catch (err: any) {
    console.error('Error syncing vault to Supabase:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 4. Document File Upload (Storage + DB Attachment)
app.post('/api/documents/upload', async (req, res) => {
  const { docId, fileName, originalName, mimeType, base64Data } = req.body;
  if (!docId || !base64Data) {
    return res.status(400).json({ error: 'Missing docId or base64Data' });
  }

  try {
    const rawData = base64Data.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(rawData, 'base64');
    const attachmentId = `att-${Date.now()}`;
    const sanitizedFileName = (fileName || originalName || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${docId}/${Date.now()}_${sanitizedFileName}`;

    let fileUrl = '';

    if (supabase) {
      // 1. Upload to Supabase Storage bucket 'vault_documents'
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('vault_documents')
        .upload(storagePath, buffer, {
          contentType: mimeType || 'application/octet-stream',
          upsert: true,
        });

      if (uploadError) {
        console.warn('Supabase storage upload error, falling back to data URL:', uploadError);
        fileUrl = base64Data;
      } else {
        const { data: publicUrlData } = supabase.storage
          .from('vault_documents')
          .getPublicUrl(storagePath);
        fileUrl = publicUrlData?.publicUrl || base64Data;
      }
    } else {
      // In-memory fallback
      inMemoryUploads.set(attachmentId, {
        buffer,
        mimeType: mimeType || 'application/pdf',
        originalName: originalName || fileName,
        fileName: sanitizedFileName,
      });
      fileUrl = base64Data;
    }

    const attachment = {
      id: attachmentId,
      fileName: sanitizedFileName,
      originalName: originalName || sanitizedFileName,
      fileSize: buffer.length,
      mimeType: mimeType || 'application/pdf',
      storagePath,
      fileUrl,
      uploadedAt: new Date().toISOString(),
    };

    // If Supabase is connected, update document record in DB
    if (supabase) {
      await supabase
        .from('financial_documents')
        .update({
          attachment_id: attachment.id,
          attachment_file_name: attachment.fileName,
          attachment_original_name: attachment.originalName,
          attachment_file_size: attachment.fileSize,
          attachment_mime_type: attachment.mimeType,
          attachment_storage_path: attachment.storagePath,
          attachment_file_url: attachment.fileUrl,
          attachment_uploaded_at: attachment.uploadedAt,
        })
        .eq('id', docId);
    }

    return res.json({ success: true, attachment });
  } catch (err: any) {
    console.error('Error handling file upload:', err);
    return res.status(500).json({ error: err.message });
  }
});

// 5. Rename Document Attachment
app.post('/api/documents/rename-file', async (req, res) => {
  const { docId, newFileName } = req.body;
  if (!docId || !newFileName) {
    return res.status(400).json({ error: 'Missing docId or newFileName' });
  }

  try {
    if (supabase) {
      await supabase
        .from('financial_documents')
        .update({ attachment_file_name: newFileName })
        .eq('id', docId);
    }

    return res.json({ success: true, newFileName });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 6. Delete Document Attachment
app.post('/api/documents/delete-file', async (req, res) => {
  const { docId, storagePath } = req.body;
  if (!docId) {
    return res.status(400).json({ error: 'Missing docId' });
  }

  try {
    if (supabase && storagePath) {
      await supabase.storage.from('vault_documents').remove([storagePath]);
      await supabase
        .from('financial_documents')
        .update({
          attachment_id: null,
          attachment_file_name: null,
          attachment_original_name: null,
          attachment_file_size: null,
          attachment_mime_type: null,
          attachment_storage_path: null,
          attachment_file_url: null,
          attachment_uploaded_at: null,
        })
        .eq('id', docId);
    }

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 7. Get raw SQL schema script
app.get('/api/supabase/schema.sql', (req, res) => {
  res.setHeader('Content-Type', 'text/plain');
  res.send(SUPABASE_SQL_SCHEMA);
});

// 8. Upsert single contact row immediately
app.post('/api/contacts/sync-row', async (req, res) => {
  const c = req.body;
  if (!c || !c.id) {
    return res.status(400).json({ error: 'Missing contact id' });
  }

  if (!supabase) {
    return res.json({
      success: true,
      localOnly: true,
      message: `Contact "${c.particulars || c.id}" staged (Connect Supabase in navbar to push live)`,
    });
  }

  try {
    const row = {
      id: c.id,
      sr_no: c.srNo ?? c.sr_no ?? 1,
      particulars: c.particulars || '',
      name: c.name || '',
      dob: c.dob || '',
      mobile: c.mobile || '',
      email: c.email || '',
      address: c.address || '',
      remarks: c.remarks || '',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('important_contacts').upsert(row);
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, message: `Contact ${c.particulars || c.id} synced to Supabase` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 9. Delete single contact row immediately
app.delete('/api/contacts/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Missing contact id' });
  }

  if (!supabase) {
    return res.json({
      success: true,
      localOnly: true,
      message: `Contact ${id} deleted locally`,
    });
  }

  try {
    const { error } = await supabase.from('important_contacts').delete().eq('id', id);
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true, message: `Contact ${id} deleted from Supabase` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------------
// Vite Middleware / Static Serving
// -----------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
