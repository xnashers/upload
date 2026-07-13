<script>
// AI APP/admin-panel.js
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

function isStoragePermissionError(error) {
  const status = error?.statusCode ?? error?.status ?? error?.response?.status;
  const message = String(error?.message ?? error ?? '').toLowerCase();
  return status === 403 || message.includes('row-level security') || message.includes('permission denied') || message.includes('not authorized');
}

function isInvalidCredentialsError(error) {
  const status = error?.statusCode ?? error?.status ?? error?.response?.status;
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  return status === 400 ||
    code === 'invalid_credentials' ||
    code === 'invalid_grant' ||
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials');
}

function errorMessage(error) {
  const status = error?.statusCode ?? error?.status ?? error?.response?.status;
  const code = String(error?.code || '').toLowerCase();
  const message = String(error?.message || '').toLowerCase();
  const details = `${message} ${JSON.stringify(error?.details || '').toLowerCase()}`;
  const isStorageError = Boolean(error?.storageRelated || error?.storageBucketMissing);
  const isStorageDeleteError = Boolean(error?.storageDeleteRelated);
  const isDatabaseError = Boolean(error?.databaseRelated);
  const isBucketMissing = error?.storageBucketMissing || message.includes('bucket not found') || message.includes('bucket does not exist');
  const isStoragePermissionError = message.includes('row-level security') || message.includes('not authorized') || message.includes('unauthorized') || message.includes('permission denied') || status === 403;

  if (isBucketMissing) return t('admin.storageBucketMissing');
  if (isStorageDeleteError && status === 401) return t('admin.authRequired');
  if (isStorageDeleteError && isStoragePermissionError) return t('admin.storagePermissionError');
  if (isStorageDeleteError) return t('admin.storageDeleteError');
  if (isStorageError && status === 401) return t('admin.authRequired');
  if (isStorageError && isStoragePermissionError) return t('admin.storagePermissionError');
  if (isStorageError) return t('admin.storageUploadError');
  if (isDatabaseError && (details.includes('column') && (details.includes('socials') || details.includes('sort_order')) || details.includes('schema cache'))) return t('admin.databaseSchemaError');
  if (isDatabaseError && (details.includes('relation') && details.includes('members') || details.includes('table') && details.includes('members'))) return t('admin.databaseTableError');
  if (isDatabaseError && (status === 401 || status === 403 || code === '42501' || message.includes('row-level security') || message.includes('permission denied'))) return t('admin.databasePermissionError');
  if (isDatabaseError) return t('admin.databaseError');
  if (isAuthorizationError(error)) return t('admin.authRequired');
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) return t('admin.emailNotConfirmed');
  if (status === 400 && (code === 'invalid_credentials' || message.includes('invalid login credentials'))) return t('admin.invalid');
  if (message.includes('bucket') || message.includes('storage') || message.includes('row-level security')) return t('admin.storageUploadError');
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
  const snapshot = JSON.stringify(portraits);
  await service.setItem('officerPortraits', snapshot);
  await service.setItem('hudASPortraits', snapshot);
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
    button.setAttribute('aria-label', t('admin.removePostAria', { title: post.title || t('admin.untitledPost') }));
    item.append(copy, button);
    container.append(item);
  });
}

function requireOnlineUpload(statusElement) {
  if (!accessToken) { setStatus(statusElement, t('admin.authRequired'), 'error'); return false; }
  return true;
}

function setupSocialMemberPicker(select) {
  const selected = select.value;
  select.innerHTML = '';
  members.forEach((member) => select.add(new Option(`${memberName(member)} · ${member.badge}`, member.key)));
  if (!members.length) select.add(new Option(t('admin.noMembers'), ''));
  else select.value = members.some((member) => member.key === selected) ? selected : members[0].key;
}

function selectedSocials(select) {
  return normalizeSocials(members.find((member) => member.key === select.value)?.socials);
}

async function uploadAdminImage(file, name, token, options = {}) {
  return uploadImageToStorage(file, name, token, options);
}

export function setupAdminPanel() {
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
  const editMemberForm = document.getElementById('editMemberForm');
  const editMember = document.getElementById('editMember');
  const editMemberName = document.getElementById('editMemberName');
  const editMemberRole = document.getElementById('editMemberRole');
  const editMemberBadge = document.getElementById('editMemberBadge');
  const editMemberImage = document.getElementById('editMemberImage');
  const editMemberSocialPlatform = document.getElementById('editMemberSocialPlatform');
  const editMemberSocialUrl = document.getElementById('editMemberSocialUrl');
  const addEditMemberSocial = document.getElementById('addEditMemberSocial');
  const editMemberSocialList = document.getElementById('editMemberSocialList');
  const editMemberSubmit = document.getElementById('editMemberSubmit');
  const editMemberStatus = document.getElementById('editMemberStatus');
  const memberSocialPlatform = document.getElementById('memberSocialPlatform');
  const memberSocialUrl = document.getElementById('memberSocialUrl');
  const addMemberSocial = document.getElementById('addMemberSocial');
  const memberSocialList = document.getElementById('memberSocialList');
  const memberStatus = document.getElementById('memberStatus');
  const removeSelect = document.getElementById('removeMember');
  const socialMember = document.getElementById('socialMember');
  const socialPlatform = document.getElementById('socialPlatform');
  const socialUrl = document.getElementById('socialUrl');
  const saveSocialLink = document.getElementById('saveSocialLink');
  const socialStatus = document.getElementById('socialStatus');
  const socialLinksList = document.getElementById('socialLinksList');
  const removeMemberButton = document.getElementById('removeMemberButton');
  const postForm = document.getElementById('postForm');
  const postTitle = document.getElementById('postTitle');
  const postDescription = document.getElementById('postDescription');
  const postFile = document.getElementById('postFile');
  const postStatus = document.getElementById('postStatus');
  const postAdminList = document.getElementById('postAdminList');
  const postRemoveStatus = document.getElementById('postRemoveStatus');
  const postButton = postForm?.querySelector('button[type="submit"]');

  if (!modal || !gate || !panel || !accessForm || !usernameInput || !passwordInput || !accessStatus || !signOutButton || !lockButton || !memberForm || !memberNameInput || !memberRoleInput || !memberBadgeInput || !memberImageInput || !editMemberForm || !editMember || !editMemberName || !editMemberRole || !editMemberBadge || !editMemberImage || !editMemberSocialPlatform || !editMemberSocialUrl || !addEditMemberSocial || !editMemberSocialList || !editMemberSubmit || !editMemberStatus || !memberSocialPlatform || !memberSocialUrl || !addMemberSocial || !memberSocialList || !memberStatus || !removeSelect || !socialMember || !socialPlatform || !socialUrl || !saveSocialLink || !socialStatus || !socialLinksList || !removeMemberButton || !postForm || !postTitle || !postDescription || !postFile || !postStatus || !postAdminList || !postRemoveStatus || !postButton) return;

  const toolModals = [...document.querySelectorAll('[data-admin-tool]')].map((button) => document.getElementById(button.dataset.adminTool)).filter(Boolean);
  let activeTool = null;
  const closeTool = () => {
    if (!activeTool) return;
    activeTool.hidden = true;
    activeTool = null;
  };
  const openTool = (toolId) => {
    if (!unlocked) return;
    closeTool();
    activeTool = document.getElementById(toolId);
    if (!activeTool) return;
    activeTool.hidden = false;
    setTimeout(() => activeTool.querySelector('[data-close-admin-tool]')?.focus(), 30);
  };

  let unlocked = false;
  const setupEditMemberPicker = () => {
    const selected = editMember.value;
    editMember.innerHTML = '';
    members.forEach((member) => editMember.add(new Option(`${memberName(member)} · ${member.badge}`, member.key)));
    if (!members.length) editMember.add(new Option(t('admin.noMembers'), ''));
    else editMember.value = members.some((member) => member.key === selected) ? selected : members[0].key;
  };
  const renderEditMemberSocials = () => renderSocialList(editMemberSocialList, editMemberSocials, (index) => {
    editMemberSocials = editMemberSocials.filter((_, socialIndex) => socialIndex !== index);
    renderEditMemberSocials();
  });
  const refreshEditMemberForm = () => {
    const member = members.find((item) => item.key === editMember.value);
    editMemberName.value = member?.name || '';
    editMemberRole.value = member?.role || '';
    editMemberBadge.value = member?.badge || '';
    editMemberImage.value = '';
    editMemberSocials = normalizeSocials(member?.socials);
    renderEditMemberSocials();
  };
  const setAccessState = (isUnlocked) => {
    unlocked = isUnlocked;
    gate.hidden = isUnlocked;
    panel.hidden = !isUnlocked;
    if (!isUnlocked) {
      accessToken = '';
      refreshToken = '';
      closeTool();
    }
    if (!isUnlocked && !modal.hidden) setTimeout(() => usernameInput.focus(), 50);
  };
  const open = async () => {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    await loadData();
    setupPickers(removeSelect);
    setupSocialMemberPicker(socialMember);
    setupEditMemberPicker();
    refreshEditMemberForm();
    refreshSocialEditor();
    renderPostAdminList(postAdminList);
    setAccessState(unlocked);
  };
  const close = () => { closeTool(); modal.hidden = true; document.body.style.overflow = ''; };

  setupPickers(removeSelect);
  setupSocialMemberPicker(socialMember);
  setupEditMemberPicker();
  refreshEditMemberForm();
  refreshSocialEditor();
  setAccessState(false);

  document.querySelectorAll('[data-open-admin]').forEach((button) => button.addEventListener('click', open));
  document.querySelectorAll('[data-admin-tool]').forEach((button) => button.addEventListener('click', () => openTool(button.dataset.adminTool)));
  toolModals.forEach((toolModal) => {
    toolModal.querySelectorAll('[data-close-admin-tool]').forEach((button) => button.addEventListener('click', closeTool));
    toolModal.addEventListener('click', (event) => { if (event.target === toolModal) closeTool(); });
  });
  document.getElementById('closeAdminModal')?.addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || modal.hidden) return;
    if (activeTool) closeTool(); else close();
  });

  // ... (rest of the file remains the same until memberForm submit)

  accessForm.addEventListener('submit', async (event) => { /* unchanged */ });
  signOutButton.addEventListener('click', async () => { /* unchanged */ });
  lockButton.addEventListener('click', () => { /* unchanged */ });

  const uploadWithFreshSession = async (file, name, options = {}) => { /* unchanged */ };
  const runWithFreshSession = async (operation) => { /* unchanged */ };

  function refreshSocialEditor() { /* unchanged */ }

  const renderNewMemberSocials = () => renderSocialList(memberSocialList, newMemberSocials, (index) => {
    newMemberSocials = newMemberSocials.filter((_, socialIndex) => socialIndex !== index);
    renderNewMemberSocials();
  });

  // ... other listeners remain unchanged ...

  // FIXED MEMBER ADD SECTION
  memberForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!memberForm.checkValidity()) { 
      setStatus(memberStatus, t('admin.memberRequired'), 'error'); 
      memberForm.reportValidity(); 
      return; 
    }
    if (isSupabaseConfigured() && !accessToken) { 
      setStatus(memberStatus, t('admin.authRequired'), 'error'); 
      return; 
    }

    const file = memberImageInput.files?.[0];
    if (!file) { 
      setStatus(memberStatus, t('admin.memberImageRequired'), 'error'); 
      return; 
    }
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { 
      setStatus(memberStatus, t('admin.memberImageType'), 'error'); 
      return; 
    }
    if (file.size > 10 * 1024 * 1024) { 
      setStatus(memberStatus, t('admin.memberImageTooLarge'), 'error'); 
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
        uploaded = await uploadWithFreshSession(file, `${member.key}-${member.name}`, { stable: true });
        await runWithFreshSession((token) => upsertOnlinePortrait(member.key, uploaded, token));
      } else {
        const localUpload = await window.miniappsAI.uploadFile(file, { persistence: 'durable' });
        uploaded = { fileId: localUpload.fileId, publicUrl: localUpload.publicUrl, mimeType: localUpload.mimeType };
      }

      portraits[member.key] = uploaded;
      await saveLocalPortraits();

      // FORCE REFRESH - This was the main fix
      members = await readMembers();
      await loadPortraits();
      if (typeof window.renderMembers === 'function') window.renderMembers(); // Direct call
      notifyRosterChanged();

      memberForm.reset();
      newMemberSocials = [];
      renderNewMemberSocials();

      setupPickers(removeSelect);
      setupSocialMemberPicker(socialMember);
      setupEditMemberPicker();
      refreshEditMemberForm();

      setStatus(memberStatus, t('admin.addMemberSuccess', { name: member.name }), 'success');
    } catch (error) {
      members = previous;
      delete portraits[member.key];
      await runWithFreshSession((token) => saveMembers(previous, token)).catch(() => {});
      if (isSupabaseConfigured()) await runWithFreshSession((token) => deleteOnlineMember(member.key, token)).catch(() => {});
      await saveLocalPortraits().catch(() => {});

      setupPickers(removeSelect);
      setupSocialMemberPicker(socialMember);
      setupEditMemberPicker();
      refreshEditMemberForm();

      setStatus(memberStatus, errorMessage(error), 'error');
    } finally { 
      addButton.disabled = false; 
    }
  });

  // Rest of the file (remove, edit, posts, etc.) remains unchanged...
  // (I kept the original logic for other sections to avoid breaking anything else)
  
  // ... [All other event listeners remain the same as in your original file] ...
}
</script>
