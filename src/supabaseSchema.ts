// ==============================================================================
// KUTUMBVAULT: COMPREHENSIVE SUPABASE SCHEMA & SECTION SPECIFICATIONS
// Matches all frontend sections, field types, and document hosting requirements.
// ==============================================================================

export interface SectionSpec {
  sectionKey: string;
  tableName: string;
  title: string;
  needsTable: boolean;
  needsDocHosting: boolean;
  description: string;
  columns: Array<{ name: string; type: string; description: string; isPrimary?: boolean }>;
}

export const VAULT_SECTIONS_SPECIFICATION: SectionSpec[] = [
  {
    sectionKey: 'familyMembers',
    tableName: 'family_members',
    title: 'Family Members & Dependents',
    needsTable: true,
    needsDocHosting: false,
    description: 'Core family tree: couple, dependent parents, and children.',
    columns: [
      { name: 'id', type: 'TEXT', description: 'Unique ID', isPrimary: true },
      { name: 'category', type: 'TEXT', description: "'couple' | 'child' | 'parent'" },
      { name: 'name', type: 'TEXT', description: 'Full Name' },
      { name: 'relationship', type: 'TEXT', description: 'Relationship (e.g. Self, Spouse, MOM)' },
      { name: 'notes', type: 'TEXT', description: 'Special notes or dependencies' },
      { name: 'created_at', type: 'TIMESTAMPTZ', description: 'Row creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', description: 'Last modified timestamp' },
    ],
  },
  {
    sectionKey: 'contacts',
    tableName: 'important_contacts',
    title: 'Important Contacts Directory',
    needsTable: true,
    needsDocHosting: false,
    description: 'Emergency and professional contacts: Self, Spouse, Parents, Doctor, Lawyer, CA, Office HR.',
    columns: [
      { name: 'id', type: 'TEXT', description: 'Unique ID', isPrimary: true },
      { name: 'sr_no', type: 'INT', description: 'Sequential serial number' },
      { name: 'particulars', type: 'TEXT', description: 'Role (Self, Spouse, MOM, Doctor, etc.)' },
      { name: 'name', type: 'TEXT', description: 'Contact Name' },
      { name: 'mobile', type: 'TEXT', description: 'Phone / Mobile Numbers' },
      { name: 'email', type: 'TEXT', description: 'Email address' },
      { name: 'address', type: 'TEXT', description: 'Physical address' },
      { name: 'remarks', type: 'TEXT', description: 'Notes & priority indicator' },
      { name: 'created_at', type: 'TIMESTAMPTZ', description: 'Row creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', description: 'Last modified timestamp' },
    ],
  },
  {
    sectionKey: 'documents',
    tableName: 'financial_documents',
    title: 'Financial & Legal Documents',
    needsTable: true,
    needsDocHosting: true, // Needs document hosting!
    description: 'Passports, PAN, Aadhaar, Will, Property Deeds, Tax returns with uploaded file attachments.',
    columns: [
      { name: 'id', type: 'TEXT', description: 'Unique ID', isPrimary: true },
      { name: 'sr_no', type: 'INT', description: 'Sequential serial number' },
      { name: 'document_name', type: 'TEXT', description: 'Name of document' },
      { name: 'document_number', type: 'TEXT', description: 'Document / Registration Number' },
      { name: 'physical_location', type: 'TEXT', description: 'Physical cupboard / folder location' },
      { name: 'virtual_location', type: 'TEXT', description: 'Virtual folder / cloud reference' },
      { name: 'remarks', type: 'TEXT', description: 'Additional instructions' },
      { name: 'expiry_date', type: 'TEXT', description: 'Validity / Expiry Date' },
      { name: 'status_note', type: 'TEXT', description: 'Urgency flag / Expiry tracking' },
      // File Attachment Hosting fields (stored in Supabase Storage bucket: 'vault_documents')
      { name: 'attachment_id', type: 'TEXT', description: 'Attachment ID' },
      { name: 'attachment_file_name', type: 'TEXT', description: 'Stored file name' },
      { name: 'attachment_original_name', type: 'TEXT', description: 'Original uploaded filename' },
      { name: 'attachment_file_size', type: 'BIGINT', description: 'File size in bytes' },
      { name: 'attachment_mime_type', type: 'TEXT', description: 'MIME type (PDF, PNG, JPG, etc.)' },
      { name: 'attachment_storage_path', type: 'TEXT', description: 'Path in vault_documents storage bucket' },
      { name: 'attachment_file_url', type: 'TEXT', description: 'Public or signed storage URL' },
      { name: 'attachment_uploaded_at', type: 'TIMESTAMPTZ', description: 'File upload timestamp' },
      { name: 'created_at', type: 'TIMESTAMPTZ', description: 'Row creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', description: 'Last modified timestamp' },
    ],
  },
  {
    sectionKey: 'onlineAccounts',
    tableName: 'online_accounts',
    title: 'Online Financial & Broker Portals',
    needsTable: true,
    needsDocHosting: false,
    description: 'Brokerage & investment platforms: Zerodha, CDSL, Golden Pi, Wint Wealth.',
    columns: [
      { name: 'id', type: 'TEXT', description: 'Unique ID', isPrimary: true },
      { name: 'sr_no', type: 'INT', description: 'Sequential serial number' },
      { name: 'platform', type: 'TEXT', description: 'Platform / Portal name' },
      { name: 'email', type: 'TEXT', description: 'Registered email' },
      { name: 'mobile', type: 'TEXT', description: 'Registered mobile' },
      { name: 'account_id', type: 'TEXT', description: 'Login ID / Demat BO ID' },
      { name: 'remarks', type: 'TEXT', description: 'Notes on portal' },
      { name: 'created_at', type: 'TIMESTAMPTZ', description: 'Row creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', description: 'Last modified timestamp' },
    ],
  },
  {
    sectionKey: 'investments',
    tableName: 'investment_accounts',
    title: 'Investment Accounts',
    needsTable: true,
    needsDocHosting: false,
    description: 'Mutual Funds, Fixed Deposits, Shares Demat, PPF, EPF, Bonds, SGB.',
    columns: [
      { name: 'id', type: 'TEXT', description: 'Unique ID', isPrimary: true },
      { name: 'sr_no', type: 'INT', description: 'Sequential serial number' },
      { name: 'investment_type', type: 'TEXT', description: 'Type: Mutual Funds, FD, Demat, PPF, etc.' },
      { name: 'platform', type: 'TEXT', description: 'Institution or Broker' },
      { name: 'account_holder_name', type: 'TEXT', description: 'Primary Account Holder' },
      { name: 'agent_or_advisor', type: 'TEXT', description: 'Agent / Advisor name' },
      { name: 'account_number', type: 'TEXT', description: 'Account / Folio Number' },
      { name: 'nominee', type: 'TEXT', description: 'Registered Nominee' },
      { name: 'maturity_date', type: 'TEXT', description: 'Maturity or lock-in date' },
      { name: 'linked_bank', type: 'TEXT', description: 'Payout linked bank account' },
      { name: 'reg_mobile', type: 'TEXT', description: 'Registered phone' },
      { name: 'reg_email', type: 'TEXT', description: 'Registered email' },
      { name: 'remarks', type: 'TEXT', description: 'Notes & Folio details' },
      { name: 'created_at', type: 'TIMESTAMPTZ', description: 'Row creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', description: 'Last modified timestamp' },
    ],
  },
  {
    sectionKey: 'insurances',
    tableName: 'insurance_policies',
    title: 'Insurance Policies',
    needsTable: true,
    needsDocHosting: false,
    description: 'Term Life, Health / Mediclaim, Vehicle, and General Insurance policies.',
    columns: [
      { name: 'id', type: 'TEXT', description: 'Unique ID', isPrimary: true },
      { name: 'sr_no', type: 'INT', description: 'Sequential serial number' },
      { name: 'type', type: 'TEXT', description: 'Life, Health, Car, Other' },
      { name: 'policy_name', type: 'TEXT', description: 'Provider & Policy name' },
      { name: 'policy_number', type: 'TEXT', description: 'Policy number' },
      { name: 'covered_person', type: 'TEXT', description: 'Insured person name' },
      { name: 'amount_insured', type: 'TEXT', description: 'Sum assured' },
      { name: 'nominee', type: 'TEXT', description: 'Nominee' },
      { name: 'advisor', type: 'TEXT', description: 'Agent / Advisor contact' },
      { name: 'valid_till', type: 'TEXT', description: 'Policy validity / renewal date' },
      { name: 'premium_amount', type: 'TEXT', description: 'Annual premium amount' },
      { name: 'premium_due_date', type: 'TEXT', description: 'Next premium due date' },
      { name: 'remarks', type: 'TEXT', description: 'Special riders / notes' },
      { name: 'created_at', type: 'TIMESTAMPTZ', description: 'Row creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', description: 'Last modified timestamp' },
    ],
  },
  {
    sectionKey: 'lockers',
    tableName: 'safe_lockers',
    title: 'Safe Deposit Lockers',
    needsTable: true,
    needsDocHosting: false,
    description: 'Bank safe deposit lockers, branch details, key locations, and operators.',
    columns: [
      { name: 'id', type: 'TEXT', description: 'Unique ID', isPrimary: true },
      { name: 'sr_no', type: 'INT', description: 'Sequential serial number' },
      { name: 'bank_and_branch', type: 'TEXT', description: 'Bank and Branch name' },
      { name: 'account_number', type: 'TEXT', description: 'Linked Savings Account number' },
      { name: 'locker_number', type: 'TEXT', description: 'Locker number' },
      { name: 'in_name_of', type: 'TEXT', description: 'Operating mode / Holder' },
      { name: 'nominee', type: 'TEXT', description: 'Nominee' },
      { name: 'code_or_remarks', type: 'TEXT', description: 'Key location instructions' },
      { name: 'created_at', type: 'TIMESTAMPTZ', description: 'Row creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', description: 'Last modified timestamp' },
    ],
  },
  {
    sectionKey: 'cards',
    tableName: 'bank_cards',
    title: 'Debit & Credit Cards',
    needsTable: true,
    needsDocHosting: false,
    description: 'Payment cards, cardholder names, masked numbers, linked accounts, expiry.',
    columns: [
      { name: 'id', type: 'TEXT', description: 'Unique ID', isPrimary: true },
      { name: 'sr_no', type: 'INT', description: 'Sequential serial number' },
      { name: 'name_on_card', type: 'TEXT', description: 'Cardholder name' },
      { name: 'card_type', type: 'TEXT', description: 'Debit or Credit' },
      { name: 'card_number', type: 'TEXT', description: 'Card number (masked or full)' },
      { name: 'cardnumber', type: 'TEXT', description: 'Card number alias' },
      { name: 'linked_account', type: 'TEXT', description: 'Linked bank account' },
      { name: 'reg_mobile', type: 'TEXT', description: 'OTP registered mobile' },
      { name: 'valid_till', type: 'TEXT', description: 'Card expiration date' },
      { name: 'remarks', type: 'TEXT', description: 'Bank notes & PIN hints' },
      { name: 'created_at', type: 'TIMESTAMPTZ', description: 'Row creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', description: 'Last modified timestamp' },
    ],
  },
  {
    sectionKey: 'properties',
    tableName: 'properties',
    title: 'Real Estate Properties',
    needsTable: true,
    needsDocHosting: false,
    description: 'House, apartment, land, commercial properties, and ownership details.',
    columns: [
      { name: 'id', type: 'TEXT', description: 'Unique ID', isPrimary: true },
      { name: 'sr_no', type: 'INT', description: 'Sequential serial number' },
      { name: 'property_name', type: 'TEXT', description: 'Property identifier' },
      { name: 'property_area', type: 'TEXT', description: 'Area / Dimensions' },
      { name: 'owners', type: 'TEXT', description: 'Deed owners' },
      { name: 'registration_number', type: 'TEXT', description: 'Registration / Khata number' },
      { name: 'nominee', type: 'TEXT', description: 'Nominee' },
      { name: 'remarks', type: 'TEXT', description: 'Location & original deed location' },
      { name: 'created_at', type: 'TIMESTAMPTZ', description: 'Row creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', description: 'Last modified timestamp' },
    ],
  },
  {
    sectionKey: 'liabilities',
    tableName: 'liabilities',
    title: 'Liabilities & Loans',
    needsTable: true,
    needsDocHosting: false,
    description: 'Home loans, personal loans, car loans, and repayment terms.',
    columns: [
      { name: 'id', type: 'TEXT', description: 'Unique ID', isPrimary: true },
      { name: 'sr_no', type: 'INT', description: 'Sequential serial number' },
      { name: 'bank_or_lender', type: 'TEXT', description: 'Lender bank / institution' },
      { name: 'liability_type', type: 'TEXT', description: 'Home Loan, Auto Loan, etc.' },
      { name: 'amount', type: 'TEXT', description: 'Principal / Outstanding amount' },
      { name: 'terms', type: 'TEXT', description: 'Tenure, EMI, Interest rate' },
      { name: 'remarks', type: 'TEXT', description: 'Insurance coverage / repayment notes' },
      { name: 'created_at', type: 'TIMESTAMPTZ', description: 'Row creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', description: 'Last modified timestamp' },
    ],
  },
  {
    sectionKey: 'passwords',
    tableName: 'online_passwords',
    title: 'Emergency Access & Digital Master Keys',
    needsTable: true,
    needsDocHosting: false,
    description: 'Master passwords, device unlocking instructions, and designated trusted contacts.',
    columns: [
      { name: 'id', type: 'TEXT', description: 'Unique ID', isPrimary: true },
      { name: 'sr_no', type: 'INT', description: 'Sequential serial number' },
      { name: 'login_kind', type: 'TEXT', description: 'Password Manager, Primary Email, Phone PIN' },
      { name: 'person_aware', type: 'TEXT', description: 'Person aware of master key' },
      { name: 'remarks', type: 'TEXT', description: 'Access procedure' },
      { name: 'instructions', type: 'TEXT', description: 'Detailed recovery instructions' },
      { name: 'created_at', type: 'TIMESTAMPTZ', description: 'Row creation timestamp' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', description: 'Last modified timestamp' },
    ],
  },
];

export const SUPABASE_SQL_SCHEMA = `-- ==============================================================================
-- KUTUMBVAULT: MASTER DATABASE REVAMP SCRIPT FOR SUPABASE
-- Run this in your Supabase SQL Editor:
-- Web URL: https://sup.puppylab.cc/project/default/sql
-- (Or Proxmox LAN: http://192.168.0.2:8000 -> SQL Editor)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- STEP 1: CLEAN DROP OF ANY EXISTING TABLES & VIEWS (Clean Slate Revamp)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.family_members CASCADE;
DROP TABLE IF EXISTS public.important_contacts CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.financial_documents CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.online_accounts CASCADE;
DROP TABLE IF EXISTS public.investment_accounts CASCADE;
DROP TABLE IF EXISTS public.investment_details CASCADE;
DROP TABLE IF EXISTS public.insurance_policies CASCADE;
DROP TABLE IF EXISTS public.safe_lockers CASCADE;
DROP TABLE IF EXISTS public.locker_details CASCADE;
DROP TABLE IF EXISTS public.bank_cards CASCADE;
DROP TABLE IF EXISTS public.card_details CASCADE;
DROP TABLE IF EXISTS public.properties CASCADE;
DROP TABLE IF EXISTS public.property_details CASCADE;
DROP TABLE IF EXISTS public.liabilities CASCADE;
DROP TABLE IF EXISTS public.liability_details CASCADE;
DROP TABLE IF EXISTS public.online_passwords CASCADE;
DROP TABLE IF EXISTS public.passwords CASCADE;

-- ------------------------------------------------------------------------------
-- STEP 2: CREATE ALL 11 PRIMARY TABLES WITH FULL COLUMN SCHEMAS
-- ------------------------------------------------------------------------------

-- 1. Family Members Table
CREATE TABLE public.family_members (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('couple', 'child', 'parent')),
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Important Contacts Table
CREATE TABLE public.important_contacts (
    id TEXT PRIMARY KEY,
    sr_no INT NOT NULL,
    particulars TEXT NOT NULL,
    name TEXT DEFAULT '',
    dob TEXT DEFAULT '',
    mobile TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    remarks TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Financial Documents Table (with Document Hosting metadata)
CREATE TABLE public.financial_documents (
    id TEXT PRIMARY KEY,
    sr_no INT NOT NULL,
    document_name TEXT NOT NULL,
    document_number TEXT DEFAULT '',
    physical_location TEXT DEFAULT '',
    virtual_location TEXT DEFAULT '',
    remarks TEXT DEFAULT '',
    expiry_date TEXT DEFAULT '',
    status_note TEXT DEFAULT '',
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

-- 4. Online Accounts (Investment Portals: Zerodha, CDSL, Golden Pi, Wint Wealth)
CREATE TABLE public.online_accounts (
    id TEXT PRIMARY KEY,
    sr_no INT NOT NULL,
    platform TEXT NOT NULL,
    email TEXT NOT NULL,
    mobile TEXT DEFAULT '',
    account_id TEXT DEFAULT '',
    remarks TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Investment Accounts (MF, FD, Demat, PPF, EPF, SGB)
CREATE TABLE public.investment_accounts (
    id TEXT PRIMARY KEY,
    sr_no INT NOT NULL,
    investment_type TEXT NOT NULL,
    platform TEXT NOT NULL,
    account_holder_name TEXT NOT NULL,
    agent_or_advisor TEXT DEFAULT '',
    account_number TEXT NOT NULL,
    nominee TEXT DEFAULT '',
    maturity_date TEXT DEFAULT '',
    linked_bank TEXT DEFAULT '',
    reg_mobile TEXT DEFAULT '',
    reg_email TEXT DEFAULT '',
    remarks TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Insurance Policies (Life, Health, Vehicle)
CREATE TABLE public.insurance_policies (
    id TEXT PRIMARY KEY,
    sr_no INT NOT NULL,
    type TEXT NOT NULL,
    policy_name TEXT NOT NULL,
    policy_number TEXT NOT NULL,
    covered_person TEXT DEFAULT '',
    amount_insured TEXT DEFAULT '',
    nominee TEXT DEFAULT '',
    advisor TEXT DEFAULT '',
    valid_till TEXT DEFAULT '',
    premium_amount TEXT DEFAULT '',
    premium_due_date TEXT DEFAULT '',
    remarks TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Safe Deposit Lockers
CREATE TABLE public.safe_lockers (
    id TEXT PRIMARY KEY,
    sr_no INT NOT NULL,
    bank_and_branch TEXT NOT NULL,
    account_number TEXT DEFAULT '',
    locker_number TEXT NOT NULL,
    in_name_of TEXT DEFAULT '',
    nominee TEXT DEFAULT '',
    code_or_remarks TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Debit / Credit Cards
CREATE TABLE public.bank_cards (
    id TEXT PRIMARY KEY,
    sr_no INT NOT NULL,
    name_on_card TEXT NOT NULL,
    card_type TEXT NOT NULL,
    card_number TEXT DEFAULT '',
    cardnumber TEXT DEFAULT '',
    linked_account TEXT DEFAULT '',
    reg_mobile TEXT DEFAULT '',
    valid_till TEXT DEFAULT '',
    remarks TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Real Estate Properties
CREATE TABLE public.properties (
    id TEXT PRIMARY KEY,
    sr_no INT NOT NULL,
    property_name TEXT NOT NULL,
    property_area TEXT DEFAULT '',
    owners TEXT DEFAULT '',
    registration_number TEXT DEFAULT '',
    nominee TEXT DEFAULT '',
    remarks TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Liabilities & Loans
CREATE TABLE public.liabilities (
    id TEXT PRIMARY KEY,
    sr_no INT NOT NULL,
    bank_or_lender TEXT NOT NULL,
    liability_type TEXT NOT NULL,
    amount TEXT NOT NULL,
    terms TEXT DEFAULT '',
    remarks TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Emergency Access & Online Passwords
CREATE TABLE public.online_passwords (
    id TEXT PRIMARY KEY,
    sr_no INT NOT NULL,
    login_kind TEXT NOT NULL,
    person_aware TEXT NOT NULL,
    remarks TEXT DEFAULT '',
    instructions TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- STEP 3: DROP UNNECESSARY VIEWS (Prevents 'UNRESTRICTED' warnings in Supabase)
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS public.investment_details CASCADE;
DROP VIEW IF EXISTS public.card_details CASCADE;
DROP VIEW IF EXISTS public.locker_details CASCADE;
DROP VIEW IF EXISTS public.property_details CASCADE;
DROP VIEW IF EXISTS public.liability_details CASCADE;
DROP VIEW IF EXISTS public.contacts CASCADE;
DROP VIEW IF EXISTS public.documents CASCADE;

-- ------------------------------------------------------------------------------
-- STEP 4: STORAGE BUCKET FOR DOCUMENT HOSTING
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault_documents', 'vault_documents', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage access policies
DROP POLICY IF EXISTS "Public Read Vault Documents" ON storage.objects;
CREATE POLICY "Public Read Vault Documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'vault_documents');

DROP POLICY IF EXISTS "Public Upload Vault Documents" ON storage.objects;
CREATE POLICY "Public Upload Vault Documents"
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

-- ------------------------------------------------------------------------------
-- STEP 5: ROW LEVEL SECURITY (RLS) PERMISSIONS
-- ------------------------------------------------------------------------------
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

-- ------------------------------------------------------------------------------
-- STEP 6: RELOAD POSTGREST SCHEMA CACHE (Immediate API refresh)
-- ------------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
`;

export const PROXMOX_SETUP_GUIDE_STEPS = [
  {
    step: 1,
    title: 'Open Supabase SQL Editor',
    description:
      'Open your self-hosted Supabase Studio console at https://sup.puppylab.cc/project/default/sql (or your LAN IP http://192.168.0.2:8000 -> SQL Editor).',
    substeps: [
      'Click "+ New query" in the SQL Editor.',
      'Copy the Master Revamp SQL script provided above.',
      'Paste into the query window and click "Run" (Ctrl+Enter).',
    ],
  },
  {
    step: 2,
    title: 'One-Click Revamp Execution',
    description:
      'The SQL script will cleanly recreate all 11 tables with exact matching columns, configure storage bucket "vault_documents" for PDFs & document attachments, and notify PostgREST to reload its schema cache.',
    substeps: [
      'All 11 sections get dedicated PostgreSQL tables.',
      'Row Level Security policies allow your local anon key full CRUD access.',
      'PostgREST immediately refreshes its internal schema cache with "NOTIFY pgrst".',
    ],
  },
  {
    step: 3,
    title: 'Push All Data from App to Supabase',
    description:
      'Return to this modal and click "Push All Data to Supabase".',
    substeps: [
      'The app will upload all 11 sections into your freshly revamped Supabase database.',
      'From this point onward, every edit you make in any section will also auto-save to Supabase automatically!',
    ],
  },
];
