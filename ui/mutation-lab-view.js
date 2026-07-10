import { gameState } from '../state.js';
import { MUTATION_LAB, getMutationLabCost } from '../data/research.js';
import { showToast } from './toast.js';
import { playSound } from './sounds.js';

const t = (key, values) => window.miniappI18n?.t(key, values) ?? key;

export function renderMutationLab(container) {
  container.innerHTML = '';

  // Summary banner
  const banner = document.createElement('div');
  banner.className = 'mb-4 p-3 rounded-xl bg-purple-900/30 border border-purple-500/20';
  const durBonus = gameState.getMutationLabEffect('mutation_duration');
  const stackBonus = gameState.getMutationLabEffect('stack_limit');
  const secretBonus = gameState.getMutationLabEffect('secret_chance');
  banner.innerHTML = `
    <div class="flex items-center gap-2 mb-2">
      <span class="text-lg">🧪</span>
      <span class="font-bold text-purple-300 text-sm">Mutation Lab</span>
    </div>
    <div class="grid grid-cols-3 gap-2 text-xs">
      <div class="text-center"><span class="text-blue-400 font-bold">⏳${durBonus}%</span><br><span class="text-slate-500">Duration</span></div>
      <div class="text-center"><span class="text-amber-400 font-bold">📚+${stackBonus}</span><br><span class="text-slate-500">Stack Limit</span></div>
      <div class="text-center"><span class="text-pink-400 font-bold">🔮${secretBonus}%</span><br><span class="text-slate-500">Secret</span></div>
    </div>
  `;
  container.appendChild(banner);

  // Upgrade cards
  for (const upgrade of MUTATION_LAB) {
    const level = gameState.getMutationLabLevel(upgrade.id);
    const isMax = level >= upgrade.maxLevel;
    const nextCost = isMax ? 0 : getMutationLabCost(level + 1);
    const effect = gameState.getMutationLabEffect(upgrade.id);

    let effectText = '';
    if (upgrade.id === 'mutation_duration') effectText = `Active: +${effect}% weather duration`;
    else if (upgrade.id === 'stack_limit') effectText = `Active: ${5 + effect} max mutations`;
    else if (upgrade.id === 'secret_chance') effectText = `Active: +${effect}% secret chance`;

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
        <div class="text-xs text-purple-400 mt-0.5">${effectText}</div>
      </div>
      <div class="flex-shrink-0">
        ${isMax ? '<span class="text-xs text-green-400 font-bold">✅ MAX</span>' :
          `<button class="lab-buy px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition active:scale-95">₱${nextCost.toLocaleString()}</button>`
        }
      </div>
    `;

    if (!isMax) {
      card.querySelector('.lab-buy').addEventListener('click', () => {
        if (gameState.player.peso < nextCost) {
          playSound('buzzer');
          showToast(t('app.toast.not_enough_peso'), 'error');
          return;
        }
        const result = gameState.buyMutationLab(upgrade.id, upgrade);
        if (result.success) {
          playSound('buy');
          showToast(`🧪 ${upgrade.name} upgraded to Lv${result.level}!`, 'success');
          renderMutationLab(container);
        }
      });
    }

    container.appendChild(card);
  }
}
