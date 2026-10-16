export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- KUTUMBVAULT: POSTGRESQL SCHEMA FOR SUPABASE (SELF-HOSTED PROXMOX / CLOUD)
-- Run this script in your Supabase SQL Editor (http://<your-proxmox-ip>:8000 -> SQL Editor)
-- It creates separate dedicated tables for each vault section and storage bucket.
-- ==============================================================================

-- 1. Family Members Table
CREATE TABLE IF NOT EXISTS public.family_members (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('couple', 'child', 'parent')),
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Important Contacts Table
CREATE TABLE IF NOT EXISTS public.important_contacts (
    id TEXT PRIMARY KEY,
    sr_no INT NOT NULL,
    particulars TEXT NOT NULL,
    name TEXT,
    mobile TEXT,
    email TEXT,
    address TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Financial Documents Table (with file attachment metadata)
CREATE TABLE IF NOT EXISTS public.financial_documents (
    id TEXT PRIMARY KEY,
    sr_no INT NOT NULL,
    document_name TEXT NOT NULL,
    document_number TEXT,
    physical_location TEXT,
    virtual_location TEXT,
    remarks TEXT,
    expiry_date TEXT,
    status_note TEXT,
    attachment_id TEXT,
    attachment_file_name TEXT,
    attachment_original_name TEXT,
    attachment_file_size BIGINT,
    attachment_mime_type TEXT,
    attachment_storage_path TEXT,
    attachment_file_url TEXT,
    attachment_uploaded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Online Accounts (Finance Portals: Zerodha, Golden Pi, Wint Wealth, CDSL)
CREATE TABLE IF NOT EXISTS public.online_accounts (
    id TEXT PRIMARY KEY,
    sr_no INT NOT NULL,
    platform TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile TEXT,
    account_id TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Investment Accounts (MF, FD, Demat, PPF, EPF)
CREATE TABLE IF NOT EXISTS public.investment_accounts (
    id TEXT PRIMARY KEY,
    sr_no INT NOT NULL,
    investment_type TEXT NOT NULL,
    platform TEXT NOT NULL,
    account_holder_name TEXT NOT NULL,
    agent_or_advisor TEXT,
    account_number TEXT NOT NULL,
    nominee TEXT,
    maturity_date TEXT,
    linked_bank TEXT,
    reg_mobile TEXT,
    reg_email TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Insurance Policies
CREATE TABLE IF NOT EXISTS public.insurance_policies (
    id TEXT PRIMARY KEY,
    sr_no INT NOT NULL,
    type TEXT NOT NULL,
    policy_name TEXT NOT NULL,
    policy_number TEXT NOT NULL,
    covered_person TEXT,
    amount_insured TEXT,
    nominee TEXT,
    advisor TEXT,
    valid_till TEXT,
    premium_amount TEXT,
    premium_due_date TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Safe Deposit Lockers
CREATE TABLE IF NOT EXISTS public.safe_lockers (
    id TEXT PRIMARY KEY,
    sr_no INT NOT NULL,
    bank_and_branch TEXT NOT NULL,
    account_number TEXT,
    locker_number TEXT NOT NULL,
    in_name_of TEXT,
    nominee TEXT,
    code_or_remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Debit / Credit Cards
CREATE TABLE IF NOT EXISTS public.bank_cards (
    id TEXT PRIMARY KEY,
    sr_no INT NOT NULL,
    name_on_card TEXT NOT NULL,
    card_type TEXT NOT NULL,
    cardNumber TEXT,
    linked_account TEXT,
    reg_mobile TEXT,
    valid_till TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Real Estate Properties
CREATE TABLE IF NOT EXISTS public.properties (
    id TEXT PRIMARY KEY,
    sr_no INT NOT NULL,
    property_name TEXT NOT NULL,
    property_area TEXT,
    owners TEXT,
    registration_number TEXT,
    nominee TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Liabilities & Loans
CREATE TABLE IF NOT EXISTS public.liabilities (
    id TEXT PRIMARY KEY,
    sr_no INT NOT NULL,
    bank_or_lender TEXT NOT NULL,
    liability_type TEXT NOT NULL,
    amount TEXT NOT NULL,
    terms TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Emergency Access & Online Passwords
CREATE TABLE IF NOT EXISTS public.online_passwords (
    id TEXT PRIMARY KEY,
    sr_no INT NOT NULL,
    login_kind TEXT NOT NULL,
    person_aware TEXT NOT NULL,
    remarks TEXT,
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- STORAGE BUCKET FOR DOCUMENTS
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault_documents', 'vault_documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage access policies (Allow read/write/delete for anon and service role)
DROP POLICY IF EXISTS "Public Access to Vault Documents" ON storage.objects;
CREATE POLICY "Public Access to Vault Documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'vault_documents');

DROP POLICY IF EXISTS "Public Upload to Vault Documents" ON storage.objects;
CREATE POLICY "Public Upload to Vault Documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'vault_documents');

DROP POLICY IF EXISTS "Public Update Vault Documents" ON storage.objects;
CREATE POLICY "Public Update Vault Documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'vault_documents');

DROP POLICY IF EXISTS "Public Delete Vault Documents" ON storage.objects;
CREATE POLICY "Public Delete Vault Documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'vault_documents');

-- ==============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) BUT PERMIT ANON ACCESS FOR PRIVATE LAN INSTANCE
-- ==============================================================================
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.important_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safe_lockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.online_passwords ENABLE ROW LEVEL SECURITY;

-- Allow full access to anon key on your private home lab / proxmox network
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
        AND tablename IN (
            'family_members', 'important_contacts', 'financial_documents', 
            'online_accounts', 'investment_accounts', 'insurance_policies', 
            'safe_lockers', 'bank_cards', 'properties', 'liabilities', 'online_passwords'
        )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Allow All For Local Supabase" ON public.%I;', tbl);
        EXECUTE format('CREATE POLICY "Allow All For Local Supabase" ON public.%I FOR ALL USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;
`;

export const PROXMOX_SETUP_GUIDE_STEPS = [
  {
    step: 1,
    title: 'Find Your Proxmox Supabase Endpoint & Keys',
    description:
      'Open your Proxmox VM/LXC running Supabase (or docker-compose setup). Access the Supabase Studio web console (usually on port 8000, e.g. http://192.168.1.xxx:8000).',
    substeps: [
      'Navigate to Project Settings -> API in Supabase Studio.',
      'Copy the Project URL (e.g. http://192.168.1.100:8000 or your custom local DNS hostname).',
      'Copy the anon / public API key (starts with eyJ...).',
    ],
  },
  {
    step: 2,
    title: 'Execute the SQL Schema Script',
    description:
      'Inside Supabase Studio, click on the "SQL Editor" tab on the left navigation bar.',
    substeps: [
      'Click "New Query".',
      'Copy and paste the KutumbVault SQL Schema provided below.',
      'Click "Run" (or Ctrl+Enter). This will create all 11 tables and the "vault_documents" storage bucket.',
    ],
  },
  {
    step: 3,
    title: 'Configure Environment Variables',
    description:
      'Set the Supabase credentials in your server environment or .env file:',
    substeps: [
      'SUPABASE_URL="http://YOUR_PROXMOX_IP:8000"',
      'SUPABASE_ANON_KEY="eyJhbGciOi..."',
      'SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..." (optional)',
    ],
  },
  {
    step: 4,
    title: 'Sync and Test Data',
    description:
      'Click "Test Supabase Connection" in this app. Once connected, click "Push Initial Data to Supabase" to instantly populate your Proxmox database with all your sheet entries!',
    substeps: [
      'The app will automatically save any new edits, document uploads, and card updates directly into your Proxmox database.',
      'Documents uploaded (PDFs, images) are stored directly in Supabase Storage under the "vault_documents" bucket.',
    ],
  },
];
