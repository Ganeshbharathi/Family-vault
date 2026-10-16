import type { VaultState, FinancialDocument, ImportantContact, InvestmentAccount } from '../types/vault.ts';

/**
 * Calculates months between a reference date (e.g., Oct 2026) and a given date string.
 * Supports formats like '31-Aug-2027', '8 Jun 2026', '29-Apr-2038', '2026-10-15', etc.
 */
export function parseDateString(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '-' || dateStr.trim() === '') return null;
  const cleaned = dateStr.trim();
  
  // Try direct Date parse
  const direct = new Date(cleaned);
  if (!isNaN(direct.getTime())) {
    return direct;
  }

  // Handle formats like DD-MMM-YYYY (e.g. 31-Aug-2027)
  const parts = cleaned.split(/[-/\s]+/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1].toLowerCase();
    const year = parseInt(parts[2], 10);

    const monthMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
      january: 0, february: 1, march: 2, april: 3, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
    };

    if (!isNaN(day) && !isNaN(year) && monthMap[monthStr] !== undefined) {
      return new Date(year, monthMap[monthStr], day);
    }
  }

  return null;
}

export interface ExpiryStatus {
  status: 'expired' | 'expiring_soon' | 'valid' | 'permanent' | 'unknown';
  monthsRemaining: number | null;
  daysRemaining: number | null;
  label: string;
  isUrgent: boolean;
}

/**
 * Evaluates document or subscription expiration status relative to a reference date.
 * Default reference date is October 15, 2026 (the current sheet date).
 */
export function checkExpiryStatus(
  dateStr?: string,
  referenceDate: Date = new Date(2026, 9, 15)
): ExpiryStatus {
  if (!dateStr || dateStr.trim() === '' || dateStr.trim() === '-') {
    return {
      status: 'permanent',
      monthsRemaining: null,
      daysRemaining: null,
      label: 'Permanent / No Expiry',
      isUrgent: false,
    };
  }

  const parsed = parseDateString(dateStr);
  if (!parsed) {
    return {
      status: 'unknown',
      monthsRemaining: null,
      daysRemaining: null,
      label: 'Unknown Date',
      isUrgent: false,
    };
  }

  const diffMs = parsed.getTime() - referenceDate.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.round(diffDays / 30.4375);

  if (diffDays < 0) {
    return {
      status: 'expired',
      monthsRemaining: diffMonths,
      daysRemaining: diffDays,
      label: `Expired ${Math.abs(diffMonths)} month${Math.abs(diffMonths) === 1 ? '' : 's'} ago`,
      isUrgent: true,
    };
  }

  // Expiring within 12 months (e.g. Passport within 10 months)
  if (diffMonths <= 12) {
    return {
      status: 'expiring_soon',
      monthsRemaining: diffMonths,
      daysRemaining: diffDays,
      label: diffMonths <= 1 ? `Expiring in ${diffDays} days` : `Expiring in ~${diffMonths} months`,
      isUrgent: true,
    };
  }

  const years = Math.floor(diffMonths / 12);
  const remainingMonths = diffMonths % 12;
  return {
    status: 'valid',
    monthsRemaining: diffMonths,
    daysRemaining: diffDays,
    label: `Valid for ~${years}y ${remainingMonths > 0 ? remainingMonths + 'm' : ''}`,
    isUrgent: false,
  };
}

export interface ReadinessCategory {
  name: string;
  weight: number;
  score: number; // 0 to 100
  completed: number;
  total: number;
  actionItems: string[];
}

export interface VaultReadiness {
  overallScore: number; // 0 to 100
  rating: 'Critical Gaps' | 'Moderate Readiness' | 'Well Prepared' | 'Emergency Ready';
  categories: ReadinessCategory[];
  urgentAlerts: {
    title: string;
    description: string;
    category: string;
    severity: 'high' | 'medium';
  }[];
}

/**
 * Computes an Emergency Readiness Score (0-100) based on family vault completeness.
 */
export function calculateReadinessScore(vault: VaultState): VaultReadiness {
  const urgentAlerts: VaultReadiness['urgentAlerts'] = [];

  // 1. Emergency Contacts (Weight 20)
  const requiredContacts = ['Family Doctor', 'MOM', 'Spouse', 'Financial Advisor', 'Lawyer'];
  let filledContacts = 0;
  const missingContactNames: string[] = [];
  requiredContacts.forEach((role) => {
    const found = vault.contacts.find(
      (c) => c.particulars.toLowerCase().includes(role.toLowerCase()) && c.name && c.mobile
    );
    if (found) {
      filledContacts++;
    } else {
      missingContactNames.push(role);
    }
  });

  const contactsScore = Math.round((filledContacts / requiredContacts.length) * 100);
  if (missingContactNames.length > 0) {
    urgentAlerts.push({
      title: 'Missing Essential Emergency Contacts',
      description: `Add contact info for: ${missingContactNames.slice(0, 3).join(', ')}`,
      category: 'Contacts',
      severity: 'medium',
    });
  }

  // 2. Identity & Legal Documents (Weight 25)
  // Must have: PAN, Passport, Aadhar, Driving License, Will
  const criticalDocs = ['PAN Card', 'Aadhar Card', 'Passport', 'Driving License', 'Will'];
  let docsLocated = 0;
  const missingDocs: string[] = [];

  criticalDocs.forEach((docTitle) => {
    const doc = vault.documents.find((d) => d.documentName.toLowerCase() === docTitle.toLowerCase());
    if (doc && (doc.documentNumber || doc.physicalLocation || doc.virtualLocation)) {
      if (docTitle === 'Will' && !doc.physicalLocation && !doc.virtualLocation) {
        missingDocs.push('Will Location');
      } else {
        docsLocated++;
      }
    } else {
      missingDocs.push(docTitle);
    }
  });

  const docsScore = Math.round((docsLocated / criticalDocs.length) * 100);

  // Check document expiries
  vault.documents.forEach((d) => {
    if (d.expiryDate) {
      const exp = checkExpiryStatus(d.expiryDate);
      if (exp.isUrgent) {
        urgentAlerts.push({
          title: `${d.documentName}: ${exp.label}`,
          description: `Document No: ${d.documentNumber || 'N/A'}. Location: ${d.physicalLocation || d.virtualLocation || 'Check file'}`,
          category: 'Documents',
          severity: exp.status === 'expired' ? 'high' : 'medium',
        });
      }
    }
  });

  // 3. Financial & Investment Accounts (Weight 20)
  const hasAccounts = vault.onlineAccounts.length > 0;
  const investmentsWithNominee = vault.investments.filter((i) => i.nominee && i.nominee.trim().length > 0).length;
  const invTotal = vault.investments.length || 1;
  const nomineeScore = Math.round((investmentsWithNominee / invTotal) * 100);
  const accountsScore = Math.round((hasAccounts ? 50 : 0) + nomineeScore * 0.5);

  if (investmentsWithNominee < invTotal) {
    urgentAlerts.push({
      title: 'Pending Investment Nominees',
      description: `${invTotal - investmentsWithNominee} investment accounts do not have nominees assigned.`,
      category: 'Investments',
      severity: 'high',
    });
  }

  // 4. Insurance Protection (Weight 20)
  const hasLife = vault.insurances.some((i) => i.type.toLowerCase() === 'life' && i.policyNumber);
  const hasHealth = vault.insurances.some((i) => i.type.toLowerCase() === 'health' && i.policyNumber);
  let insCount = 0;
  if (hasLife) insCount++;
  if (hasHealth) insCount++;
  const insScore = Math.round((insCount / 2) * 100);

  if (!hasHealth) {
    urgentAlerts.push({
      title: 'Health Insurance / Mediclaim Untracked',
      description: 'Record your health insurance policy number and cashless card location for hospitalization.',
      category: 'Insurance',
      severity: 'high',
    });
  }

  // 5. Emergency Passwords & Locker Access (Weight 15)
  const pwdCount = vault.passwords.filter((p) => p.personAware && p.personAware.trim().length > 0).length;
  const lockerConfigured = vault.lockers.length > 0 && vault.lockers.some((l) => l.lockerNumber && l.nominee);
  const accessScore = Math.round((pwdCount >= 2 ? 60 : 30) + (lockerConfigured ? 40 : 0));

  // Category breakdown
  const categories: ReadinessCategory[] = [
    {
      name: 'Emergency Contacts',
      weight: 20,
      score: contactsScore,
      completed: filledContacts,
      total: requiredContacts.length,
      actionItems: missingContactNames.map((n) => `Fill details for ${n}`),
    },
    {
      name: 'Essential Documents & IDs',
      weight: 25,
      score: docsScore,
      completed: docsLocated,
      total: criticalDocs.length,
      actionItems: missingDocs.map((d) => `Locate & record ${d}`),
    },
    {
      name: 'Investments & Nominees',
      weight: 20,
      score: accountsScore,
      completed: investmentsWithNominee,
      total: invTotal,
      actionItems: investmentsWithNominee < invTotal ? ['Add nominees to all investment accounts'] : [],
    },
    {
      name: 'Insurance Cover',
      weight: 20,
      score: insScore,
      completed: insCount,
      total: 2,
      actionItems: !hasHealth ? ['Add Health Insurance details'] : [],
    },
    {
      name: 'Digital Access & Locker Safe',
      weight: 15,
      score: accessScore,
      completed: pwdCount,
      total: 3,
      actionItems: pwdCount < 3 ? ['Ensure trusted person knows master vault unlock instructions'] : [],
    },
  ];

  // Weighted overall calculation
  const weightedSum = categories.reduce((sum, cat) => sum + cat.score * (cat.weight / 100), 0);
  const overallScore = Math.round(weightedSum);

  let rating: VaultReadiness['rating'] = 'Critical Gaps';
  if (overallScore >= 80) rating = 'Emergency Ready';
  else if (overallScore >= 65) rating = 'Well Prepared';
  else if (overallScore >= 45) rating = 'Moderate Readiness';

  return {
    overallScore,
    rating,
    categories,
    urgentAlerts,
  };
}

/**
 * Formats/masks sensitive numbers like Aadhar, Cards, Account numbers.
 */
export function maskSensitive(value: string, isMasked: boolean, type: 'aadhar' | 'card' | 'pan' | 'account' | 'generic' = 'generic'): string {
  if (!isMasked || !value) return value;
  const trimmed = value.trim();

  if (type === 'aadhar') {
    // 7747 7836 9898 -> •••• •••• 9898
    const digitsOnly = trimmed.replace(/\s+/g, '');
    if (digitsOnly.length >= 8) {
      const last4 = digitsOnly.slice(-4);
      return `•••• •••• ${last4}`;
    }
  }

  if (type === 'card') {
    const digitsOnly = trimmed.replace(/\s+/g, '');
    if (digitsOnly.length >= 4) {
      const last4 = digitsOnly.slice(-4);
      return `•••• •••• •••• ${last4}`;
    }
  }

  if (type === 'pan') {
    // CFDPG5192R -> CFD•••••2R
    if (trimmed.length === 10) {
      return `${trimmed.slice(0, 3)}•••••${trimmed.slice(-2)}`;
    }
  }

  if (type === 'account') {
    if (trimmed.length > 4) {
      return `••••••••${trimmed.slice(-4)}`;
    }
  }

  // Generic: leave last 3 characters visible if length > 5
  if (trimmed.length > 5) {
    return '•'.repeat(trimmed.length - 3) + trimmed.slice(-3);
  }

  return '••••••';
}

import type { TabKey } from '../components/Sidebar.tsx';

/**
 * Universal search across all items in the vault.
 */
export interface SearchResultItem {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  tag: string;
  tabKey: TabKey;
}

export function searchVault(vault: VaultState, query: string): SearchResultItem[] {
  if (!query || query.trim().length === 0) return [];
  const q = query.toLowerCase().trim();
  const results: SearchResultItem[] = [];

  // Contacts
  vault.contacts.forEach((c) => {
    const match =
      c.particulars.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.mobile.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.remarks && c.remarks.toLowerCase().includes(q));
    if (match) {
      results.push({
        id: c.id,
        category: 'Contacts',
        title: c.name || c.particulars,
        subtitle: `${c.particulars} · ${c.mobile || 'No phone'} · ${c.email || ''}`,
        tag: 'Contact',
        tabKey: 'contacts',
      });
    }
  });

  // Documents
  vault.documents.forEach((d) => {
    const match =
      d.documentName.toLowerCase().includes(q) ||
      d.documentNumber.toLowerCase().includes(q) ||
      d.physicalLocation.toLowerCase().includes(q) ||
      d.virtualLocation.toLowerCase().includes(q) ||
      (d.remarks && d.remarks.toLowerCase().includes(q));
    if (match) {
      results.push({
        id: d.id,
        category: 'Documents',
        title: d.documentName,
        subtitle: `No: ${d.documentNumber || 'Unassigned'} · Loc: ${d.physicalLocation || d.virtualLocation || 'Not filed'}`,
        tag: 'Document',
        tabKey: 'documents',
      });
    }
  });

  // Online Accounts
  vault.onlineAccounts.forEach((oa) => {
    const match =
      oa.platform.toLowerCase().includes(q) ||
      oa.email.toLowerCase().includes(q) ||
      oa.mobile.toLowerCase().includes(q) ||
      (oa.accountId && oa.accountId.toLowerCase().includes(q)) ||
      (oa.remarks && oa.remarks.toLowerCase().includes(q));
    if (match) {
      results.push({
        id: oa.id,
        category: 'Online Accounts',
        title: oa.platform,
        subtitle: `${oa.email} · Acc/BO ID: ${oa.accountId || 'None'}`,
        tag: 'Account',
        tabKey: 'investments',
      });
    }
  });

  // Insurances
  vault.insurances.forEach((ins) => {
    const match =
      ins.type.toLowerCase().includes(q) ||
      ins.policyName.toLowerCase().includes(q) ||
      ins.policyNumber.toLowerCase().includes(q) ||
      ins.coveredPerson.toLowerCase().includes(q) ||
      ins.nominee.toLowerCase().includes(q);
    if (match) {
      results.push({
        id: ins.id,
        category: 'Insurance',
        title: `${ins.type} Insurance - ${ins.policyName}`,
        subtitle: `Policy: ${ins.policyNumber} · Insured: ${ins.amountInsured} · Nominee: ${ins.nominee}`,
        tag: 'Policy',
        tabKey: 'insurance',
      });
    }
  });

  // Investments
  vault.investments.forEach((inv) => {
    const match =
      inv.investmentType.toLowerCase().includes(q) ||
      inv.platform.toLowerCase().includes(q) ||
      inv.accountNumber.toLowerCase().includes(q) ||
      inv.nominee.toLowerCase().includes(q) ||
      (inv.remarks && inv.remarks.toLowerCase().includes(q));
    if (match) {
      results.push({
        id: inv.id,
        category: 'Investments',
        title: `${inv.investmentType} (${inv.platform})`,
        subtitle: `Folio/Acc: ${inv.accountNumber} · Nominee: ${inv.nominee}`,
        tag: 'Investment',
        tabKey: 'investments',
      });
    }
  });

  // Lockers
  vault.lockers.forEach((loc) => {
    const match =
      loc.bankAndBranch.toLowerCase().includes(q) ||
      loc.lockerNumber.toLowerCase().includes(q) ||
      loc.nominee.toLowerCase().includes(q) ||
      (loc.codeOrRemarks && loc.codeOrRemarks.toLowerCase().includes(q));
    if (match) {
      results.push({
        id: loc.id,
        category: 'Locker',
        title: `Locker ${loc.lockerNumber} - ${loc.bankAndBranch}`,
        subtitle: `Nominee: ${loc.nominee} · ${loc.codeOrRemarks || ''}`,
        tag: 'Locker',
        tabKey: 'banking',
      });
    }
  });

  // Passwords
  vault.passwords.forEach((pwd) => {
    const match =
      pwd.loginKind.toLowerCase().includes(q) ||
      pwd.personAware.toLowerCase().includes(q) ||
      (pwd.remarks && pwd.remarks.toLowerCase().includes(q)) ||
      (pwd.instructions && pwd.instructions.toLowerCase().includes(q));
    if (match) {
      results.push({
        id: pwd.id,
        category: 'Security & Access',
        title: pwd.loginKind,
        subtitle: `Aware: ${pwd.personAware} · ${pwd.remarks || ''}`,
        tag: 'Access',
        tabKey: 'passwords',
      });
    }
  });

  return results;
}

/**
 * Exports the current vault state back to a well-formatted CSV matching the original sheet format.
 */
export function exportVaultToCsv(vault: VaultState): string {
  const lines: string[] = [];

  lines.push(`${vault.currentDate},Financial Information and Documents details,,,,,,,,,,`);
  lines.push(`^ current date,What my Family should know:,,,,,,,,,,`);
  lines.push(`,Names of Family Members,,,,,,,,,,`);
  lines.push(`,Sr.No.,Couple Names,Dependent Children,Dependent Parents,,,,,,,`);
  vault.familyMembers.forEach((fm, idx) => {
    const couple = fm.category === 'couple' ? fm.name : '';
    const child = fm.category === 'child' ? fm.name : '';
    const parent = fm.category === 'parent' ? fm.name : '';
    lines.push(`,${idx + 1},${couple},${child},${parent},,,,,,,`);
  });
  lines.push(`,,,,,,,,,,,`);

  lines.push(`,Important Contacts for Family,,,,,,,,,,`);
  lines.push(`,Sr.No.,Particulars,Name of Contact,Mobile,Email,Address,Remarks,,,,`);
  vault.contacts.forEach((c) => {
    lines.push(`,${c.srNo},"${c.particulars}","${c.name}","${c.mobile}","${c.email}","${c.address || ''}","${c.remarks || ''}",,,,`);
  });
  lines.push(`,,,,,,,,,,,`);

  lines.push(`,Online Accounts - Related to Finance,,,,,,,,,,`);
  lines.push(`,Sr. No.,Platform,Email Id & mobile: 9787004065,,Remarks,,,,,,`);
  vault.onlineAccounts.forEach((oa) => {
    lines.push(`,${oa.srNo},"${oa.platform}","${oa.email}","${oa.accountId || ''}","${oa.remarks || ''}",,,,,`);
  });
  lines.push(`,,,,,,,,,,,`);

  lines.push(`,Important Financial Documents,,,,,,Current year,${vault.currentYear},,,`);
  lines.push(`,S.No.,Document,Document Number,,Doc Location (Physical),Doc Location (Virtual),Remarks,,,Expire soon? True/False`);
  vault.documents.forEach((d) => {
    lines.push(`,${d.srNo},"${d.documentName}","${d.documentNumber}",,"${d.physicalLocation}","${d.virtualLocation}","${d.remarks || ''}",,,"${d.statusNote || ''}"`);
  });
  lines.push(`,,,,,,,,,,,`);

  lines.push(`,Locker Details,,,,,,,,,,`);
  lines.push(`,Sr. No.,Bank Name & Branch,Bank Account Number,Locker No.,In the Name of,Code/Remarks,Nominee,Remarks,,,`);
  vault.lockers.forEach((l) => {
    lines.push(`,${l.srNo},"${l.bankAndBranch}","${l.accountNumber}","${l.lockerNumber}","${l.inNameOf}","${l.codeOrRemarks || ''}","${l.nominee}",,,,`);
  });
  lines.push(`,,,,,,,,,,,`);

  lines.push(`,Online Passwords,,,,,,,,,,`);
  lines.push(`,Sr. No.,Login Kind,Person who is aware of Password,,Remarks,,,,,,`);
  vault.passwords.forEach((p) => {
    lines.push(`,${p.srNo},"${p.loginKind}","${p.personAware}",,"${p.remarks || ''}",,,,,`);
  });
  lines.push(`,,,,,,,,,,,`);

  lines.push(`,"Life, Health and Other Insurance Policies - Basic details",,,,,,,,,,`);
  lines.push(`,Sr. No.,Type of Policy,Name of the policy,Policy No.,Name of the Covered,Amount Insured,Nominee,Advisor,,,`);
  vault.insurances.forEach((ins) => {
    lines.push(`,${ins.srNo},"${ins.type}","${ins.policyName}","${ins.policyNumber}","${ins.coveredPerson}","${ins.amountInsured}","${ins.nominee}","${ins.advisor || ''}",,,`);
  });
  lines.push(`,,,,,,,,,,,`);

  lines.push(`,Debit / Credit Card Details,,,,,,,,,,`);
  lines.push(`,Sr. No.,Name on card,Card Type,Card Number,Linked Account,Registered Mobile No.,Valid Till,Remarks,,,`);
  vault.cards.forEach((card) => {
    lines.push(`,${card.srNo},"${card.nameOnCard}","${card.cardType}","${card.cardNumber}","${card.linkedAccount}","${card.regMobile}","${card.validTill || ''}","${card.remarks || ''}",,,`);
  });
  lines.push(`,,,,,,,,,,,`);

  lines.push(`,Property Details,,,,,,,,,,`);
  lines.push(`,Sr. No.,Property Name,Property Area,Name of Owners,Registration No.,Nominee (If Any),Remarks,,,,`);
  vault.properties.forEach((prop) => {
    lines.push(`,${prop.srNo},"${prop.propertyName}","${prop.propertyArea}","${prop.owners}","${prop.registrationNumber}","${prop.nominee || ''}","${prop.remarks || ''}",,,,`);
  });
  lines.push(`,,,,,,,,,,,`);

  lines.push(`,Liability details,,,,,,,,,,`);
  lines.push(`,Sr. No.,Bank/Lender,Type of liability,Amount,Terms,Remarks,,,,,`);
  vault.liabilities.forEach((lia) => {
    lines.push(`,${lia.srNo},"${lia.bankOrLender}","${lia.liabilityType}","${lia.amount}","${lia.terms}","${lia.remarks || ''}",,,,,`);
  });
  lines.push(`,,,,,,,,,,,`);

  lines.push(`,Investment Account Details - Part 1 & Part 2,,,,,,,,,,`);
  lines.push(`,Sr. No.,Investment Account Type,Platform,Account Holder Name,Agent / Advisor,Account No. ,Nominee/s,Maturity,Linked Bank,Regd. Mobile,Regd. Email`);
  vault.investments.forEach((inv) => {
    lines.push(`,${inv.srNo},"${inv.investmentType}","${inv.platform}","${inv.accountHolderName}","${inv.agentOrAdvisor || ''}","${inv.accountNumber}","${inv.nominee}","${inv.maturityDate || ''}","${inv.linkedBank || ''}","${inv.regMobile}","${inv.regEmail}"`);
  });

  return lines.join('\n');
}
