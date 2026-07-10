import { gameState } from '../state.js';
import { CROPS, CROP_CATEGORIES } from '../data/crops.js';
import { GENETICS_TIERS, getGeneticsCost } from '../data/research.js';
import { showToast } from './toast.js';
import { playSound } from './sounds.js';

export function renderGenetics(container) {
  container.innerHTML = '';

  const banner = document.createElement('div');
  banner.className = 'mb-4 p-3 rounded-xl bg-amber-900/30 border border-amber-500/20';
  const upgradedCrops = Object.keys(gameState.cropGenetics).filter(k => gameState.cropGenetics[k] > 0).length;
  banner.innerHTML = `
    <div class="flex items-center gap-2 mb-1">
      <span class="text-lg">🧬</span>
      <span class="font-bold text-amber-300 text-sm">Seed Genetics</span>
    </div>
    <div class="text-xs text-slate-400">Upgrade crop tiers for permanent sell price multipliers. Same crop, better stats!</div>
    <div class="text-xs text-amber-400 mt-1">${upgradedCrops} crops upgraded · Max ×${GENETICS_TIERS[GENETICS_TIERS.length - 1].priceMultiplier.toFixed(1)} sell price</div>
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
      const tier = gameState.getCropGeneticsTier(crop.id);
      const isMax = tier >= GENETICS_TIERS.length;
      const nextCost = isMax ? 0 : getGeneticsCost(crop, tier);
      const canAfford = !isMax && gameState.player.peso >= nextCost;
      const tierName = tier > 0 ? GENETICS_TIERS[tier - 1].name : 'Normal';
      const tierEmoji = tier > 0 ? GENETICS_TIERS[tier - 1].emoji : '';
      const priceMult = tier > 0 ? GENETICS_TIERS[tier - 1].priceMultiplier : 1;
      const nextMult = !isMax ? GENETICS_TIERS[tier].priceMultiplier : priceMult;

      const card = document.createElement('div');
      card.className = `flex items-center gap-3 p-3 rounded-xl border transition ${
        isMax ? 'bg-green-900/20 border-green-500/30' :
        canAfford ? 'bg-slate-800/60 border-white/10 hover:border-white/20' :
        'bg-slate-900/40 border-white/5'
      }`;

      const progressBar = Array.from({ length: GENETICS_TIERS.length }, (_, i) =>
        `<div class="flex-1 h-1.5 rounded-full ${i < tier ? 'bg-amber-500' : 'bg-slate-700'}"></div>`
      ).join('');

      card.innerHTML = `
        <span class="text-2xl flex-shrink-0">${crop.emoji}</span>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5">
            <span class="font-semibold text-white text-sm">${crop.name}</span>
            ${tierEmoji ? `<span class="text-xs">${tierEmoji}</span>` : ''}
            <span class="text-xs text-slate-400">${tierName}</span>
          </div>
          <div class="flex gap-0.5 mt-1">${progressBar}</div>
          <div class="text-xs text-amber-400 mt-1">×${priceMult.toFixed(2)} sell price${!isMax ? ` → ×${nextMult.toFixed(2)}` : ''}</div>
        </div>
        <div class="flex-shrink-0">
          ${isMax ? '<span class="text-xs text-green-400 font-bold">✅ MAX</span>' :
            canAfford ? `<button class="genetics-buy px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition active:scale-95">₱${nextCost.toLocaleString()}</button>` :
            `<span class="text-xs text-slate-500">₱${nextCost.toLocaleString()}</span>`
          }
        </div>
      `;

      if (canAfford) {
        card.querySelector('.genetics-buy').addEventListener('click', () => {
          const result = gameState.upgradeCropGenetics(crop.id);
          if (result.success) {
            playSound('buy');
            showToast(`🧬 ${crop.name} → ${GENETICS_TIERS[result.tier - 1].name}! (×${GENETICS_TIERS[result.tier - 1].priceMultiplier.toFixed(2)})`, 'gold');
            renderGenetics(container);
          }
        });
      }

      grid.appendChild(card);
    }

    section.appendChild(grid);
    container.appendChild(section);
  }
}
