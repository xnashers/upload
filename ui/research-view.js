import { gameState } from '../state.js';
import { renderResearchLab } from './research-lab-view.js';
import { renderMutationLab } from './mutation-lab-view.js';
import { renderWeatherCenter } from './weather-center-view.js';
import { renderGenetics } from './genetics-view.js';
import { renderMastery } from './mastery-view.js';

const SUB_TABS = [
  { id: 'lab', label: '🔬 Lab', render: renderResearchLab },
  { id: 'mutations', label: '🧪 Mutations', render: renderMutationLab },
  { id: 'weather', label: '🌤️ Weather', render: renderWeatherCenter },
  { id: 'genetics', label: '🧬 Genetics', render: renderGenetics },
  { id: 'mastery', label: '🎓 Mastery', render: renderMastery },
];

export function createResearchView() {
  const container = document.createElement('div');
  container.className = 'p-4 pb-24 max-w-lg mx-auto';

  // Sub-tab bar
  const tabBar = document.createElement('div');
  tabBar.className = 'flex gap-1 mb-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide';

  const content = document.createElement('div');

  let currentTab = 'lab';

  function switchTab(tabId) {
    currentTab = tabId;
    tabBar.querySelectorAll('button').forEach(btn => {
      const isActive = btn.dataset.tab === tabId;
      btn.className = `flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition active:scale-95 whitespace-nowrap ${
        isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-300'
      }`;
    });
    const tab = SUB_TABS.find(t => t.id === tabId);
    if (tab) tab.render(content);
  }

  for (const tab of SUB_TABS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.tab = tab.id;
    btn.textContent = tab.label;
    btn.addEventListener('click', () => switchTab(tab.id));
    tabBar.appendChild(btn);
  }

  container.appendChild(tabBar);
  container.appendChild(content);

  // Initial render
  switchTab('lab');

  gameState.subscribe(() => {
    // Re-render current tab when state changes
    const tab = SUB_TABS.find(t => t.id === currentTab);
    if (tab) tab.render(content);
  });

  return { element: container };
}
