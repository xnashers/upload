import { gameState } from '../state.js';
import { showToast } from './toast.js';
import { playSound } from './sounds.js';

const t = (key, values) => window.miniappI18n?.t(key, values) ?? key;

export function createMarketView() {
  const container = document.createElement('div');
  container.className = 'p-4 pb-24 max-w-lg mx-auto';

  const title = document.createElement('h2');
  title.className = 'text-xl font-bold text-white mb-4';
  title.textContent = t('app.market.title');
  container.appendChild(title);

  const list = document.createElement('div');
  list.className = 'space-y-4';
  container.appendChild(list);

  function render() {
    list.innerHTML = '';
    const entries = Object.entries(gameState.inventory).filter(([, items]) => items && items.length > 0);

    if (entries.length === 0) {
      list.innerHTML = `
        <div class="text-center py-12 text-slate-500">
          <span class="text-4xl block mb-3">🏪</span>
          <p>${t('app.market.empty')}</p>
        </div>
      `;
      return;
    }

    // Separate mutated and normal items
    const normalItems = [];  // { cropId, crop, items[] }
    const mutatedItems = []; // { cropId, crop, items[] }

    for (const [cropId, items] of entries) {
      const crop = gameState.getCrop(cropId);
      if (!crop) continue;
      const normal = items.filter(i => !i.mutations || i.mutations.length === 0);
      const mutated = items.filter(i => i.mutations && i.mutations.length > 0);
      if (normal.length > 0) normalItems.push({ cropId, crop, items: normal });
      if (mutated.length > 0) mutatedItems.push({ cropId, crop, items: mutated });
    }

    // === MUTATED CROPS SECTION ===
    if (mutatedItems.length > 0) {
      const mutHeader = document.createElement('div');
      mutHeader.className = 'flex items-center gap-2 mb-2';
      mutHeader.innerHTML = `
        <h3 class="text-sm font-bold text-purple-300">🧬 Mutated Crops</h3>
        <span class="text-[10px] text-purple-500 bg-purple-900/30 px-2 py-0.5 rounded-full">Premium</span>
      `;
      list.appendChild(mutHeader);

      for (const { cropId, crop, items } of mutatedItems) {
        // Group by mutation combo for display
        const groups = {};
        for (const item of items) {
          const key = (item.mutations || []).map(m => m.weatherId).sort().join('+');
          if (!groups[key]) groups[key] = { mutations: item.mutations || [], items: [] };
          groups[key].items.push(item);
        }

        for (const [, group] of Object.entries(groups)) {
          const count = group.items.length;
          const totalValue = group.items.reduce((sum, item) => sum + gameState.getItemSellPrice(cropId, item), 0);
          const avgPrice = Math.round(totalValue / count);
          const mutations = group.mutations;

          const card = document.createElement('div');
          card.className = 'rounded-2xl border border-purple-500/30 bg-purple-900/10 overflow-hidden';

          // Mutation badges header
          const badges = mutations.map(m =>
            `<span class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              m.isSecret ? 'bg-purple-600/50 text-purple-200 border border-purple-400/40' : 'bg-amber-600/30 text-amber-200 border border-amber-400/20'
            }">${m.emoji} ${m.name} ${m.isSecret ? `x${m.bonusMultiplier}` : `x${m.multiplier}`}</span>`
          ).join('');

          card.innerHTML = `
            <div class="px-4 pt-3 pb-2 border-b border-purple-500/20">
              <div class="flex items-center gap-2 mb-1.5">${badges}</div>
              <div class="flex items-center gap-3">
                <span class="text-3xl">${crop.emoji}</span>
                <div class="flex-1 min-w-0">
                  <div class="font-semibold text-purple-200">${crop.name} <span class="text-purple-400 text-sm">x${count}</span></div>
                  <div class="text-xs text-purple-400">₱${avgPrice.toLocaleString()} each · Total ₱${totalValue.toLocaleString()}</div>
                </div>
              </div>
            </div>
            <div class="p-3 flex gap-2">
              <button class="sell-one flex-1 py-2 bg-purple-700/60 hover:bg-purple-600/60 text-purple-200 rounded-xl text-xs font-semibold transition active:scale-95">
                Sell One ₱${gameState.getItemSellPrice(cropId, group.items[0]).toLocaleString()}
              </button>
              <button class="sell-all flex-1 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition active:scale-95">
                All ₱${totalValue.toLocaleString()}
              </button>
            </div>
          `;

          const firstItemIdx = items.indexOf(group.items[0]);
          card.querySelector('.sell-one').addEventListener('click', () => {
            // Find current index of this specific item
            const currentItems = gameState.inventory[cropId];
            if (!currentItems) return;
            const idx = currentItems.findIndex(i => i === group.items[0] || (i.weight === group.items[0].weight && JSON.stringify(i.mutations) === JSON.stringify(group.items[0].mutations)));
            if (idx === -1) return;
            const result = gameState.sellCrop(cropId, idx);
            if (result) {
              playSound('sell');
              showToast(`${crop.emoji} Mutated crop sold for ₱${result.amount.toLocaleString()}!`, 'gold');
              gameState.checkAchievements();
            }
          });

          card.querySelector('.sell-all').addEventListener('click', () => {
            // Sell only this mutation group
            const currentItems = gameState.inventory[cropId];
            if (!currentItems) return;
            let totalAmount = 0;
            let sold = 0;
            const toRemove = [];
            for (let i = currentItems.length - 1; i >= 0; i--) {
              const ci = currentItems[i];
              const match = group.items.find(gi => ci.weight === gi.weight && JSON.stringify(ci.mutations) === JSON.stringify(gi.mutations));
              if (match) {
                totalAmount += gameState.getItemSellPrice(cropId, ci);
                toRemove.push(i);
                sold++;
              }
            }
            for (const idx of toRemove) currentItems.splice(idx, 1);
            if (currentItems.length === 0) delete gameState.inventory[cropId];
            gameState.player.peso += totalAmount;
            gameState.stats.totalSold += sold;
            gameState.stats.totalEarned += totalAmount;
            gameState.save();
            if (totalAmount > 0) {
              playSound('sell');
              showToast(`${sold} ${crop.emoji} mutated crops sold for ₱${totalAmount.toLocaleString()}!`, 'gold');
              gameState.checkAchievements();
            }
          });

          list.appendChild(card);
        }
      }
    }

    // === NORMAL CROPS SECTION ===
    if (normalItems.length > 0) {
      const normalHeader = document.createElement('div');
      normalHeader.className = 'flex items-center gap-2 mb-2 mt-2';
      normalHeader.innerHTML = `
        <h3 class="text-sm font-bold text-slate-300">🌾 Normal Crops</h3>
      `;
      list.appendChild(normalHeader);

      for (const { cropId, crop, items } of normalItems) {
        const count = items.length;
        const totalValue = items.reduce((sum, item) => sum + gameState.getItemSellPrice(cropId, item), 0);

        let heaviestIdx = 0;
        for (let i = 1; i < items.length; i++) {
          if (items[i].weight > items[heaviestIdx].weight) heaviestIdx = i;
        }
        const bestPrice = gameState.getItemSellPrice(cropId, items[heaviestIdx]);

        const card = document.createElement('div');
        card.className = 'flex items-center gap-3 p-4 rounded-2xl bg-slate-800/60 border border-white/5';
        card.innerHTML = `
          <span class="text-3xl flex-shrink-0">${crop.emoji}</span>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-white">${crop.name} <span class="text-slate-400 text-sm">x${count}</span></div>
            <div class="text-xs text-slate-400 mt-0.5">Best: ₱${bestPrice.toLocaleString()} · Total: ₱${totalValue.toLocaleString()}</div>
          </div>
          <div class="flex flex-col gap-1.5 flex-shrink-0">
            <button class="sell-best px-3 py-1.5 bg-yellow-600/80 hover:bg-yellow-500 active:bg-yellow-400 text-white rounded-xl text-xs font-semibold transition active:scale-95">₱${bestPrice.toLocaleString()}</button>
            <button class="sell-all px-3 py-1.5 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-300 text-slate-900 rounded-xl text-xs font-bold transition active:scale-95">All ₱${totalValue.toLocaleString()}</button>
          </div>
        `;

        card.querySelector('.sell-best').addEventListener('click', () => {
          const result = gameState.sellHeaviest(cropId);
          if (result) {
            playSound('sell');
            showToast(`${crop.emoji} sold for ₱${result.amount.toLocaleString()}!`, 'gold');
            const newAchs = gameState.checkAchievements();
            for (const ach of newAchs) {
              setTimeout(() => showToast(`🏆 ${ach.name} unlocked!`, 'gold'), 500);
            }
          }
        });

        card.querySelector('.sell-all').addEventListener('click', () => {
          // Only sell non-mutated items
          const currentItems = gameState.inventory[cropId];
          if (!currentItems) return;
          let totalAmount = 0;
          let sold = 0;
          const toRemove = [];
          for (let i = currentItems.length - 1; i >= 0; i--) {
            if (!currentItems[i].mutations || currentItems[i].mutations.length === 0) {
              totalAmount += gameState.getItemSellPrice(cropId, currentItems[i]);
              toRemove.push(i);
              sold++;
            }
          }
          for (const idx of toRemove) currentItems.splice(idx, 1);
          if (currentItems.length === 0) delete gameState.inventory[cropId];
          gameState.player.peso += totalAmount;
          gameState.stats.totalSold += sold;
          gameState.stats.totalEarned += totalAmount;
          gameState.save();
          if (totalAmount > 0) {
            playSound('sell');
            showToast(`${sold} ${crop.emoji} sold for ₱${totalAmount.toLocaleString()}!`, 'gold');
            gameState.checkAchievements();
          }
        });

        list.appendChild(card);
      }
    }
  }

  gameState.subscribe(render);
  render();
  return { element: container, render };
}
