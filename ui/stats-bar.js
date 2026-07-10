import { gameState } from '../state.js';
import { TITLE_DISPLAY } from '../data/achievements.js';

const t = (key) => window.miniappI18n?.t(key) ?? key;

export function createStatsBar() {
  const bar = document.createElement('header');
  bar.className = 'sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-white/10 px-4 py-3';
  bar.innerHTML = `
    <div class="flex items-center justify-between max-w-lg mx-auto">
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-2xl flex-shrink-0">🌱</span>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <span id="farm-name-display" class="font-bold text-lg text-white truncate">Pocket Farm</span>
            <span id="title-badge" class="hidden text-xs bg-amber-600/30 text-amber-300 px-1.5 py-0.5 rounded-full font-bold truncate max-w-[80px]"></span>
          </div>
          <span id="level-title" class="text-xs text-purple-400 truncate block">Newbie</span>
        </div>
      </div>
      <div class="flex items-center gap-2 text-sm flex-shrink-0">
        <div class="flex items-center gap-1" title="Farmer Tokens">
          <span class="text-purple-400">🪙</span>
          <span id="stat-tokens" class="font-semibold text-purple-300">0</span>
        </div>
        <div class="flex items-center gap-1" title="Peso">
          <span class="text-yellow-400 font-bold">₱</span>
          <span id="stat-peso" class="font-semibold text-yellow-300">100</span>
        </div>
      </div>
    </div>
    <div class="flex items-center justify-between max-w-lg mx-auto mt-1">
      <div class="flex items-center gap-2">
        <div class="flex items-center gap-1" title="${t('app.stats.level')}">
          <span class="text-purple-400">⭐</span>
          <span id="stat-level" class="font-semibold text-purple-300">1</span>
        </div>
        <div class="flex items-center gap-1" title="${t('app.stats.xp')}">
          <span class="text-blue-400">✨</span>
          <span id="stat-xp" class="font-semibold text-blue-300">0</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <div id="crate-badge" class="hidden items-center gap-1 text-xs bg-orange-900/30 text-orange-300 px-2 py-0.5 rounded-full border border-orange-700/30">
          <span>🎁</span>
          <span id="stat-crates">0</span>
        </div>
        <div id="ticket-badge" class="hidden items-center gap-1 text-xs bg-cyan-900/30 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-700/30">
          <span>🎫</span>
          <span id="stat-tickets">0</span>
        </div>
      </div>
    </div>
    <div id="xp-bar-container" class="max-w-lg mx-auto mt-1.5">
      <div class="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div id="xp-bar" class="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500" style="width: 0%"></div>
      </div>
      <div class="flex justify-between text-[10px] text-slate-500 mt-0.5">
        <span id="xp-current">0 XP</span>
        <span id="xp-next">50 XP</span>
      </div>
    </div>
  `;

  function update() {
    const { level, xp, peso } = gameState.player;
    bar.querySelector('#stat-level').textContent = level;
    bar.querySelector('#stat-peso').textContent = peso.toLocaleString();
    bar.querySelector('#stat-xp').textContent = xp.toLocaleString();
    bar.querySelector('#farm-name-display').textContent = gameState.getDisplayName();
    bar.querySelector('#level-title').textContent = gameState.getLevelTitle();

    // Farmer tokens
    bar.querySelector('#stat-tokens').textContent = gameState.farmerTokens;

    // Title badge
    const titleBadge = bar.querySelector('#title-badge');
    const activeTitle = gameState.getActiveTitle();
    if (activeTitle && TITLE_DISPLAY[activeTitle]) {
      titleBadge.textContent = `${TITLE_DISPLAY[activeTitle].emoji} ${TITLE_DISPLAY[activeTitle].name}`;
      titleBadge.classList.remove('hidden');
    } else {
      titleBadge.classList.add('hidden');
    }

    // Crate and ticket badges
    const crateBadge = bar.querySelector('#crate-badge');
    const ticketBadge = bar.querySelector('#ticket-badge');
    if (gameState.giftCrates > 0) {
      crateBadge.classList.remove('hidden');
      crateBadge.classList.add('flex');
      bar.querySelector('#stat-crates').textContent = gameState.giftCrates;
    } else {
      crateBadge.classList.add('hidden');
      crateBadge.classList.remove('flex');
    }
    if (gameState.weatherTickets > 0) {
      ticketBadge.classList.remove('hidden');
      ticketBadge.classList.add('flex');
      bar.querySelector('#stat-tickets').textContent = gameState.weatherTickets;
    } else {
      ticketBadge.classList.add('hidden');
      ticketBadge.classList.remove('flex');
    }

    const current = gameState.getCurrentLevelXP();
    const next = gameState.getNextLevelXP();
    const xpBar = bar.querySelector('#xp-bar');
    const xpCurrent = bar.querySelector('#xp-current');
    const xpNext = bar.querySelector('#xp-next');

    if (next !== null) {
      const pct = Math.min(100, ((xp - current) / (next - current)) * 100);
      xpBar.style.width = `${pct}%`;
      xpCurrent.textContent = `${xp.toLocaleString()} XP`;
      xpNext.textContent = `${next.toLocaleString()} XP`;
    } else {
      xpBar.style.width = '100%';
      xpCurrent.textContent = 'MAX';
      xpNext.textContent = 'MAX';
    }
  }

  gameState.subscribe(update);
  update();
  return { element: bar, update };
}
