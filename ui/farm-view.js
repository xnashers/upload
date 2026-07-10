import { gameState } from '../state.js';
import { SPRINKLERS } from '../data/gear.js';
import { createWeatherDisplay } from './weather-display.js';
import { showToast } from './toast.js';
import { playSound } from './sounds.js';
import { spawnHarvestAnimation } from './harvest-anim.js';

const t = (key, values) => window.miniappI18n?.t(key, values) ?? key;

let timerInterval = null;
let weatherInterval = null;
let lastRenderedWeatherId = null;

function renderWeatherEffects() {
  const weatherFx = document.getElementById('weather-effects');
  if (!weatherFx) return;
  const w = gameState.currentWeather;
  if (!w) { weatherFx.innerHTML = ''; lastRenderedWeatherId = null; return; }

  // Skip re-render if same weather — particles persist smoothly
  if (lastRenderedWeatherId === w.id) return;
  lastRenderedWeatherId = w.id;

  let particles = '';
  const count = 40;

  if (w.id === 'rain' || w.id === 'thunderstorm') {
    for (let i = 0; i < count; i++) {
      const left = Math.random() * 100;
      const delay = Math.random() * 2;
      const duration = 0.5 + Math.random() * 0.5;
      particles += `<div class="weather-rain" style="left:${left}%;animation-delay:${delay}s;animation-duration:${duration}s"></div>`;
    }
    weatherFx.innerHTML = particles;
    if (w.id === 'thunderstorm') {
      weatherFx.className = 'fixed inset-0 pointer-events-none z-10 overflow-hidden thunder-flash';
    } else {
      weatherFx.className = 'fixed inset-0 pointer-events-none z-10 overflow-hidden';
    }
  } else if (w.id === 'snow') {
    for (let i = 0; i < 30; i++) {
      const left = Math.random() * 100;
      const delay = Math.random() * 5;
      const duration = 3 + Math.random() * 4;
      const size = 4 + Math.random() * 6;
      particles += `<div class="weather-snow" style="left:${left}%;animation-delay:${delay}s;animation-duration:${duration}s;width:${size}px;height:${size}px"></div>`;
    }
    weatherFx.innerHTML = particles;
    weatherFx.className = 'fixed inset-0 pointer-events-none z-10 overflow-hidden';
  } else if (w.id === 'fog') {
    weatherFx.innerHTML = '<div class="weather-fog"></div>';
    weatherFx.className = 'fixed inset-0 pointer-events-none z-10 overflow-hidden';
  } else if (w.id === 'cherry') {
    for (let i = 0; i < 15; i++) {
      const left = Math.random() * 100;
      const delay = Math.random() * 8;
      const duration = 4 + Math.random() * 6;
      particles += `<div class="weather-petal" style="left:${left}%;animation-delay:${delay}s;animation-duration:${duration}s"></div>`;
    }
    weatherFx.innerHTML = particles;
    weatherFx.className = 'fixed inset-0 pointer-events-none z-10 overflow-hidden';
  } else if (w.id === 'meteor') {
    for (let i = 0; i < 5; i++) {
      const left = 20 + Math.random() * 60;
      const delay = Math.random() * 6;
      particles += `<div class="weather-meteor" style="left:${left}%;animation-delay:${delay}s"></div>`;
    }
    weatherFx.innerHTML = particles;
    weatherFx.className = 'fixed inset-0 pointer-events-none z-10 overflow-hidden';
  } else if (w.id === 'aurora') {
    weatherFx.innerHTML = '<div class="weather-aurora"></div>';
    weatherFx.className = 'fixed inset-0 pointer-events-none z-10 overflow-hidden';
  } else {
    weatherFx.innerHTML = '';
    weatherFx.className = 'fixed inset-0 pointer-events-none z-10 overflow-hidden';
  }
}

function formatGrowTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  return `${secs}s`;
}

function formatMs(ms) {
  const totalSecs = Math.ceil(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function createSeedPopup() {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 hidden';
  overlay.innerHTML = `
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm seed-backdrop"></div>
    <div class="absolute inset-x-4 top-1/2 -translate-y-1/2 max-w-md mx-auto">
      <div class="bg-slate-800 rounded-3xl border border-white/10 shadow-2xl overflow-hidden seed-content">
        <div class="p-5 border-b border-white/10">
          <h2 class="text-lg font-bold text-white">🌱 Plant Seed</h2>
          <p class="text-sm text-slate-400 mt-1">Choose from your seeds</p>
        </div>
        <div id="seed-list" class="p-4 max-h-[60vh] overflow-y-auto space-y-2"></div>
        <div class="p-4 border-t border-white/10">
          <button class="seed-cancel w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold transition active:scale-98">Cancel</button>
        </div>
      </div>
    </div>
  `;

  let targetPlot = null;

  function open(plotIndex) {
    targetPlot = plotIndex;
    const list = overlay.querySelector('#seed-list');
    list.innerHTML = '';

    const ownedSeeds = Object.entries(gameState.seeds).filter(([, count]) => count > 0);

    if (ownedSeeds.length === 0) {
      list.innerHTML = '<div class="text-center py-8 text-slate-500"><span class="text-3xl block mb-2">🌱</span>No seeds! Visit the Shop</div>';
    } else {
      for (const [cropId, count] of ownedSeeds) {
        const crop = gameState.getCrop(cropId);
        if (!crop) continue;

        const blockInfo = gameState.getWeatherPlantingBlock(cropId);
        const isBlocked = blockInfo.blocked;

        const item = document.createElement('button');
        item.type = 'button';
        item.className = `w-full flex items-center gap-4 p-3 rounded-xl transition text-left ${
          isBlocked ? 'bg-slate-800/50 opacity-50 cursor-not-allowed' : 'bg-slate-700/50 hover:bg-slate-700 active:bg-slate-600 cursor-pointer'
        }`;
        item.innerHTML = `
          <span class="text-3xl flex-shrink-0">${crop.emoji}</span>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-white">${crop.name}</div>
            <div class="text-xs text-slate-400">⏱ ${formatGrowTime(gameState.getEffectiveGrowTime(cropId))} · 💰₱${crop.sellPrice}/kg</div>
            ${isBlocked ? `<div class="text-[10px] text-amber-400 mt-0.5">🚫 ${blockInfo.message}</div>` : ''}
          </div>
          <span class="text-sm font-bold text-green-400">x${count}</span>
        `;
        if (isBlocked) {
          item.disabled = true;
        } else {
          item.addEventListener('click', () => {
            const result = gameState.plantCrop(targetPlot, cropId);
            if (result && result.success) {
              playSound('plant');
              showToast(t('app.toast.planted', { crop: crop.emoji }), 'success');
            } else if (result && result.reason === 'weather_blocked') {
              showToast(result.message, 'warning');
            }
            close();
          });
        }
        list.appendChild(item);
      }
    }

    overlay.classList.remove('hidden');
  }

  function close() {
    targetPlot = null;
    overlay.classList.add('hidden');
  }

  overlay.querySelector('.seed-backdrop').addEventListener('click', close);
  overlay.querySelector('.seed-cancel').addEventListener('click', close);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.classList.contains('hidden')) close();
  });

  return { element: overlay, open, close };
}

function createSprinklerBar() {
  const bar = document.createElement('div');
  bar.className = 'flex items-center gap-2 px-3 py-2 mb-3 rounded-xl border transition-all duration-300';
  bar.id = 'sprinkler-bar';

  function render() {
    const active = gameState.getActiveSprinkler();

    if (!active) {
      const invCount = gameState.gear.sprinklerInventory.length;
      const invText = invCount > 0
        ? ` · 💦 <strong class="text-blue-400">${invCount} ready</strong> — Inventory ▶ Use`
        : ' · Buy in <strong class="text-blue-400">Gear</strong> shop';
      bar.className = 'flex items-center gap-2 px-3 py-2 mb-3 rounded-xl border transition-all duration-300 bg-slate-800/40 border-white/5';
      bar.innerHTML = `
        <span class="text-base opacity-50">💧</span>
        <span class="text-xs text-slate-500">No sprinkler${invText}</span>
      `;
    } else {
      const sp = SPRINKLERS.find(s => s.tier === active.tier);
      if (!sp) return;
      const bonusPct = Math.round(sp.speedBonus * 100);
      const doubleStr = sp.doubleHarvestBonus ? ` · +${Math.round(sp.doubleHarvestBonus * 100)}% double` : '';
      const remaining = gameState.getActiveSprinklerTimeRemaining();
      bar.className = 'flex items-center gap-2 px-3 py-2 mb-3 rounded-xl border transition-all duration-300 bg-blue-900/30 border-blue-500/40';
      bar.innerHTML = `
        <span class="text-base flex-shrink-0">${sp.emoji}</span>
        <div class="flex-1 min-w-0">
          <span class="text-xs font-semibold text-blue-300">${sp.name} Active</span>
          <span class="text-xs text-green-400"> · ⚡+${bonusPct}% speed${doubleStr}</span>
        </div>
        <div class="text-right flex-shrink-0">
          <div class="text-xs text-green-400 font-bold sprinkler-countdown">${formatMs(remaining)}</div>
        </div>
      `;
    }
  }

  gameState.subscribe(render);
  render();
  return { element: bar, render };
}

export function createFarmView() {
  const container = document.createElement('div');
  container.className = 'p-4 pb-24 max-w-lg mx-auto';

  // Weather visual effects overlay
  const weatherFx = document.createElement('div');
  weatherFx.id = 'weather-effects';
  weatherFx.className = 'fixed inset-0 pointer-events-none z-10 overflow-hidden';
  container.appendChild(weatherFx);

  const weatherDisplay = createWeatherDisplay();
  container.appendChild(weatherDisplay.element);

  const sprinklerBar = createSprinklerBar();
  container.appendChild(sprinklerBar.element);

  const header = document.createElement('div');
  header.className = 'flex items-center justify-between mb-3';
  header.innerHTML = `
    <h2 class="text-lg font-bold text-white">${t('app.tabs.farm')}</h2>
    <span id="plot-count" class="text-sm text-slate-400"></span>
  `;
  container.appendChild(header);

  const grid = document.createElement('div');
  grid.id = 'farm-grid';
  grid.className = 'grid grid-cols-2 sm:grid-cols-3 gap-3';
  container.appendChild(grid);

  const seedPopup = createSeedPopup();
  container.appendChild(seedPopup.element);

  function renderPlot(plot, index) {
    const card = document.createElement('div');
    card.className = 'relative rounded-2xl border-2 transition-all duration-200 overflow-hidden';
    card.dataset.plotIndex = index;

    const isFav = gameState.isFavorite(index);

    if (plot.status === 'empty') {
      card.className += ' border-dashed border-slate-600 bg-slate-800/50 hover:border-green-500/50 hover:bg-slate-800 cursor-pointer active:scale-95';
      card.innerHTML = `
        <div class="flex flex-col items-center justify-center py-8 px-4 gap-2">
          <span class="text-3xl opacity-40">+</span>
          <span class="text-xs text-slate-500">${t('app.farm.empty')}</span>
        </div>
      `;
      card.addEventListener('click', () => {
        const ownedSeeds = Object.entries(gameState.seeds).filter(([, c]) => c > 0);
        if (ownedSeeds.length === 0) {
          showToast('No seeds! Visit the Shop 🌱', 'info');
          return;
        }
        seedPopup.open(index);
      });
    } else {
      const crop = gameState.getCrop(plot.cropId);
      if (!crop) {
        card.className += ' border-dashed border-slate-600 bg-slate-800/50 cursor-pointer hover:border-green-500/50';
        card.innerHTML = `
          <div class="flex flex-col items-center justify-center py-8 px-4 gap-2">
            <span class="text-3xl opacity-40">+</span>
            <span class="text-xs text-slate-500">${t('app.farm.empty')}</span>
          </div>
        `;
        card.addEventListener('click', () => {
          const ownedSeeds = Object.entries(gameState.seeds).filter(([, c]) => c > 0);
          if (ownedSeeds.length === 0) {
            showToast('No seeds! Visit the Shop 🌱', 'info');
            return;
          }
          seedPopup.open(index);
        });
        return card;
      }
      const progress = gameState.getProgress(plot);
      const remaining = gameState.getRemainingMs(plot);
      const isReady = plot.status === 'ready' || progress >= 1;
      const mutations = plot.mutations || [];

      if (isReady) {
        const glowClass = mutations.length > 0 ? 'mutation-glow' : 'ready-glow';
        card.className += ` border-green-400/60 bg-green-900/30 cursor-pointer hover:bg-green-900/50 ${glowClass}`;

        const mutationBadges = mutations.length > 0
          ? `<div class="flex flex-wrap gap-1 mt-1 justify-center">${mutations.map(m =>
              `<span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                m.isSecret ? 'bg-purple-600/40 text-purple-200 border border-purple-400/30' : 'bg-amber-600/30 text-amber-200 border border-amber-400/20'
              }">${m.emoji} ${m.name}${m.isSecret ? ` x${m.bonusMultiplier}` : ` x${m.multiplier}`}</span>`
            ).join('')}</div>`
          : '';

        card.innerHTML = `
          <div class="flex flex-col items-center justify-center py-5 px-3 gap-1">
            <span class="text-3xl">${crop.emoji}</span>
            ${mutationBadges}
            <span class="text-xs font-bold text-green-300 animate-pulse">${t('app.farm.ready')}</span>

          </div>
        `;
        card.addEventListener('click', () => {
          if (gameState.isFavorite(index)) {
            showToast('❤️ This plot is favorited! Unfavorite it first to harvest.', 'warning');
            playSound('click');
            return;
          }
          handleHarvest(index);
        });
      } else {
        const canFertilize = !plot.fertilized && gameState.gear.fertilizerCount > 0;
        const activeSp = gameState.getActiveSprinkler();
        const spData = activeSp ? SPRINKLERS.find(s => s.tier === activeSp.tier) : null;
        const spBonusPct = spData ? Math.round(spData.speedBonus * 100) : 0;
        card.className += activeSp ? ' border-blue-500/30 bg-blue-900/10' : ' border-slate-600/40 bg-slate-800/30';

        let actionBtns = '';
        if (canFertilize) {
          actionBtns += '<button class="mt-1 px-2 py-1.5 bg-amber-600/80 hover:bg-amber-500 text-white rounded-xl text-xs transition fert-btn active:scale-95">💩 Fertilize</button>';
        } else if (plot.fertilized) {
          actionBtns += '<span class="mt-1 text-xs text-amber-400/60">💩 Fertilized</span>';
        }

        const sprinklerBadge = activeSp
          ? `<span class="text-[10px] text-blue-400 font-bold">⚡+${spBonusPct}% speed</span>`
          : '';

        const pct = Math.round(progress * 100);
        card.innerHTML = `
          <div class="flex flex-col items-center py-4 px-3 gap-1.5">
            <span class="text-2xl">${crop.emoji}</span>
            <span class="text-xs text-slate-400">${t('app.farm.growing')}</span>
            <div class="w-full mt-1">
              <div class="w-full h-2 bg-slate-700/60 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full progress-bar" style="width: ${pct}%"></div>
              </div>
            </div>
            ${plot.fertilized ? '<span class="text-xs text-amber-400">💩 +weight</span>' : ''}
            ${sprinklerBadge}
            <div class="flex gap-1">${actionBtns}</div>
          </div>
        `;

        if (canFertilize) {
          card.querySelector('.fert-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (gameState.fertilizeCrop(index)) {
              playSound('click');
              showToast('💩 Fertilized! +20-50% weight', 'success');
            }
          });
        }
      }
    }

    // ❤️ Favorite toggle — top-right corner, always visible on non-empty plots
    if (plot.status !== 'empty') {
      const favBtn = document.createElement('button');
      favBtn.type = 'button';
      favBtn.className = 'absolute top-1.5 right-1.5 z-20 w-7 h-7 flex items-center justify-center rounded-full transition-all duration-150 active:scale-90';
      favBtn.style.cssText = isFav
        ? 'background: rgba(236, 72, 153, 0.3); border: 1px solid rgba(236, 72, 153, 0.5);'
        : 'background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.1);';
      favBtn.innerHTML = `<span class="text-sm leading-none" style="filter: ${isFav ? 'none' : 'grayscale(1) opacity(0.4)'}">${isFav ? '❤️' : '🤍'}</span>`;
      favBtn.setAttribute('aria-label', isFav ? 'Unfavorite plot' : 'Favorite plot');
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nowFav = gameState.toggleFavorite(index);
        playSound('click');
        showToast(nowFav ? '❤️ Plot favorited! Protected from accidental harvest.' : '🤍 Plot unfavorited.', 'info');
        render();
      });
      card.appendChild(favBtn);
    }

    return card;
  }

  function renderBuyPlotTile() {
    const card = document.createElement('div');
    const plotPrice = gameState.getPlotPrice();
    card.className = 'relative rounded-2xl border-2 border-dashed overflow-hidden transition-all duration-200 border-amber-500/50 bg-amber-900/20 hover:border-amber-400 hover:bg-amber-900/30 cursor-pointer active:scale-95';
    card.innerHTML = `
      <div class="flex flex-col items-center justify-center py-8 px-4 gap-1">
        <span class="text-2xl">🔓</span>
        <span class="text-xs font-semibold text-amber-300">${t('app.farm.buy_plot')}</span>
        <span class="text-xs text-yellow-400">₱${plotPrice.toLocaleString()}</span>
      </div>
    `;
    card.addEventListener('click', () => {
      if (gameState.player.peso < plotPrice) {
        playSound('buzzer');
        showToast(t('app.toast.not_enough_peso'), 'error');
        return;
      }
      if (gameState.buyPlot()) {
        playSound('buy');
        showToast(t('app.toast.plot_bought'), 'success');
      }
    });
    return card;
  }

  function handleHarvest(index) {
    const result = gameState.harvestCrop(index);
    if (result) {
      playSound('harvest');
      setTimeout(() => playSound('peso'), 300);
      const plotEl = grid.querySelector(`[data-plot-index="${index}"]`);
      if (plotEl) {
        plotEl.classList.add('harvest-pop');
        plotEl.addEventListener('animationend', () => plotEl.classList.remove('harvest-pop'), { once: true });
        spawnHarvestAnimation(plotEl, result.crop, result);
      }

      const msg = result.isDouble
        ? `${t('app.toast.double')} +${result.quantity} ${result.crop.emoji}`
        : `${t('app.toast.harvested', { crop: result.crop.emoji, xp: result.crop.xp * result.quantity })}`;
      showToast(msg, result.isDouble ? 'gold' : 'success');

      // Check achievements after harvest
      const newAchs = gameState.checkAchievements();
      for (const ach of newAchs) {
        setTimeout(() => showToast(`🏆 ${ach.name} unlocked!`, 'gold'), 800);
      }
    }
  }

  function render() {
    grid.innerHTML = '';
    const countEl = header.querySelector('#plot-count');
    if (countEl) countEl.textContent = `🪴 ${gameState.plots.length} ${t('app.farm.plots')}`;

    gameState.plots.forEach((plot, i) => {
      grid.appendChild(renderPlot(plot, i));
    });
    grid.appendChild(renderBuyPlotTile());
  }

  function updateTimers() {
    let needsFullRender = false;

    // Update sprinkler countdown
    const sprinklerCountdownEl = container.querySelector('.sprinkler-countdown');
    if (sprinklerCountdownEl) {
      const remaining = gameState.getActiveSprinklerTimeRemaining();
      if (remaining <= 0) {
        needsFullRender = true;
      } else {
        sprinklerCountdownEl.textContent = formatMs(remaining);
      }
    }

    const cards = grid.querySelectorAll('[data-plot-index]');
    cards.forEach(card => {
      const index = parseInt(card.dataset.plotIndex);
      const plot = gameState.plots[index];
      if (!plot || plot.status !== 'growing') return;
      const remaining = gameState.getRemainingMs(plot);
      if (remaining <= 0) {
        // Immediately flip growing → ready in game state
        plot.status = 'ready';
        needsFullRender = true;
        return;
      }
      const progress = gameState.getProgress(plot);
      const bar = card.querySelector('.progress-bar');
      if (bar) bar.style.width = `${Math.round(progress * 100)}%`;
    });
    if (needsFullRender) render();
  }

  function weatherTick() {
    gameState.checkAndApplyWeather();
    renderWeatherEffects();
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimers, 1000);
    if (weatherInterval) clearInterval(weatherInterval);
    weatherInterval = setInterval(weatherTick, 3000);
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (weatherInterval) { clearInterval(weatherInterval); weatherInterval = null; }
  }

  function activate() { render(); startTimer(); weatherDisplay.startTimer?.(); renderWeatherEffects(); }
  function deactivate() { stopTimer(); weatherDisplay.stopTimer?.(); }

  gameState.subscribe(render);
  return { element: container, activate, deactivate, render };
}
