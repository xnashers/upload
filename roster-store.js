import {
  fetchOnlineMembers,
  fetchOnlinePosts,
  fetchOnlinePortraits,
  upsertOnlineMembers,
  upsertOnlinePosts,
  isSupabaseConfigured
} from './online-service.js';

export const ROSTER_KEY = 'hudASMembers';
export const ROSTER_RESET_KEY = 'hudASRosterReset';
export const POSTS_KEY = 'hudASPhotoPosts';
const PORTRAITS_KEY = 'hudASPortraits';
const storage = () => window.miniappsAI?.storage;

export function normalizeSocials(socials) {
  // PostgREST normally returns jsonb arrays as arrays, but older records or
  // manually imported rows may contain the same value as a JSON string or a
  // platform-keyed object. Normalize all supported shapes so public profiles
  // do not lose links that are already stored in Supabase.
  let value = socials;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return []; }
  }
  if (value && !Array.isArray(value) && typeof value === 'object') {
    if (typeof value.platform === 'string' && typeof value.url === 'string') value = [value];
    else value = Object.entries(value).map(([platform, url]) => ({ platform, url }));
  }
  if (!Array.isArray(value)) return [];
  return value
    .filter((social) => social && ['facebook', 'discord', 'tiktok'].includes(social.platform) && typeof social.url === 'string' && social.url.trim())
    .map((social) => ({ platform: social.platform, url: social.url.trim() }));
}

function validMember(member) {
  return member && typeof member.key === 'string' && typeof member.name === 'string' && typeof member.role === 'string' && typeof member.badge === 'string';
}

function normalizeMembers(list) {
  return list.map((member) => ({ ...member, socials: normalizeSocials(member.socials) }));
}

export async function readMembers() {
  if (isSupabaseConfigured()) {
    try {
      const online = await fetchOnlineMembers();
      // Supabase is the source of truth. An empty online roster must stay
      // empty instead of being replaced by the old demo members.
      return normalizeMembers(online);
    } catch (error) {
      console.warn('Online roster unavailable; showing an empty roster.', error);
      return [];
    }
  }
  try {
    const service = storage();
    if ((await service?.getItem(ROSTER_RESET_KEY)) === 'true') return [];
    const raw = await service?.getItem(ROSTER_KEY);
    if (!raw) return [];
    const saved = JSON.parse(raw);
    return Array.isArray(saved) && saved.every(validMember) ? normalizeMembers(saved) : [];
  } catch (error) {
    console.warn('Roster could not be loaded.', error);
    return [];
  }
}

export async function saveMembers(members, accessToken) {
  const service = storage();
  if (service) {
    await service.setItem(ROSTER_KEY, JSON.stringify(members));
    if (members.length) await service.removeItem(ROSTER_RESET_KEY);
    else await service.setItem(ROSTER_RESET_KEY, 'true');
  }
  if (isSupabaseConfigured() && members.length) await upsertOnlineMembers(members, accessToken);
  if (!service && !isSupabaseConfigured()) throw new Error('Storage service unavailable');
}

export async function readPosts() {
  if (isSupabaseConfigured()) {
    try {
      const online = await fetchOnlinePosts();
      if (online.length) return online;
    } catch (error) { console.warn('Online posts unavailable; using local posts.', error); }
  }
  try {
    const raw = await storage()?.getItem(POSTS_KEY);
    if (!raw) return [];
    const saved = JSON.parse(raw);
    return Array.isArray(saved) ? saved.filter((post) => post?.id && post?.publicUrl && post?.title) : [];
  } catch (error) {
    console.warn('Photo posts could not be loaded.', error);
    return [];
  }
}

export async function savePosts(posts, accessToken) {
  const service = storage();
  if (service) await service.setItem(POSTS_KEY, JSON.stringify(posts));
  if (isSupabaseConfigured()) await upsertOnlinePosts(posts, accessToken);
  if (!service && !isSupabaseConfigured()) throw new Error('Storage service unavailable');
}

export async function readPortraits() {
  if (isSupabaseConfigured()) {
    try {
      const online = await fetchOnlinePortraits();
      if (Object.keys(online).length) return online;
    } catch (error) { console.warn('Online portraits unavailable; using local portraits.', error); }
  }
  try {
    const service = storage();
    const raw = await service?.getItem(PORTRAITS_KEY) || await service?.getItem('officerPortraits');
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn('Portraits could not be loaded.', error);
    return {};
  }
}

export function notifyRosterChanged() {
  window.dispatchEvent(new CustomEvent('hudas:roster-changed'));
}

export function notifyPostsChanged() {
  window.dispatchEvent(new CustomEvent('hudas:posts-changed'));
}
