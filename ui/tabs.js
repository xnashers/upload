const t = (key) => window.miniappI18n?.t(key) ?? key;

const TABS = [
  { id: 'farm', icon: '🌾', labelKey: 'app.tabs.farm' },
  { id: 'shop', icon: '🏪', labelKey: 'app.tabs.shop' },
  { id: 'market', icon: '💰', labelKey: 'app.tabs.market' },
  { id: 'research', icon: '🔬', labelKey: 'app.tabs.research' },
  { id: 'inventory', icon: '🎒', labelKey: 'app.tabs.inventory' },
  { id: 'objectives', icon: '📋', labelKey: 'app.tabs.progress' },
];

export function createTabs(onChange) {
  const nav = document.createElement('nav');
  nav.className = 'fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-white/10 flex justify-around py-2 px-1 z-40 safe-bottom';
  nav.setAttribute('role', 'tablist');

  let active = 'farm';

  for (const tab of TABS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', tab.id === active ? 'true' : 'false');
    btn.className = 'flex flex-col items-center gap-0.5 px-1.5 py-1 rounded-lg transition text-[10px] min-w-[40px]';
    btn.innerHTML = `<span class="text-lg leading-none">${tab.icon}</span><span class="leading-tight whitespace-nowrap">${t(tab.labelKey)}</span>`;

    btn.addEventListener('click', () => {
      active = tab.id;
      nav.querySelectorAll('button').forEach(b => {
        b.setAttribute('aria-selected', 'false');
        b.classList.remove('text-green-400');
        b.classList.add('text-slate-400');
      });
      btn.setAttribute('aria-selected', 'true');
      btn.classList.remove('text-slate-400');
      btn.classList.add('text-green-400');
      onChange(tab.id);
    });

    if (tab.id === active) {
      btn.classList.add('text-green-400');
    } else {
      btn.classList.add('text-slate-400');
    }

    nav.appendChild(btn);
  }

  return nav;
}
