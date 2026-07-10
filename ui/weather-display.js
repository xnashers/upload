import { gameState } from '../state.js';

export function createWeatherDisplay() {
  const container = document.createElement('div');
  container.className = 'flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800/60 border border-white/5 mb-3';

  let timerInterval = null;

  function formatCountdown(ms) {
    const secs = Math.ceil(ms / 1000);
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s.toString().padStart(2, '0')}`;
  }

  function update() {
    const weather = gameState.currentWeather;
    if (!weather) {
      container.innerHTML = '<span class="text-sm text-slate-500">☀️ Checking weather...</span>';
      return;
    }

    const remaining = gameState.getWeatherTimeRemaining();

    // Only show forecast if purchased
    let forecastHTML = '';
    if (gameState.forecastResult && gameState.forecastResult.purchased && Date.now() < gameState.forecastResult.expiresAt) {
      forecastHTML = `<span class="text-blue-400 text-[10px]">📡 Next: ${gameState.forecastResult.emoji}</span>`;
    }

    const isRareActive = gameState.isRareBoostActive();
    const mutBonus = gameState.getWeatherMutationBonus();
    const bonusStr = mutBonus > 0 ? `<span class="text-amber-400 text-[10px]">🧬 +${Math.round(mutBonus * 100)}% mutation</span>` : '';

    container.innerHTML = `
      <div class="flex items-center gap-2 flex-1 min-w-0">
        <span class="text-2xl flex-shrink-0">${weather.emoji}</span>
        <div class="min-w-0">
          <div class="font-semibold text-white text-sm">${weather.name}</div>
          <div class="text-xs text-purple-400">${weather.mutationEmoji} ${weather.mutation} · x${weather.multiplier} ${forecastHTML} ${bonusStr}</div>
        </div>
      </div>
      <div class="text-right flex-shrink-0">
        <div class="text-xs text-slate-500 tabular-nums">⏱ ${formatCountdown(remaining)}</div>
        ${isRareActive ? '<div class="text-[10px] text-amber-400">🌟 Rare Boost</div>' : ''}
      </div>
    `;
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(update, 1000);
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  gameState.on('weatherChange', update);
  update();
  startTimer();

  return { element: container, update, startTimer, stopTimer };
}
