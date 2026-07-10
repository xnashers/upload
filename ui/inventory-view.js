import { gameState } from '../state.js';
import { SPRINKLERS } from '../data/gear.js';
import { showToast } from './toast.js';
import { playSound } from './sounds.js';

const t = (key) => window.miniappI18n?.t(key) ?? key;

function formatMs(ms) {
  const totalSecs = Math.ceil(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export function createInventoryView() {
  const container = document.createElement('div');
  container.className = 'p-4 pb-24 max-w-lg mx-auto';

  const title = document.createElement('h2');
  title.className = 'text-xl font-bold text-white mb-4';
  title.textContent = t('app.inventory.title');
  container.appendChild(title);

  const list = document.createElement('div');
  list.className = 'space-y-3';
  container.appendChild(list);

  let sprinklerTimerInterval = null;

  function render() {
    list.innerHTML = '';

    const seedEntries = Object.entries(gameState.seeds).filter(([, count]) => count > 0);
    const cropEntries = Object.entries(gameState.inventory).filter(([, items]) => items && items.length > 0);
    const sprinklerEntries = gameState.gear.sprinklerInventory || [];
    const activeSprinkler = gameState.getActiveSprinkler();

    if (seedEntries.length === 0 && cropEntries.length === 0 && sprinklerEntries.length === 0 && !activeSprinkler && gameState.gear.fertilizerCount <= 0) {
      list.innerHTML = `
        <div class="text-center py-12 text-slate-500">
          <span class="text-4xl block mb-3">🎒</span>
          <p>${t('app.inventory.empty')}</p>
        </div>
      `;
      return;
    }

    // === Active Sprinkler ===
    if (activeSprinkler) {
      const sp = SPRINKLERS.find(s => s.tier === activeSprinkler.tier);
      if (sp) {
        const section = document.createElement('div');
        const header = document.createElement('h3');
        header.className = 'text-sm font-bold text-slate-300 mb-2';
        header.textContent = '💦 Active Sprinkler';
        section.appendChild(header);

        const card = document.createElement('div');
        card.className = 'flex items-center gap-3 p-4 rounded-xl bg-blue-900/30 border border-blue-500/30';
        const bonusPct = Math.round(sp.speedBonus * 100);
        const doubleStr = sp.doubleHarvestBonus ? ` · +${Math.round(sp.doubleHarvestBonus * 100)}% double` : '';
        card.innerHTML = `
          <span class="text-3xl flex-shrink-0">${sp.emoji}</span>
          <div class="flex-1">
            <div class="font-semibold text-white">${sp.name}</div>
            <div class="text-xs text-blue-300">+${bonusPct}% speed${doubleStr}</div>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-sm font-bold text-green-400 active-sprinkler-timer">${formatMs(gameState.getActiveSprinklerTimeRemaining())}</div>
            <div class="text-[10px] text-slate-500">remaining</div>
          </div>
        `;
        section.appendChild(card);
        list.appendChild(section);

        // Start countdown timer
        startSprinklerTimer();
      }
    }

    // === Sprinkler Inventory ===
    if (sprinklerEntries.length > 0) {
      const section = document.createElement('div');
      const header = document.createElement('h3');
      header.className = 'text-sm font-bold text-slate-300 mb-2 mt-4';
      header.textContent = '💦 Sprinklers';
      section.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'space-y-2';

      sprinklerEntries.forEach((item, index) => {
        const sp = SPRINKLERS.find(s => s.tier === item.tier);
        if (!sp) return;
        const bonusPct = Math.round(sp.speedBonus * 100);
        const isActive = !!activeSprinkler;

        const card = document.createElement('div');
        card.className = 'flex items-center gap-3 p-3 rounded-xl bg-blue-900/20 border border-blue-500/20';
        card.innerHTML = `
          <span class="text-2xl flex-shrink-0">${sp.emoji}</span>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-white text-sm">${sp.name}</div>
            <div class="text-xs text-slate-400">+${bonusPct}% speed · ${formatMs(sp.duration)}</div>
          </div>
          <button class="use-sprinkler-btn px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
            isActive
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }" ${isActive ? 'disabled' : ''}>${isActive ? '⏳ Wait' : '▶ Use'}</button>
        `;

        if (!isActive) {
          card.querySelector('.use-sprinkler-btn').addEventListener('click', () => {
            if (gameState.useSprinkler(index)) {
              playSound('buy');
              showToast(`${sp.emoji} ${sp.name} activated! ${formatMs(sp.duration)}`, 'success');
            }
          });
        }

        grid.appendChild(card);
      });

      section.appendChild(grid);
      list.appendChild(section);
    }

    // === Seeds ===
    if (seedEntries.length > 0) {
      const seedSection = document.createElement('div');
      const seedHeader = document.createElement('h3');
      seedHeader.className = 'text-sm font-bold text-slate-300 mb-2 mt-4';
      seedHeader.textContent = '🌱 Seeds';
      seedSection.appendChild(seedHeader);

      const seedGrid = document.createElement('div');
      seedGrid.className = 'space-y-2';

      for (const [cropId, count] of seedEntries) {
        const crop = gameState.getCrop(cropId);
        if (!crop) continue;
        const card = document.createElement('div');
        card.className = 'flex items-center gap-3 p-3 rounded-xl bg-slate-800/40 border border-white/5';
        card.innerHTML = `
          <span class="text-2xl flex-shrink-0">${crop.emoji}</span>
          <div class="flex-1">
            <div class="font-semibold text-white text-sm">${crop.name} Seed</div>
          </div>
          <span class="text-sm font-bold text-green-400">x${count}</span>
        `;
        seedGrid.appendChild(card);
      }

      seedSection.appendChild(seedGrid);
      list.appendChild(seedSection);
    }

    // === Harvested Crops ===
    if (cropEntries.length > 0) {
      const cropSection = document.createElement('div');
      const cropHeader = document.createElement('h3');
      cropHeader.className = 'text-sm font-bold text-slate-300 mb-2 mt-4';
      cropHeader.textContent = '🌾 Harvested Crops';
      cropSection.appendChild(cropHeader);

      const cropGrid = document.createElement('div');
      cropGrid.className = 'space-y-2';

      for (const [cropId, items] of cropEntries) {
        const crop = gameState.getCrop(cropId);
        if (!crop) continue;
        const count = items.length;
        const totalValue = items.reduce((sum, item) => sum + gameState.getItemSellPrice(cropId, item), 0);
        const heaviest = Math.max(...items.map(i => i.weight));
        const lightest = Math.min(...items.map(i => i.weight));

        const card = document.createElement('div');
        card.className = 'flex items-center gap-4 p-4 rounded-2xl bg-slate-800/60 border border-white/5';
        card.innerHTML = `
          <span class="text-3xl flex-shrink-0">${crop.emoji}</span>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-white">${crop.name} <span class="text-slate-400 text-sm">x${count}</span></div>
            <div class="text-xs text-slate-400 mt-0.5">⚖️ ${lightest.toFixed(2)} – ${heaviest.toFixed(2)} kg</div>
          </div>
          <div class="text-right flex-shrink-0">
            <div class="text-yellow-400 font-semibold text-sm">₱${totalValue.toLocaleString()}</div>
            <div class="text-[10px] text-slate-500">total value</div>
          </div>
        `;
        cropGrid.appendChild(card);
      }

      cropSection.appendChild(cropGrid);
      list.appendChild(cropSection);
    }

    // === Gear ===
    const gearSection = document.createElement('div');
    const gearHeader = document.createElement('h3');
    gearHeader.className = 'text-sm font-bold text-slate-300 mb-2 mt-4';
    gearHeader.textContent = '⚙️ Gear';
    gearSection.appendChild(gearHeader);

    const gearGrid = document.createElement('div');
    gearGrid.className = 'space-y-2';

    if (gameState.gear.fertilizerCount > 0) {
      const card = document.createElement('div');
      card.className = 'flex items-center gap-3 p-3 rounded-xl bg-amber-900/20 border border-amber-500/20';
      card.innerHTML = `<span class="text-2xl">💩</span><span class="text-white text-sm font-semibold">Fertilizer</span><span class="text-amber-400 text-sm ml-auto">x${gameState.gear.fertilizerCount}</span>`;
      gearGrid.appendChild(card);
    }

    gearSection.appendChild(gearGrid);
    list.appendChild(gearSection);
  }

  function startSprinklerTimer() {
    if (sprinklerTimerInterval) clearInterval(sprinklerTimerInterval);
    sprinklerTimerInterval = setInterval(() => {
      const timerEl = container.querySelector('.active-sprinkler-timer');
      if (!timerEl) { clearInterval(sprinklerTimerInterval); return; }
      const remaining = gameState.getActiveSprinklerTimeRemaining();
      if (remaining <= 0) {
        clearInterval(sprinklerTimerInterval);
        render(); // Re-render to show expired state
        return;
      }
      timerEl.textContent = formatMs(remaining);
    }, 1000);
  }

  function activate() {
    render();
  }

  function deactivate() {
    if (sprinklerTimerInterval) { clearInterval(sprinklerTimerInterval); sprinklerTimerInterval = null; }
  }

  gameState.subscribe(render);
  render();
  return { element: container, render, activate, deactivate };
}
