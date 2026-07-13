import { ONLINE_CONFIG, isSupabaseConfigured } from './online-config.js';

const tableUrl = (table, query = '') => `${ONLINE_CONFIG.supabaseUrl.replace(/\/$/, '')}/rest/v1/${table}${query}`;
const authUrl = () => `${ONLINE_CONFIG.supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`;
const storageBucket = () => ONLINE_CONFIG.supabaseStorageBucket || 'hudas-media';
const storageFolder = () => ONLINE_CONFIG.supabaseStorageFolder || 'images';
const storageUrl = (path = '') => `${ONLINE_CONFIG.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(storageBucket())}/${path.split('/').map(encodeURIComponent).join('/')}`;
const publicStorageUrl = (path = '') => `${ONLINE_CONFIG.supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${encodeURIComponent(storageBucket())}/${path.split('/').map(encodeURIComponent).join('/')}`;
const storagePathFromPublicUrl = (url = '') => {
  const marker = `/storage/v1/object/public/${encodeURIComponent(storageBucket())}/`;
  const source = String(url);
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) return '';
  try { return decodeURIComponent(source.slice(markerIndex + marker.length)); } catch { return ''; }
};

function supabaseHeaders(accessToken, extra = {}) {
  return {
    apikey: ONLINE_CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${accessToken || ONLINE_CONFIG.supabaseAnonKey}`,
    ...extra
  };
}

async function readResponse(response) {
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) {
    const error = new Error(body?.message || body?.error_description || body?.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.code = body?.code || body?.error_code || '';
    error.details = body;
    throw error;
  }
  return body;
}

async function supabaseFetch(url, options = {}, accessToken) {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
  const response = await fetch(url, {
    ...options,
    headers: { ...supabaseHeaders(accessToken, { 'Content-Type': 'application/json' }), ...(options.headers || {}) }
  });
  try {
    return await readResponse(response);
  } catch (error) {
    const method = String(options.method || 'GET').toUpperCase();
    if (method !== 'GET') error.databaseRelated = true;
    throw error;
  }
}

export async function signInAdmin(email, password) {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
  const response = await fetch(authUrl(), {
    method: 'POST',
    headers: { apikey: ONLINE_CONFIG.supabaseAnonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return readResponse(response);
}

// Refreshing the access token is important after an admin role is added in
// Supabase. The role lives in the JWT, so an older token can still be denied
// by Storage even though the user record now shows app_metadata.role=admin.
export async function refreshAdminSession(refreshToken) {
  if (!isSupabaseConfigured() || !refreshToken) throw new Error('Admin session refresh is unavailable.');
  const response = await fetch(`${ONLINE_CONFIG.supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { apikey: ONLINE_CONFIG.supabaseAnonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken })
  });
  return readResponse(response);
}

export async function signOutAdmin(accessToken) {
  if (!isSupabaseConfigured() || !accessToken) return;
  const response = await fetch(`${ONLINE_CONFIG.supabaseUrl.replace(/\/$/, '')}/auth/v1/logout`, {
    method: 'POST',
    headers: supabaseHeaders(accessToken)
  });
  return readResponse(response);
}

export async function fetchOnlineMembers() {
  const rows = await supabaseFetch(tableUrl('members', '?select=key,name,role,badge,socials,sort_order&order=sort_order.asc,created_at.asc'));
  return Array.isArray(rows) ? rows.map((row) => ({ key: row.key, name: row.name, role: row.role, badge: row.badge, socials: row.socials ?? [] })) : [];
}

export async function upsertOnlineMembers(members, accessToken) {
  const rows = members.map((member, index) => ({ key: member.key, name: member.name, role: member.role, badge: member.badge, socials: Array.isArray(member.socials) ? member.socials : [], sort_order: index }));
  return supabaseFetch(tableUrl('members', '?on_conflict=key'), { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) }, accessToken);
}

export async function deleteOnlineMember(key, accessToken) {
  return supabaseFetch(tableUrl('members', `?key=eq.${encodeURIComponent(key)}`), { method: 'DELETE', headers: { Prefer: 'return=minimal' } }, accessToken);
}

export async function fetchOnlinePosts() {
  const rows = await supabaseFetch(tableUrl('posts', '?select=id,title,description,image_url,image_path,mime_type,created_at&order=created_at.desc'));
  return Array.isArray(rows) ? rows.map((row) => ({ id: row.id, title: row.title, description: row.description || '', publicUrl: row.image_url, storagePath: row.image_path || storagePathFromPublicUrl(row.image_url), mimeType: row.mime_type || '', createdAt: row.created_at })) : [];
}

export async function upsertOnlinePosts(posts, accessToken) {
  const rows = posts.map((post) => ({ id: post.id, title: post.title, description: post.description || '', image_url: post.publicUrl, image_path: post.storagePath || '', mime_type: post.mimeType || '', created_at: post.createdAt || new Date().toISOString() }));
  return supabaseFetch(tableUrl('posts', '?on_conflict=id'), { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(rows) }, accessToken);
}

export async function deleteOnlinePost(id, accessToken) {
  return supabaseFetch(tableUrl('posts', `?id=eq.${encodeURIComponent(id)}`), { method: 'DELETE', headers: { Prefer: 'return=minimal' } }, accessToken);
}

export async function fetchOnlinePortraits() {
  const rows = await supabaseFetch(tableUrl('portraits', '?select=member_key,image_url,image_path,mime_type'));
  return Array.isArray(rows) ? rows.reduce((result, row) => {
    if (row.member_key && row.image_url) result[row.member_key] = { publicUrl: row.image_url, storagePath: row.image_path || storagePathFromPublicUrl(row.image_url), mimeType: row.mime_type || '' };
    return result;
  }, {}) : {};
}

export async function upsertOnlinePortrait(memberKey, portrait, accessToken) {
  return supabaseFetch(tableUrl('portraits', '?on_conflict=member_key'), { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ member_key: memberKey, image_url: portrait.publicUrl, image_path: portrait.storagePath || '', mime_type: portrait.mimeType || '', updated_at: new Date().toISOString() }) }, accessToken);
}

export async function deleteOnlinePortrait(memberKey, accessToken) {
  return supabaseFetch(tableUrl('portraits', `?member_key=eq.${encodeURIComponent(memberKey)}`), { method: 'DELETE', headers: { Prefer: 'return=minimal' } }, accessToken);
}

function safePath(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70) || 'image';
}

function extensionFor(file) {
  const known = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  return known[file.type] || 'bin';
}

export async function uploadImageToStorage(file, name, accessToken, options = {}) {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
  if (!accessToken) throw new Error('Sign in before uploading.');
  const suffix = options.stable ? '' : `-${Date.now()}`;
  const path = `${storageFolder()}/${safePath(name)}${suffix}.${extensionFor(file)}`;
  const response = await fetch(storageUrl(path), {
    method: 'POST',
    headers: supabaseHeaders(accessToken, { 'Content-Type': file.type || 'application/octet-stream', 'x-upsert': 'true' }),
    body: file
  });
  try {
    await readResponse(response);
  } catch (error) {
    error.storageRelated = true;
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('bucket not found') || message.includes('bucket does not exist')) {
      error.storageBucketMissing = true;
      error.code = 'STORAGE_BUCKET_NOT_FOUND';
    }
    throw error;
  }
  return { storagePath: path, publicUrl: publicStorageUrl(path), mimeType: file.type };
}

export async function deleteImageFromStorage(path, accessToken) {
  if (!path || !accessToken || !isSupabaseConfigured()) return;
  // Delete one exact object. The bulk POST /remove route treats values as
  // prefixes and can leave confusing folder-like entries in the bucket. The
  // object DELETE route targets the stored file itself and cannot accidentally
  // create or remove a folder.
  const response = await fetch(storageUrl(path), {
    method: 'DELETE',
    headers: supabaseHeaders(accessToken)
  });
  try {
    await readResponse(response);
  } catch (error) {
    error.storageRelated = true;
    error.storageDeleteRelated = true;
    // Deletion is intentionally idempotent. A stale database record can point
    // at an object that was already removed from Storage, so treat a missing
    // object as successfully cleared.
    if (error?.status === 404) return;
    throw error;
  }
}

export { isSupabaseConfigured };
