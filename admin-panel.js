const t = (key, values) => window.miniappI18n?.t(key, values) ?? key;

const MEMBERS = [
  ['dyaren', 'CM'], ['maoni', 'CF'], ['angel', 'VCM'], ['ellie', 'ACM'],
  ['kembs', 'HC'], ['macoy', 'PRO'], ['chix', 'VIP'], ['xyra', 'MUSE'],
  ['ewicuh', 'HE'], ['kelly', 'EX'], ['shichi', 'EX']
];
const ADMIN_USERNAME = 'HUDAS';
const ADMIN_PASSWORD = 'HUDAS-ADMIN';
const portraits = {};
let portraitsLoaded = false;

const storage = () => window.miniappsAI?.storage;

function isAuthorizationError(error) {
  const status = error?.statusCode ?? error?.status ?? error?.response?.status;
  const message = String(error?.message ?? error ?? '').toLowerCase();
  return status === 401 || status === 403 || message.includes('not authorized') || message.includes('forbidden') || message.includes('unauthorized');
}

function errorMessage(error) {
  return t(isAuthorizationError(error) ? 'admin.authRequired' : 'officers.storageError');
}

async function loadPortraits() {
  if (portraitsLoaded) return;
  portraitsLoaded = true;
  try {
    const raw = await storage()?.getItem('officerPortraits');
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.entries(saved).forEach(([key, portrait]) => {
      if (MEMBERS.some(([memberKey]) => memberKey === key) && portrait?.publicUrl) portraits[key] = portrait;
    });
  } catch (error) {
    console.warn('Portraits could not be loaded.', error);
  }
}

function setupPicker() {
  const select = document.getElementById('portraitMember');
  if (!select) return;
  select.innerHTML = MEMBERS
    .map(([key, badge]) => `<option value="${key}">${t(`member.${key}.name`)} · ${badge}</option>`)
    .join('');
}

export function setupAdminPanel() {
  const modal = document.getElementById('adminModal');
  const gate = document.getElementById('adminGate');
  const panel = document.getElementById('portraitManager');
  const accessForm = document.getElementById('adminForm');
  const usernameInput = document.getElementById('adminUsername');
  const passwordInput = document.getElementById('adminPassword');
  const accessStatus = document.getElementById('adminStatus');
  const lockButton = document.getElementById('lockAdmin');
  const portraitForm = document.getElementById('portraitForm');
  const select = document.getElementById('portraitMember');
  const fileInput = document.getElementById('portraitFile');
  const removeButton = document.getElementById('removePortrait');
  const portraitStatus = document.getElementById('portraitStatus');
  const uploadButton = portraitForm?.querySelector('button[type="submit"]');
  if (!modal || !gate || !panel || !accessForm || !usernameInput || !passwordInput || !accessStatus || !lockButton || !portraitForm || !select || !fileInput || !removeButton || !portraitStatus || !uploadButton) return;

  let unlocked = false;
  const setAccessState = (isUnlocked) => {
    unlocked = isUnlocked;
    gate.hidden = isUnlocked;
    panel.hidden = !isUnlocked;
    if (!isUnlocked && !modal.hidden) setTimeout(() => usernameInput.focus(), 50);
  };
  const showPortraitStatus = (message, type = '') => {
    portraitStatus.textContent = message;
    portraitStatus.className = `portrait-status ${type}`.trim();
  };
  const selectedName = () => t(`member.${select.value}.name`);
  const savePortraits = async () => {
    const service = storage();
    if (!service) throw new Error('Storage service unavailable');
    await service.setItem('officerPortraits', JSON.stringify(portraits));
  };
  const open = async () => {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    await loadPortraits();
    if (!unlocked) setAccessState(false);
  };
  const close = () => {
    modal.hidden = true;
    document.body.style.overflow = '';
  };

  setupPicker();
  setAccessState(false);
  document.querySelectorAll('[data-open-admin]').forEach((button) => button.addEventListener('click', open));
  document.getElementById('closeAdminModal')?.addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) close(); });

  accessForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const username = usernameInput.value.trim().toUpperCase();
    const password = passwordInput.value;
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      accessStatus.textContent = t('admin.invalid');
      accessStatus.className = 'admin-status error';
      passwordInput.select();
      return;
    }
    accessForm.reset();
    accessStatus.textContent = '';
    accessStatus.className = 'admin-status';
    setAccessState(true);
  });

  lockButton.addEventListener('click', () => {
    setAccessState(false);
    accessStatus.textContent = t('admin.locked');
    accessStatus.className = 'admin-status success';
  });

  portraitForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = fileInput.files?.[0];
    if (!file) { showPortraitStatus(t('officers.uploadEmpty'), 'error'); return; }
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) { showPortraitStatus(t('officers.fileType'), 'error'); return; }
    if (file.size > 10 * 1024 * 1024) { showPortraitStatus(t('officers.fileTooLarge'), 'error'); return; }

    const key = select.value;
    const previousPortrait = portraits[key];
    uploadButton.disabled = true;
    showPortraitStatus(t('officers.uploading'));
    try {
      const uploaded = await window.miniappsAI.uploadFile(file, { persistence: 'durable' });
      portraits[key] = { fileId: uploaded.fileId, publicUrl: uploaded.publicUrl, mimeType: uploaded.mimeType };
      await savePortraits();
      portraitForm.reset();
      select.value = key;
      showPortraitStatus(t('officers.uploadSuccess', { name: selectedName() }), 'success');
    } catch (error) {
      if (previousPortrait) portraits[key] = previousPortrait;
      else delete portraits[key];
      console.error('Portrait upload failed.', error);
      showPortraitStatus(errorMessage(error), 'error');
    } finally {
      uploadButton.disabled = false;
    }
  });

  removeButton.addEventListener('click', async () => {
    const key = select.value;
    if (!portraits[key]) { showPortraitStatus(t('officers.noCustom'), 'error'); return; }
    const previousPortrait = portraits[key];
    removeButton.disabled = true;
    try {
      delete portraits[key];
      await savePortraits();
      showPortraitStatus(t('officers.removeSuccess', { name: selectedName() }), 'success');
    } catch (error) {
      portraits[key] = previousPortrait;
      console.error('Portrait removal failed.', error);
      showPortraitStatus(errorMessage(error), 'error');
    } finally {
      removeButton.disabled = false;
    }
  });
}
