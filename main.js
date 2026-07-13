import { setupAdminPanel } from './admin-panel.js';
import { DEFAULT_MEMBERS, normalizeSocials, readMembers, readPosts, readPortraits } from './roster-store.js';

const PLATFORM_META = {
  facebook: { slug: 'facebook' },
  discord: { slug: 'discord' },
  tiktok: { slug: 'tiktok' }
};

const t = (key, values) => window.miniappI18n?.t(key, values) ?? key;
const ASSETS = {
  icon: 'https://media.discordapp.net/attachments/918391199335841823/1526064357019095130/HUDAS_ICON_2.png?ex=6a55a9af&is=6a54582f&hm=ebffa2c9f540433fb79511d530b27f5c054d1f0c9941466f9b0ddf2037d5fd74&=&format=webp&quality=lossless&width=664&height=552',
  banner: 'https://media.discordapp.net/attachments/918391199335841823/1526064356230565888/HUDAS_Title_banner.png?ex=6a55a9af&is=6a54582f&hm=8afe5facec59da321f68605b902e28485beec64199f7d993fa16f64ce983115a&=&format=webp&quality=lossless',
  memberDummy: 'https://media.discordapp.net/attachments/918391199335841823/1526066655699144836/ChatGPT_Image_May_6_2026_09_54_06_PM.png?ex=6a55abd3&is=6a545a53&hm=bdbb45b7765aac097544bc8236af2ea7198a9b6e653139131a60c1ca2bdd9a46&=&format=webp&quality=lossless&width=437&height=656'
};

const rules = ['respect', 'communicate', 'contribute', 'haveFun'];
const portraits = {};
let members = [];
let posts = [];

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function localizedMember(member) {
  const defaultMember = DEFAULT_MEMBERS.find((item) => item.key === member.key);
  if (!defaultMember) return member;
  // Localize untouched seed fields independently, without hiding an admin's
  // deliberate name or role edit behind the default translation.
  return {
    ...member,
    name: member.name === defaultMember.name ? t(`member.${member.key}.name`) : member.name,
    role: member.role === defaultMember.role ? t(`member.${member.key}.role`) : member.role
  };
}

function renderMembers() {
  const grid = document.getElementById('memberGrid');
  if (!grid) return;
  const lights = ['#f7a9d5', '#cf9dff', '#ff8ebd', '#d9adff'];
  const deeps = ['#713c91', '#542b82', '#8c326d', '#43266e'];
  const darks = ['#b35ca2', '#8156c2', '#c14e94', '#7655af'];
  grid.innerHTML = members.map((rawMember, index) => {
    const member = localizedMember(rawMember);
    return `<article class="member-card sparkle-hover" tabindex="0" role="button" data-member-key="${escapeHtml(member.key)}" aria-label="${escapeHtml(t('members.openProfile', { name: member.name }))}" style="--avatar-light:${lights[index % 4]};--avatar-deep:${deeps[index % 4]};--avatar-dark:${darks[index % 4]}">
      <div class="member-portrait"><img src="${escapeHtml(portraits[member.key]?.publicUrl || ASSETS.memberDummy)}" alt="${escapeHtml(member.name)}"></div>
      <div class="member-info"><span class="member-badge">${escapeHtml(member.badge)}</span><h3>${escapeHtml(member.name)}</h3><p>${escapeHtml(member.role)}</p></div>
    </article>`;
  }).join('');
  const count = document.getElementById('memberCount');
  if (count) count.textContent = String(members.length).padStart(2, '0');
}

function safeSocialUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch { return ''; }
}

function renderMemberProfile(member) {
  const image = document.getElementById('memberProfileImage');
  const badge = document.getElementById('memberProfileBadge');
  const name = document.getElementById('memberProfileName');
  const role = document.getElementById('memberProfileRole');
  const socials = document.getElementById('memberProfileSocials');
  if (!image || !badge || !name || !role || !socials || !member) return;
  const localized = localizedMember(member);
  image.src = portraits[member.key]?.publicUrl || ASSETS.memberDummy;
  image.alt = localized.name;
  badge.textContent = localized.badge;
  name.textContent = localized.name;
  role.textContent = localized.role;
  const links = normalizeSocials(member.socials).map((social) => ({ ...social, url: safeSocialUrl(social.url) })).filter((social) => PLATFORM_META[social.platform]?.slug && social.url);
  socials.innerHTML = links.length ? links.map((social) => {
    const label = t(`social.${social.platform}`);
    const slug = PLATFORM_META[social.platform].slug;
    return `<a class="profile-social-link" href="${escapeHtml(social.url)}" target="_top" rel="noopener noreferrer"><img src="https://cdn.simpleicons.org/${slug}/FFFFFF" alt="" aria-hidden="true"><span>${escapeHtml(label)}</span></a>`;
  }).join('') : `<p class="profile-social-empty">${escapeHtml(t('members.noSocials'))}</p>`;
}

function setupMemberProfiles() {
  const grid = document.getElementById('memberGrid');
  const modal = document.getElementById('memberProfileModal');
  const closeButton = document.getElementById('closeMemberProfile');
  if (!grid || !modal || !closeButton) return;
  const close = () => {
    modal.hidden = true;
    document.body.style.overflow = '';
  };
  const open = (card) => {
    const member = members.find((item) => item.key === card?.dataset.memberKey);
    if (!member) return;
    renderMemberProfile(member);
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    closeButton.focus();
  };
  const activate = (event) => {
    const card = event.target.closest('[data-member-key]');
    if (!card) return;
    event.preventDefault();
    open(card);
  };
  grid.addEventListener('click', activate);
  grid.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('[data-member-key]');
    if (!card) return;
    event.preventDefault();
    open(card);
  });
  closeButton.addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) close(); });
}

function renderRules() {
  const list = document.getElementById('rulesList');
  if (!list) return;
  list.innerHTML = rules.map((key, index) => `<div class="rule"><span class="rule-number">0${index + 1}</span><span>${t(`rules.${key}`)}</span></div>`).join('');
}

function renderPosts() {
  const section = document.getElementById('communityPosts');
  const grid = document.getElementById('postGrid');
  if (!section || !grid) return;
  section.hidden = posts.length === 0;
  grid.innerHTML = posts.map((post) => `<article class="photo-post" tabindex="0" role="button" data-lightbox-url="${escapeHtml(post.publicUrl)}" data-lightbox-title="${escapeHtml(post.title)}" data-lightbox-description="${escapeHtml(post.description || '')}" aria-label="${escapeHtml(post.title)}">
    <img src="${escapeHtml(post.publicUrl)}" alt="${escapeHtml(post.title)}">
    <div class="photo-post-copy"><span>${escapeHtml(t('gallery.postLabel'))}</span><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.description || '')}</p></div>
  </article>`).join('');
}

function renderGallery() {
  const cards = [...document.querySelectorAll('[data-gallery-slot]')];
  cards.forEach((card, index) => {
    const image = card.querySelector('.gallery-image');
    const label = card.querySelector('.gallery-label');
    const title = card.querySelector('strong');
    const post = posts[index];
    if (!image || !label || !title) return;

    if (!post) {
      card.classList.remove('has-upload');
      card.removeAttribute('tabindex');
      card.removeAttribute('role');
      delete card.dataset.lightboxUrl;
      delete card.dataset.lightboxTitle;
      delete card.dataset.lightboxDescription;
      image.hidden = true;
      image.removeAttribute('src');
      image.alt = '';
      image.setAttribute('aria-hidden', 'true');
      label.textContent = t(label.dataset.i18n || 'gallery.card1Label');
      title.textContent = t(title.dataset.i18n || 'gallery.card1Title');
      card.removeAttribute('title');
      return;
    }

    card.classList.add('has-upload');
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.dataset.lightboxUrl = post.publicUrl;
    card.dataset.lightboxTitle = post.title;
    card.dataset.lightboxDescription = post.description || '';
    image.hidden = false;
    image.src = post.publicUrl;
    image.alt = post.title;
    image.removeAttribute('aria-hidden');
    label.textContent = t('gallery.postLabel');
    title.textContent = post.title;
    card.title = post.description || post.title;
  });
}

function setupGalleryLightbox() {
  const backdrop = document.getElementById('galleryLightbox');
  const image = document.getElementById('lightboxImage');
  const title = document.getElementById('lightboxTitle');
  const description = document.getElementById('lightboxDescription');
  const closeButton = document.getElementById('closeLightbox');
  const galleryGrid = document.getElementById('snapshotGrid');
  const postsGrid = document.getElementById('postGrid');
  if (!backdrop || !image || !title || !description || !closeButton) return;

  const close = () => {
    backdrop.hidden = true;
    document.body.style.overflow = '';
    image.removeAttribute('src');
  };

  const open = (card) => {
    const url = card?.dataset.lightboxUrl;
    if (!url) return;
    image.src = url;
    image.alt = card.dataset.lightboxTitle || '';
    title.textContent = card.dataset.lightboxTitle || '';
    description.textContent = card.dataset.lightboxDescription || '';
    backdrop.hidden = false;
    document.body.style.overflow = 'hidden';
    closeButton.focus();
  };

  const activateCard = (event) => {
    const card = event.target.closest('[data-lightbox-url]');
    if (!card) return;
    event.preventDefault();
    open(card);
  };

  galleryGrid?.addEventListener('click', activateCard);
  postsGrid?.addEventListener('click', activateCard);
  [galleryGrid, postsGrid].forEach((grid) => grid?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('[data-lightbox-url]');
    if (!card) return;
    event.preventDefault();
    open(card);
  }));
  closeButton.addEventListener('click', close);
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop) close(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !backdrop.hidden) close(); });
}

async function loadPortraits() {
  try {
    const saved = await readPortraits();
    Object.keys(portraits).forEach((key) => delete portraits[key]);
    Object.entries(saved).forEach(([key, portrait]) => {
      if (members.some((member) => member.key === key) && portrait?.publicUrl) portraits[key] = portrait;
    });
  } catch (error) {
    console.warn('Portraits could not be loaded.', error);
  }
}

function setupNavigation() {
  const header = document.querySelector('.site-header');
  const menu = document.getElementById('menuToggle');
  const nav = document.getElementById('siteNav');
  menu?.addEventListener('click', () => { const isOpen = nav.classList.toggle('open'); menu.setAttribute('aria-expanded', String(isOpen)); });
  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => { nav.classList.remove('open'); menu?.setAttribute('aria-expanded', 'false'); }));
  window.addEventListener('scroll', () => header?.classList.toggle('scrolled', window.scrollY > 22), { passive: true });
  const sections = [...document.querySelectorAll('.section-anchor')];
  const links = [...document.querySelectorAll('.nav-link')];
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) links.forEach((link) => link.classList.toggle('active', link.dataset.section === entry.target.id)); }), { rootMargin: '-35% 0px -55% 0px' });
  sections.forEach((section) => observer.observe(section));
}

function setupDataEvents() {
  window.addEventListener('hudas:roster-changed', async () => { members = await readMembers(); await loadPortraits(); renderMembers(); });
  window.addEventListener('hudas:posts-changed', async () => { posts = await readPosts(); renderGallery(); renderPosts(); });
}

async function boot() {
  document.getElementById('brandIcon').src = ASSETS.icon;
  document.getElementById('titleBanner').src = ASSETS.banner;
  members = await readMembers();
  posts = await readPosts();
  await loadPortraits();
  renderMembers();
  renderRules();
  setupMemberProfiles();
  renderGallery();
  renderPosts();
  setupGalleryLightbox();
  setupNavigation();
  setupDataEvents();
  setupAdminPanel();
}

document.addEventListener('DOMContentLoaded', boot);
