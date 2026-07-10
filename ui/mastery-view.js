import { gameState } from '../state.js';
import { CROPS, CROP_CATEGORIES } from '../data/crops.js';
import { MASTERY_CONFIG, getMasteryCost } from '../data/research.js';
import { showToast } from './toast.js';
import { playSound } from './sounds.js';

const t = (key, values) => window.miniappI18n?.t(key, values) ?? key;

export function renderMastery(container) {
  container.innerHTML = '';

  const banner = document.createElement('div');
  banner.className = 'mb-4 p-3 rounded-xl bg-emerald-900/30 border border-emerald-500/20';
  const totalMastery = Object.values(gameState.cropMastery).reduce((s, l) => s + l, 0);
  const maxMastery = CROPS.length * MASTERY_CONFIG.maxLevel;
  banner.innerHTML = `
    <div class="flex items-center gap-2 mb-1">
      <span class="text-lg">🎓</span>
      <span class="font-bold text-emerald-300 text-sm">Crop Mastery</span>
    </div>
    <div class="text-xs text-slate-400">Each mastery level grants: +${MASTERY_CONFIG.weightBonus * 100}% weight</div>
    <div class="text-xs text-emerald-400 mt-1">${totalMastery} / ${maxMastery} total mastery points</div>
  `;
  container.appendChild(banner);

  for (const cat of CROP_CATEGORIES) {
    const catCrops = CROPS.filter(c => c.category === cat.id);
    const section = document.createElement('div');
    section.className = 'mb-4';

    const header = document.createElement('h3');
    header.className = 'text-sm font-bold text-slate-300 mb-2';
    header.textContent = cat.name;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'space-y-2';

    for (const crop of catCrops) {
      const level = gameState.getCropMasteryLevel(crop.id);
      const isMax = level >= MASTERY_CONFIG.maxLevel;
      const nextCost = isMax ? 0 : getMasteryCost(crop, level + 1);
      const bonus = gameState.getCropMasteryBonus(crop.id);

      const pct = Math.round((level / MASTERY_CONFIG.maxLevel) * 100);

      const card = document.createElement('div');
      card.className = `flex items-center gap-3 p-3 rounded-xl border transition ${
        isMax ? 'bg-green-900/20 border-green-500/30' :
        'bg-slate-800/60 border-white/10 hover:border-white/20'
      }`;

      card.innerHTML = `
        <span class="text-2xl flex-shrink-0">${crop.emoji}</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-white text-sm">${crop.name}</span>
            <span class="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">Lv${level}</span>
          </div>
          <div class="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
            <div class="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full" style="width: ${pct}%"></div>
          </div>
          <div class="text-xs text-emerald-400 mt-1">⚖️+${bonus.weightBonus.toFixed(1)}% weight</div>
        </div>
        <div class="flex-shrink-0">
          ${isMax ? '<span class="text-xs text-green-400 font-bold">✅ MAX</span>' :
            `<button class="mastery-buy px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition active:scale-95">₱${nextCost.toLocaleString()}</button>`
          }
        </div>
      `;

      if (!isMax) {
        card.querySelector('.mastery-buy').addEventListener('click', () => {
          if (gameState.player.peso < nextCost) {
            playSound('buzzer');
            showToast(t('app.toast.not_enough_peso'), 'error');
            return;
          }
          const result = gameState.upgradeCropMastery(crop.id);
          if (result.success) {
            playSound('buy');
            showToast(`🎓 ${crop.name} mastery → Lv${result.level}!`, 'success');
            renderMastery(container);
          }
        });
      }

      grid.appendChild(card);
    }

    section.appendChild(grid);
    container.appendChild(section);
  }
}
