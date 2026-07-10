import { gameState } from '../state.js';
import { LOGIN_CYCLE, MONTHLY_MILESTONES } from '../data/login-rewards.js';
import { playSound } from './sounds.js';
import { showToast } from './toast.js';

const t = (key, values) => window.miniappI18n?.t(key, values) ?? key;

export function showLoginRewardPopup() {
  const reward = gameState.pendingLoginReward;
  if (!reward) return;

  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4';

  const card = document.createElement('div');
  card.className = 'bg-slate-900 rounded-3xl border border-slate-700 w-full max-w-md shadow-2xl animate-fade-in overflow-hidden';

  const { daily, monthly } = reward;
  const streak = gameState.loginRewards.streak;

  // Header with gradient
  const headerHTML = `
    <div class="bg-gradient-to-br from-amber-600/30 to-yellow-600/10 p-5 text-center border-b border-slate-700">
      <div class="text-5xl mb-2">🎁</div>
      <h2 class="text-xl font-bold text-amber-300">Daily Rewards</h2>
      <p class="text-xs text-slate-400 mt-1">Day ${streak} Login Streak 🔥</p>
    </div>
  `;

  // 7-day reward grid
  let rewardsGrid = '<div class="grid grid-cols-7 gap-1.5 px-4 pt-4">';
  for (let d = 1; d <= 7; d++) {
    const cycle = LOGIN_CYCLE.find(l => l.day === d);
    if (!cycle) continue;
    const isPast = d < streak;
    const isCurrent = d === streak;
    const isFuture = d > streak;
    rewardsGrid += `
      <div class="flex flex-col items-center rounded-xl py-2 px-1 text-center transition-all ${
        isCurrent ? 'bg-amber-600/40 border-2 border-amber-400 shadow-lg shadow-amber-600/20' :
        isPast ? 'bg-slate-800/60 border border-slate-700 opacity-60' :
        'bg-slate-800/40 border border-slate-700'
      }">
        <span class="text-[10px] font-bold ${isCurrent ? 'text-amber-300' : isPast ? 'text-slate-600' : 'text-slate-500'}">Day ${d}</span>
        <span class="text-lg my-1 ${isPast ? 'grayscale' : ''}">${cycle.emoji}</span>
        <span class="text-[9px] ${isCurrent ? 'text-amber-200 font-bold' : isPast ? 'text-slate-600' : 'text-slate-500'} leading-tight">${cycle.label.replace(/[₱×]/g, '').trim().slice(0, 8)}</span>
        ${isPast ? '<span class="text-[8px] text-emerald-500 mt-0.5">✓</span>' : ''}
        ${isCurrent ? '<span class="text-[8px] text-amber-400 mt-0.5 animate-pulse">▲</span>' : ''}
      </div>
    `;
  }
  rewardsGrid += '</div>';

  // Today's reward highlight
  const todayReward = `
    <div class="mx-4 mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-900/30 to-yellow-900/20 border border-amber-600/30">
      <div class="flex items-center gap-4">
        <div class="text-4xl">${daily.emoji}</div>
        <div class="flex-1">
          <p class="text-xs text-amber-500 font-semibold uppercase tracking-wider">Today's Reward</p>
          <p class="text-lg font-bold text-amber-200">${daily.label}</p>
        </div>
      </div>
    </div>
  `;

  // Monthly milestone (if any)
  let monthlyHTML = '';
  if (monthly) {
    monthlyHTML = `
      <div class="mx-4 mt-3 p-3 rounded-2xl bg-purple-900/20 border border-purple-600/30">
        <div class="flex items-center gap-3">
          <div class="text-3xl">${monthly.emoji}</div>
          <div class="flex-1">
            <p class="text-xs text-purple-400 font-semibold">🌟 Monthly Milestone!</p>
            <p class="text-sm font-bold text-purple-200">${monthly.label}</p>
          </div>
        </div>
      </div>
    `;
  }

  // Monthly milestones preview
  let milestonesHTML = '<div class="mx-4 mt-3 flex gap-2">';
  for (const ms of MONTHLY_MILESTONES) {
    const claimed = gameState.loginRewards.monthlyClaimed[ms.days];
    const reached = gameState.loginRewards.totalLoginDays >= ms.days;
    milestonesHTML += `
      <div class="flex-1 text-center py-2 rounded-lg text-[9px] ${
        claimed ? 'bg-emerald-900/30 border border-emerald-700/30 text-emerald-400' :
        reached ? 'bg-amber-900/20 border border-amber-700/30 text-amber-400' :
        'bg-slate-800/40 border border-slate-700 text-slate-600'
      }">
        <span class="block text-base">${ms.emoji}</span>
        <span class="block">${ms.days}d</span>
        ${claimed ? '<span class="block text-emerald-500">✓</span>' : ''}
      </div>
    `;
  }
  milestonesHTML += '</div>';

  card.innerHTML = headerHTML + rewardsGrid + todayReward + monthlyHTML + milestonesHTML;

  // Claim button
  const btnWrap = document.createElement('div');
  btnWrap.className = 'p-4';
  const claimBtn = document.createElement('button');
  claimBtn.className = 'w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-white font-bold text-sm transition-all active:scale-95 shadow-lg shadow-amber-600/20';
  claimBtn.textContent = '✨ Claim Rewards';
  claimBtn.onclick = () => {
    const res = gameState.claimLoginReward();
    if (res.success) {
      playSound('levelup');
      const msgs = [`${daily.emoji} ${daily.label}`];
      if (monthly) msgs.push(`${monthly.emoji} ${monthly.label}`);
      showToast(msgs.join(' + '), 'gold');
    }
    overlay.classList.add('animate-fade-out');
    setTimeout(() => overlay.remove(), 300);
  };
  btnWrap.appendChild(claimBtn);
  card.appendChild(btnWrap);

  overlay.appendChild(card);
  document.body.appendChild(overlay);
}
