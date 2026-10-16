export interface FamilyMember {
  id: string;
  category: 'couple' | 'child' | 'parent';
  name: string;
  relationship: string;
  notes?: string;
}

export interface ImportantContact {
  id: string;
  srNo: number;
  particulars: string; // e.g., 'Self', 'Spouse', 'MOM', 'Family Doctor', etc.
  name: string;
  dob?: string; // Date of birth e.g. '1995-05-15' or '15-May-1995'
  mobile: string;
  email: string;
  address?: string;
  remarks?: string;
}

export interface OnlineAccount {
  id: string;
  srNo: number;
  platform: string;
  email: string;
  mobile: string;
  accountId?: string; // e.g., Zerodha BO ID 12081601 57789711
  remarks?: string;
}

export interface DocumentAttachment {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number; // bytes
  mimeType: string;
  storagePath: string; // Supabase bucket path or storage id
  fileUrl: string; // Public URL, signed URL, or data URI for preview
  uploadedAt: string;
}

export interface FinancialDocument {
  id: string;
  srNo: number;
  documentName: string;
  documentNumber: string;
  physicalLocation: string;
  virtualLocation: string;
  remarks?: string;
  expiryDate?: string; // e.g., '31-Aug-2027', '29-Apr-2038', '8 Jun 2026'
  statusNote?: string; // 'Going to Expire Soon/Next Year' or 'FALSE'
  attachment?: DocumentAttachment;
}

export interface LockerDetail {
  id: string;
  srNo: number;
  bankAndBranch: string;
  accountNumber: string;
  lockerNumber: string;
  inNameOf: string;
  nominee: string;
  codeOrRemarks?: string;
}

export interface OnlinePasswordEntry {
  id: string;
  srNo: number;
  loginKind: string; // 'Personal Email', 'Password Manager', 'Mobile Phone Unlock'
  personAware: string;
  remarks?: string;
  instructions?: string;
}

export interface InsurancePolicy {
  id: string;
  srNo: number;
  type: 'Life' | 'Health' | 'Car' | 'Other' | string;
  policyName: string;
  policyNumber: string;
  coveredPerson: string;
  amountInsured: string; // e.g. "Rs 50,00,000" or raw number
  nominee: string;
  advisor?: string;
  validTill?: string;
  premiumAmount?: string;
  premiumDueDate?: string;
  remarks?: string;
}

export interface CardDetail {
  id: string;
  srNo: number;
  nameOnCard: string;
  cardType: 'Debit' | 'Credit' | string;
  cardNumber: string;
  linkedAccount: string;
  regMobile: string;
  validTill?: string;
  remarks?: string;
}

export interface PropertyDetail {
  id: string;
  srNo: number;
  propertyName: string;
  propertyArea: string;
  owners: string;
  registrationNumber: string;
  nominee?: string;
  remarks?: string;
}

export interface LiabilityDetail {
  id: string;
  srNo: number;
  bankOrLender: string;
  liabilityType: string;
  amount: string;
  terms: string;
  remarks?: string;
}

export interface InvestmentAccount {
  id: string;
  srNo: number;
  investmentType: string; // 'Mutual Funds', 'Fixed Deposits', 'Shares - Demat', 'PPF', 'EPF'
  platform: string;
  accountHolderName: string;
  agentOrAdvisor?: string;
  accountNumber: string;
  nominee: string;
  maturityDate?: string;
  linkedBank?: string;
  regMobile: string;
  regEmail: string;
  remarks?: string;
}

export interface VaultState {
  currentDate: string; // e.g. '15-Oct-2026'
  currentYear: number;
  familyMembers: FamilyMember[];
  contacts: ImportantContact[];
  onlineAccounts: OnlineAccount[];
  documents: FinancialDocument[];
  lockers: LockerDetail[];
  passwords: OnlinePasswordEntry[];
  insurances: InsurancePolicy[];
  cards: CardDetail[];
  properties: PropertyDetail[];
  liabilities: LiabilityDetail[];
  investments: InvestmentAccount[];
}
