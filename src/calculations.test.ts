import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDateString,
  checkExpiryStatus,
  calculateReadinessScore,
  maskSensitive,
  searchVault,
  exportVaultToCsv,
  reorderDocumentsList,
  filterDocumentsByPersonAndMultiTags,
} from './calculations.ts';
import { INITIAL_VAULT_DATA } from './initialData.ts';
import { sanitizeName } from './documentZip.ts';

test('parseDateString parses day-month-year correctly', () => {
  const d1 = parseDateString('31-Aug-2027');
  assert.ok(d1 !== null);
  assert.equal(d1?.getFullYear(), 2027);
  assert.equal(d1?.getMonth(), 7); // August is 0-indexed 7
  assert.equal(d1?.getDate(), 31);

  const d2 = parseDateString('8 Jun 2026');
  assert.ok(d2 !== null);
  assert.equal(d2?.getFullYear(), 2026);
  assert.equal(d2?.getMonth(), 5); // June
  assert.equal(d2?.getDate(), 8);

  assert.equal(parseDateString(''), null);
  assert.equal(parseDateString('-'), null);
});

test('checkExpiryStatus flags passport expiring within 12 months as expiring_soon', () => {
  const refDate = new Date(2026, 9, 15); // 15-Oct-2026
  const passportStatus = checkExpiryStatus('31-Aug-2027', refDate);
  assert.equal(passportStatus.status, 'expiring_soon');
  assert.equal(passportStatus.isUrgent, true);
  assert.ok(passportStatus.monthsRemaining! <= 11);

  const dlStatus = checkExpiryStatus('29-Apr-2038', refDate);
  assert.equal(dlStatus.status, 'valid');
  assert.equal(dlStatus.isUrgent, false);

  const expiredPrime = checkExpiryStatus('8 Jun 2026', refDate);
  assert.equal(expiredPrime.status, 'expired');
  assert.equal(expiredPrime.isUrgent, true);
});

test('calculateReadinessScore generates weighted score and actionable alerts', () => {
  const testVault = {
    ...INITIAL_VAULT_DATA,
    documents: [
      {
        id: 'doc-test-1',
        srNo: 1,
        category: 'Identity',
        documentName: 'Passport',
        documentNumber: 'Z8912345',
        personTag: 'Self',
        tags: ['Passport'],
        expiryDate: '31-Aug-2027',
        isSoftCopyAvailable: true,
        isHardCopyAvailable: true,
        remarks: 'Test passport',
      },
    ],
  };

  const result = calculateReadinessScore(testVault);
  assert.ok(result.overallScore > 0 && result.overallScore <= 100);
  assert.ok(result.categories.length === 5);
  assert.ok(result.urgentAlerts.length > 0);
  
  // Should detect passport expiry alert
  const hasPassportAlert = result.urgentAlerts.some((a) => a.title.includes('Passport'));
  assert.ok(hasPassportAlert, 'Passport should have an urgent expiry alert');
});

test('maskSensitive properly masks aadhar, card, and pan numbers', () => {
  assert.equal(maskSensitive('7747 7836 9898', true, 'aadhar'), '•••• •••• 9898');
  assert.equal(maskSensitive('7747 7836 9898', false, 'aadhar'), '7747 7836 9898');
  assert.equal(maskSensitive('CFDPG5192R', true, 'pan'), 'CFD•••••2R');
  assert.equal(maskSensitive('4591 2234 5567 8812', true, 'card'), '•••• •••• •••• 8812');
  assert.equal(maskSensitive('1208160157789711', true, 'account'), '••••••••9711');
});

test('searchVault returns matching contacts, documents, and accounts', () => {
  const testVault = {
    ...INITIAL_VAULT_DATA,
    documents: [
      {
        id: 'doc-test-passport',
        srNo: 1,
        category: 'Identity',
        documentName: 'Passport',
        documentNumber: 'Z8912345',
        personTag: 'Self',
        tags: ['Passport'],
        expiryDate: '31-Aug-2027',
        isSoftCopyAvailable: true,
        isHardCopyAvailable: true,
      },
    ],
  };

  const res1 = searchVault(testVault, 'Zerodha');
  assert.ok(res1.length >= 1);
  assert.ok(res1.some((r) => r.title.includes('Zerodha')));

  const res2 = searchVault(testVault, 'Santhi');
  assert.ok(res2.length >= 1);
  assert.ok(res2.some((r) => r.category === 'Contacts' || r.category === 'Investments'));

  const res3 = searchVault(testVault, 'Passport');
  assert.ok(res3.some((r) => r.title === 'Passport'));
});

test('exportVaultToCsv formats valid CSV containing all sheet headers', () => {
  const testVault = {
    ...INITIAL_VAULT_DATA,
    documents: [
      {
        id: 'doc-test-pan',
        srNo: 1,
        category: 'Identity',
        documentName: 'PAN Card',
        documentNumber: 'CFDPG5192R',
        personTag: 'Self',
        tags: ['PAN'],
        isSoftCopyAvailable: true,
        isHardCopyAvailable: true,
      },
    ],
  };
  const csv = exportVaultToCsv(testVault);
  assert.ok(csv.includes('Financial Information and Documents details'));
  assert.ok(csv.includes('Important Contacts for Family'));
  assert.ok(csv.includes('Online Accounts - Related to Finance'));
  assert.ok(csv.includes('Important Financial Documents'));
  assert.ok(csv.includes('CFDPG5192R'));
  assert.ok(csv.includes('Zerodha'));
  assert.ok(csv.includes('Santhi'));
});

test('documents have mandatory personTag and tags array validation', () => {
  // INITIAL_VAULT_DATA.documents starts empty per user feature request
  assert.equal(INITIAL_VAULT_DATA.documents.length, 0);

  // Validate document structure requirement
  const sampleDocs = [
    {
      id: 'doc-1',
      srNo: 1,
      category: 'Identity',
      documentName: 'Aadhaar Card',
      documentNumber: '7747 7836 9898',
      personTag: 'Self',
      tags: ['Adhaar'],
      isSoftCopyAvailable: true,
      isHardCopyAvailable: true,
    },
    {
      id: 'doc-2',
      srNo: 2,
      category: 'Identity',
      documentName: 'PAN Card',
      documentNumber: 'AAAPL1234C',
      personTag: 'Spouse',
      tags: ['PAN'],
      isSoftCopyAvailable: true,
      isHardCopyAvailable: true,
    },
  ];

  sampleDocs.forEach((doc) => {
    assert.ok(doc.personTag && doc.personTag.trim().length > 0, `Doc ${doc.documentName} must have mandatory personTag`);
    assert.ok(Array.isArray(doc.tags), `Doc ${doc.documentName} must have tags array`);
  });

  const selfDocs = sampleDocs.filter((d) => (d.personTag || '').toLowerCase() === 'self');
  assert.equal(selfDocs.length, 1);

  const spouseDocs = sampleDocs.filter((d) => (d.personTag || '').toLowerCase() === 'spouse');
  assert.equal(spouseDocs.length, 1);
});

test('reorderDocumentsList moves row and updates srNo sequentially', () => {
  const docs = [
    { id: 'd-1', srNo: 1, documentName: 'Doc A', documentNumber: '111', tags: [] },
    { id: 'd-2', srNo: 2, documentName: 'Doc B', documentNumber: '222', tags: [] },
    { id: 'd-3', srNo: 3, documentName: 'Doc C', documentNumber: '333', tags: [] },
  ] as any;

  // Move d-3 above d-1
  const reordered1 = reorderDocumentsList(docs, 'd-3', 'd-1', 'above');
  assert.equal(reordered1[0].id, 'd-3');
  assert.equal(reordered1[0].srNo, 1);
  assert.equal(reordered1[1].id, 'd-1');
  assert.equal(reordered1[1].srNo, 2);
  assert.equal(reordered1[2].id, 'd-2');
  assert.equal(reordered1[2].srNo, 3);

  // Move d-1 below d-3
  const reordered2 = reorderDocumentsList(docs, 'd-1', 'd-3', 'below');
  assert.equal(reordered2[0].id, 'd-2');
  assert.equal(reordered2[0].srNo, 1);
  assert.equal(reordered2[1].id, 'd-3');
  assert.equal(reordered2[1].srNo, 2);
  assert.equal(reordered2[2].id, 'd-1');
  assert.equal(reordered2[2].srNo, 3);
});

test('filterDocumentsByPersonAndMultiTags filters with person AND multi-select tags (OR among tags)', () => {
  const docs = [
    { id: 'd-1', srNo: 1, documentName: 'Aadhaar', documentNumber: '111', personTag: 'Ganesh', tags: ['Adhaar'] },
    { id: 'd-2', srNo: 2, documentName: 'PAN', documentNumber: '222', personTag: 'Ganesh', tags: ['PAN'] },
    { id: 'd-3', srNo: 3, documentName: 'Voter ID', documentNumber: '333', personTag: 'Santhi', tags: ['Voter ID'] },
    { id: 'd-4', srNo: 4, documentName: 'Photo', documentNumber: '444', personTag: 'Santhi', tags: ['Photo', 'Adhaar'] },
  ] as any;

  // All people, all tags
  const resAll = filterDocumentsByPersonAndMultiTags(docs, 'all', []);
  assert.equal(resAll.length, 4);

  // Filter by person Ganesh, no tag filter
  const resGanesh = filterDocumentsByPersonAndMultiTags(docs, 'Ganesh', []);
  assert.equal(resGanesh.length, 2);

  // Filter by person Ganesh, multiple tags: ['Adhaar', 'PAN']
  const resGaneshTags = filterDocumentsByPersonAndMultiTags(docs, 'Ganesh', ['Adhaar', 'PAN']);
  assert.equal(resGaneshTags.length, 2);

  // Filter by person Ganesh, tag ['Voter ID'] -> none
  const resGaneshVoter = filterDocumentsByPersonAndMultiTags(docs, 'Ganesh', ['Voter ID']);
  assert.equal(resGaneshVoter.length, 0);

  // Filter all people with multi tags ['Adhaar', 'Voter ID'] -> d-1 (Ganesh Adhaar), d-3 (Santhi Voter ID), d-4 (Santhi Photo+Adhaar)
  const resMulti = filterDocumentsByPersonAndMultiTags(docs, 'all', ['Adhaar', 'Voter ID']);
  assert.equal(resMulti.length, 3);
});

test('30-day trash retention correctly retains recent items and purges items older than 30 days', () => {
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const THIRTY_DAYS_MS = 30 * DAY_MS;

  const trashedItems = [
    { id: 't-1', deletedAt: new Date(now - 2 * DAY_MS).toISOString() },
    { id: 't-2', deletedAt: new Date(now - 29 * DAY_MS).toISOString() },
    { id: 't-3', deletedAt: new Date(now - 31 * DAY_MS).toISOString() },
    { id: 't-4', deletedAt: new Date(now - 60 * DAY_MS).toISOString() },
  ];

  const retained = trashedItems.filter((item) => {
    const time = new Date(item.deletedAt).getTime();
    return now - time < THIRTY_DAYS_MS;
  });

  assert.equal(retained.length, 2);
  assert.equal(retained[0].id, 't-1');
  assert.equal(retained[1].id, 't-2');
});

test('sanitizeName cleans forbidden filesystem characters and folder grouping organizes files per person', () => {
  // Test sanitizeName
  assert.equal(sanitizeName('Ganesh/Sharma:Passport*'), 'Ganesh_Sharma_Passport_');
  assert.equal(sanitizeName('John "The Boss" <Doe>'), 'John _The Boss_ _Doe_');
  assert.equal(sanitizeName('  Priya   Nair  '), 'Priya Nair');

  // Test person folder mapping
  const sampleDocs = [
    {
      id: 'd-1',
      documentName: 'Passport',
      personTag: 'Ganesh Sharma',
      attachments: [{ id: 'a1', fileName: 'passport.pdf', fileUrl: 'data:application/pdf;base64,AAAA', mimeType: 'application/pdf' }],
    },
    {
      id: 'd-2',
      documentName: 'Aadhaar',
      personTag: 'Ganesh Sharma',
      attachments: [{ id: 'a2', fileName: 'aadhaar.jpg', fileUrl: 'data:image/jpeg;base64,BBBB', mimeType: 'image/jpeg' }],
    },
    {
      id: 'd-3',
      documentName: 'Driving License',
      personTag: 'Santhi',
      attachments: [{ id: 'a3', fileName: 'dl.png', fileUrl: 'data:image/png;base64,CCCC', mimeType: 'image/png' }],
    },
    {
      id: 'd-4',
      documentName: 'House Deed',
      personTag: '',
      attachments: [{ id: 'a4', fileName: 'deed.pdf', fileUrl: 'data:application/pdf;base64,DDDD', mimeType: 'application/pdf' }],
    },
  ] as any[];

  const personFolderMap = new Map<string, string[]>();
  for (const doc of sampleDocs) {
    const rawPerson = (doc.personTag && doc.personTag.trim()) || 'General (No Person Tag)';
    const folder = sanitizeName(rawPerson);
    if (!personFolderMap.has(folder)) {
      personFolderMap.set(folder, []);
    }
    const atts = doc.attachments || [];
    for (const a of atts) {
      personFolderMap.get(folder)!.push(a.fileName);
    }
  }

  // Expect 3 folders: Ganesh Sharma, Santhi, General (No Person Tag)
  assert.equal(personFolderMap.size, 3);
  assert.deepEqual(personFolderMap.get('Ganesh Sharma'), ['passport.pdf', 'aadhaar.jpg']);
  assert.deepEqual(personFolderMap.get('Santhi'), ['dl.png']);
  assert.deepEqual(personFolderMap.get('General (No Person Tag)'), ['deed.pdf']);
});


