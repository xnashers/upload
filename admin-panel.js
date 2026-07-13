import {
  normalizeSocials,
  readMembers,
  saveMembers,
  readPosts,
  savePosts,
  readPortraits,
  notifyRosterChanged,
  notifyPostsChanged
} from './roster-store.js';
import {
  deleteImageFromStorage,
  deleteOnlineMember,
  deleteOnlinePost,
  deleteOnlinePortrait,
  isSupabaseConfigured,
  refreshAdminSession,
  signOutAdmin,
  signInAdmin,
  uploadImageToStorage,
  upsertOnlinePortrait
} from './online-service.js';

const t = (key, values) => window.miniappI18n?.t(key, values) ?? key;
const LOCAL_USERNAME = 'HUDAS';
const LOCAL_PASSWORD = 'HUDAS-ADMIN';

const portraits = {};
let portraitsLoaded = false;
let members = [];
let posts = [];
let accessToken = '';
let refreshToken = '';
let newMemberSocials = [];
let editMemberSocials = [];

const SOCIAL_PLATFORMS = ['facebook', 'discord', 'tiktok'];
const memberName = (member) => member?.name || '';
const storage = () => window.miniappsAI?.storage;

function socialLabel(platform) {
  return SOCIAL_PLATFORMS.includes(platform) ? t(`social.${platform}`) : platform;
}

function renderSocialList(container, socials, onRemove) {
  if (!container) return;
  container.innerHTML = '';
  if (!socials.length) {
    const empty = document.createElement('p');
    empty.className = 'social-list-empty';
    empty.textContent = t('admin.noSocialLinks');
    container.append(empty);
    return;
  }
  socials.forEach((social, index) => {
    const item = document.createElement('div');
    item.className = 'social-admin-item';
    const copy = document.createElement('div');
    copy.className = 'social-admin-copy';
    const platform = document.createElement('strong');
    platform.textContent = socialLabel(social.platform);
    const url = document.createElement('span');
    url.textContent = social.url;
    copy.append(platform, url);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'button button-ghost social-remove-button';
    remove.textContent = t('admin.removeSocial');
    remove.setAttribute('aria-label', t('admin.removeSocialAria', { platform: socialLabel(social.platform) }));
    remove.addEventListener('click', () => onRemove(index));
    item.append(copy, remove);
    container.append(item);
  });
}

function isAuthorizationError(error) {
  const status = error?.statusCode ?? error?.status ?? error?.response?.status;
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message ?? error ?? '').toLowerCase();
  return status === 401 || status === 403 || code === '42501' || message.includes('not authorized') || message.includes('forbidden') || message.includes('unauthorized') || message.includes('row-level security') || message.includes('permission denied');
}

function errorMessage(error) {
  // ... (keep your original errorMessage function)
  const status = error?.statusCode ?? error?.status ?? error?.response?.status;
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('bucket not found') || message.includes('bucket does not exist')) return t('admin.storageBucketMissing');
  if (isAuthorizationError(error)) return t('admin.authRequired');
  return t('admin.storageError');
}

async function loadPortraits() {
  if (portraitsLoaded) return;
  portraitsLoaded = true;
  try {
    const saved = await readPortraits();
    Object.entries(saved).forEach(([key, portrait]) => { if (portrait?.publicUrl) portraits[key] = portrait; });
  } catch (error) { console.warn('Portraits could not be loaded.', error); }
}

async function loadData() {
  members = await readMembers();
  posts = await readPosts();
  await loadPortraits();
}

function setupPickers(removeSelect) {
  const selectedRemove = removeSelect.value;
  removeSelect.innerHTML = '';
  members.forEach((member) => {
    const label = `${memberName(member)} · ${member.badge}`;
    removeSelect.add(new Option(label, member.key));
  });
  if (!members.length) {
    removeSelect.add(new Option(t('admin.noMembers'), ''));
  } else {
    removeSelect.value = members.some((member) => member.key === selectedRemove) ? selectedRemove : members[0].key;
  }
}

async function saveLocalPortraits() {
  const service = storage();
  if (!service) return;
  await service.setItem('hudASPortraits', JSON.stringify(portraits));
}

function setStatus(element, message, type = '') {
  element.textContent = message;
  element.className = `${element.className.split(' ')[0]} ${type}`.trim();
}

function renderPostAdminList(container) {
  if (!container) return;
  container.innerHTML = '';
  if (!posts.length) {
    const empty = document.createElement('p');
    empty.className = 'post-admin-empty';
    empty.textContent = t('admin.noPosts');
    container.append(empty);
    return;
  }
  posts.forEach((post) => {
    const item = document.createElement('div');
    item.className = 'post-admin-item';
    const copy = document.createElement('div');
    copy.className = 'post-admin-copy';
    const title = document.createElement('strong');
    title.textContent = post.title || t('admin.untitledPost');
    const description = document.createElement('span');
    description.textContent = post.description || t('admin.noPostDescription');
    copy.append(title, description);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'button button-ghost post-remove-button';
    button.dataset.removePost = post.id;
    button.textContent = t('admin.removePostButton');
    item.append(copy, button);
    container.append(item);
  });
}

function setupSocialMemberPicker(select) {
  const selected = select.value;
  select.innerHTML = '';
  members.forEach((member) => select.add(new Option(`${memberName(member)} · ${member.badge}`, member.key)));
  if (!members.length) select.add(new Option(t('admin.noMembers'), ''));
  else select.value = members.some((member) => member.key === selected) ? selected : members[0].key;
}

async function uploadAdminImage(file, name, token, options = {}) {
  return uploadImageToStorage(file, name, token, options);
}

export function setupAdminPanel() {
  // Element selection
  const modal = document.getElementById('adminModal');
  const gate = document.getElementById('adminGate');
  const panel = document.getElementById('portraitManager');
  const accessForm = document.getElementById('adminForm');
  const usernameInput = document.getElementById('adminUsername');
  const passwordInput = document.getElementById('adminPassword');
  const accessStatus = document.getElementById('adminStatus');
  const signOutButton = document.getElementById('signOutAdmin');
  const lockButton = document.getElementById('lockAdmin');
  const memberForm = document.getElementById('memberForm');
  const memberNameInput = document.getElementById('memberName');
  const memberRoleInput = document.getElementById('memberRole');
  const memberBadgeInput = document.getElementById('memberBadge');
  const memberImageInput = document.getElementById('memberImage');
  const memberStatus = document.getElementById('memberStatus');
  const removeSelect = document.getElementById('removeMember');
  const removeMemberButton = document.getElementById('removeMemberButton');

  if (!modal || !gate || !panel) return;

  let unlocked = false;
  let activeTool = null;

  const closeTool = () => {
    if (activeTool) activeTool.hidden = true;
    activeTool = null;
  };

  const openTool = (toolId) => {
    if (!unlocked) return;
    closeTool();
    activeTool = document.getElementById(toolId);
    if (activeTool) activeTool.hidden = false;
  };

  const setAccessState = (isUnlocked) => {
    unlocked = isUnlocked;
    gate.hidden = isUnlocked;
    panel.hidden = !isUnlocked;
    if (!isUnlocked) accessToken = refreshToken = '';
  };

  const open = async () => {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    await loadData();
    setupPickers(removeSelect);
    setAccessState(unlocked);
  };

  const close = () => {
    closeTool();
    modal.hidden = true;
    document.body.style.overflow = '';
  };

  // Initial setup
  setupPickers(removeSelect);
  setAccessState(false);

  document.querySelectorAll('[data-open-admin]').forEach(btn => btn.addEventListener('click', open));
  document.getElementById('closeAdminModal')?.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  // Login
  accessForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // ... your original login logic ...
    if (isSupabaseConfigured()) {
      try {
        const session = await signInAdmin(usernameInput.value.trim(), passwordInput.value);
        accessToken = session.access_token || '';
        refreshToken = session.refresh_token || '';
        setAccessState(true);
        setStatus(accessStatus, t('admin.onlineSignedIn'), 'success');
      } catch (err) {
        setStatus(accessStatus, errorMessage(err), 'error');
      }
    } else {
      if (usernameInput.value.trim().toUpperCase() === LOCAL_USERNAME && passwordInput.value === LOCAL_PASSWORD) {
        setAccessState(true);
        setStatus(accessStatus, t('admin.localMode'), 'success');
      } else {
        setStatus(accessStatus, t('admin.invalid'), 'error');
      }
    }
  });

  // Add Member - FIXED
  memberForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!memberForm.checkValidity()) {
      setStatus(memberStatus, t('admin.memberRequired'), 'error');
      memberForm.reportValidity();
      return;
    }

    const file = memberImageInput.files?.[0];
    if (!file) {
      setStatus(memberStatus, t('admin.memberImageRequired'), 'error');
      return;
    }

    const member = {
      key: `custom-${Date.now()}`,
      name: memberNameInput.value.trim(),
      role: memberRoleInput.value.trim(),
      badge: memberBadgeInput.value.trim().toUpperCase(),
      socials: normalizeSocials(newMemberSocials)
    };

    const previous = [...members];
    members = [...members, member];

    const addButton = memberForm.querySelector('button[type="submit"]');
    addButton.disabled = true;
    setStatus(memberStatus, isSupabaseConfigured() ? t('admin.storageUploading') : t('admin.memberAdding'));

    try {
      await runWithFreshSession((token) => saveMembers(members, token));

      let uploaded;
      if (isSupabaseConfigured()) {
        uploaded = await uploadAdminImage(file, `${member.key}-${member.name}`, accessToken, { stable: true });
        await runWithFreshSession((token) => upsertOnlinePortrait(member.key, uploaded, token));
      } else {
        const localUpload = await window.miniappsAI.uploadFile(file, { persistence: 'durable' });
        uploaded = { fileId: localUpload.fileId, publicUrl: localUpload.publicUrl, mimeType: localUpload.mimeType };
      }

      portraits[member.key] = uploaded;
      await saveLocalPortraits();

      // Refresh everything
      members = await readMembers();
      await loadPortraits();
      notifyRosterChanged();

      memberForm.reset();
      newMemberSocials = [];
      setupPickers(removeSelect);

      setStatus(memberStatus, t('admin.addMemberSuccess', { name: member.name }), 'success');
    } catch (error) {
      members = previous;
      console.error(error);
      setStatus(memberStatus, errorMessage(error), 'error');
    } finally {
      addButton.disabled = false;
    }
  });

  // Add your other listeners (edit, remove, posts, etc.) here if needed
}

// Helper for fresh session (make sure this is defined)
async function runWithFreshSession(operation) {
  try {
    return await operation(accessToken);
  } catch (error) {
    if (!isSupabaseConfigured() || !refreshToken || !isAuthorizationError(error)) throw error;
    const session = await refreshAdminSession(refreshToken);
    accessToken = session.access_token || accessToken;
    refreshToken = session.refresh_token || refreshToken;
    return operation(accessToken);
  }
}
