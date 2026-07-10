import { gameState } from '../state.js';
import { WEATHER_CENTER } from '../data/research.js';
import { showToast } from './toast.js';
import { playSound } from './sounds.js';

const t = (key, values) => window.miniappI18n?.t(key, values) ?? key;

export function renderWeatherCenter(container) {
  container.innerHTML = '';

  const banner = document.createElement('div');
  banner.className = 'mb-4 p-3 rounded-xl bg-cyan-900/30 border border-cyan-500/20';

  const weather = gameState.currentWeather;
  const weatherStr = weather ? `${weather.emoji} ${weather.name}` : '—';
  const isRareActive = gameState.isRareBoostActive();
  const mutBonus = gameState.getWeatherMutationBonus();
  const forecastLevel = gameState.forecastLevel || 0;
  const forecastList = gameState.getForecastQueue();

  let forecastHTML = '';
  if (forecastLevel > 0 && forecastList.length > 0) {
    const labels = ['Next', 'Then', 'After'];
    forecastHTML = forecastList.map((w, i) =>
      `<div class="text-xs ${i === 0 ? 'text-blue-300 font-semibold' : 'text-slate-400'}">${labels[i] || 'Later'}: ${w.emoji} ${w.name}</div>`
    ).join('');
  } else {
    forecastHTML = '<span class="text-xs text-slate-600">🔒 Buy to unlock</span>';
  }

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
        <div class="text-slate-500 mb-1">Forecast ${forecastLevel > 0 ? `(Lv.${forecastLevel})` : ''}</div>
        ${forecastHTML}
      </div>
    </div>
    ${mutBonus > 0 ? `<div class="mt-2 text-xs text-purple-400 font-bold text-center">🧬 +${Math.round(mutBonus * 100)}% mutation chance this weather!</div>` : ''}
    ${isRareActive ? '<div class="mt-2 text-xs text-amber-400 font-bold text-center">🌟 Rare Weather Boost Active!</div>' : ''}
  `;
  container.appendChild(banner);

  // Forecast upgrade/buy action
  const forecastMaxed = forecastLevel >= WEATHER_CENTER.forecast.maxLevel;
  const forecastNextCost = forecastMaxed ? 0 : WEATHER_CENTER.forecast.costs[forecastLevel + 1];

  const forecastCard = document.createElement('div');
  forecastCard.className = `flex items-center gap-3 p-3 rounded-xl border transition mb-2 ${
    forecastMaxed ? 'bg-green-900/20 border-green-500/30' :
    'bg-slate-800/60 border-white/10 hover:border-white/20'
  }`;

  forecastCard.innerHTML = `
    <span class="text-2xl flex-shrink-0">📡</span>
    <div class="flex-1 min-w-0">
      <div class="font-semibold text-white text-sm">${forecastMaxed ? 'Forecast' : forecastLevel > 0 ? 'Upgrade Forecast' : 'Buy Forecast'}</div>
      <div class="text-xs text-slate-400">${forecastMaxed ? 'Max level — seeing all future weather' : forecastLevel > 0 ? `Upgrade to Lv.${forecastLevel + 1} — see ${forecastLevel + 1} weathers ahead` : 'See the next weather event'}</div>
    </div>
    <div class="flex-shrink-0">
      ${forecastMaxed ? '<span class="text-xs text-green-400 font-bold">✅ Max</span>' :
        `<button class="forecast-action px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition active:scale-95">₱${forecastNextCost.toLocaleString()}</button>`
      }
    </div>
  `;

  if (!forecastMaxed) {
    forecastCard.querySelector('.forecast-action').addEventListener('click', () => {
      if (gameState.player.peso < forecastNextCost) {
        playSound('buzzer');
        showToast(t('app.toast.not_enough_peso'), 'error');
        return;
      }
      const result = gameState.upgradeForecast();
      if (result.success) {
        playSound('buy');
        showToast(`📡 Forecast ${forecastLevel > 0 ? 'upgraded' : 'purchased'} — Level ${result.level}!`, 'success');
        renderWeatherCenter(container);
      }
    });
  }
  container.appendChild(forecastCard);

  // Skip Weather
  const skipCost = WEATHER_CENTER.skip.cost;
  const skipCard = document.createElement('div');
  skipCard.className = 'flex items-center gap-3 p-3 rounded-xl border transition mb-2 bg-slate-800/60 border-white/10 hover:border-white/20';
  skipCard.innerHTML = `
    <span class="text-2xl flex-shrink-0">⏭️</span>
    <div class="flex-1 min-w-0">
      <div class="font-semibold text-white text-sm">${WEATHER_CENTER.skip.name}</div>
      <div class="text-xs text-slate-400">${WEATHER_CENTER.skip.desc}</div>
    </div>
    <div class="flex-shrink-0">
      <button class="skip-action px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition active:scale-95">₱${skipCost.toLocaleString()}</button>
    </div>
  `;
  skipCard.querySelector('.skip-action').addEventListener('click', () => {
    if (gameState.player.peso < skipCost) {
      playSound('buzzer');
      showToast(t('app.toast.not_enough_peso'), 'error');
      return;
    }
    const result = gameState.skipWeather();
    if (result.success) {
      playSound('buy');
      showToast(`⏭️ Weather changed to ${result.weather.emoji} ${result.weather.name}!`, 'success');
      renderWeatherCenter(container);
    }
  });
  container.appendChild(skipCard);

  // Rare Weather Boost
  const rareActive = gameState.isRareBoostActive();
  const rareCost = WEATHER_CENTER.rareBoost.cost;
  const rareCard = document.createElement('div');
  rareCard.className = `flex items-center gap-3 p-3 rounded-xl border transition mb-2 ${
    rareActive ? 'bg-green-900/20 border-green-500/30' :
    'bg-slate-800/60 border-white/10 hover:border-white/20'
  }`;

  let rareStatus = '';
  if (rareActive) {
    const remaining = gameState.getRareBoostTimeRemaining();
    const mins = Math.floor(remaining / 60000);
    const secs = Math.floor((remaining % 60000) / 1000);
    rareStatus = `<span class="text-xs text-green-400">⏳ ${mins}m ${secs}s remaining</span>`;
  }

  rareCard.innerHTML = `
    <span class="text-2xl flex-shrink-0">🌟</span>
    <div class="flex-1 min-w-0">
      <div class="font-semibold text-white text-sm">${WEATHER_CENTER.rareBoost.name}</div>
      <div class="text-xs text-slate-400">${WEATHER_CENTER.rareBoost.desc}</div>
      ${rareStatus}
    </div>
    <div class="flex-shrink-0">
      ${rareActive ? '<span class="text-xs text-green-400 font-bold">✅ Active</span>' :
        `<button class="rare-action px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition active:scale-95">₱${rareCost.toLocaleString()}</button>`
      }
    </div>
  `;

  if (!rareActive) {
    rareCard.querySelector('.rare-action').addEventListener('click', () => {
      if (gameState.player.peso < rareCost) {
        playSound('buzzer');
        showToast(t('app.toast.not_enough_peso'), 'error');
        return;
      }
      const result = gameState.activateRareBoost();
      if (result.success) {
        playSound('buy');
        showToast('🌟 Rare Weather Boost activated for 10 minutes!', 'gold');
        renderWeatherCenter(container);
      }
    });
  }
  container.appendChild(rareCard);
}
