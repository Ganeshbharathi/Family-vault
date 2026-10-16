import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseDateString,
  checkExpiryStatus,
  calculateReadinessScore,
  maskSensitive,
  searchVault,
  exportVaultToCsv,
} from './vaultCalculations.ts';
import { INITIAL_VAULT_DATA } from '../data/initialVaultData.ts';

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
  const result = calculateReadinessScore(INITIAL_VAULT_DATA);
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
  const res1 = searchVault(INITIAL_VAULT_DATA, 'Zerodha');
  assert.ok(res1.length >= 1);
  assert.ok(res1.some((r) => r.title.includes('Zerodha')));

  const res2 = searchVault(INITIAL_VAULT_DATA, 'Santhi');
  assert.ok(res2.length >= 1);
  assert.ok(res2.some((r) => r.category === 'Contacts' || r.category === 'Investments'));

  const res3 = searchVault(INITIAL_VAULT_DATA, 'Passport');
  assert.ok(res3.some((r) => r.title === 'Passport'));
});

test('exportVaultToCsv formats valid CSV containing all sheet headers', () => {
  const csv = exportVaultToCsv(INITIAL_VAULT_DATA);
  assert.ok(csv.includes('Financial Information and Documents details'));
  assert.ok(csv.includes('Important Contacts for Family'));
  assert.ok(csv.includes('Online Accounts - Related to Finance'));
  assert.ok(csv.includes('Important Financial Documents'));
  assert.ok(csv.includes('CFDPG5192R'));
  assert.ok(csv.includes('Zerodha'));
  assert.ok(csv.includes('Santhi'));
});
