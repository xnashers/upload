import { setupAdminPanel } from './admin-panel.js';

const t = (key, values) => window.miniappI18n?.t(key, values) ?? key;

const ASSETS = {
  icon: 'https://media.discordapp.net/attachments/918391199335841823/1526064357019095130/HUDAS_ICON_2.png?ex=6a55a9af&is=6a54582f&hm=ebffa2c9f540433fb79511d530b27f5c054d1f0c9941466f9b0ddf2037d5fd74&=&format=webp&quality=lossless&width=664&height=552',
  banner: 'https://media.discordapp.net/attachments/918391199335841823/1526064356230565888/HUDAS_Title_banner.png?ex=6a55a9af&is=6a54582f&hm=8afe5facec59da321f68605b902e28485beec64199f7d993fa16f64ce983115a&=&format=webp&quality=lossless',
  memberDummy: 'https://media.discordapp.net/attachments/918391199335841823/1526066655699144836/ChatGPT_Image_May_6_2026_09_54_06_PM.png?ex=6a55abd3&is=6a545a53&hm=bdbb45b7765aac097544bc8236af2ea7198a9b6e653139131a60c1ca2bdd9a46&=&format=webp&quality=lossless&width=437&height=656'
};

const memberKeys = [
  ['dyaren', 'CM'], ['maoni', 'CF'], ['angel', 'VCM'], ['ellie', 'ACM'],
  ['kembs', 'HC'], ['macoy', 'PRO'], ['chix', 'VIP'], ['xyra', 'MUSE'],
  ['ewicuh', 'HE'], ['kelly', 'EX'], ['shichi', 'EX']
];
const rules = ['respect', 'communicate', 'contribute', 'haveFun'];
const portraits = {};

function renderMembers() {
  const grid = document.getElementById('memberGrid');
  if (!grid) return;
  const lights = ['#f7a9d5', '#cf9dff', '#ff8ebd', '#d9adff'];
  const deeps = ['#713c91', '#542b82', '#8c326d', '#43266e'];
  const darks = ['#b35ca2', '#8156c2', '#c14e94', '#7655af'];
  grid.innerHTML = memberKeys.map(([key, badge], index) => {
    const name = t(`member.${key}.name`);
    const role = t(`member.${key}.role`);
    return `<article class="member-card sparkle-hover" style="--avatar-light:${lights[index % 4]};--avatar-deep:${deeps[index % 4]};--avatar-dark:${darks[index % 4]}">
      <div class="member-portrait"><img src="${portraits[key]?.publicUrl || ASSETS.memberDummy}" alt="${name}"></div>
      <div class="member-info"><span class="member-badge">${badge}</span><h3>${name}</h3><p>${role}</p></div>
    </article>`;
  }).join('');
}

function renderRules() {
  const list = document.getElementById('rulesList');
  if (!list) return;
  list.innerHTML = rules.map((key, index) => `<div class="rule"><span class="rule-number">0${index + 1}</span><span>${t(`rules.${key}`)}</span></div>`).join('');
}

async function loadPortraits() {
  try {
    const raw = await window.miniappsAI?.storage?.getItem('officerPortraits');
    if (!raw) return;
    const saved = JSON.parse(raw);
    Object.entries(saved).forEach(([key, portrait]) => {
      if (memberKeys.some(([memberKey]) => memberKey === key) && portrait?.publicUrl) portraits[key] = portrait;
    });
  } catch (error) {
    console.warn('Portraits could not be loaded.', error);
  }
}

function setupModal() {
  const modal = document.getElementById('applyModal');
  const formView = document.getElementById('applyFormView');
  const successView = document.getElementById('successView');
  const form = document.getElementById('applyForm');
  const status = document.getElementById('formStatus');
  if (!modal || !formView || !successView || !form || !status) return;

  const close = () => {
    modal.hidden = true;
    document.body.style.overflow = '';
    form.reset();
    formView.hidden = false;
    successView.hidden = true;
    status.textContent = '';
  };
  const open = () => {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => modal.querySelector('input')?.focus(), 50);
  };

  document.querySelectorAll('[data-open-apply]').forEach((button) => button.addEventListener('click', open));
  document.getElementById('closeModal')?.addEventListener('click', close);
  document.getElementById('doneButton')?.addEventListener('click', close);
  modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !modal.hidden) close(); });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      status.textContent = t('modal.validation');
      form.reportValidity();
      return;
    }
    status.textContent = '';
    formView.hidden = true;
    successView.hidden = false;
  });
}

function setupNavigation() {
  const header = document.querySelector('.site-header');
  const menu = document.getElementById('menuToggle');
  const nav = document.getElementById('siteNav');
  menu?.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(isOpen));
  });
  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menu?.setAttribute('aria-expanded', 'false');
  }));
  window.addEventListener('scroll', () => header?.classList.toggle('scrolled', window.scrollY > 22), { passive: true });

  const sections = [...document.querySelectorAll('.section-anchor')];
  const links = [...document.querySelectorAll('.nav-link')];
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    links.forEach((link) => link.classList.toggle('active', link.dataset.section === entry.target.id));
  }), { rootMargin: '-35% 0px -55% 0px' });
  sections.forEach((section) => observer.observe(section));
}

async function boot() {
  document.getElementById('brandIcon').src = ASSETS.icon;
  document.getElementById('titleBanner').src = ASSETS.banner;
  await loadPortraits();
  renderMembers();
  renderRules();
  setupModal();
  setupNavigation();
  setupAdminPanel();
}

document.addEventListener('DOMContentLoaded', boot);
