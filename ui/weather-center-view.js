import { gameState } from '../state.js';
import { WEATHER_CENTER } from '../data/research.js';
import { showToast } from './toast.js';
import { playSound } from './sounds.js';

const t = (key, values) => window.miniappI18n?.t(key, values) ?? key;

export function renderWeatherCenter(container) {
  container.innerHTML = '';

  const banner = document.createElement('div');
  banner.className = 'mb-4 p-3 rounded-xl bg-cyan-900/30 border border-cyan-500/20';

  let forecastStr = '—';
  if (gameState.forecastResult && gameState.forecastResult.purchased && Date.now() < gameState.forecastResult.expiresAt) {
    forecastStr = `${gameState.forecastResult.emoji} ${gameState.forecastResult.name}`;
  } else if (!gameState.forecastResult || !gameState.forecastResult.purchased) {
    forecastStr = '<span class="text-slate-600">🔒 Buy to unlock</span>';
  }

  const weather = gameState.currentWeather;
  const weatherStr = weather ? `${weather.emoji} ${weather.name}` : '—';
  const isRareActive = gameState.isRareBoostActive();
  const mutBonus = gameState.getWeatherMutationBonus();

  banner.innerHTML = `
    <div class="flex items-center gap-2 mb-2">
      <span class="text-lg">🌤️</span>
      <span class="font-bold text-cyan-300 text-sm">Weather Center</span>
    </div>
    <div class="grid grid-cols-2 gap-3 text-xs">
      <div class="p-2 rounded-lg bg-slate-800/50">
        <div class="text-slate-500 mb-1">Current Weather</div>
        <div class="font-semibold text-white">${weatherStr}</div>
      </div>
      <div class="p-2 rounded-lg bg-slate-800/50">
        <div class="text-slate-500 mb-1">Forecast</div>
        <div class="font-semibold text-blue-300">${forecastStr}</div>
      </div>
    </div>
    ${mutBonus > 0 ? `<div class="mt-2 text-xs text-purple-400 font-bold text-center">🧬 +${Math.round(mutBonus * 100)}% mutation chance this weather!</div>` : ''}
    ${isRareActive ? '<div class="mt-2 text-xs text-amber-400 font-bold text-center">🌟 Rare Weather Boost Active!</div>' : ''}
  `;
  container.appendChild(banner);

  // Actions
  const actions = [
    {
      key: 'forecast',
      ...WEATHER_CENTER.forecast,
      handler: () => {
        const result = gameState.forecastWeather();
        if (result.success) {
          playSound('buy');
          showToast(`📡 Forecast: ${result.weather.emoji} ${result.weather.name}`, 'info');
          renderWeatherCenter(container);
        } else {
          playSound('error');
          showToast('Not enough Peso!', 'error');
        }
      },
      isDisabled: () => false,
    },
    {
      key: 'skip',
      ...WEATHER_CENTER.skip,
      handler: () => {
        const result = gameState.skipWeather();
        if (result.success) {
          playSound('buy');
          showToast(`⏭️ Weather changed to ${result.weather.emoji} ${result.weather.name}!`, 'success');
          renderWeatherCenter(container);
        } else {
          playSound('error');
          showToast('Not enough Peso!', 'error');
        }
      },
      isDisabled: () => false,
    },
    {
      key: 'rareBoost',
      ...WEATHER_CENTER.rareBoost,
      handler: () => {
        const result = gameState.activateRareBoost();
        if (result.success) {
          playSound('buy');
          showToast('🌟 Rare Weather Boost activated for 10 minutes!', 'gold');
          renderWeatherCenter(container);
        } else if (result.reason === 'active') {
          showToast('🌟 Boost already active!', 'info');
        } else {
          playSound('error');
          showToast('Not enough Peso!', 'error');
        }
      },
      isDisabled: () => gameState.isRareBoostActive(),
    },
  ];

  for (const action of actions) {
    const canAfford = gameState.player.peso >= action.cost;
    const isDisabled = action.isDisabled();

    const card = document.createElement('div');
    card.className = `flex items-center gap-3 p-3 rounded-xl border transition mb-2 ${
      isDisabled ? 'bg-green-900/20 border-green-500/30' :
      canAfford ? 'bg-slate-800/60 border-white/10 hover:border-white/20' :
      'bg-slate-900/40 border-white/5'
    }`;

    let statusText = '';
    if (action.key === 'rareBoost' && isDisabled) {
      const remaining = gameState.getRareBoostTimeRemaining();
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      statusText = `<span class="text-xs text-green-400">⏳ ${mins}m ${secs}s remaining</span>`;
    }

    card.innerHTML = `
      <span class="text-2xl flex-shrink-0">${action.emoji}</span>
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-white text-sm">${action.name}</div>
        <div class="text-xs text-slate-400">${action.desc}</div>
        ${statusText}
      </div>
      <div class="flex-shrink-0">
        ${isDisabled ? '<span class="text-xs text-green-400 font-bold">✅ Active</span>' :
          canAfford ? `<button class="weather-action px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition active:scale-95">₱${action.cost.toLocaleString()}</button>` :
          `<span class="text-xs text-slate-500">₱${action.cost.toLocaleString()}</span>`
        }
      </div>
    `;

    if (!isDisabled && canAfford) {
      card.querySelector('.weather-action').addEventListener('click', action.handler);
    }

    container.appendChild(card);
  }
}
