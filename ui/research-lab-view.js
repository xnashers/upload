import { gameState } from '../state.js';
import { RESEARCH_LAB, getResearchCost } from '../data/research.js';
import { showToast } from './toast.js';
import { playSound } from './sounds.js';

const t = (key, values) => window.miniappI18n?.t(key, values) ?? key;

export function renderResearchLab(container) {
  container.innerHTML = '';

  const summary = gameState.getResearchBonusesSummary();
  const totalSpent = Object.values(gameState.researchLevels).reduce((sum, lvl) => {
    let cost = 0;
    for (let i = 1; i <= lvl; i++) cost += getResearchCost(i);
    return sum + cost;
  }, 0);

  // Summary banner
  const banner = document.createElement('div');
  banner.className = 'mb-4 p-3 rounded-xl bg-indigo-900/30 border border-indigo-500/20';
  banner.innerHTML = `
    <div class="flex items-center gap-2 mb-2">
      <span class="text-lg">🔬</span>
      <span class="font-bold text-indigo-300 text-sm">Research Lab</span>
      <span class="text-xs text-slate-500 ml-auto">₱${totalSpent.toLocaleString()} invested</span>
    </div>
    <div class="grid grid-cols-3 gap-2 text-xs">
      <div class="text-center"><span class="text-green-400 font-bold">⚡${summary.speedBonus}%</span><br><span class="text-slate-500">Speed</span></div>
      <div class="text-center"><span class="text-blue-400 font-bold">⚖️${summary.weightBonus}%</span><br><span class="text-slate-500">Weight</span></div>
      <div class="text-center"><span class="text-purple-400 font-bold">✨${summary.xpBonus}%</span><br><span class="text-slate-500">XP</span></div>
      <div class="text-center"><span class="text-pink-400 font-bold">🧪${summary.mutBonus}%</span><br><span class="text-slate-500">Mutation</span></div>
      <div class="text-center"><span class="text-amber-400 font-bold">💩${summary.fertBonus}%</span><br><span class="text-slate-500">Fertilizer</span></div>
    </div>
  `;
  container.appendChild(banner);

  // Upgrade cards
  for (const upgrade of RESEARCH_LAB) {
    const level = gameState.getResearchLevel(upgrade.id);
    const isMax = level >= upgrade.maxLevel;
    const nextCost = isMax ? 0 : getResearchCost(level + 1);
    const effect = gameState.getResearchEffect(upgrade.id);

    const card = document.createElement('div');
    card.className = `flex items-center gap-3 p-3 rounded-xl border transition ${
      isMax ? 'bg-green-900/20 border-green-500/30' :
      'bg-slate-800/60 border-white/10 hover:border-white/20'
    }`;

    card.innerHTML = `
      <span class="text-2xl flex-shrink-0">${upgrade.emoji}</span>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2">
          <span class="font-semibold text-white text-sm">${upgrade.name}</span>
          <span class="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">${level}/${upgrade.maxLevel}</span>
        </div>
        <div class="text-xs text-slate-400 mt-0.5">${upgrade.desc}</div>
        <div class="text-xs text-green-400 mt-0.5">Active: +${effect}%</div>
      </div>
      <div class="flex-shrink-0">
        ${isMax ? '<span class="text-xs text-green-400 font-bold">✅ MAX</span>' :
          `<button class="research-buy px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition active:scale-95">₱${nextCost.toLocaleString()}</button>`
        }
      </div>
    `;

    if (!isMax) {
      card.querySelector('.research-buy').addEventListener('click', () => {
        if (gameState.player.peso < nextCost) {
          playSound('buzzer');
          showToast(t('app.toast.not_enough_peso'), 'error');
          return;
        }
        const result = gameState.buyResearch(upgrade.id, upgrade);
        if (result.success) {
          playSound('buy');
          showToast(`🔬 ${upgrade.name} upgraded to Lv${result.level}!`, 'success');
          renderResearchLab(container);
        }
      });
    }

    container.appendChild(card);
  }
}
