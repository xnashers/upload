import { gameState } from '../state.js';
import { CROPS, CROP_CATEGORIES } from '../data/crops.js';
import { GEAR_ITEMS, SPRINKLERS } from '../data/gear.js';
import { showToast } from './toast.js';
import { playSound } from './sounds.js';

const t = (key, values) => window.miniappI18n?.t(key, values) ?? key;

export function createShopView() {
  const container = document.createElement('div');
  container.className = 'p-4 pb-24 max-w-lg mx-auto';

  const toggle = document.createElement('div');
  toggle.className = 'flex gap-2 mb-4';
  toggle.innerHTML = `
    <button class="shop-tab flex-1 py-2.5 rounded-xl text-sm font-bold transition active:scale-98 bg-green-600 text-white" data-section="seeds">🌱 Seeds</button>
    <button class="shop-tab flex-1 py-2.5 rounded-xl text-sm font-bold transition active:scale-98 bg-slate-700 text-slate-300" data-section="gear">⚙️ Gear</button>
  `;
  container.appendChild(toggle);

  const content = document.createElement('div');
  container.appendChild(content);

  let currentSection = 'seeds';

  function switchSection(section) {
    currentSection = section;
    toggle.querySelectorAll('.shop-tab').forEach(btn => {
      const active = btn.dataset.section === section;
      btn.className = `shop-tab flex-1 py-2.5 rounded-xl text-sm font-bold transition active:scale-98 ${
        active ? 'bg-green-600 text-white' : 'bg-slate-700 text-slate-300'
      }`;
    });
    renderSection();
  }

  toggle.querySelectorAll('.shop-tab').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });

  function formatGrowTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    return `${secs}s`;
  }

  function formatTime(ms) {
    const totalSecs = Math.ceil(ms / 1000);
    if (totalSecs <= 0) return '0s';
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    if (mins > 0) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
    return `${secs}s`;
  }

  const STOCK_MAX = { starter: 5, intermediate: 3, advanced: 1, premium: 1 };
  const RARE_CATS = new Set(['advanced', 'premium']);

  function renderSeeds() {
    content.innerHTML = '';

    const remaining = gameState.getAvailabilityTimeRemaining();
    const timerBar = document.createElement('div');
    timerBar.className = 'flex items-center justify-between mb-4 px-3 py-2 rounded-xl bg-slate-800/60 border border-white/5';
    timerBar.innerHTML = `
      <span class="text-xs text-slate-400">🔄 Stock refreshes in</span>
      <span class="text-xs font-bold text-amber-400 shop-timer">${formatTime(remaining)}</span>
    `;
    content.appendChild(timerBar);

    for (const cat of CROP_CATEGORIES) {
      const catCrops = CROPS.filter(c => c.category === cat.id);
      const maxStock = STOCK_MAX[cat.id] || 3;

      const isRare = RARE_CATS.has(cat.id);
      const label = isRare ? '🎲 30% chance' : `x${maxStock}/cycle`;

      const section = document.createElement('div');
      section.className = 'mb-5';

      const header = document.createElement('h3');
      header.className = 'text-sm font-bold text-slate-300 mb-2';
      header.textContent = `${cat.name} (${label})`;
      section.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'space-y-2';

      for (const crop of catCrops) {
        const stock = gameState.getSeedStock(crop.id);
        const ownedSeeds = gameState.seeds[crop.id] || 0;
        const minSell = crop.seedCost * 5;
        const unavailable = stock <= 0;

        const card = document.createElement('div');
        card.className = `flex items-center gap-3 p-3 rounded-xl border transition ${
          unavailable ? 'bg-slate-900/40 border-white/5 opacity-40' : 'bg-slate-800/60 border-white/5 hover:border-white/10'
        }`;

        card.innerHTML = `
          <span class="text-2xl flex-shrink-0">${crop.emoji}</span>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-white text-sm">${crop.name}</div>
            <div class="text-xs text-slate-400">
              ⏱ ${formatGrowTime(crop.growTime)} · Min ₱${minSell}
              ${ownedSeeds > 0 ? ` · <span class="text-green-400">🌱${ownedSeeds}</span>` : ''}
            </div>
            <div class="text-xs mt-0.5 ${unavailable ? 'text-slate-600' : 'text-amber-400'}">${unavailable ? (isRare ? '🚫 Not available this cycle' : '⏳ Sold out — restocks soon') : `📦 ${stock} in stock`}</div>
          </div>
          <div class="flex gap-1 flex-shrink-0">
            ${!unavailable && stock >= 1 ? `<button class="buy-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 bg-green-600/80 hover:bg-green-500 text-white" data-crop="${crop.id}">₱${crop.seedCost}</button>` : ''}
            ${!unavailable && stock >= 3 ? `<button class="buy-3 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 bg-green-700/80 hover:bg-green-600 text-white" data-crop="${crop.id}">x3</button>` : ''}
            ${!unavailable && stock >= 5 ? `<button class="buy-5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 bg-green-800/80 hover:bg-green-700 text-white" data-crop="${crop.id}">x5</button>` : ''}
            ${unavailable ? `<span class="text-xs text-slate-600">${isRare ? '🎲' : 'Empty'}</span>` : ''}
          </div>
        `;

        const buy1 = card.querySelector('.buy-1');
        const buy3 = card.querySelector('.buy-3');
        const buy5 = card.querySelector('.buy-5');

        if (buy1) buy1.addEventListener('click', () => buySeeds(crop, 1));
        if (buy3) buy3.addEventListener('click', () => buySeeds(crop, 3));
        if (buy5) buy5.addEventListener('click', () => buySeeds(crop, 5));

        grid.appendChild(card);
      }

      section.appendChild(grid);
      content.appendChild(section);
    }
  }

  function buySeeds(crop, qty) {
    const result = gameState.buySeed(crop.id, qty);
    if (result && result > 0) {
      playSound('buy');
      showToast(`🌱 Bought ${result} ${crop.name} seed${result > 1 ? 's' : ''}!`, 'success');
    } else {
      playSound('buzzer');
      showToast(t('app.toast.not_enough_peso'), 'error');
    }
  }

  function renderGear() {
    content.innerHTML = '';

    // Sprinkler rotation timer
    const spRemaining = gameState.getSprinklerAvailabilityTimeRemaining();
    const spTimerBar = document.createElement('div');
    spTimerBar.className = 'flex items-center justify-between mb-4 px-3 py-2 rounded-xl bg-slate-800/60 border border-white/5';
    spTimerBar.innerHTML = `
      <span class="text-xs text-slate-400">🔄 Gear stock refreshes in</span>
      <span class="text-xs font-bold text-blue-400 sprinkler-timer">${formatTime(spRemaining)}</span>
    `;
    content.appendChild(spTimerBar);

    // Sprinklers
    const spSection = document.createElement('div');
    spSection.className = 'mb-5';
    spSection.innerHTML = '<h3 class="text-sm font-bold text-slate-300 mb-2">💦 Sprinklers</h3>';
    const spGrid = document.createElement('div');
    spGrid.className = 'space-y-2';

    const SP_STOCK = { 1: 3, 2: 2, 3: 1 };

    for (const sp of SPRINKLERS) {
      const stock = gameState.getSprinklerStock(sp.tier);
      const maxStock = SP_STOCK[sp.tier] || 1;
      const invCount = gameState.gear.sprinklerInventory.filter(s => s.tier === sp.tier).length;
      const bonusPct = Math.round(sp.speedBonus * 100);
      const doubleStr = sp.doubleHarvestBonus ? ` · +${Math.round(sp.doubleHarvestBonus * 100)}% double` : '';
      const durMin = Math.floor(sp.duration / 60);
      const durSec = sp.duration % 60;
      const durStr = durMin > 0 ? `${durMin}m${durSec > 0 ? ` ${durSec}s` : ''}` : `${durSec}s`;
      const unavailable = stock <= 0;

      const card = document.createElement('div');
      card.className = `flex items-center gap-3 p-3 rounded-xl border ${
        unavailable ? 'bg-slate-900/40 border-white/5 opacity-40' : 'bg-slate-800/60 border-white/10'
      }`;

      card.innerHTML = `
        <span class="text-2xl flex-shrink-0">${sp.emoji}</span>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-white text-sm">${sp.name}</div>
          <div class="text-xs text-slate-400">+${bonusPct}% speed${doubleStr} · ${durStr}</div>
          ${invCount > 0 ? `<div class="text-xs text-blue-400 mt-0.5">🎒 ${invCount} owned</div>` : ''}
          <div class="text-xs mt-0.5 ${unavailable ? 'text-slate-600' : 'text-amber-400'}">${unavailable ? '⏳ Sold out — restocks soon' : `📦 ${stock}/${maxStock} in stock`}</div>
        </div>
        <div class="flex-shrink-0">
          ${!unavailable ? `<button class="buy-sp px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 bg-blue-600/80 hover:bg-blue-500 text-white">₱${sp.cost}</button>` :
            '<span class="text-xs text-slate-600">Empty</span>'
          }
        </div>
      `;

      if (!unavailable) {
        const spBtn = card.querySelector('.buy-sp');
        if (spBtn) {
          spBtn.addEventListener('click', () => {
            if (gameState.player.peso < sp.cost) {
              playSound('buzzer');
              showToast(t('app.toast.not_enough_peso'), 'error');
              return;
            }
            if (gameState.buySprinkler(sp.tier)) {
              playSound('buy');
              showToast(`💦 ${sp.name} added to inventory!`, 'success');
            }
          });
        }
      }

      spGrid.appendChild(card);
    }

    spSection.appendChild(spGrid);
    content.appendChild(spSection);

    // Fertilizer
    const toolsSection = document.createElement('div');
    const fertStock = gameState.getFertilizerStock();
    const fertMax = 5;
    const fertStockColor = fertStock > 2 ? 'text-green-400' : fertStock > 0 ? 'text-amber-400' : 'text-red-400';

    toolsSection.innerHTML = `<h3 class="text-sm font-bold text-slate-300 mb-2">💩 Fertilizer <span class="text-xs ${fertStockColor} font-normal">(${fertStock}/${fertMax} in stock)</span></h3>`;
    const toolsGrid = document.createElement('div');
    toolsGrid.className = 'space-y-2';

    const fert = GEAR_ITEMS.fertilizer;
    const fertUnavailable = fertStock <= 0;

    const fertCard = document.createElement('div');
    fertCard.className = `flex items-center gap-3 p-3 rounded-xl border ${
      fertUnavailable ? 'bg-slate-900/40 border-white/5 opacity-40' : 'bg-slate-800/60 border-white/5'
    }`;
    fertCard.innerHTML = `
      <span class="text-2xl flex-shrink-0">${fert.emoji}</span>
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-white text-sm">${fert.name}</div>
        <div class="text-xs text-slate-400">${fert.description}</div>
        <div class="text-xs text-amber-400 mt-0.5">Owned: ${gameState.gear.fertilizerCount}</div>
      </div>
      <div class="flex flex-col gap-1 flex-shrink-0">
        ${!fertUnavailable && fertStock >= 1 ? `<button class="buy-fert-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 bg-amber-600/80 hover:bg-amber-500 text-white">x1 ₱${fert.cost}</button>` : ''}
        ${!fertUnavailable && fertStock >= 3 ? `<button class="buy-fert-3 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 bg-amber-700/80 hover:bg-amber-600 text-white">x3 ₱${fert.cost * 3}</button>` : ''}
        ${fertUnavailable ? '<span class="text-xs text-slate-600 text-center">Empty</span>' : ''}
      </div>
    `;

    const buyFert1 = fertCard.querySelector('.buy-fert-1');
    const buyFert3 = fertCard.querySelector('.buy-fert-3');
    if (buyFert1) buyFert1.addEventListener('click', () => buyFert(1));
    if (buyFert3) buyFert3.addEventListener('click', () => buyFert(3));

    toolsGrid.appendChild(fertCard);
    toolsSection.appendChild(toolsGrid);
    content.appendChild(toolsSection);
  }

  function buyFert(qty) {
    const result = gameState.buyFertilizer(qty);
    if (result && result > 0) {
      playSound('buy');
      showToast(`💩 Bought ${result} Fertilizer!`, 'success');
    } else {
      playSound('buzzer');
      showToast(t('app.toast.not_enough_peso'), 'error');
    }
  }

  function renderSection() {
    if (currentSection === 'seeds') renderSeeds();
    else renderGear();
  }

  let timerInterval = null;
  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      const seedTimer = content.querySelector('.shop-timer');
      if (seedTimer) {
        const remaining = gameState.getAvailabilityTimeRemaining();
        seedTimer.textContent = formatTime(remaining);
        if (remaining <= 0) renderSection();
      }
      const spTimer = content.querySelector('.sprinkler-timer');
      if (spTimer) {
        const remaining = gameState.getSprinklerAvailabilityTimeRemaining();
        spTimer.textContent = formatTime(remaining);
        if (remaining <= 0 && currentSection === 'gear') renderSection();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  gameState.subscribe(renderSection);
  renderSection();
  startTimer();

  return { element: container, render: renderSection, activate: startTimer, deactivate: stopTimer };
}
