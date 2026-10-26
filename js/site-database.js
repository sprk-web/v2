import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config.js';

const MAX_SYNCED_VALUE_BYTES = 256 * 1024;
const APPEARANCE_KEYS = new Set(['sprk-theme', 'sprk-accent', 'theme']);
const SYNC_META_PREFIX = 'sprk-cloud-sync:';
const EXCLUDED_KEY = /auth|token|password|secret|logged.?in|credential|^sb-/i;
const pendingWrites = new Map();
let clientPromise;
let initialized = false;
let activeUserId = null;
let suppressStorageSync = false;
let reloadScheduled = false;

function setCloudStatus(message) {
  const status = document.getElementById('sprk-cloud-status');
  if (status) status.textContent = message;
}

function getClient() {
  if (!clientPromise) {
    clientPromise = new Promise((resolve, reject) => {
      if (window.supabase?.createClient) {
        resolve(window.supabase);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = () => window.supabase?.createClient
        ? resolve(window.supabase)
        : reject(new Error('Supabase client library did not initialize.'));
      script.onerror = () => reject(new Error('Unable to load the Supabase client library.'));
      document.head.append(script);
    }).then(supabaseSdk => supabaseSdk.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
  }
  return clientPromise;
}

function scopeForKey(key) {
  return APPEARANCE_KEYS.has(key) ? 'appearance' : 'site';
}

function metaKey(scope, key) {
  return `${SYNC_META_PREFIX}${scope}:${key}`;
}

function isSyncableKey(key) {
  return !key.startsWith(SYNC_META_PREFIX) && !EXCLUDED_KEY.test(key);
}

function reportError(action, error) {
  console.error(`${action}:`, error);
  setCloudStatus(error.message || 'Cloud sync failed. Your local data is unchanged.');
}

async function upsertLocalValue(client, userId, key) {
  if (!isSyncableKey(key)) return;
  const rawValue = localStorage.getItem(key);
  if (rawValue === null) return;
  if (rawValue.length * 2 > MAX_SYNCED_VALUE_BYTES) {
    setCloudStatus(`"${key}" is too large to sync; it remains saved on this device.`);
    return;
  }

  const scope = scopeForKey(key);
  const { data, error } = await client.from('site_user_data').upsert({
    user_id: userId,
    scope,
    data_key: key,
    data: { raw: rawValue }
  }, { onConflict: 'user_id,scope,data_key' }).select('updated_at').single();
  if (error) throw error;

  try {
    localStorage.setItem(metaKey(scope, key), data.updated_at);
  } catch (error) {
    console.warn('Unable to save cloud sync metadata:', error);
  }
}

function queueUpsert(client, userId, key) {
  if (!isSyncableKey(key)) return;
  const pendingKey = `${userId}:${scopeForKey(key)}:${key}`;
  clearTimeout(pendingWrites.get(pendingKey));
  pendingWrites.set(pendingKey, setTimeout(() => {
    pendingWrites.delete(pendingKey);
    upsertLocalValue(client, userId, key).catch(error => reportError('Unable to sync saved data', error));
  }, 500));
}

async function removeCloudValue(client, userId, key) {
  if (!isSyncableKey(key)) return;
  const scope = scopeForKey(key);
  const { error } = await client.from('site_user_data')
    .delete()
    .eq('user_id', userId)
    .eq('scope', scope)
    .eq('data_key', key);
  if (error) throw error;
  try {
    localStorage.removeItem(metaKey(scope, key));
  } catch (storageError) {
    console.warn('Unable to remove cloud sync metadata:', storageError);
  }
}

function installStorageSync(client) {
  if (window.__sprkStorageSyncInstalled) return;
  window.__sprkStorageSyncInstalled = true;

  const storage = Storage.prototype;
  const originalSetItem = storage.setItem;
  const originalRemoveItem = storage.removeItem;
  const originalClear = storage.clear;

  storage.setItem = function (key, value) {
    const result = originalSetItem.call(this, key, value);
    if (this === localStorage && !suppressStorageSync && activeUserId) {
      queueUpsert(client, activeUserId, String(key));
    }
    return result;
  };
  storage.removeItem = function (key) {
    const result = originalRemoveItem.call(this, key);
    if (this === localStorage && !suppressStorageSync && activeUserId && isSyncableKey(String(key))) {
      removeCloudValue(client, activeUserId, String(key)).catch(error => reportError('Unable to remove saved cloud data', error));
    }
    return result;
  };
  storage.clear = function () {
    const userId = activeUserId;
    const keys = this === localStorage && !suppressStorageSync && userId
      ? Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter(Boolean)
      : [];
    const result = originalClear.call(this);
    if (keys.some(isSyncableKey)) {
      client.from('site_user_data')
        .delete()
        .eq('user_id', userId)
        .then(({ error }) => {
          if (error) reportError('Unable to clear saved cloud data', error);
        })
        .catch(error => reportError('Unable to clear saved cloud data', error));
    }
    return result;
  };

  window.addEventListener('storage', event => {
    if (!activeUserId || event.storageArea !== localStorage) return;
    if (!event.key && event.newValue === null) {
      client.from('site_user_data')
        .delete()
        .eq('user_id', activeUserId)
        .then(({ error }) => {
          if (error) reportError('Unable to sync cleared data', error);
        })
        .catch(error => reportError('Unable to sync cleared data', error));
      return;
    }
    if (!event.key || !isSyncableKey(event.key)) return;
    if (event.newValue === null) {
      removeCloudValue(client, activeUserId, event.key).catch(error => reportError('Unable to sync removed data', error));
    } else {
      queueUpsert(client, activeUserId, event.key);
    }
  });
}

async function loadAndMergeScope(client, userId, scope) {
  const { data, error } = await client.from('site_user_data')
    .select('data_key,data,updated_at')
    .eq('user_id', userId)
    .eq('scope', scope);
  if (error) throw error;

  const remoteByKey = new Map((data || []).map(record => [record.data_key, record]));
  for (const [key, record] of remoteByKey) {
    if (!isSyncableKey(key)) continue;
    const rawLocal = localStorage.getItem(key);
    const lastSynced = localStorage.getItem(metaKey(scope, key));
    const remoteTime = Date.parse(record.updated_at);
    const localTime = Date.parse(lastSynced || '');

    if (rawLocal === null || (Number.isFinite(remoteTime) && Number.isFinite(localTime) && remoteTime > localTime)) {
      const rawValue = record.data?.raw;
      if (typeof rawValue !== 'string' || rawValue.length * 2 > MAX_SYNCED_VALUE_BYTES) continue;
      suppressStorageSync = true;
      try {
        localStorage.setItem(key, rawValue);
        localStorage.setItem(metaKey(scope, key), record.updated_at);
      } finally {
        suppressStorageSync = false;
      }
      reloadScheduled = true;
    }
  }

  const keys = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
    .filter((key) => key && isSyncableKey(key) && scopeForKey(key) === scope);
  for (const key of keys) {
    const remote = remoteByKey.get(key);
    const localTime = Date.parse(localStorage.getItem(metaKey(scope, key)) || '');
    const remoteTime = Date.parse(remote?.updated_at || '');
    if (!remote || !Number.isFinite(remoteTime) || !Number.isFinite(localTime) || localTime > remoteTime) {
      await upsertLocalValue(client, userId, key);
    }
  }
}

async function recordCurrentPage(client, userId) {
  const { error } = await client.from('site_activity').insert({
    user_id: userId,
    page_path: location.pathname,
    page_title: document.title.slice(0, 200)
  });
  if (error) throw error;
}

async function activateAccount(client, user) {
  if (!user || activeUserId === user.id) return;
  pendingWrites.forEach(timer => clearTimeout(timer));
  pendingWrites.clear();
  activeUserId = user.id;
  installStorageSync(client);
  setCloudStatus('Syncing this page and your saved data…');
  try {
    await Promise.all([
      loadAndMergeScope(client, user.id, 'appearance'),
      loadAndMergeScope(client, user.id, 'site'),
      recordCurrentPage(client, user.id)
    ]);
    setCloudStatus('Signed in: saved settings, site data, and activity sync to your account.');
    if (reloadScheduled && !sessionStorage.getItem(`sprk-hydrated:${location.pathname}`)) {
      sessionStorage.setItem(`sprk-hydrated:${location.pathname}`, 'true');
      location.reload();
      return;
    }
    sessionStorage.removeItem(`sprk-hydrated:${location.pathname}`);
  } catch (error) {
    activeUserId = null;
    reportError('Unable to sync your Supabase data', error);
  }
}

export async function initializeSiteDatabase() {
  if (initialized || location.pathname.startsWith('/simulator/') || location.pathname.includes('/simulator/')) return;
  initialized = true;
  const client = await getClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw error;

  client.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => {
      if (session?.user) {
        activateAccount(client, session.user).catch(error => reportError('Unable to activate cloud sync', error));
      } else {
        pendingWrites.forEach(timer => clearTimeout(timer));
        pendingWrites.clear();
        activeUserId = null;
        setCloudStatus('Sign in to sync saved data, appearance, and page activity.');
      }
    }, 0);
  });

  if (data.session?.user) {
    await activateAccount(client, data.session.user);
  } else {
    setCloudStatus('Sign in to sync saved data, appearance, and page activity.');
  }
}

export function getSupabaseClient() {
  return getClient();
}

export async function loadRecentActivity(limit = 8) {
  const client = await getClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Sign in to view your account activity.');

  const { data, error } = await client.from('site_activity')
    .select('page_path,page_title,visited_at')
    .eq('user_id', userData.user.id)
    .order('visited_at', { ascending: false })
    .limit(Math.max(1, Math.min(Number(limit) || 8, 50)));
  if (error) throw error;
  return data || [];
}
