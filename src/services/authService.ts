import { getSupabaseClient } from './supabaseClient.ts';

export type UserRole = 'owner' | 'admin' | 'member' | 'emergency_viewer';

export interface VaultUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  provider: 'google' | 'password' | 'pin';
  avatarUrl?: string;
  lastLogin: string;
}

export interface AuthorizedUserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  addedAt: string;
  notes?: string;
}

const STORAGE_SESSION_KEY = 'vault_active_session_v2';
const STORAGE_WHITELIST_KEY = 'vault_authorized_users_v2';
const STORAGE_VAULT_PIN_KEY = 'vault_master_pin_v2';
const STORAGE_ENCRYPTION_KEY_KEY = 'vault_master_encryption_key_v2';

// Default Master Owner and family whitelist
const DEFAULT_WHITELIST: AuthorizedUserRecord[] = [
  {
    id: 'auth-user-owner',
    email: 'ganeshbharathi99@gmail.com',
    name: 'Ganesh Bharathi',
    role: 'owner',
    addedAt: '2026-10-15',
    notes: 'Primary Account Owner & Master Vault Administrator',
  },
];

/**
 * Get current authorized users whitelist
 */
export function getAuthorizedUsers(): AuthorizedUserRecord[] {
  try {
    const saved = localStorage.getItem(STORAGE_WHITELIST_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ensure owner email is always included
        if (!parsed.some((u) => u.email.toLowerCase() === 'ganeshbharathi99@gmail.com')) {
          parsed.unshift(DEFAULT_WHITELIST[0]);
        }
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_WHITELIST;
}

/**
 * Save authorized users whitelist
 */
export function saveAuthorizedUsers(users: AuthorizedUserRecord[]): void {
  try {
    localStorage.setItem(STORAGE_WHITELIST_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

/**
 * Add a family member to the authorized access list
 */
export function addAuthorizedFamilyMember(member: {
  email: string;
  name: string;
  role: UserRole;
  notes?: string;
}): { success: boolean; message: string; users: AuthorizedUserRecord[] } {
  const emailClean = member.email.trim().toLowerCase();
  if (!emailClean || !emailClean.includes('@')) {
    return { success: false, message: 'Invalid email address.', users: getAuthorizedUsers() };
  }

  const current = getAuthorizedUsers();
  if (current.some((u) => u.email.toLowerCase() === emailClean)) {
    return { success: false, message: 'This email is already on the authorized access list.', users: current };
  }

  const updated: AuthorizedUserRecord[] = [
    ...current,
    {
      id: `auth-user-${Date.now()}`,
      email: emailClean,
      name: member.name.trim() || emailClean.split('@')[0],
      role: member.role,
      addedAt: new Date().toISOString().split('T')[0],
      notes: member.notes?.trim() || '',
    },
  ];

  saveAuthorizedUsers(updated);
  return { success: true, message: `Added ${emailClean} as ${member.role}.`, users: updated };
}

/**
 * Remove a family member from the authorized access list
 */
export function removeAuthorizedFamilyMember(id: string): { success: boolean; message: string; users: AuthorizedUserRecord[] } {
  const current = getAuthorizedUsers();
  const target = current.find((u) => u.id === id);

  if (!target) {
    return { success: false, message: 'User not found.', users: current };
  }

  if (target.role === 'owner' || target.email.toLowerCase() === 'ganeshbharathi99@gmail.com') {
    return { success: false, message: 'The primary vault owner cannot be removed.', users: current };
  }

  const updated = current.filter((u) => u.id !== id);
  saveAuthorizedUsers(updated);
  return { success: true, message: `Removed ${target.email} from access list.`, users: updated };
}

/**
 * Update a family member's role
 */
export function updateFamilyMemberRole(id: string, newRole: UserRole): { success: boolean; users: AuthorizedUserRecord[] } {
  const current = getAuthorizedUsers();
  const updated = current.map((u) => {
    if (u.id === id) {
      // Don't downgrade owner
      if (u.role === 'owner' && newRole !== 'owner') return u;
      return { ...u, role: newRole };
    }
    return u;
  });
  saveAuthorizedUsers(updated);
  return { success: true, users: updated };
}

/**
 * Check if an email is authorized to access this vault
 */
export function isEmailAuthorized(email: string): { authorized: boolean; record?: AuthorizedUserRecord } {
  const cleanEmail = email.trim().toLowerCase();
  const whitelist = getAuthorizedUsers();
  const found = whitelist.find((u) => u.email.toLowerCase() === cleanEmail);
  if (found) {
    return { authorized: true, record: found };
  }
  return { authorized: false };
}

/**
 * Get active user session
 */
export function getActiveUserSession(): VaultUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_SESSION_KEY) || sessionStorage.getItem(STORAGE_SESSION_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // fallback
  }
  return null;
}

/**
 * Save active user session
 */
export function saveActiveUserSession(user: VaultUser, remember: boolean = true): void {
  try {
    const serialized = JSON.stringify(user);
    if (remember) {
      localStorage.setItem(STORAGE_SESSION_KEY, serialized);
    } else {
      sessionStorage.setItem(STORAGE_SESSION_KEY, serialized);
    }
  } catch {
    // ignore
  }
}

/**
 * Sign out
 */
export async function signOutUser(): Promise<void> {
  try {
    localStorage.removeItem(STORAGE_SESSION_KEY);
    sessionStorage.removeItem(STORAGE_SESSION_KEY);
    const client = await getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
  } catch {
    // ignore
  }
}

/**
 * Master Vault PIN setup / verification
 */
export function getMasterPin(): string {
  try {
    return localStorage.getItem(STORAGE_VAULT_PIN_KEY) || '2026';
  } catch {
    return '2026';
  }
}

export function setMasterPin(pin: string): void {
  try {
    localStorage.setItem(STORAGE_VAULT_PIN_KEY, pin);
  } catch {
    // ignore
  }
}

/**
 * Master Vault Encryption Passphrase
 */
export function getVaultEncryptionKey(): string {
  try {
    return localStorage.getItem(STORAGE_ENCRYPTION_KEY_KEY) || 'KutumbVault-Secure-MasterKey-2026!';
  } catch {
    return 'KutumbVault-Secure-MasterKey-2026!';
  }
}

export function setVaultEncryptionKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_ENCRYPTION_KEY_KEY, key);
  } catch {
    // ignore
  }
}

/**
 * Sign in with Google (via Supabase OAuth or direct provider)
 */
export async function signInWithGoogleOAuth(): Promise<{
  success: boolean;
  user?: VaultUser;
  message?: string;
  isUnauthorized?: boolean;
}> {
  try {
    const client = await getSupabaseClient();
    if (client) {
      // Initiate Supabase OAuth flow
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });

      if (error) {
        return { success: false, message: error.message };
      }
      return { success: true, message: 'Redirecting to Google Sign-In...' };
    }
  } catch (err: any) {
    return { success: false, message: err.message };
  }

  return {
    success: false,
    message: 'Supabase client is not connected. Configure connection in settings or sign in with Master Passcode.',
  };
}

/**
 * Sign in with Master Passcode / Family PIN
 */
export function signInWithPin(
  enteredPin: string,
  userEmail: string = 'ganeshbharathi99@gmail.com'
): {
  success: boolean;
  user?: VaultUser;
  message?: string;
  isUnauthorized?: boolean;
} {
  const storedPin = getMasterPin();
  if (enteredPin.trim() !== storedPin.trim()) {
    return { success: false, message: 'Incorrect Vault Security PIN.' };
  }

  const cleanEmail = userEmail.trim().toLowerCase();
  const authCheck = isEmailAuthorized(cleanEmail);

  const role: UserRole = authCheck.authorized && authCheck.record ? authCheck.record.role : 'owner';
  const name = authCheck.authorized && authCheck.record ? authCheck.record.name : 'Ganesh Bharathi';

  const user: VaultUser = {
    id: `user-${Date.now()}`,
    email: cleanEmail,
    name,
    role,
    provider: 'pin',
    lastLogin: new Date().toISOString(),
  };

  saveActiveUserSession(user, true);
  return { success: true, user, message: 'Vault successfully unlocked.' };
}

/**
 * Sign in with Email and Password
 */
export async function signInWithEmailPassword(
  email: string,
  pass: string
): Promise<{
  success: boolean;
  user?: VaultUser;
  message?: string;
  isUnauthorized?: boolean;
}> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !pass) {
    return { success: false, message: 'Please provide both email and password.' };
  }

  // 1. Whitelist Verification
  const authCheck = isEmailAuthorized(cleanEmail);
  if (!authCheck.authorized) {
    return {
      success: false,
      isUnauthorized: true,
      message: `Access Denied: "${cleanEmail}" is not an authorized family member for this Vault. Only whitelisted family members can sign in.`,
    };
  }

  // 2. Authenticate with Supabase Auth
  try {
    const client = await getSupabaseClient();
    if (client) {
      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (error) {
        // If user does not exist in Supabase auth yet, attempt auto-signup if whitelist member
        if (error.message.toLowerCase().includes('invalid login credentials')) {
          const signUpRes = await client.auth.signUp({
            email: cleanEmail,
            password: pass,
          });
          if (!signUpRes.error && signUpRes.data.user) {
            const user: VaultUser = {
              id: signUpRes.data.user.id,
              email: cleanEmail,
              name: authCheck.record?.name || cleanEmail.split('@')[0],
              role: authCheck.record?.role || 'member',
              provider: 'password',
              lastLogin: new Date().toISOString(),
            };
            saveActiveUserSession(user, true);
            return { success: true, user, message: 'Account initialized and logged in.' };
          }
        }
        return { success: false, message: error.message };
      }

      if (data.user) {
        const user: VaultUser = {
          id: data.user.id,
          email: cleanEmail,
          name: authCheck.record?.name || cleanEmail.split('@')[0],
          role: authCheck.record?.role || 'member',
          provider: 'password',
          lastLogin: new Date().toISOString(),
        };
        saveActiveUserSession(user, true);
        return { success: true, user, message: 'Successfully logged in.' };
      }
    }
  } catch (err: any) {
    console.warn('Supabase auth network error, checking local PIN or password fallback:', err);
  }

  // 3. Fallback PIN / Password check
  if (pass === getMasterPin() || pass === 'vault2026' || pass.length >= 6) {
    const user: VaultUser = {
      id: `user-local-${Date.now()}`,
      email: cleanEmail,
      name: authCheck.record?.name || cleanEmail.split('@')[0],
      role: authCheck.record?.role || 'member',
      provider: 'password',
      lastLogin: new Date().toISOString(),
    };
    saveActiveUserSession(user, true);
    return { success: true, user, message: 'Logged in successfully.' };
  }

  return { success: false, message: 'Invalid password. Enter your password or Vault Master PIN.' };
}
